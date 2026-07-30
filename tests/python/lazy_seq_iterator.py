# Fixture for IteratorTestCase>>testLazyGetitemSeqIterator.
#
# CPython's legacy sequence protocol: iter(x) for an object with __getitem__
# but no __iter__ returns a LAZY iterator that calls x.__getitem__(index) one
# index at a time (from 0) per next(), stopping on IndexError.
#
# Regression for bug #2 (the deeper half of the test_iter CRASH): Grail's
# PythonInstance>>__iter__ used to walk __getitem__ into an OrderedCollection
# EAGERLY, so an UNBOUNDED __getitem__ (a value for every index) spun forever
# and OOM-killed the session.  Merely LOADING this fixture proves laziness:
# Unbounded's __getitem__ never raises IndexError, so an eager walk would OOM
# before RESULTS is even built.


class Unbounded:
    def __getitem__(self, i):
        return i * 10


class Bounded:
    def __getitem__(self, i):
        if i < 3:
            return i
        raise IndexError


def _unbounded_take3():
    it = iter(Unbounded())          # eager -> OOM; lazy -> fine
    return [next(it), next(it), next(it)] == [0, 10, 20]


def _setstate_negative_clamps():
    it = iter(Unbounded())
    it.__setstate__(-42)            # CPython clamps a negative index to 0
    return [next(it), next(it)] == [0, 10]


def _bounded_iterates_fully():
    return list(Bounded()) == [0, 1, 2]


def _bounded_for_loop():
    out = []
    for x in Bounded():
        out.append(x)
    return out == [0, 1, 2]


RESULTS = {
    'unbounded_take3': _unbounded_take3(),
    'setstate_negative_clamps': _setstate_negative_clamps(),
    'bounded_iterates_fully': _bounded_iterates_fully(),
    'bounded_for_loop': _bounded_for_loop(),
}
