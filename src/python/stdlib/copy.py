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
    # A dict/list SUBCLASS without its own __copy__ (Counter, OrderedDict,
    # ...) -- reconstruct via the subclass's own constructor rather than
    # falling to the atom passthrough below, which would return ``obj``
    # itself instead of an independent copy.
    if isinstance(obj, dict):
        return t(obj)
    if isinstance(obj, list):
        return t(obj)
    # Atoms (int, str, None, ...) — copy returns the same object.
    return obj


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
    # Atoms — deepcopy returns the same object.
    memo[obj_id] = obj
    return obj
