# Regression fixture: timedelta arithmetic with a float SUBCLASS.
#
# Two bugs, both in PyTimedelta's float path:
#
#   1. The float branch was gated on `isKindOf: Float`, which a float
#      SUBCLASS is not -- the kernel Float is sealed, so `class F(float)`
#      becomes an AbstractPyFloat wrapper (a Number, but not a Float).
#      Such an operand took the INTEGER path, multiplying/dividing by the
#      wrapper directly, so a subclass overriding as_integer_ratio was
#      ignored entirely.
#
#   2. __truediv__ checked for a zero divisor BEFORE consulting
#      as_integer_ratio.  CPython has no explicit zero check at all: it
#      calls as_integer_ratio first and ZeroDivisionError only falls out
#      of the division.  Since a BadFloat() is 0.0, the early check
#      pre-empted the TypeError/ValueError that a malformed ratio owes.

from datetime import timedelta

RESULTS = {}


def _get_bad_float(bad_ratio):
    class BadFloat(float):
        def as_integer_ratio(self):
            return bad_ratio
    return BadFloat()


def _raises(exc, fn):
    try:
        fn()
        return False
    except exc:
        return True
    except Exception:
        return False


# A non-tuple ratio is a TypeError; a wrong-length one a ValueError.
RESULTS['div_bad_ratio_type'] = _raises(TypeError, lambda: timedelta() / _get_bad_float(1 << 1000))
RESULTS['mul_bad_ratio_type'] = _raises(TypeError, lambda: timedelta() * _get_bad_float(1 << 1000))
for _i, _r in enumerate([(), (42,), (1, 2, 3)]):
    RESULTS['div_bad_ratio_value_%d' % _i] = _raises(ValueError, lambda r=_r: timedelta() / _get_bad_float(r))
    RESULTS['mul_bad_ratio_value_%d' % _i] = _raises(ValueError, lambda r=_r: timedelta() * _get_bad_float(r))

# Genuine zero divisors must still raise ZeroDivisionError.
RESULTS['div_int_zero'] = _raises(ZeroDivisionError, lambda: timedelta(seconds=1) / 0)
RESULTS['div_float_zero'] = _raises(ZeroDivisionError, lambda: timedelta(seconds=1) / 0.0)
RESULTS['div_timedelta_zero'] = _raises(ZeroDivisionError, lambda: timedelta(seconds=1) / timedelta(0))
RESULTS['floordiv_zero'] = _raises(ZeroDivisionError, lambda: timedelta(seconds=1) // 0)


class _GoodFloat(float):
    pass


class _GoodInt(int):
    pass


# A well-behaved float subclass must behave exactly like the float.
RESULTS['mul_float_subclass'] = (timedelta(seconds=1) * _GoodFloat(0.5) == timedelta(microseconds=500000))
RESULTS['div_float_subclass'] = (timedelta(seconds=1) / _GoodFloat(2.0) == timedelta(microseconds=500000))
# Exact integer-ratio rounding, not binary float error (issue #23521).
RESULTS['mul_float_subclass_exact'] = ((timedelta(seconds=1) * _GoodFloat(0.123456)).microseconds == 123456)

# An int subclass must keep taking the integer path.
RESULTS['mul_int_subclass'] = (timedelta(seconds=1) * _GoodInt(3) == timedelta(seconds=3))
RESULTS['div_int_subclass'] = (timedelta(seconds=1) / _GoodInt(2) == timedelta(microseconds=500000))

# Ordinary arithmetic must be untouched.
RESULTS['mul_float_exact'] = ((timedelta(seconds=1) * 0.123456).microseconds == 123456)
RESULTS['div_float'] = (timedelta(seconds=1) / 2.0 == timedelta(microseconds=500000))
RESULTS['div_int'] = (timedelta(seconds=1) / 2 == timedelta(microseconds=500000))
RESULTS['mul_int'] = (timedelta(seconds=1) * 3 == timedelta(seconds=3))
RESULTS['div_timedelta'] = (timedelta(seconds=1) / timedelta(seconds=2) == 0.5)
RESULTS['mul_negative_float'] = (timedelta(seconds=2) * -1.5 == timedelta(seconds=-3))
RESULTS['div_negative_float'] = (timedelta(seconds=2) / -4.0 == timedelta(microseconds=-500000))
