# Fixture for BuiltinsTestCase>>testContainsComparesElementFirst.
#
# CPython's ``x in obj'' (PySequence_Contains) compares each ELEMENT against x
# with the element as the LEFT operand: RichCompareBool(element, x, EQ), so the
# element's __eq__ runs first (reflected to x.__eq__ only on NotImplemented).
# The generic object __contains__ fallback -- taken by a class with __iter__ but
# no __contains__ -- must honour that order, so an asymmetric __eq__ on the
# element decides the match (test_iter's test_in_and_not_in: ALWAYS_EQ must NOT
# be found in iter([NEVER_EQ])).
class ALWAYS_EQ:
    def __eq__(self, other):
        return True

    def __hash__(self):
        return 1


class NEVER_EQ:
    def __eq__(self, other):
        return False

    def __hash__(self):
        return 2


class Iterable:
    # __iter__ but no __contains__ -> membership routes through the generic
    # object>>__contains__ iteration fallback (the method under test).
    def __init__(self, items):
        self.items = items

    def __iter__(self):
        return iter(self.items)


ALW = ALWAYS_EQ()
NEV = NEVER_EQ()


def check():
    ok = True
    # element 1: 1.__eq__(ALW) is NotImplemented -> reflected ALW.__eq__(1)=True.
    ok = ok and (ALW in Iterable([1]))
    # element NEV: NEV.__eq__(ALW)=False -> NOT found.  (The bug compared in the
    # wrong order -- ALW.__eq__(NEV)=True -- and reported a spurious match.)
    ok = ok and (not (ALW in Iterable([NEV])))
    # element ALW: ALW.__eq__(NEV)=True -> found.
    ok = ok and (NEV in Iterable([ALW]))
    # plain-value membership still works
    ok = ok and (2 in Iterable([1, 2, 3]))
    ok = ok and (not (9 in Iterable([1, 2, 3])))
    return ok


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        check,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
