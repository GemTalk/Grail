"""Fixture: cmath's original functions are CPython's, special values and all.

Grail's native cmath computed sqrt through polar form, tan as sin/cos and so
on, which loses the signs of zeros, the C99 special values, CPython's
overflow and domain errors, log's base argument and its argument conversion.
Each function now forwards to CPython's Modules/cmathmodule.c ported to
Python (src/python/stdlib/_grail_cmath.py).

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.  Zeros are compared by repr, which shows their sign.
"""

import cmath
import math

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def _parts(z):
    return (repr(z.real), repr(z.imag))


inf, nan = math.inf, math.nan

r['signs of zero results'] = _try(lambda: [
    _parts(cmath.sqrt(complex(-0.0, -0.0))), _parts(cmath.tanh(complex(-0.0, 0.0))),
    _parts(cmath.sin(complex(0.0, -0.0))), _parts(cmath.exp(complex(0.0, -0.0)))])
r['special values'] = _try(lambda: [
    _parts(cmath.sqrt(complex(-inf, 1.0))), _parts(cmath.exp(complex(-inf, 1.0))),
    _parts(cmath.cosh(complex(inf, 0.0))), _parts(cmath.tanh(complex(inf, 2.0))),
    _parts(cmath.log(complex(-inf, inf)))])
r['log with a base'] = _try(lambda: _parts(cmath.log(8, 2)))
r['log of zero is a domain error'] = _try(lambda: cmath.log(0))
r['log to base one is a domain error'] = _try(lambda: cmath.log(5, 1))
r['exp overflow is an OverflowError'] = _try(lambda: cmath.exp(complex(800, 1)))
r['cosh of a large argument does not overflow'] = _try(
    lambda: math.isfinite(cmath.cosh(complex(710, 1.5)).imag))
r['sin of an infinite real part is a domain error'] = _try(
    lambda: cmath.sin(complex(inf, 1.0)))
r['polar of an infinite part with a nan'] = _try(lambda: cmath.polar(complex(inf, nan))[0])
r['rect special values'] = _try(lambda: [
    _parts(cmath.rect(inf, 0.0)), _parts(cmath.rect(-0.0, 1.0)), _parts(cmath.rect(1.0, -0.0))])
r['rect of an infinite angle is a domain error'] = _try(lambda: cmath.rect(1.0, inf))
r['phase keeps the sign of zero'] = _try(
    lambda: [repr(cmath.phase(complex(-1.0, -0.0))), repr(cmath.phase(complex(-1.0, 0.0)))])
r['__complex__ is honoured'] = _try(lambda: _parts(cmath.sqrt(type(
    'C', (), {'__complex__': lambda self: complex(-4.0, 0.0)})())))
r['a string is refused'] = _try(lambda: cmath.sqrt('4'))
r['the classification functions'] = _try(lambda: [
    cmath.isfinite(complex(1, 2)), cmath.isinf(complex(1, inf)),
    cmath.isnan(complex(nan, 0)), cmath.isfinite(complex(inf, 0))])


EXPECTED = {
    'signs of zero results': ('ok', [('0.0', '-0.0'), ('-0.0', '0.0'),
                                     ('0.0', '-0.0'), ('1.0', '-0.0')]),
    'special values': ('ok', [('0.0', 'inf'), ('0.0', '0.0'), ('inf', '0.0'),
                              ('1.0', '-0.0'), ('inf', '2.356194490192345')]),
    'log with a base': ('ok', ('3.0', '0.0')),
    'log of zero is a domain error': ('ValueError', 'math domain error'),
    'log to base one is a domain error': ('ValueError', 'math domain error'),
    'exp overflow is an OverflowError': ('OverflowError', 'math range error'),
    'cosh of a large argument does not overflow': ('ok', True),
    'sin of an infinite real part is a domain error': ('ValueError', 'math domain error'),
    'polar of an infinite part with a nan': ('ok', inf),
    'rect special values': ('ok', [('inf', '0.0'), ('-0.0', '-0.0'), ('1.0', '-0.0')]),
    'rect of an infinite angle is a domain error': ('ValueError', 'math domain error'),
    'phase keeps the sign of zero': ('ok', ['-3.141592653589793', '3.141592653589793']),
    '__complex__ is honoured': ('ok', ('0.0', '2.0')),
    'a string is refused': ('TypeError', 'must be real number, not str'),
    'the classification functions': ('ok', [True, True, True, False]),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-52s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
