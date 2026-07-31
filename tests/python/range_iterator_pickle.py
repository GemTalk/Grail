# Fixture for IteratorTestCase>>testRangeIteratorPickle.
#
# iter(range(...)) returns a range_iterator.  CPython pickles it as
# __reduce__ == (iter, (range(start, stop, step),), index); Grail pickles it
# with a dedicated tag carrying (start, stop, step, position) so the range is
# rebuilt and iteration resumes at the saved position.  This mirrors
# test_iter's check_pickle (the range-iterator half of test_iter_basic /
# test_iter_range / test_iter_for_loop / test_iter_big_range).

import pickle


def _fresh_roundtrips():
    # A brand-new range iterator round-trips to the full sequence.
    it = pickle.loads(pickle.dumps(iter(range(10))))
    return list(it) == list(range(10))


def _partial_resumes():
    # A partially-consumed iterator resumes at the same position.
    it = iter(range(10))
    next(it)                              # consume 0
    it2 = pickle.loads(pickle.dumps(it))
    return list(it2) == list(range(1, 10))


def _stepped_range():
    # A non-unit (and negative) step survives the round-trip.
    it = iter(range(20, 2, -3))
    seq = list(range(20, 2, -3))
    next(it)                              # consume the first element
    it2 = pickle.loads(pickle.dumps(it))
    return list(it2) == seq[1:]


def _exhausted_stays_exhausted():
    # An iterator advanced to the end pickles as a spent iterator.
    it = iter(range(3))
    for _ in range(3):
        next(it)
    it2 = pickle.loads(pickle.dumps(it))
    return list(it2) == []


def _big_range():
    # A large range does not materialize; only (start, stop, step, pos) travel.
    it = pickle.loads(pickle.dumps(iter(range(10000))))
    return list(it) == list(range(10000))


RESULTS = {
    'fresh_roundtrips': _fresh_roundtrips(),
    'partial_resumes': _partial_resumes(),
    'stepped_range': _stepped_range(),
    'exhausted_stays_exhausted': _exhausted_stays_exhausted(),
    'big_range': _big_range(),
}
