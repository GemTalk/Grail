# Grail copy module — minimal stub.
#
# Provides ``copy'' (shallow) and ``deepcopy'' (recursive) over
# the common containers werkzeug touches.  CPython's full copy
# module is ~250 lines and handles dispatch via ``__copy__'' /
# ``__deepcopy__'' dunders + a registry — this stub honors the
# dunders (so a class with a ``__deepcopy__'' opt-out works) and
# recurses by container type.  Add cases as callers surface.


def copy(obj):
    """Shallow copy.  Tries ``obj.__copy__()'' first; falls through
    to container-specific shallow copies."""
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
        result = tuple(deepcopy(item, memo) for item in obj)
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
    # Atoms — deepcopy returns the same object.
    memo[obj_id] = obj
    return obj
