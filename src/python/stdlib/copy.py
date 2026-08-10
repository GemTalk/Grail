# Grail copy module — minimal stub.
#
# Provides ``copy'' (shallow) and ``deepcopy'' (recursive) over
# the common containers werkzeug touches.  CPython's full copy
# module is ~250 lines and handles dispatch via ``__copy__'' /
# ``__deepcopy__'' dunders + a registry — this stub honors the
# dunders (so a class with a ``__deepcopy__'' opt-out works) and
# recurses by container type.  Add cases as callers surface.


class Error(Exception):
    """Raised for un-copyable objects.  CPython exposes this as
    ``copy.Error``, with ``copy.error`` as a long-standing alias."""
    pass


error = Error


def _state_is_dict(obj):
    """True when *obj* is an ordinary instance whose ENTIRE state is its
    ``__dict__`` -- the one shape it is safe to rebuild attribute by
    attribute.

    The discriminator is the TYPE of ``__dict__``, not its presence.
    Presence alone is answered by classes (a plain ``dict``), by modules
    (``PyModuleDict``) and by several native wrappers whose real state lives
    elsewhere, so reconstructing any of those from ``__dict__`` would mangle
    them.  Only an ordinary instance answers Grail's ``PyInstanceDict``.

    This is the predicate the atom passthrough below used to lack, which is
    why ``copy.copy(obj)`` and ``copy.deepcopy(obj)`` handed back *obj*
    itself for a plain instance -- the ``unexpectedly identical'' failures
    throughout test_copy.
    """
    try:
        d = obj.__dict__
    except BaseException:
        return False
    return type(d).__name__ == 'PyInstanceDict'


# ``object.__reduce__`` answers a SYMBOL (``___NotImplemented___``) when a
# class opts out of the pickle protocol.  Symbol is a str subclass here, so
# ``isinstance(rv, str)`` alone reads that opt-out as the protocol's "I am the
# global named by this string" form and hands back every plain instance
# uncopied -- which is exactly the bug this module had.
#
# The discriminator is the EXACT type: a genuine "I am this global" reduce
# answers a real ``str``, the opt-out answers a ``Symbol``.  Comparing the
# sentinel's TEXT does not work -- ``str(rv) == '___NotImplemented___'`` is
# False for the Symbol.
def _is_global_name(rv):
    """True only for a real ``str`` -- never for the opt-out Symbol."""
    return type(rv).__name__ == 'str'


def _reduce_of(obj):
    """*obj*'s own pickle-protocol answer, or None when it has none.

    Call this AT MOST ONCE per object per copy: a user ``__reduce__`` may have
    side effects, and test_copy's test_deepcopy_reduce asserts it runs exactly
    once.

    Answers either a string (the "I am this global" form) or a tuple (the
    "rebuild me" form); the opt-out sentinel becomes None.
    """
    try:
        rv = obj.__reduce__()
    except BaseException:
        return None
    if isinstance(rv, str):
        return rv if _is_global_name(rv) else None
    return rv


def _rebindable_method(obj):
    """True for a bound method whose RECEIVER is an ordinary instance -- the
    only case where deep-copying should re-look-up the method on the copy.

    The receiver test is load-bearing, not belt-and-braces.  A plain function
    is a BoundMethod here too, with the MODULE as its ``__self__``; CPython
    treats functions as atoms (``deepcopy(f) is f``), and rebinding one
    produced a fresh object that broke that identity.  Requiring the receiver
    to be an ordinary instance -- exactly the thing deepcopy will replace with
    a copy -- admits ``f.b = f.m`` and excludes module-level functions.
    """
    if not (hasattr(obj, '__self__') and hasattr(obj, '__name__')):
        return False
    try:
        return _state_is_dict(obj.__self__)
    except BaseException:
        return False


def _bare_instance(cls):
    """A fresh instance of *cls* with ``__init__`` not run -- what CPython's
    reconstructor does.  ``object.__new__`` is the form that dispatches
    reliably here; ``cls.__new__(cls)`` hits descriptor edge cases (see the
    note at the top of dataclasses.py)."""
    return object.__new__(cls)


