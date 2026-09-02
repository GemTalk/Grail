"""Generic (shallow and deep) copying operations.

Interface summary:

        import copy

        x = copy.copy(y)                # make a shallow copy of y
        x = copy.deepcopy(y)            # make a deep copy of y
        x = copy.replace(y, a=1, b=2)   # new object with fields replaced, as defined by `__replace__`

For module specific errors, copy.Error is raised.

The difference between shallow and deep copying is only relevant for
compound objects (objects that contain other objects, like lists or
class instances).

- A shallow copy constructs a new compound object and then (to the
  extent possible) inserts *the same objects* into it that the
  original contains.

- A deep copy constructs a new compound object and then, recursively,
  inserts *copies* into it of the objects found in the original.

Two problems often exist with deep copy operations that don't exist
with shallow copy operations:

 a) recursive objects (compound objects that, directly or indirectly,
    contain a reference to themselves) may cause a recursive loop

 b) because deep copy copies *everything* it may copy too much, e.g.
    administrative data structures that should be shared even between
    copies

Python's deep copy operation avoids these problems by:

 a) keeping a table of objects already copied during the current
    copying pass

 b) letting user-defined classes override the copying operation or the
    set of components copied

This version does not copy types like module, class, function, method,
nor stack trace, stack frame, nor file, socket, window, nor any
similar types.

Classes can use the same interfaces to control copying that they use
to control pickling: they can define methods called __getinitargs__(),
__getstate__() and __setstate__().  See the documentation for module
"pickle" for information on these methods.

GRAIL: this is CPython's copy module rather than a reimplementation.  It
replaces a hand-written stub that dispatched by container type and knew
nothing of the reduction protocol -- which is what test_copy spends most of
its length exercising.

The adaptations are all marked GRAIL below.  The one worth reading first is
_types_of: a Grail builtin is not always the class its Python NAME resolves
to, and CPython's atomic sets and dispatch tables are keyed by exact type
identity, so naming them alone silently misses whole categories of value.
"""

import types
import weakref
# GRAIL DEVIATION from upstream, which spells this
# ``from copyreg import dispatch_table''.  That binds the DICTIONARY at import
# time, and a deployed copy.py then reads the deploy session's dictionary
# forever while copyreg.pickle() writes this session's -- so a registration was
# silently invisible here (docs/Persistent_Modules_and_Classes.md par.4.3).
# Reading it through the module each time is behaviourally identical in CPython,
# where there is only ever one dictionary.
import copyreg


class Error(Exception):
    pass


error = Error   # backward compatibility

__all__ = ["Error", "copy", "deepcopy", "replace"]


def _newobj(cls, *args):
    """copyreg.__newobj__ -- the reconstructor CPython names in a protocol-2
    reduction.  Spelled out here rather than imported because copy calls it
    directly and never has to put its name on a wire.

    A TypeError from here is not caught: copy.copy of a class whose __new__
    demands arguments is documented to raise it (test_copy_registry asks for
    exactly that before registering a reductor)."""
    return cls.__new__(cls, *args)


def _newobj_bare(cls):
    """GRAIL: allocate an EMPTY instance of a built-in container subclass.

    Such a class's __new__ takes the initial CONTENTS here, so
    ``list.__new__(LS)`` reads the class itself as an iterable and raises.
    object.__new__ gives the empty instance the reduction wants; the items
    arrive separately through listitems / dictitems."""
    return object.__new__(cls)


def _newobj_ex(cls, args, kwargs):
    """copyreg.__newobj_ex__, for a __getnewargs_ex__ reduction."""
    return cls.__new__(cls, *args, **kwargs)


def _new_args_of(x):
    """GRAIL: CPython's __getnewargs_ex__ / __getnewargs__ pair, as
    (args, kwargs).

    These carry the value of an immutable builtin's subclass: its state lives
    in the constructor, so rebuilding means calling __new__ with it."""
    getnewargs_ex = getattr(x, '__getnewargs_ex__', None)
    if getnewargs_ex is not None:
        args, kwargs = getnewargs_ex()
        return tuple(args), dict(kwargs)
    getnewargs = getattr(x, '__getnewargs__', None)
    if getnewargs is not None:
        return tuple(getnewargs()), {}
    return (), {}


_no_contents = object()


