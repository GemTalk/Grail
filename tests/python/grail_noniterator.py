# Fixture for BuiltinsTestCase>>testIterReturnedNonIterator.
#
# CPython's PyObject_GetIter verifies that the object returned by __iter__ is
# itself an iterator (defines __next__), and iter(x) raises TypeError otherwise
# (test_iter's test_new_style_iter_class).  Grail's PythonInstance carries a
# catchable-TypeError __next__ fallback on every instance, so a plain
# responds-to check would wrongly accept IterClass; the builtins.iter: fix asks
# whether __next__ is defined BELOW that fallback level.  A class that DOES
# define __next__ iterates normally.
class IterClass(object):
    def __iter__(self):
        return self


class GoodIter(object):
    def __init__(self):
        self.n = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.n >= 3:
            raise StopIteration
        self.n += 1
        return self.n


def check():
    # iter() on a non-iterator (its __iter__ returns self, no __next__) raises.
    try:
        iter(IterClass())
        return False
    except TypeError:
        pass
    # A genuine iterator (defines __iter__ AND __next__) is unaffected.
    return list(iter(GoodIter())) == [1, 2, 3]
