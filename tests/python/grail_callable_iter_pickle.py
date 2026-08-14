# Fixture for BuiltinsTestCase>>testCallableIteratorPickle.
#
# test_iter's test_iter_callable round-trips iter(callable, sentinel) -- a
# callable_iterator -- through pickle at every protocol (check_iterator with
# pickle=True -> check_pickle).  CPython reduces it to (iter, (callable,
# sentinel)); the callable (a CallableIterClass instance) carries its own resume
# state and pickles generically, so a mid-stream iterator resumes correctly.
import pickle
import collections.abc


class CallableIterClass:
    def __init__(self):
        self.i = 0

    def __call__(self):
        i = self.i
        self.i = i + 1
        if i > 100:
            raise IndexError  # emergency stop
        return i


def _check_pickle(itorg, seq):
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        d = pickle.dumps(itorg, proto)
        it = pickle.loads(d)
        if not isinstance(it, collections.abc.Iterator):
            return False
        if list(it) != seq:
            return False

        it = pickle.loads(d)
        try:
            next(it)
        except StopIteration:
            continue
        d = pickle.dumps(it, proto)
        it = pickle.loads(d)
        if list(it) != seq[1:]:
            return False
    return True


def check():
    seq = list(range(10))

    # the full check_iterator(pickle=True) contract: round-trip, then drain the
    # original (check_pickle must not have consumed it).
    it = iter(CallableIterClass(), 10)
    if not _check_pickle(it, seq):
        return False
    if list(it) != seq:
        return False

    # a partially-consumed iterator resumes at the right place after a round-trip
    it = iter(CallableIterClass(), 10)
    next(it)
    next(it)
    it2 = pickle.loads(pickle.dumps(it))
    if list(it2) != list(range(2, 10)):
        return False

    return True


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        check,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
