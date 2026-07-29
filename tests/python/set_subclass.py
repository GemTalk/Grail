# Fixture for SubclassCopyPickleTestCase.
#
# Exercises the set / frozenset SUBCLASS copy.deepcopy + pickle paths:
#   - copy.py's isinstance(obj, set) / isinstance(obj, frozenset) deepcopy
#     fallbacks (rebuild a distinct object of the SAME subclass),
#   - pickle.py's "y" tag for a builtin-collection subclass, and
#   - object.__getstate__ (carries the instance __dict__ through pickle).
#
# These can't be reached from the eval-based SetTestCase tests: a builtin
# subclass can't be defined in the eval: module scope (class-body #new DNU),
# so the coverage needs a real loaded module.  Kept in its OWN test class
# (SubclassCopyPickleTestCase) so the fixture COMPILE lands in a shard with
# memory headroom rather than piling onto the allocation-heavy collections
# shard (Set/Dict/Frozenset), where it flaked under 4-way parallel peak.
#
# Each check is computed here (module body) inside try/except and exposed as a
# ``*_ok'' boolean + ``*_err'' string.  A raw Python exception escaping the
# module body would run in the test's setUp -- OUTSIDE SUnit's per-test handler
# (Python exceptions aren't Smalltalk Errors) -- and crash the whole shard;
# catching it here turns any failure into an ordinary assertion failure with a
# diagnostic message instead.
import copy
import pickle


class MySet(set):
    pass


class MyFrozen(frozenset):
    pass


def _run(fn):
    """Return (ok_bool, err_string); never raises."""
    try:
        return bool(fn()), ""
    except BaseException as e:  # noqa: BLE001 - deliberately broad; see header
        return False, repr(e)


def _set_deepcopy():
    s = MySet([1, 2, 3])
    s.tag = "hi"
    dc = copy.deepcopy(s)
    # independent object, SAME subclass, equal contents
    return type(dc) is MySet and dc == s and dc is not s


def _set_pickle():
    s = MySet([1, 2, 3])
    s.tag = "hi"
    p = pickle.loads(pickle.dumps(s))
    # SAME subclass, equal contents, instance attr preserved (object.__getstate__)
    return type(p) is MySet and p == s and getattr(p, "tag", None) == "hi"


def _frozenset_deepcopy():
    f = MyFrozen([4, 5, 6])
    dc = copy.deepcopy(f)
    return type(dc) is MyFrozen and dc == f


def _frozenset_pickle():
    f = MyFrozen([4, 5, 6])
    f.label = "fz"
    p = pickle.loads(pickle.dumps(f))
    return type(p) is MyFrozen and p == f and getattr(p, "label", None) == "fz"


set_deepcopy_ok, set_deepcopy_err = _run(_set_deepcopy)
set_pickle_ok, set_pickle_err = _run(_set_pickle)
frozenset_deepcopy_ok, frozenset_deepcopy_err = _run(_frozenset_deepcopy)
frozenset_pickle_ok, frozenset_pickle_err = _run(_frozenset_pickle)
