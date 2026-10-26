"""CPython's Modules/cmathmodule.c, ported to Python for Grail's cmath.

Grail's ``cmath'' is a Smalltalk module class.  It had no inverse functions
at all -- acos, acosh, asin, asinh, atan, atanh -- and no isclose, so
test_cmath, which lists them at module level, could not even be imported;
cmath >> __getattr__: answers those from here.  The functions it did have
computed by textbook formulas, and now forward here too
(cmath >> ___ported___:with:).

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


# ---------------------------------------------------------------------------
# The functions Grail's native cmath already had, which computed by textbook
# formulas: sqrt through polar form, tan as sin/cos.  Those lost the signs of
# zeros and the C99 special values, overflowed where CPython does not, and
# raised nothing where CPython raises.  Each *_impl below returns
# (result, errno) the way cmathmodule.c's do: None, EDOM or ERANGE.

_EDOM = 'EDOM'
_ERANGE = 'ERANGE'
_E = _math.e
_LN10 = 2.302585092994045684
_LOG_LARGE_DOUBLE = _math.log(_LARGE_DOUBLE)
_MANT_DIG = _sys.float_info.mant_dig


def _math_error(errno):
    """math_error(): EDOM is ValueError, ERANGE OverflowError."""
    if errno == _EDOM:
        raise ValueError('math domain error')
    if errno == _ERANGE:
        raise OverflowError('math range error')


def _protected(pair):
    """Py_complex_protected's return conversion."""
    result, errno = pair
    _math_error(errno)
    return result


def _overflowed(r):
    return _ERANGE if _math.isinf(r.real) or _math.isinf(r.imag) else None


_COSH_SPECIAL = (
    ((_INF, _NAN), (_U, _U), (_INF, 0.), (_INF, -0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_NAN, 0.), (_U, _U), (1., 0.), (1., -0.), (_U, _U), (_NAN, 0.), (_NAN, 0.)),
    ((_NAN, 0.), (_U, _U), (1., -0.), (1., 0.), (_U, _U), (_NAN, 0.), (_NAN, 0.)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_INF, _NAN), (_U, _U), (_INF, -0.), (_INF, 0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_NAN, _NAN), (_NAN, 0.), (_NAN, 0.), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN)),
)


def _cosh(z):
    if not (_math.isfinite(z.real) and _math.isfinite(z.imag)):
        if _math.isinf(z.real) and _math.isfinite(z.imag) and z.imag != 0.:
            if z.real > 0:
                r = complex(_math.copysign(_INF, _math.cos(z.imag)),
                            _math.copysign(_INF, _math.sin(z.imag)))
            else:
                r = complex(_math.copysign(_INF, _math.cos(z.imag)),
                            -_math.copysign(_INF, _math.sin(z.imag)))
        else:
            r = _special_value(z, _COSH_SPECIAL)
        errno = _EDOM if _math.isinf(z.imag) and not _math.isnan(z.real) else None
        return r, errno
    if abs(z.real) > _LOG_LARGE_DOUBLE:
        # cosh(z.real) overflows where cosh(z) need not
        x_minus_one = z.real - _math.copysign(1., z.real)
        r = complex(_math.cos(z.imag) * _math.cosh(x_minus_one) * _E,
                    _math.sin(z.imag) * _math.sinh(x_minus_one) * _E)
    else:
        r = complex(_math.cos(z.imag) * _math.cosh(z.real),
                    _math.sin(z.imag) * _math.sinh(z.real))
    return r, _overflowed(r)


def _cos(z):
    # cos(z) = cosh(iz)
    return _cosh(complex(-z.imag, z.real))