def copy(obj):
    """Shallow copy.  Tries ``obj.__copy__()'' first; falls through
    to container-specific shallow copies."""
    # A CLASS is an atom, as in CPython.  This must come BEFORE the __copy__
    # probe: a class INHERITS its instances' __copy__, so ``hasattr`` finds it
    # and the call goes through unbound -- "unbound method '__copy__' must be
    # called with an instance as the first argument".  Enum is exactly that
    # shape, since enum members declare __copy__ to stay singletons.
    if isinstance(obj, type):
        return obj
    if hasattr(obj, '__copy__'):
        return obj.__copy__()
    t = type(obj)
    if t is list:
        return list(obj)
    if t is tuple:
        return tuple(obj)
    if t is dict:
        return dict(obj)
    if t is set:
        return set(obj)
    if t is frozenset:
        return frozenset(obj)
    if t is bytearray:
        return bytearray(obj)
    # A dict/list SUBCLASS without its own __copy__ (Counter, OrderedDict,
    # ...) -- reconstruct via the subclass's own constructor rather than
    # falling to the atom passthrough below, which would return ``obj``
    # itself instead of an independent copy.
    if isinstance(obj, dict):
        return t(obj)
    if isinstance(obj, list):
        return t(obj)
    # A bytes/bytearray SUBCLASS is not an atom: CPython rebuilds it through
    # __reduce_ex__, producing a distinct object of the same type that carries
    # the instance attributes.  (An EXACT bytes falls through to the atom
    # passthrough below, which is what CPython does for immutables.)
    if isinstance(obj, (bytes, bytearray)):
        result = t(obj)
        _copy_attrs(obj, result, None)
        return result
    # An ORDINARY INSTANCE whose whole state is its __dict__.  CPython gets
    # here through __reduce_ex__ and reconstructs; Grail can recognise the
    # shape outright, so build a bare instance of the SAME class (subclass
    # included) and carry the attributes across.  __init__ is deliberately not
    # run: copying must not repeat construction side effects.
    if _is_global_name(_reduce_of(obj)):
        # "I am the global named by this string" -- identity, not a copy.
        return obj
    if _state_is_dict(obj):
        result = _bare_instance(t)
        _copy_attrs(obj, result, None)
        return result
    # Atoms (int, str, None, ...) — copy returns the same object.
    return obj


def _instance_attrs(obj):
    """The instance-attribute mapping of *obj*, or None when it has none."""
    try:
        d = obj.__dict__
    except AttributeError:
        return None
    return d


def _copy_attrs(src, dst, memo):
    """Carry src's instance attributes onto dst, deep-copying when *memo*
    is not None."""
    d = _instance_attrs(src)
    if not d:
        return
    for k in list(d.keys()):
        v = d[k]
        setattr(dst, k, v if memo is None else deepcopy(v, memo))


def replace(obj, /, **changes):
    """PEP 8046 ``copy.replace`` (Python 3.13+): return a copy of *obj*
    with the named attributes replaced.  CPython dispatches to
    ``type(obj).__replace__(obj, **changes)``; Grail honors that dunder
    when present, then falls back to a ``.replace(**changes)`` method,
    which the native date/time/datetime immutables already provide."""
    cls = obj.__class__
    func = getattr(cls, '__replace__', None)
    if func is not None:
        return func(obj, **changes)
    meth = getattr(obj, 'replace', None)
    if meth is None:
        raise TypeError("replace() does not support %s objects"
                        % cls.__name__)
    return meth(**changes)


def _keep_alive(obj, memo):
    """Keep *obj* alive until this deepcopy finishes (CPython copy._keep_alive).

    Stored under id(memo) -- an int key, so it cannot collide with a caller's
    key, and the memo itself is alive throughout, so ITS id is never recycled.
    """
    try:
        memo[id(memo)].append(obj)
    except KeyError:
        memo[id(memo)] = [obj]


