"""Fixture: abs(-0.0) is 0.0, and copysign keeps a zero's sign.

CPython's float abs is C's fabs, which clears the sign bit.  GemStone's
Float >> abs compares with zero instead, and -0.0 < 0 is false, so abs(-0.0)
answered -0.0.  math.fabs answered the same, and math.copysign, which takes
the magnitude first, got copysign(-0.0, -0.0) wrong: 0.0.  cmath's
inverse functions, which lean on copysign and abs for the sign of a zero
result, inherited it -- cmath.acos(0.5) came out 1.047...+0j where CPython
answers 1.047...-0j.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.  Zeros are compared by repr, which is what shows their sign.
"""

import cmath
import math

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


r['abs of a negative zero'] = _try(
    lambda: [repr(abs(-0.0)), repr(math.fabs(-0.0)), repr((-0.0).__abs__())])
r['abs of other values'] = _try(
    lambda: [abs(-1.5), abs(2.5), abs(-math.inf), math.isnan(abs(math.nan))])
r['copysign with a zero magnitude'] = _try(
    lambda: [repr(math.copysign(-0.0, -0.0)), repr(math.copysign(-0.0, 0.0)),
             repr(math.copysign(0.0, -0.0)), repr(math.copysign(0.0, 0.0))])
r['copysign with other magnitudes'] = _try(
    lambda: [math.copysign(-1.5, 1.0), math.copysign(1.5, -0.0),
             math.copysign(math.inf, -1.0)])
r['cmath keeps the sign of a zero part'] = _try(
    lambda: [repr(cmath.acos(0.5).imag), repr(cmath.acos(complex(0.5, -0.0)).imag),
             repr(cmath.atanh(complex(0.5, -0.0)).imag)])


EXPECTED = {
    'abs of a negative zero': ('ok', ['0.0', '0.0', '0.0']),
    'abs of other values': ('ok', [1.5, 2.5, math.inf, True]),
    'copysign with a zero magnitude': ('ok', ['-0.0', '0.0', '-0.0', '0.0']),
    'copysign with other magnitudes': ('ok', [1.5, -1.5, -math.inf]),
    'cmath keeps the sign of a zero part': ('ok', ['-0.0', '0.0', '-0.0']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
