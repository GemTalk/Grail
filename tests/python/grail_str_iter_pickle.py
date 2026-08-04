# Fixture for BuiltinsTestCase>>testStrIteratorPickle.
#
# test_iter's test_iter_string round-trips iter("abcde") through pickle at
# every protocol (check_pickle): the rebuilt object must be an Iterator,
# reproduce the full sequence, and -- after one next() -- reproduce the tail.
import pickle
import collections.abc


def check():
    seq = ["a", "b", "c", "d", "e"]
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        it0 = iter("abcde")
        d = pickle.dumps(it0, proto)
        it = pickle.loads(d)
        # CPython cannot assert type equality (str iters are their own type
        # here), but the rebuilt object must be an Iterator.
        if not isinstance(it, collections.abc.Iterator):
            return False
        if list(it) != seq:
            return False

        # advance one, then round-trip the tail
        it = pickle.loads(d)
        next(it)
        d2 = pickle.dumps(it, proto)
        it = pickle.loads(d2)
        if list(it) != seq[1:]:
            return False

    # a mid-stream iterator resumes at the right character
    it = iter("hello")
    next(it)
    next(it)
    it2 = pickle.loads(pickle.dumps(it))
    if list(it2) != ["l", "l", "o"]:
        return False

    return True