def _builtin_contents(x, newargs):
    """GRAIL: the constructor argument for a built-in subclass whose value
    lives in the constructor, or _no_contents.

    Only for the kinds the default reduction cannot carry: a set's elements
    and a bytes / bytearray / str subclass's content.  A class that supplies
    its own __getnewargs__ is left alone -- it has said how to rebuild
    itself."""
    if newargs:
        return _no_contents
    if isinstance(x, (set, frozenset)):
        return list(x)
    if isinstance(x, (bytes, bytearray)):
        # Plain BYTES either way, including for a bytearray: the deep path
        # copies the reconstructor's arguments, so handing back a value of
        # the same type would copy that, and again, forever.  bytes is
        # atomic, and bytearray(b'...') rebuilds from it.
        return bytes(x)
    if isinstance(x, str):
        return str(x)
    return _no_contents


def _reduce_for_copy(x, cls):
    """GRAIL: the reduction tuple for x, in CPython's protocol-2 shape.

    CPython reaches the protocol through ``x.__reduce_ex__(4)``, and Grail's
    object.__reduce_ex__ answers NotImplemented on purpose: pickle.py depends
    on that answer to take its own generic path, because a Grail module
    function is a BoundMethod with no __module__ and so cannot be pickled by
    reference.  That reasoning is about PICKLING; a copy calls the
    reconstructor in-process and never names it, so when the object supplies
    no reduction of its own this builds the one object.__reduce_ex__(2)
    would have."""
    reductor = copyreg.dispatch_table.get(cls)
    if reductor is not None:
        return reductor(x)

    saw_reductor = False
    reductor = getattr(x, "__reduce_ex__", None)
    if reductor is not None:
        saw_reductor = True
        rv = reductor(4)
        if rv is not NotImplemented and rv is not None:
            return rv
    reductor = getattr(x, "__reduce__", None)
    if reductor is not None:
        saw_reductor = True
        rv = reductor()
        if rv is not NotImplemented and rv is not None:
            return rv
    if not saw_reductor:
        # Neither reductor is reachable -- a __getattribute__ that hides them
        # is how a class declares itself uncopyable, and CPython reports that
        # as copy.Error rather than inventing a reduction.
        raise Error("un(shallow)copyable object of type %s" % (cls,))

    # The default, as object.__reduce_ex__(2) computes it.
    args, kwargs = _new_args_of(x)
    contents = _builtin_contents(x, args)
    if kwargs:
        func, fargs = _newobj_ex, (cls, args, kwargs)
    elif contents is not _no_contents:
        # GRAIL: rebuild through the CLASS with the contents, which is the
        # shape CPython's set.__reduce__ uses -- ``(cls, (list(self),),
        # state)``.  The default allocator cannot serve these: a set's
        # elements have no listitems/dictitems slot to travel in, and a
        # bytes subclass's __new__ reads its argument as the value, so
        # cls.__new__(cls) handed it the class.
        func, fargs = cls, (contents,)
    elif not args and isinstance(x, (list, dict)):
        func, fargs = _newobj_bare, (cls,)
    else:
        func, fargs = _newobj, (cls,) + args

    getstate = getattr(x, '__getstate__', None)
    state = getstate() if getstate is not None else None

    # A list or dict SUBCLASS carries its items outside __dict__, so the
    # reduction reports them separately and _reconstruct replays them.
    listitems = iter(x) if isinstance(x, list) else None
    dictitems = iter(x.items()) if isinstance(x, dict) else None
    return (func, fargs, state, listitems, dictitems)


def copy(x):
    """Shallow copy operation on arbitrary Python objects.

    See the module's __doc__ string for more info.
    """

    cls = type(x)

    if cls in _copy_atomic_types:
        return x
    if cls in _copy_builtin_containers:
        return cls.copy(x)

    if issubclass(cls, type):
        # treat it as a regular class:
        return x

    # GRAIL: probe the INSTANCE, the way the __deepcopy__ branch below
    # already does.  CPython looks on the type so an instance attribute
    # cannot hijack the dunder, but a class-side read here answers None for
    # a method on a non-PythonInstance class (re's SrePattern) and a
    # class-BOUND wrapper for others -- calling which passes the class as
    # self, so UserDict.__copy__ read the CLASS's __dict__ and failed deep
    # inside.  Binding to x is what both cases actually need.
    copier = getattr(x, "__copy__", None)
    if copier is not None:
        return copier()

    rv = _reduce_for_copy(x, cls)

    if isinstance(rv, str):
        return x
    return _reconstruct(x, None, *rv)


