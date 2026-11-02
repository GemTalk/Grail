"""Fixture: int.__pow__ and int.__rpow__ take the arguments CPython's wrapper takes.

A ternary dunder's slot wrapper takes the exponent and an optional modulus, by
position only: anything else is "expected 1 or 2 arguments, got N", and a
keyword is "wrapper __pow__() takes no keyword arguments"
(Objects/typeobject.c:9329-9368).  __rpow__ with a modulus is
pow(other, self, mod), which int answers only for an int ``other''.

Grail refused a wrong count in its own words, which test_descr's
test_pow_wrapper_error_messages compares.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except TypeError as e:
        return 'TypeError: %s' % e


three = 3

r['pow_counts'] = [outcome(lambda: three.__pow__()), outcome(lambda: three.__pow__(1, 2, 3))]
r['rpow_counts'] = [outcome(lambda: three.__rpow__()), outcome(lambda: three.__rpow__(1, 2, 3))]
r['keywords'] = [outcome(lambda: three.__pow__(exp=2)), outcome(lambda: three.__rpow__(2, mod=5))]
r['pow_still_computes'] = [three.__pow__(2), three.__pow__(2, 5), three.__pow__(2, None)]
r['rpow_still_computes'] = [three.__rpow__(2), three.__rpow__(2, 5), three.__rpow__(2, None),
                            three.__rpow__(2.0, 5)]

EXPECTED = {
    'pow_counts': ['TypeError: expected 1 or 2 arguments, got 0',
                   'TypeError: expected 1 or 2 arguments, got 3'],
    'rpow_counts': ['TypeError: expected 1 or 2 arguments, got 0',
                    'TypeError: expected 1 or 2 arguments, got 3'],
    'keywords': ['TypeError: wrapper __pow__() takes no keyword arguments',
                 'TypeError: wrapper __rpow__() takes no keyword arguments'],
    'pow_still_computes': [9, 4, 9],
    'rpow_still_computes': [8, 3, 8, NotImplemented],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
