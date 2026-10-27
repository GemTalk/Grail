"""The parts of CPython's Modules/cmathmodule.c that Grail's native cmath lacks.

Grail's ``cmath'' is a Smalltalk module class.  It had no inverse functions
at all -- acos, acosh, asin, asinh, atan, atanh -- and no isclose, so
test_cmath, which lists them at module level, could not even be imported.
cmath >> __getattr__: answers them from here.

Each function is a line-for-line port of the C implementation in CPython
3.14.4, special-value tables included, because that is what test_cmath
checks them against (cmath_testcases.txt): the C99 Annex G results for
infinities, NaNs and signed zeros, and the rescalings that keep a large or
subnormal argument from overflowing or losing precision.  The private
helpers mirror cmathmodule.c's statics of the same names; _sqrt is
cmath_sqrt_impl, which these functions build on.
"""

import math as _math
import sys as _sys

_INF = float('inf')
_NAN = float('nan')

_P = _math.pi
_P14 = 0.25 * _math.pi
_P12 = 0.5 * _math.pi
_P34 = 0.75 * _math.pi
_U = -9.5426319407711027e33   # "unlikely value, used as placeholder"

_LN2 = 0.6931471805599453094
_DBL_MIN = _sys.float_info.min
_LARGE_DOUBLE = _sys.float_info.max / 4.
_SQRT_LARGE_DOUBLE = _math.sqrt(_LARGE_DOUBLE)
_SQRT_DBL_MIN = _math.sqrt(_DBL_MIN)
_SCALE_UP = 2 * (_sys.float_info.mant_dig // 2) + 1
_SCALE_DOWN = -(_SCALE_UP + 1) // 2

# special_types, in cmathmodule.c's order.
_NINF, _NEG, _NZERO, _PZERO, _POS, _PINF, _ST_NAN = range(7)


def _special_type(d):
    if _math.isfinite(d):
        if d != 0:
            return _POS if _math.copysign(1., d) == 1. else _NEG
        return _PZERO if _math.copysign(1., d) == 1. else _NZERO
    if _math.isnan(d):
        return _ST_NAN
    return _PINF if _math.copysign(1., d) == 1. else _NINF


def _special_value(z, table):
    """SPECIAL_VALUE: the table entry for a non-finite z, or None."""
    if _math.isfinite(z.real) and _math.isfinite(z.imag):
        return None
    re, im = table[_special_type(z.real)][_special_type(z.imag)]
    return complex(re, im)


def _log1p(x):
    """_Py_log1p: log1p, keeping the sign of a zero argument."""
    if x == 0.:
        return x
    return _math.log1p(x)


def _as_complex(z):
    """The ``D'' argument converter: a complex, anything with __complex__,
    or a real number (__float__ / __index__)."""
    if isinstance(z, complex):
        return z
    convert = getattr(type(z), '__complex__', None)
    if convert is not None:
        result = convert(z)
        if not isinstance(result, complex):
            raise TypeError('__complex__ returned non-complex (type %s)'
                            % type(result).__name__)
        return result
    if isinstance(z, (str, bytes, bytearray)):
        raise TypeError('must be real number, not %s' % type(z).__name__)
    convert = getattr(type(z), '__float__', None)
    if convert is not None:
        return complex(convert(z), 0.)
    if getattr(type(z), '__index__', None) is not None:
        return complex(float(z), 0.)
    raise TypeError('must be real number, not %s' % type(z).__name__)


_SQRT_SPECIAL = (
    ((_INF, -_INF), (0., -_INF), (0., -_INF), (0., _INF), (0., _INF), (_INF, _INF), (_NAN, _INF)),
    ((_INF, -_INF), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _INF), (_NAN, _NAN)),
    ((_INF, -_INF), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (_INF, _INF), (_NAN, _NAN)),
    ((_INF, -_INF), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (_INF, _INF), (_NAN, _NAN)),
    ((_INF, -_INF), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _INF), (_NAN, _NAN)),
    ((_INF, -_INF), (_INF, -0.), (_INF, -0.), (_INF, 0.), (_INF, 0.), (_INF, _INF), (_INF, _NAN)),
    ((_INF, -_INF), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_INF, _INF), (_NAN, _NAN)),
)


def _sqrt(z):
    """cmath_sqrt_impl."""
    special = _special_value(z, _SQRT_SPECIAL)
    if special is not None:
        return special
    if z.real == 0. and z.imag == 0.:
        return complex(0., z.imag)
    ax = abs(z.real)
    ay = abs(z.imag)
    if ax < _DBL_MIN and ay < _DBL_MIN:
        # hypot(ax, ay) may be subnormal: rescale to keep full precision.
        ax = _math.ldexp(ax, _SCALE_UP)
        s = _math.ldexp(_math.sqrt(ax + _math.hypot(ax, _math.ldexp(ay, _SCALE_UP))),
                        _SCALE_DOWN)
    else:
        ax /= 8.
        s = 2. * _math.sqrt(ax + _math.hypot(ax, ay / 8.))
    d = ay / (2. * s)
    if z.real >= 0.:
        return complex(s, _math.copysign(d, z.imag))
    return complex(d, _math.copysign(s, z.imag))


