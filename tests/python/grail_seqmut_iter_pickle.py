# Fixture for BuiltinsTestCase>>testMutatingSeqClassIterPickle.
#
# test_iter's test_mutating_seq_class_iter_pickle pickles the tuple
# (iterator, sequence) together, so the reloaded iterator's source IS the
# reloaded sequence (shared via the pickle memo): growing seq.n after the
# round-trip extends a LIVE iterator, but an EXHAUSTED iterator stays spent
# (CPython clears it_seq, reducing to iter(())).
import pickle
import collections.abc


class SequenceClass:
    def __init__(self, n):
        self.n = n

    def __getitem__(self, i):
        if 0 <= i < self.n:
            return i
        else:
            raise IndexError


def check():
    orig = SequenceClass(5)
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        # initial iterator: shares source with orig, so seq.n = 7 extends it
        itorig = iter(orig)
        d = pickle.dumps((itorig, orig), proto)
        it, seq = pickle.loads(d)
        seq.n = 7
        if type(it) is not type(itorig):
            return False
        if list(it) != list(range(7)):
            return False

        # running iterator
        next(itorig)
        d = pickle.dumps((itorig, orig), proto)
        it, seq = pickle.loads(d)
        seq.n = 7
        if type(it) is not type(itorig):
            return False
        if list(it) != list(range(1, 7)):
            return False

        # positioned at the end but not yet spent
        for i in range(1, 5):
            next(itorig)
        d = pickle.dumps((itorig, orig), proto)
        it, seq = pickle.loads(d)
        seq.n = 7
        if type(it) is not type(itorig):
            return False
        if list(it) != list(range(5, 7)):
            return False

        # exhausted iterator: spent forever, growing seq must not revive it
        try:
            next(itorig)
            return False
        except StopIteration:
            pass
        d = pickle.dumps((itorig, orig), proto)
        it, seq = pickle.loads(d)
        seq.n = 7
        if not isinstance(it, collections.abc.Iterator):
            return False
        if list(it) != []:
            return False

    return True
