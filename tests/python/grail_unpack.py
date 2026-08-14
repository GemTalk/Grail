# Fixture for BuiltinsTestCase>>testUnpackCountValidation.
#
# CPython tuple-unpacking assigns via the iterator protocol and enforces the
# value count (test_iter's test_unpack_iter): an iterable-but-not-subscriptable
# class unpacks by __iter__, too many / too few values raise ValueError, and a
# non-iterable raises TypeError.
def check():
    class BasicIter:
        def __init__(self, n):
            self.n = n
            self.i = 0

        def __next__(self):
            if self.i >= self.n:
                raise StopIteration
            r = self.i
            self.i += 1
            return r

        def __iter__(self):
            return self

    class IteratingSeq:                # __iter__ only -- NOT subscriptable
        def __init__(self, n):
            self.n = n

        def __iter__(self):
            return BasicIter(self.n)

    # exact count via the iterator protocol
    a, b, c = IteratingSeq(3)
    if (a, b, c) != (0, 1, 2):
        return False

    # too many values -> ValueError
    try:
        a, b = IteratingSeq(3)
        return False
    except ValueError:
        pass

    # not enough values -> ValueError
    try:
        a, b, c = IteratingSeq(2)
        return False
    except ValueError:
        pass

    # not iterable -> TypeError
    try:
        a, b, c = len
        return False
    except TypeError:
        pass

    # a dict-values view unpacks by iteration
    a, b, c = {1: 42, 2: 42, 3: 42}.values()
    if (a, b, c) != (42, 42, 42):
        return False

    # a real sequence with the wrong count also raises ValueError (CPython)
    try:
        a, b = [1, 2, 3]
        return False
    except ValueError:
        pass

    # star unpacking is unaffected
    a, *b, c = [1, 2, 3, 4, 5]
    if (a, b, c) != (1, [2, 3, 4], 5):
        return False

    return True


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        check,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