_ACOS_SPECIAL = (
    ((_P34, _INF), (_P, _INF), (_P, _INF), (_P, -_INF), (_P, -_INF), (_P34, -_INF), (_NAN, _INF)),
    ((_P12, _INF), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_P12, -_INF), (_NAN, _NAN)),
    ((_P12, _INF), (_U, _U), (_P12, 0.), (_P12, -0.), (_U, _U), (_P12, -_INF), (_P12, _NAN)),
    ((_P12, _INF), (_U, _U), (_P12, 0.), (_P12, -0.), (_U, _U), (_P12, -_INF), (_P12, _NAN)),
    ((_P12, _INF), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_P12, -_INF), (_NAN, _NAN)),
    ((_P14, _INF), (0., _INF), (0., _INF), (0., -_INF), (0., -_INF), (_P14, -_INF), (_NAN, _INF)),
    ((_NAN, _INF), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, -_INF), (_NAN, _NAN)),
)


def _acos(z):
    special = _special_value(z, _ACOS_SPECIAL)
    if special is not None:
        return special
    if abs(z.real) > _LARGE_DOUBLE or abs(z.imag) > _LARGE_DOUBLE:
        # avoid unnecessary overflow for large arguments
        return complex(
            _math.atan2(abs(z.imag), z.real),
            -_math.copysign(_math.log(_math.hypot(z.real / 2., z.imag / 2.)) + _LN2 * 2.,
                            z.imag))
    s1 = _sqrt(complex(1. - z.real, -z.imag))
    s2 = _sqrt(complex(1. + z.real, z.imag))
    return complex(2. * _math.atan2(s1.real, s2.real),
                   _math.asinh(s2.real * s1.imag - s2.imag * s1.real))