def _type_set(*thunks):
    """GRAIL: the named types, skipping any this build does not expose.

    CPython names them as bare globals.  Grail resolves most but not all of
    them -- ``super'' is not bound as a value -- and a NameError while
    importing copy would take out every module that imports it."""
    out = set()
    for t in thunks:
        try:
            out.add(t())
        except BaseException:
            pass
    return out


class _Probe(object):
    """GRAIL: a sample object whose derived values expose Grail's real
    classes -- its __dict__ for the instance-dict view, a live referent for
    weakref, and ``_Probe.method'' for the unbound-method class."""

    def method(self):
        pass


_probe = _Probe()

_BOUND_METHOD_TYPE = type(_probe.method)
# Bound at module scope: a deployed module's function body does not resolve the
# module's own imports (which is why _type_set swallows a NameError per thunk),
# so ``types.ModuleType'' inside _grail_needs_method_rebind would not resolve.
_MODULE_TYPE = types.ModuleType


def _grail_needs_method_rebind(x):
    """GRAIL: is ``x'' a method bound to an INSTANCE that deepcopy must rebind?

    Grail models a module-level function, a bound method, a classmethod and a
    built-in's bound method with ONE concrete class, so the exact-type keying
    CPython's atomic set and deepcopy dispatch rely on cannot tell them apart
    -- and because a plain function has to stay atomic, a bound method was
    handed back as-is, still pointing at the ORIGINAL receiver
    (test_copy.py's test_deepcopy_bound_method: ``g.b.__self__ is g'').

    Discriminate on the RECEIVER instead, which does differ: a function is
    bound to its MODULE, a classmethod / staticmethod to a CLASS, and a
    built-in method to a value whose own type deepcopy already treats as
    atomic or copies itself (``[].append'' -- atomic in CPython, where it is
    a builtin_function_or_method).  What is left is the instance-bound form,
    which is exactly CPython's MethodType."""
    if type(x) is not _BOUND_METHOD_TYPE:
        return False
    obj = getattr(x, '__self__', None)
    if obj is None or isinstance(obj, (_MODULE_TYPE, type)):
        return False
    cls = type(obj)
    return cls not in _atomic_types and cls not in _deepcopy_dispatch


def _types_of(*values):
    """GRAIL: the concrete runtime types of sample values.

    A Grail builtin is not always the class its Python NAME resolves to.  A
    str spans Unicode7 / Unicode16 / Unicode32 under CharacterCollection, so
    ``type('') is str`` is False; NotImplemented is a Symbol; a weakref is a
    WeakReference; a property is a PropertyDescriptor.  CPython's atomic sets
    and deepcopy dispatch are keyed by exact type IDENTITY, so naming the
    types alone misses every one of those.

    The miss is not a wrong answer, it is an unbounded recursion: the value
    falls through to the reduction path, __getnewargs__ hands the same value
    back as the constructor argument, and _reconstruct copies that argument,
    forever.  Keying on the real classes is what stops it.

    Samples rather than class names, so a build that splits a type
    differently is still right."""
    out = set()
    for v in values:
        try:
            out.add(type(v))
        except BaseException:
            pass
    return out


def _grail_string_samples():
    """Every class a Python str can be here.

    Grail spreads str across several Smalltalk classes -- the Unicode widths
    for literals, and a byte String for one produced by ``Symbol asString'',
    which is how an instance __dict__ hands back its keys.  They all report
    ``str'' as their __name__, so the difference is invisible until an
    identity-keyed table misses one.

    Missing one is not a wrong answer but an unbounded recursion: the string
    falls through to the reduction path, __getnewargs__ hands the same string
    back, and _reconstruct copies it again.  That is exactly what happened to
    the keys of a reconstructed __dict__, and it is why the samples are
    DERIVED (from a real instance dict, a concatenation, a repr) rather than
    written as three literals."""
    _probe.sample_attr = 1
    keys = list(_probe.__dict__.keys())
    return tuple(keys) + ('', '\xe9', '\U0001D11E', 'a' + 'b', repr(1),
                          str(1), 'A'.lower())


def _grail_shared_atomic_samples():
    """Values atomic to BOTH copy and deepcopy -- CPython's two sets agree on
    these."""
    return _grail_string_samples() + (
            b'', 1, 1.5, True, 1j, range(1),
            None, NotImplemented, Ellipsis, weakref.ref(_probe),
            (lambda: None).__code__, property(lambda s: 0),
            _newobj, lambda: None, _Probe.method, _probe.method)