_SINH_SPECIAL = (
    ((_INF, _NAN), (_U, _U), (-_INF, -0.), (-_INF, 0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((0., _NAN), (_U, _U), (-0., -0.), (-0., 0.), (_U, _U), (0., _NAN), (0., _NAN)),
    ((0., _NAN), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (0., _NAN), (0., _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_INF, _NAN), (_U, _U), (_INF, -0.), (_INF, 0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_NAN, _NAN), (_NAN, -0.), (_NAN, 0.), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN)),
)


def _sinh(z):
    if not (_math.isfinite(z.real) and _math.isfinite(z.imag)):
        if _math.isinf(z.real) and _math.isfinite(z.imag) and z.imag != 0.:
            if z.real > 0:
                r = complex(_math.copysign(_INF, _math.cos(z.imag)),
                            _math.copysign(_INF, _math.sin(z.imag)))
            else:
                r = complex(-_math.copysign(_INF, _math.cos(z.imag)),
                            _math.copysign(_INF, _math.sin(z.imag)))
        else:
            r = _special_value(z, _SINH_SPECIAL)
        errno = _EDOM if _math.isinf(z.imag) and not _math.isnan(z.real) else None
        return r, errno
    if abs(z.real) > _LOG_LARGE_DOUBLE:
        x_minus_one = z.real - _math.copysign(1., z.real)
        r = complex(_math.cos(z.imag) * _math.sinh(x_minus_one) * _E,
                    _math.sin(z.imag) * _math.cosh(x_minus_one) * _E)
    else:
        r = complex(_math.cos(z.imag) * _math.sinh(z.real),
                    _math.sin(z.imag) * _math.cosh(z.real))
    return r, _overflowed(r)


def _sin(z):
    # sin(z) = -i sinh(iz)
    s, errno = _sinh(complex(-z.imag, z.real))
    return complex(s.imag, -s.real), errno


_TANH_SPECIAL = (
    ((-1., 0.), (_U, _U), (-1., -0.), (-1., 0.), (_U, _U), (-1., 0.), (-1., 0.)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((-0.0, _NAN), (_U, _U), (-0., -0.), (-0., 0.), (_U, _U), (-0.0, _NAN), (-0., _NAN)),
    ((0.0, _NAN), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (0.0, _NAN), (0., _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((1., 0.), (_U, _U), (1., -0.), (1., 0.), (_U, _U), (1., 0.), (1., 0.)),
    ((_NAN, _NAN), (_NAN, _NAN), (_NAN, -0.), (_NAN, 0.), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN)),
)


def _tanh(z):
    if not (_math.isfinite(z.real) and _math.isfinite(z.imag)):
        if _math.isinf(z.real) and _math.isfinite(z.imag) and z.imag != 0.:
            r = complex(1.0 if z.real > 0 else -1.0,
                        _math.copysign(0., 2. * _math.sin(z.imag) * _math.cos(z.imag)))
        else:
            r = _special_value(z, _TANH_SPECIAL)
        errno = _EDOM if _math.isinf(z.imag) and _math.isfinite(z.real) else None
        return r, errno
    # danger of overflow in 2.*z.imag
    if abs(z.real) > _LOG_LARGE_DOUBLE:
        return complex(_math.copysign(1., z.real),
                       4. * _math.sin(z.imag) * _math.cos(z.imag)
                       * _math.exp(-2. * abs(z.real))), None
    tx = _math.tanh(z.real)
    ty = _math.tan(z.imag)
    cx = 1. / _math.cosh(z.real)
    txty = tx * ty
    denom = 1. + txty * txty
    return complex(tx * (1. + ty * ty) / denom, ((ty / denom) * cx) * cx), None


def _tan(z):
    # tan(z) = -i tanh(iz)
    s, errno = _tanh(complex(-z.imag, z.real))
    return complex(s.imag, -s.real), errno


_EXP_SPECIAL = (
    ((0., 0.), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (0., 0.), (0., 0.)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_NAN, _NAN), (_U, _U), (1., -0.), (1., 0.), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_NAN, _NAN), (_U, _U), (1., -0.), (1., 0.), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_INF, _NAN), (_U, _U), (_INF, -0.), (_INF, 0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_NAN, _NAN), (_NAN, -0.), (_NAN, 0.), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN)),
)


def _exp(z):
    if not (_math.isfinite(z.real) and _math.isfinite(z.imag)):
        if _math.isinf(z.real) and _math.isfinite(z.imag) and z.imag != 0.:
            if z.real > 0:
                r = complex(_math.copysign(_INF, _math.cos(z.imag)),
                            _math.copysign(_INF, _math.sin(z.imag)))
            else:
                r = complex(_math.copysign(0., _math.cos(z.imag)),
                            _math.copysign(0., _math.sin(z.imag)))
        else:
            r = _special_value(z, _EXP_SPECIAL)
        errno = (_EDOM if _math.isinf(z.imag) and
                 (_math.isfinite(z.real) or (_math.isinf(z.real) and z.real > 0))
                 else None)
        return r, errno
    if z.real > _LOG_LARGE_DOUBLE:
        l = _math.exp(z.real - 1.)
        r = complex(l * _math.cos(z.imag) * _E, l * _math.sin(z.imag) * _E)
    else:
        l = _math.exp(z.real)
        r = complex(l * _math.cos(z.imag), l * _math.sin(z.imag))
    return r, _overflowed(r)