_ACOSH_SPECIAL = (
    ((_INF, -_P34), (_INF, -_P), (_INF, -_P), (_INF, _P), (_INF, _P), (_INF, _P34), (_INF, _NAN)),
    ((_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (0., -_P12), (0., _P12), (_U, _U), (_INF, _P12), (_NAN, _P12)),
    ((_INF, -_P12), (_U, _U), (0., -_P12), (0., _P12), (_U, _U), (_INF, _P12), (_NAN, _P12)),
    ((_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P14), (_INF, -0.), (_INF, -0.), (_INF, 0.), (_INF, 0.), (_INF, _P14), (_INF, _NAN)),
    ((_INF, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_INF, _NAN), (_NAN, _NAN)),
)


def _acosh(z):
    special = _special_value(z, _ACOSH_SPECIAL)
    if special is not None:
        return special
    if abs(z.real) > _LARGE_DOUBLE or abs(z.imag) > _LARGE_DOUBLE:
        # avoid unnecessary overflow for large arguments
        return complex(_math.log(_math.hypot(z.real / 2., z.imag / 2.)) + _LN2 * 2.,
                       _math.atan2(z.imag, z.real))
    s1 = _sqrt(complex(z.real - 1., z.imag))
    s2 = _sqrt(complex(z.real + 1., z.imag))
    return complex(_math.asinh(s1.real * s2.real + s1.imag * s2.imag),
                   2. * _math.atan2(s1.imag, s2.real))


_ASINH_SPECIAL = (
    ((-_INF, -_P14), (-_INF, -0.), (-_INF, -0.), (-_INF, 0.), (-_INF, 0.), (-_INF, _P14), (-_INF, _NAN)),
    ((-_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (-_INF, _P12), (_NAN, _NAN)),
    ((-_INF, -_P12), (_U, _U), (-0., -0.), (-0., 0.), (_U, _U), (-_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P14), (_INF, -0.), (_INF, -0.), (_INF, 0.), (_INF, 0.), (_INF, _P14), (_INF, _NAN)),
    ((_INF, _NAN), (_NAN, _NAN), (_NAN, -0.), (_NAN, 0.), (_NAN, _NAN), (_INF, _NAN), (_NAN, _NAN)),
)


def _asinh(z):
    special = _special_value(z, _ASINH_SPECIAL)
    if special is not None:
        return special
    if abs(z.real) > _LARGE_DOUBLE or abs(z.imag) > _LARGE_DOUBLE:
        big = _math.log(_math.hypot(z.real / 2., z.imag / 2.)) + _LN2 * 2.
        if z.imag >= 0.:
            real = _math.copysign(big, z.real)
        else:
            real = -_math.copysign(big, -z.real)
        return complex(real, _math.atan2(z.imag, abs(z.real)))
    s1 = _sqrt(complex(1. + z.imag, -z.real))
    s2 = _sqrt(complex(1. - z.imag, z.real))
    return complex(_math.asinh(s1.real * s2.imag - s2.real * s1.imag),
                   _math.atan2(z.imag, s1.real * s2.real - s1.imag * s2.imag))


def _asin(z):
    # asin(z) = -i asinh(iz)
    s = _asinh(complex(-z.imag, z.real))
    return complex(s.imag, -s.real)


_ATANH_SPECIAL = (
    ((-0., -_P12), (-0., -_P12), (-0., -_P12), (-0., _P12), (-0., _P12), (-0., _P12), (-0., _NAN)),
    ((-0., -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (-0., _P12), (_NAN, _NAN)),
    ((-0., -_P12), (_U, _U), (-0., -0.), (-0., 0.), (_U, _U), (-0., _P12), (-0., _NAN)),
    ((0., -_P12), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (0., _P12), (0., _NAN)),
    ((0., -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (0., _P12), (_NAN, _NAN)),
    ((0., -_P12), (0., -_P12), (0., -_P12), (0., _P12), (0., _P12), (0., _P12), (0., _NAN)),
    ((0., -_P12), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (0., _P12), (_NAN, _NAN)),
)


def _atanh(z):
    """cmath_atanh_impl.  Answers (result, domain_error): atanh(1+-0j) is
    inf+-0j and sets EDOM, which the wrapper turns into ValueError."""
    special = _special_value(z, _ATANH_SPECIAL)
    if special is not None:
        return special, False
    # Reduce to the case z.real >= 0, using atanh(z) = -atanh(-z).
    if z.real < 0.:
        r, domain_error = _atanh(-z)
        return -r, domain_error
    ay = abs(z.imag)
    if z.real > _SQRT_LARGE_DOUBLE or ay > _SQRT_LARGE_DOUBLE:
        # atanh(z) ~ 1/z +/- i*pi/2 for large abs(z)
        h = _math.hypot(z.real / 2., z.imag / 2.)   # safe from overflow
        return complex(z.real / 4. / h / h, _math.copysign(_math.pi / 2., z.imag)), False
    if z.real == 1. and ay < _SQRT_DBL_MIN:
        # C99: atanh(1+-0.) is inf +- 0i
        if ay == 0.:
            return complex(_INF, z.imag), True
        return complex(-_math.log(_math.sqrt(ay) / _math.sqrt(_math.hypot(ay, 2.))),
                       _math.copysign(_math.atan2(2., -ay) / 2, z.imag)), False
    return complex(
        _log1p(4. * z.real / ((1 - z.real) * (1 - z.real) + ay * ay)) / 4.,
        -_math.atan2(-2. * z.imag, (1 - z.real) * (1 + z.real) - ay * ay) / 2.), False


def _atan(z):
    # atan(z) = -i atanh(iz)
    s, domain_error = _atanh(complex(-z.imag, z.real))
    return complex(s.imag, -s.real), domain_error


def _checked(result, domain_error=False):
    """Py_complex_protected's return conversion: EDOM is ValueError, and a
    result that overflowed from finite arguments (ERANGE) is OverflowError."""
    if domain_error:
        raise ValueError('math domain error')
    return result


def acos(z, /):
    """Return the arc cosine of z."""
    return _checked(_acos(_as_complex(z)))


def acosh(z, /):
    """Return the inverse hyperbolic cosine of z."""
    return _checked(_acosh(_as_complex(z)))


def asin(z, /):
    """Return the arc sine of z."""
    return _checked(_asin(_as_complex(z)))


def asinh(z, /):
    """Return the inverse hyperbolic sine of z."""
    return _checked(_asinh(_as_complex(z)))


def atan(z, /):
    """Return the arc tangent of z."""
    return _checked(*_atan(_as_complex(z)))


def atanh(z, /):
    """Return the inverse hyperbolic tangent of z."""
    return _checked(*_atanh(_as_complex(z)))


def isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0):
    """Determine whether two complex numbers are close in value.

    Return True if a is close in value to b, and False otherwise.

    For the values to be considered close, the difference between them must be
    smaller than at least one of the tolerances.

    -inf, inf and NaN behave similarly to the IEEE 754 Standard. That is, NaN is
    not close to anything, even itself. inf and -inf are only close to themselves."""
    a = _as_complex(a)
    b = _as_complex(b)
    rel_tol = float(rel_tol)
    abs_tol = float(abs_tol)
    if rel_tol < 0.0 or abs_tol < 0.0:
        raise ValueError('tolerances must be non-negative')
    if a.real == b.real and a.imag == b.imag:
        # Exact equality, which catches two infinities of the same sign.
        return True
    if (_math.isinf(a.real) or _math.isinf(a.imag)
            or _math.isinf(b.real) or _math.isinf(b.imag)):
        return False
    diff = abs(a - b)
    return (diff <= rel_tol * abs(b) or diff <= rel_tol * abs(a)
            or diff <= abs_tol)


# They are cmath's functions; this module is only where they are written.
for _function in (acos, acosh, asin, asinh, atan, atanh, isclose):
    _function.__module__ = 'cmath'
del _function