def _grail_shallow_only_atomic_samples():
    """Atomic to SHALLOW copy only.

    CPython's two sets differ here and the difference is load-bearing: a
    tuple, frozenset or slice is returned as-is by copy(), but deepcopy has
    to copy its MEMBERS.  Folding them together made deepcopy hand back the
    original -- test_set's deep-copy tests and test_slice's test_deepcopy."""
    return ((), frozenset(), slice(1))


_copy_atomic_types = _type_set(
    lambda: types.NoneType, lambda: int, lambda: float, lambda: bool,
    lambda: complex, lambda: str, lambda: tuple, lambda: bytes,
    lambda: frozenset, lambda: type, lambda: range, lambda: slice,
    lambda: property, lambda: types.BuiltinFunctionType,
    lambda: types.EllipsisType, lambda: types.NotImplementedType,
    lambda: types.FunctionType, lambda: types.CodeType,
    lambda: weakref.ref, lambda: super)
_copy_atomic_types |= _types_of(*_grail_shared_atomic_samples())
_copy_atomic_types |= _types_of(*_grail_shallow_only_atomic_samples())
_copy_builtin_containers = _type_set(
    lambda: list, lambda: dict, lambda: set, lambda: bytearray)


def deepcopy(x, memo=None, _nil=[]):
    """Deep copy operation on arbitrary Python objects.

    See the module's __doc__ string for more info.
    """

    cls = type(x)

    if cls in _atomic_types and not _grail_needs_method_rebind(x):
        return x

    d = id(x)
    if memo is None:
        memo = {}
    else:
        y = memo.get(d, _nil)
        if y is not _nil:
            return y

    copier = _deepcopy_dispatch.get(cls)
    if copier is not None:
        y = copier(x, memo)
    else:
        if issubclass(cls, type):
            y = x  # atomic copy
        else:
            copier = getattr(x, "__deepcopy__", None)
            if copier is not None:
                y = copier(memo)
            else:
                rv = _reduce_for_copy(x, cls)
                if isinstance(rv, str):
                    y = x
                else:
                    y = _reconstruct(x, memo, *rv)

    # If is its own copy, don't memoize.
    if y is not x:
        memo[d] = y
        _keep_alive(x, memo)  # Make sure x lives at least as long as d
    return y


_atomic_types = _type_set(
    lambda: types.NoneType, lambda: types.EllipsisType,
    lambda: types.NotImplementedType, lambda: int, lambda: float,
    lambda: bool, lambda: complex, lambda: bytes, lambda: str,
    lambda: types.CodeType, lambda: type, lambda: range,
    lambda: types.BuiltinFunctionType, lambda: types.FunctionType,
    lambda: weakref.ref, lambda: property)
_atomic_types |= _types_of(*_grail_shared_atomic_samples())

_deepcopy_dispatch = d = {}


def _deepcopy_list(x, memo):
    y = []
    memo[id(x)] = y
    append = y.append
    for a in x:
        append(deepcopy(a, memo))
    return y


d[list] = _deepcopy_list


def _deepcopy_tuple(x, memo):
    y = [deepcopy(a, memo) for a in x]
    # We're not going to put the tuple in the memo, but it's still important we
    # check for it, in case the tuple contains recursive mutable structures.
    try:
        return memo[id(x)]
    except KeyError:
        pass
    for k, j in zip(x, y):
        if k is not j:
            y = tuple(y)
            break
    else:
        y = x
    return y


d[tuple] = _deepcopy_tuple


def _deepcopy_dict(x, memo):
    y = {}
    memo[id(x)] = y
    for key, value in x.items():
        y[deepcopy(key, memo)] = deepcopy(value, memo)
    return y


d[dict] = _deepcopy_dict


def _deepcopy_method(x, memo):  # Copy instance methods
    obj = deepcopy(x.__self__, memo)
    if obj is x.__self__:
        return x
    # GRAIL: a BoundMethod is (receiver, selector), not (func, self), so
    # CPython's ``type(x)(x.__func__, obj)'' has no constructor to reach --
    # BoundMethod() rejects the two arguments.  Reading the same attribute off
    # the COPIED receiver is what that constructor amounts to, and it yields a
    # real BoundMethod, so the rebound method still compares equal to a fresh
    # read (test_copy.py asserts ``g.m == g.b'').
    name = getattr(x, '__name__', None)
    if name is not None:
        try:
            return getattr(obj, name)
        except AttributeError:
            pass
    return type(x)(x.__func__, obj)