def deepcopy(obj, memo=None):
    """Recursive copy.  Honors ``__deepcopy__'' dunder for opt-in
    custom semantics; otherwise walks lists / tuples / dicts / sets
    recursively.  Identity cycle protection via the ``memo'' dict
    matches CPython's signature so call sites that thread memo
    through (``__deepcopy__(self, memo)'') work."""
    if memo is None:
        memo = {}
    obj_id = id(obj)
    if obj_id in memo:
        return memo[obj_id]
    # Hold a reference to obj for the rest of this copy.  The memo is keyed by
    # id(), and Grail hands out id slots from a table that is RECYCLED once an
    # object is collected -- so a temporary that dies mid-copy (the
    # ``list(args)'' in the pickle-protocol branch below is exactly one) can
    # pass its id on to a later object, whose lookup then hits the dead entry
    # and returns an unrelated copy.  That is how deepcopy of
    # ``partial(f, ['asdf'])'' could answer [[<BoundMethod>]] for ['asdf']
    # (test_functools.TestPartialC.test_deepcopy) -- rarely, and only with the
    # right allocation pattern ahead of it.  CPython's copy.py keeps the same
    # list, for the same reason.
    _keep_alive(obj, memo)
    # A CLASS is an atom -- see the matching guard in copy(), which must
    # likewise precede the dunder probe so an inherited __deepcopy__ is not
    # called unbound on the class itself.
    if isinstance(obj, type):
        memo[obj_id] = obj
        return obj
    if hasattr(obj, '__deepcopy__'):
        result = obj.__deepcopy__(memo)
        memo[obj_id] = result
        return result
    t = type(obj)
    if t is list:
        result = []
        memo[obj_id] = result
        for item in obj:
            result.append(deepcopy(item, memo))
        return result
    if t is tuple:
        items = [deepcopy(item, memo) for item in obj]
        # CPython answers the ORIGINAL tuple when no element needed copying:
        # a tuple is immutable, so a fresh one would differ only in identity,
        # and code that checks ``is`` sees a spurious change.  Building
        # unconditionally also copied ``(1, 2)``.
        result = obj
        for i in range(len(items)):
            if items[i] is not obj[i]:
                result = tuple(items)
                break
        memo[obj_id] = result
        return result
    if t is dict:
        result = {}
        memo[obj_id] = result
        for k in obj:
            result[deepcopy(k, memo)] = deepcopy(obj[k], memo)
        return result
    if t is set:
        result = set()
        memo[obj_id] = result
        for item in obj:
            result.add(deepcopy(item, memo))
        return result
    if t is frozenset:
        result = frozenset(deepcopy(item, memo) for item in obj)
        memo[obj_id] = result
        return result
    if t is bytearray:
        result = bytearray(obj)
        memo[obj_id] = result
        return result
    if t is slice:
        # A slice is immutable, but its start/stop/step may be mutable
        # (test_slice test_deepcopy's ``slice([1,2],[3,4],[5,6])'') -- rebuild
        # a NEW slice over deep-copied fields so the copy is a distinct object
        # with distinct fields.  Without this, the atom passthrough below
        # returned the same slice (assertIsNot failed).
        result = slice(deepcopy(obj.start, memo),
                       deepcopy(obj.stop, memo),
                       deepcopy(obj.step, memo))
        memo[obj_id] = result
        return result
    # A dict/list SUBCLASS without its own __deepcopy__ -- same rationale
    # as the isinstance fallback in copy() above.
    if isinstance(obj, dict):
        result = t()
        memo[obj_id] = result
        for k in obj:
            result[deepcopy(k, memo)] = deepcopy(obj[k], memo)
        return result
    if isinstance(obj, list):
        result = t()
        memo[obj_id] = result
        for item in obj:
            result.append(deepcopy(item, memo))
        return result
    # A frozenset/set SUBCLASS without its own __deepcopy__.  Checked before
    # the atom passthrough, which would otherwise return ``obj`` itself (same
    # id) instead of an independent copy.  frozenset first: it is immutable, so
    # it is rebuilt in one shot from the deep-copied items; a set subclass is
    # pre-registered empty (cycle-safe) then populated via .add.
    if isinstance(obj, frozenset):
        result = t(deepcopy(item, memo) for item in obj)
        memo[obj_id] = result
        return result
    if isinstance(obj, set):
        result = t()
        memo[obj_id] = result
        for item in obj:
            result.add(deepcopy(item, memo))
        return result
    # bytes/bytearray SUBCLASS -- see the matching branch in copy().
    if isinstance(obj, (bytes, bytearray)):
        result = t(obj)
        memo[obj_id] = result
        _copy_attrs(obj, result, memo)
        return result
    # An object that implements the PICKLE protocol.  CPython reaches every
    # unrecognised object this way; Grail only takes the branch for one that
    # answers a usable __reduce__, because reconstructing an object whose
    # state is NOT its __dict__ from its __dict__ would mangle it -- worse
    # than the aliasing below.  functools.partial is exactly that shape: it
    # keeps func/args/keywords out of __dict__ on purpose, and says so
    # through __reduce__.
    #
    # object's default __reduce__ answers a NotImplemented sentinel rather
    # than a tuple, so a plain instance falls through unchanged.  Its state
    # is deep-copied BEFORE __setstate__ sees it -- that is the whole point:
    # deepcopy(f).attr must not be f.attr.
    # Consulted ONCE per object: a user __reduce__ may have side effects, and
    # test_copy's test_deepcopy_reduce counts the calls.
    rv = _reduce_of(obj)
    if _is_global_name(rv):
        # The pickle protocol's "I am the global named by this string" form.
        # A named global has exactly one instance, so the answer is identity.
        memo[obj_id] = obj
        return obj
    reduced = _usable_reduction(rv)
    if reduced is not None:
        factory, args, state = reduced
        result = factory(*deepcopy(list(args), memo))
        memo[obj_id] = result
        if state is not None:
            setter = getattr(result, '__setstate__', None)
            if setter is not None:
                setter(deepcopy(state, memo))
            else:
                _copy_attrs(obj, result, memo)
        return result
    # An ORDINARY INSTANCE whose whole state is its __dict__ -- the shape the
    # atom passthrough below used to swallow, handing back obj itself.  The
    # "state IS its __dict__" predicate this needed now exists: see
    # _state_is_dict, which keys off the __dict__'s TYPE rather than its
    # presence, so classes, modules and native wrappers stay out of it.
    #
    # Registered in the memo BEFORE recursing, so a self-referential object
    # (obj.self = obj) terminates and its copy points at the copy.
    #
    # A BOUND METHOD must REBIND to the deep-copied receiver, which is what
    # makes ``deepcopy(f).b.__self__ is deepcopy(f)'' hold when an instance
    # stores one of its own methods (``f.b = f.m'').  The receiver is already
    # in the memo by the time its attributes are walked, so this resolves to
    # the copy rather than building a second one.
    if _rebindable_method(obj):
        result = getattr(deepcopy(obj.__self__, memo), obj.__name__)
        memo[obj_id] = result
        return result
    if _state_is_dict(obj):
        result = _bare_instance(t)
        memo[obj_id] = result
        _copy_attrs(obj, result, memo)
        return result
    # Atoms — deepcopy returns the same object.
    memo[obj_id] = obj
    return obj


def _usable_reduction(rv):
    """``(factory, args, state)`` from a pickle-protocol answer, or None.

    Takes the ALREADY-OBTAINED answer (see _reduce_of) rather than calling
    __reduce__ itself, so a user __reduce__ with side effects runs once.
    None for anything not of the rebuildable tuple shape.
    """
    if not isinstance(rv, tuple) or len(rv) < 2:
        return None
    factory, args = rv[0], rv[1]
    if not callable(factory) or not isinstance(args, tuple):
        return None
    state = rv[2] if len(rv) > 2 else None
    return factory, args, state
