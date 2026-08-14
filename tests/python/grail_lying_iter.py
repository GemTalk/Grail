# Fixture for ListTestCase>>testConstructorRespectsIter.
#
# list(x) must construct via the iterator protocol, so a list/tuple SUBCLASS
# that overrides __iter__ to yield different values than its contents is
# honored (seq_tests test_constructors, issue #23757).  The plain built-in
# sequence classes keep the fast index-copy path.
class LyingList(list):
    def __iter__(self):
        yield 1


class LyingTuple(tuple):
    def __iter__(self):
        yield 1


def check():
    return (list(LyingList([2])) == [1]
            and list(LyingTuple((2,))) == [1]
            and list([2]) == [2]
            and list((3, 4)) == [3, 4])


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        check,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