_LOG_SPECIAL = (
    ((_INF, -_P34), (_INF, -_P), (_INF, -_P), (_INF, _P), (_INF, _P), (_INF, _P34), (_INF, _NAN)),
    ((_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (-_INF, -_P), (-_INF, _P), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (-_INF, -0.), (-_INF, 0.), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P12), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_INF, _P12), (_NAN, _NAN)),
    ((_INF, -_P14), (_INF, -0.), (_INF, -0.), (_INF, 0.), (_INF, 0.), (_INF, _P14), (_INF, _NAN)),
    ((_INF, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN), (_INF, _NAN), (_NAN, _NAN)),
)


def _log(z):
    """c_log."""
    special = _special_value(z, _LOG_SPECIAL)
    if special is not None:
        return special, None
    ax = abs(z.real)
    ay = abs(z.imag)
    if ax > _LARGE_DOUBLE or ay > _LARGE_DOUBLE:
        real = _math.log(_math.hypot(ax / 2., ay / 2.)) + _LN2
    elif ax < _DBL_MIN and ay < _DBL_MIN:
        if ax > 0. or ay > 0.:
            # hypot(ax, ay) would be subnormal: rescale
            real = (_math.log(_math.hypot(_math.ldexp(ax, _MANT_DIG),
                                          _math.ldexp(ay, _MANT_DIG)))
                    - _MANT_DIG * _LN2)
        else:
            # log(+/-0. +/- 0i)
            return complex(-_INF, _math.atan2(z.imag, z.real)), _EDOM
    else:
        h = _math.hypot(ax, ay)
        if 0.71 <= h <= 1.73:
            am = ax if ax > ay else ay
            an = ay if ax > ay else ax
            real = _log1p((am - 1) * (am + 1) + an * an) / 2.
        else:
            real = _math.log(h)
    return complex(real, _math.atan2(z.imag, z.real)), None


def _quot(a, b):
    """_Py_c_quot (Objects/complexobject.c): Smith's algorithm, EDOM for a
    zero divisor, and C11 Annex G's recovery of infinities and zeros."""
    abs_breal = -b.real if b.real < 0 else b.real
    abs_bimag = -b.imag if b.imag < 0 else b.imag
    errno = None
    if abs_breal >= abs_bimag:
        if abs_breal == 0.0:
            errno = _EDOM
            real = imag = 0.0
        else:
            ratio = b.imag / b.real
            denom = b.real + b.imag * ratio
            real = (a.real + a.imag * ratio) / denom
            imag = (a.imag - a.real * ratio) / denom
    elif abs_bimag >= abs_breal:
        ratio = b.real / b.imag
        denom = b.real * ratio + b.imag
        real = (a.real * ratio + a.imag) / denom
        imag = (a.imag * ratio - a.real) / denom
    else:
        real = imag = _NAN
    if _math.isnan(real) and _math.isnan(imag):
        if ((_math.isinf(a.real) or _math.isinf(a.imag))
                and _math.isfinite(b.real) and _math.isfinite(b.imag)):
            x = _math.copysign(1.0 if _math.isinf(a.real) else 0.0, a.real)
            y = _math.copysign(1.0 if _math.isinf(a.imag) else 0.0, a.imag)
            real = _INF * (x * b.real + y * b.imag)
            imag = _INF * (y * b.real - x * b.imag)
        elif ((_math.isinf(abs_breal) or _math.isinf(abs_bimag))
                and _math.isfinite(a.real) and _math.isfinite(a.imag)):
            x = _math.copysign(1.0 if _math.isinf(b.real) else 0.0, b.real)
            y = _math.copysign(1.0 if _math.isinf(b.imag) else 0.0, b.imag)
            real = 0.0 * (a.real * x + a.imag * y)
            imag = 0.0 * (a.imag * x - a.real * y)
    return complex(real, imag), errno


def _c_abs(z):
    """_Py_c_abs: C99 says an infinite part makes the modulus infinite even
    beside a NaN; a finite z whose hypot overflows is ERANGE."""
    if not (_math.isfinite(z.real) and _math.isfinite(z.imag)):
        if _math.isinf(z.real):
            return abs(z.real), None
        if _math.isinf(z.imag):
            return abs(z.imag), None
        return _NAN, None
    result = _math.hypot(z.real, z.imag)
    return result, (None if _math.isfinite(result) else _ERANGE)


