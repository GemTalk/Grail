"""Fixture: cmath's inverse functions and isclose exist and follow CPython.

Grail's cmath had no acos, acosh, asin, asinh, atan, atanh or isclose, so
test_cmath -- which lists them at module level -- could not be imported.
They are now CPython's Modules/cmathmodule.c ported to Python
(src/python/stdlib/_grail_cmath.py), special-value tables included.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.  Finite results are compared with isclose rather than exactly:
CPython's math.hypot is more accurate than the libm hypot its C module
calls, so a port through it can differ from CPython in the last bit.
"""

import cmath
import math

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def _close(got, want):
    return cmath.isclose(got, want, rel_tol=1e-15, abs_tol=1e-300)


def _regular_values():
    pairs = [
        (cmath.acos(0.5), complex(1.0471975511965979, 0.0)),
        (cmath.acosh(2 + 1j), complex(1.4693517443681852, 0.5073563032171445)),
        (cmath.asin(1 + 2j), complex(0.4270785863924761, 1.5285709194809982)),
        (cmath.asinh(0.5j), complex(0.0, 0.5235987755982989)),
        (cmath.atan(3 - 4j), complex(1.4483069952314644, -0.15899719167999918)),
        (cmath.atanh(0.5), complex(0.5493061443340549, 0.0)),
    ]
    return [_close(got, want) for got, want in pairs]


def _special_values():
    inf, nan = math.inf, math.nan
    out = []
    for value in (cmath.acos(complex(inf, inf)), cmath.acosh(complex(-inf, 0.0)),
                  cmath.asinh(complex(inf, nan)), cmath.atanh(complex(inf, 1.0))):
        out.append((repr(value.real), repr(value.imag)))
    return out


def _large_arguments():
    big = 1e308
    return [math.isfinite(f(complex(big, big)).real)
            for f in (cmath.acos, cmath.acosh, cmath.asinh, cmath.atanh)]


def _argument_conversion():
    class HasComplex:
        def __complex__(self):
            return 0.5 + 0j
    out = [_close(cmath.acos(1), 0j), _close(cmath.acos(HasComplex()),
                                            complex(1.0471975511965979, 0.0))]
    try:
        cmath.acos('1')
        out.append('no error')
    except TypeError:
        out.append('TypeError')
    return out


def _isclose():
    return [cmath.isclose(1 + 1j, 1 + 1.0000000001j),
            cmath.isclose(1j, 1.1j),
            cmath.isclose(1j, 1.1j, rel_tol=0.2),
            cmath.isclose(complex(math.inf, 0), complex(math.inf, 0)),
            cmath.isclose(complex(math.nan, 0), complex(math.nan, 0)),
            cmath.isclose(0j, 1e-10j, abs_tol=1e-9)]


r['regular values are CPython\'s'] = _try(_regular_values)
r['special values follow the C99 tables'] = _try(_special_values)
r['large arguments do not overflow'] = _try(_large_arguments)
r['atanh(1) is a domain error'] = _try(lambda: cmath.atanh(1))
r['arguments convert as CPython\'s do'] = _try(_argument_conversion)
r['isclose'] = _try(_isclose)
r['negative tolerances are refused'] = _try(lambda: cmath.isclose(1, 1, rel_tol=-1))
r['the functions belong to cmath'] = _try(
    lambda: sorted({f.__module__ for f in (cmath.acos, cmath.asinh, cmath.isclose)}))


EXPECTED = {
    'regular values are CPython\'s': ('ok', [True] * 6),
    'special values follow the C99 tables': (
        'ok', [('0.7853981633974483', '-inf'), ('inf', '3.141592653589793'),
               ('inf', 'nan'), ('0.0', '1.5707963267948966')]),
    'large arguments do not overflow': ('ok', [True] * 4),
    'atanh(1) is a domain error': ('ValueError', 'math domain error'),
    'arguments convert as CPython\'s do': ('ok', [True, True, 'TypeError']),
    'isclose': ('ok', [True, False, True, True, False, True]),
    'negative tolerances are refused': ('ValueError', 'tolerances must be non-negative'),
    'the functions belong to cmath': ('ok', ['cmath']),
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