d[types.MethodType] = _deepcopy_method

# GRAIL: the same keying problem as the atomic sets -- register the concrete
# runtime classes too, so a literal reaches its copier.
d[type([])] = _deepcopy_list
d[type(())] = _deepcopy_tuple
d[type({})] = _deepcopy_dict
# The bound-method class, which a plain function shares: only the calls
# _grail_needs_method_rebind admits get this far (a function short-circuits
# on the atomic set above), so registering it does not make functions
# non-atomic.
d[_BOUND_METHOD_TYPE] = _deepcopy_method

del d

_INSTANCE_DICT_TYPE = type(_probe.__dict__)


def _plain_state(state):
    """GRAIL: a state that is an instance's __dict__ VIEW, as a real dict.

    CPython's __dict__ IS a dict, so ``return (C, (), self.__dict__)`` hands
    back something deepcopy walks as a mapping.  Here it is a live view whose
    own reduction answers itself, so copying it directly does not terminate.
    Materialising it is what CPython effectively passes anyway, and it also
    stops the copy from writing through to the ORIGINAL instance."""
    if type(state) is _INSTANCE_DICT_TYPE:
        return dict(state.items())
    return state


def _keep_alive(x, memo):
    """Keeps a reference to the object x in the memo.

    Because we remember objects by their id, we have
    to assure that possibly temporary objects are kept
    alive by referencing them.
    We store a reference at the id of the memo, which should
    normally not be used unless someone tries to deepcopy
    the memo itself...
    """
    try:
        memo[id(memo)].append(x)
    except KeyError:
        # aha, this is the first one :-)
        memo[id(memo)] = [x]


def _reconstruct(x, memo, func, args,
                 state=None, listiter=None, dictiter=None):
    deep = memo is not None
    if deep and args:
        args = tuple(deepcopy(arg, memo) for arg in args)
    y = func(*args)
    if deep:
        memo[id(x)] = y

    if state is not None:
        state = _plain_state(state)
        if deep:
            state = deepcopy(state, memo)
        # GRAIL: y is HALF-BUILT here -- allocated but not yet given its
        # state -- and a class whose attribute machinery reads that state
        # (UserDict's __getattr__ reaches for self.data) raises from the
        # probe itself.  CPython's hasattr swallows only AttributeError;
        # a partially built Grail object can fail in other ways.
        try:
            setstate = getattr(y, '__setstate__', None)
        except BaseException:
            setstate = None
        if setstate is not None:
            setstate(state)
        else:
            if isinstance(state, tuple) and len(state) == 2:
                state, slotstate = state
            else:
                slotstate = None
            if state is not None:
                # GRAIL: a freshly allocated instance has no __dict__ until
                # something is stored in it, and several native types never
                # get one.  CPython can always update the mapping in place;
                # here the per-key store is what creates it.
                try:
                    target = getattr(y, '__dict__', None)
                except BaseException:
                    target = None
                if target is not None:
                    target.update(state)
                else:
                    for key, value in state.items():
                        setattr(y, key, value)
            if slotstate is not None:
                for key, value in slotstate.items():
                    setattr(y, key, value)

    if listiter is not None:
        if deep:
            for item in listiter:
                item = deepcopy(item, memo)
                y.append(item)
        else:
            for item in listiter:
                y.append(item)
    if dictiter is not None:
        if deep:
            for key, value in dictiter:
                key = deepcopy(key, memo)
                value = deepcopy(value, memo)
                y[key] = value
        else:
            for key, value in dictiter:
                y[key] = value
    return y


del types, weakref


def replace(obj, /, **changes):
    """Return a new object replacing specified fields with new values.

    This is especially useful for immutable objects, like named tuples or
    frozen dataclasses.
    """
    cls = obj.__class__
    func = getattr(cls, '__replace__', None)
    if func is not None:
        return func(obj, **changes)
    # GRAIL: fall back to a ``.replace(**changes)'' METHOD.  CPython 3.13 gave
    # date / time / datetime a __replace__ dunder alongside the method they
    # have always had; Grail's natives still have only the method, and
    # test_datetime's test_replace goes through copy.replace to reach it.
    meth = getattr(obj, 'replace', None)
    if meth is None:
        raise TypeError("replace() does not support %s objects"
                        % (cls.__name__,))
    return meth(**changes)
