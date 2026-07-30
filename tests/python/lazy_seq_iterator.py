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


import pickle


class _Attrs:
    # A plain user object with instance attributes: exercises Grail's default
    # object pickling (object.__reduce__ -> pickle.newobj + __getstate__).
    def __init__(self, a, b):
        self.a = a
        self.b = b


def _generic_object_pickle():
    # Round-trips through the default object.__reduce__ path (previously
    # "Not yet implemented: __reduce__").
    o = pickle.loads(pickle.dumps(_Attrs(7, "x")))
    return o.a == 7 and o.b == "x"


def _seq_iterator_pickle():
    # Pickle a partially-consumed seq_iterator (over a __getitem__ source):
    # unpickling must resume at the same index, which also pickles the source
    # object through the generic-object path.
    it = iter(Bounded())
    next(it)                    # consume 0
    it2 = pickle.loads(pickle.dumps(it))
    return list(it2) == [1, 2]


RESULTS = {
    'unbounded_take3': _unbounded_take3(),
    'setstate_negative_clamps': _setstate_negative_clamps(),
    'bounded_iterates_fully': _bounded_iterates_fully(),
    'bounded_for_loop': _bounded_for_loop(),
    'generic_object_pickle': _generic_object_pickle(),
    'seq_iterator_pickle': _seq_iterator_pickle(),
}