_RECT_SPECIAL = (
    ((_INF, _NAN), (_U, _U), (-_INF, 0.), (-_INF, -0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((0., 0.), (_U, _U), (-0., 0.), (-0., -0.), (_U, _U), (0., 0.), (0., 0.)),
    ((0., 0.), (_U, _U), (0., -0.), (0., 0.), (_U, _U), (0., 0.), (0., 0.)),
    ((_NAN, _NAN), (_U, _U), (_U, _U), (_U, _U), (_U, _U), (_NAN, _NAN), (_NAN, _NAN)),
    ((_INF, _NAN), (_U, _U), (_INF, -0.), (_INF, 0.), (_U, _U), (_INF, _NAN), (_INF, _NAN)),
    ((_NAN, _NAN), (_NAN, _NAN), (_NAN, 0.), (_NAN, 0.), (_NAN, _NAN), (_NAN, _NAN), (_NAN, _NAN)),
)


def _as_real(x):
    """The ``d'' converter rect() takes its arguments through."""
    if isinstance(x, float):
        return x
    if isinstance(x, (str, bytes, bytearray)) or not (
            hasattr(type(x), '__float__') or hasattr(type(x), '__index__')):
        raise TypeError('must be real number, not %s' % type(x).__name__)
    return float(x)


def cos(z, /):
    """Return the cosine of z."""
    return _protected(_cos(_as_complex(z)))


def cosh(z, /):
    """Return the hyperbolic cosine of z."""
    return _protected(_cosh(_as_complex(z)))


def exp(z, /):
    """Return the exponential value e**z."""
    return _protected(_exp(_as_complex(z)))


def isfinite(z, /):
    """Return True if both the real and imaginary parts of z are finite, else False."""
    z = _as_complex(z)
    return _math.isfinite(z.real) and _math.isfinite(z.imag)


def isinf(z, /):
    """Checks if the real or imaginary part of z is infinite."""
    z = _as_complex(z)
    return _math.isinf(z.real) or _math.isinf(z.imag)


def isnan(z, /):
    """Checks if the real or imaginary part of z not a number (NaN)."""
    z = _as_complex(z)
    return _math.isnan(z.real) or _math.isnan(z.imag)


def log(z, base=None, /):
    """log(z[, base]) -> the logarithm of z to the given base.

    If the base is not specified, returns the natural logarithm (base e) of z."""
    x, errno = _log(_as_complex(z))
    if base is not None:
        y, base_errno = _log(_as_complex(base))
        x, quot_errno = _quot(x, y)
        errno = quot_errno or base_errno or errno
    _math_error(errno)
    return x


def log10(z, /):
    """Return the base-10 logarithm of z."""
    r, errno = _log(_as_complex(z))
    return _protected((complex(r.real / _LN10, r.imag / _LN10), errno))


def phase(z, /):
    """Return argument, also known as the phase angle, of a complex."""
    z = _as_complex(z)
    return _math.atan2(z.imag, z.real)


def polar(z, /):
    """Convert a complex from rectangular coordinates to polar coordinates.

    r is the distance from 0 and phi the phase angle."""
    z = _as_complex(z)
    phi = _math.atan2(z.imag, z.real)
    r, errno = _c_abs(z)
    _math_error(errno)
    return r, phi


def rect(r, phi, /):
    """Convert from polar coordinates to rectangular coordinates."""
    r = _as_real(r)
    phi = _as_real(phi)
    errno = None
    if not (_math.isfinite(r) and _math.isfinite(phi)):
        if _math.isinf(r) and _math.isfinite(phi) and phi != 0.:
            if r > 0:
                z = complex(_math.copysign(_INF, _math.cos(phi)),
                            _math.copysign(_INF, _math.sin(phi)))
            else:
                z = complex(-_math.copysign(_INF, _math.cos(phi)),
                            -_math.copysign(_INF, _math.sin(phi)))
        else:
            z = complex(*_RECT_SPECIAL[_special_type(r)][_special_type(phi)])
        if r != 0. and not _math.isnan(r) and _math.isinf(phi):
            errno = _EDOM
    elif phi == 0.0:
        # bpo-18513: r * phi, not r * sin(phi), for a zero phi
        z = complex(r, r * phi)
    else:
        z = complex(r * _math.cos(phi), r * _math.sin(phi))
    _math_error(errno)
    return z


def sin(z, /):
    """Return the sine of z."""
    return _protected(_sin(_as_complex(z)))


def sinh(z, /):
    """Return the hyperbolic sine of z."""
    return _protected(_sinh(_as_complex(z)))


def sqrt(z, /):
    """Return the square root of z."""
    return _sqrt(_as_complex(z))


def tan(z, /):
    """Return the tangent of z."""
    return _protected(_tan(_as_complex(z)))


def tanh(z, /):
    """Return the hyperbolic tangent of z."""
    return _protected(_tanh(_as_complex(z)))


for _function in (cos, cosh, exp, isfinite, isinf, isnan, log, log10, phase,
                  polar, rect, sin, sinh, sqrt, tan, tanh):
    _function.__module__ = 'cmath'
del _function
