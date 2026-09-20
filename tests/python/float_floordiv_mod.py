"""float //, % and divmod: one routine, and an exact fmod under it.

CPython derives all three from a single function, `float_divmod`
(Objects/floatobject.c). Grail computed each separately, and they drifted from
upstream in three independent ways -- every one of which is invisible unless
you pick the operand that exposes it:

  * THE EXACT QUOTIENT. `fmod(x, y)` is `x - n*y` with `n = trunc(x/y)` taken
    from the TRUE quotient. GemStone's `rem:` takes it from the ROUNDED one,
    and those differ whenever the true quotient sits just below an integer.
    The stored 0.1 is slightly more than a tenth, so `1.0 / 0.1` is really
    9.999..., `n` is 9, and `fmod(1.0, 0.1)` is 0.09999999999999995 -- while
    the rounded quotient is exactly 10.0, giving `n = 10` and a remainder of
    0.0. That one substitution accounted for `1.0 // 0.1 == 10.0` (CPython:
    9.0), for the zero remainders below, and for `math.fmod` too.

  * THE QUOTIENT'S SHARE OF THE SIGN FIX. When the remainder does not have the
    divisor's sign, upstream shifts it one divisor up AND drops the quotient by
    one. Grail did the first half only, so `0.1 // -inf` was 0.0 where CPython
    says -1.0.

  * THE SIGNED ZERO QUOTIENT. A zero quotient carries the sign of the true
    quotient, so `0.0 // -1.0` is -0.0, not 0.0.

Deriving all three from one routine is the actual fix; the individual answers
below are what that buys.

Every expectation here was measured against CPython 3.14.
"""

import math

INF = float('inf')
NAN = float('nan')

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


def check_repr(name, got, want):
    """Compare by repr, so -0.0 and 0.0 are distinguishable (they are ==)."""
    RESULTS[name] = (repr(got) == repr(want)) or ('got: ' + repr(got)[:120])


def check_all_nan(name, values):
    RESULTS[name] = (all(isinstance(v, float) and math.isnan(v) for v in values)
                     or ('got: ' + repr(values)[:120]))


# ------------------------------------------------- the exact quotient (fmod)

check('fmod_uses_the_exact_quotient',
      math.fmod(1.0, 0.1), 0.09999999999999995)

check('fmod_of_a_larger_dividend',
      math.fmod(7.5, 0.1), 0.09999999999999959)

check('floordiv_uses_the_exact_quotient', 1.0 // 0.1, 9.0)

check('mod_uses_the_exact_quotient', 1.0 % 0.1, 0.09999999999999995)

check('divmod_uses_the_exact_quotient',
      divmod(1.0, 0.1), (9.0, 0.09999999999999995))

check('a_negative_dividend_keeps_the_divisor_sign',
      divmod(-1.0, -0.1), (9.0, -0.09999999999999995))

check('the_exact_quotient_scales',
      (3.0 // 0.1, 5.5 // 0.1, 7.5 // 0.1), (29.0, 54.0, 74.0))


# -------------------------------------- the quotient's share of the sign fix

# An infinite divisor: fmod(x, inf) is x, and it is the SIGN ADJUSTMENT that
# produces the -1.0 -- not any infinity rule.
check('floordiv_by_an_opposite_signed_infinity', 0.1 // -INF, -1.0)

check('floordiv_of_a_negative_by_infinity', -0.1 // INF, -1.0)

check('divmod_by_an_opposite_signed_infinity',
      divmod(0.1, -INF), (-1.0, -INF))

check('divmod_by_a_same_signed_infinity', divmod(0.1, INF), (0.0, 0.1))

check('a_large_dividend_by_an_opposite_infinity', 1e300 // -INF, -1.0)


# ------------------------------------------------------ the signed zero half

check_repr('a_zero_quotient_takes_the_true_sign', 0.0 // -1.0, -0.0)

check_repr('a_negative_zero_dividend_keeps_its_sign', -0.0 // 1.0, -0.0)

check_repr('a_same_signed_zero_quotient_is_positive', 0.0 // 1.0, 0.0)

check_repr('a_zero_remainder_takes_the_divisor_sign', 1.0 % -1.0, -0.0)

check_repr('a_zero_remainder_stays_positive_for_a_positive_divisor',
           -1.0 % 1.0, 0.0)


# ------------------------------------------------------------ NaN and errors

check_all_nan('an_infinite_dividend_is_nan', [INF // 2.0, INF % 2.0])

check_all_nan('a_nan_operand_is_nan',
              [NAN // 1.0, NAN % 1.0, 1.0 // NAN, 1.0 % NAN])


def raises(name, fn, want_type, want_message=None):
    """Check the MESSAGE too, not just the type.

    3.14 unified the zero-divisor wording to a plain 'division by zero' for
    every one of these; CPython's C source still carries the older distinct
    strings, so writing them in from memory is an easy and silent regression.
    """
    try:
        got = fn()
    except want_type as exc:
        if want_message is not None and str(exc) != want_message:
            RESULTS[name] = 'message: ' + repr(str(exc))[:120]
        else:
            RESULTS[name] = True
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, str(exc)[:80])
    else:
        RESULTS[name] = 'no raise, got: ' + repr(got)[:120]


raises('floordiv_by_zero_raises', lambda: 1.0 // 0.0, ZeroDivisionError,
       'division by zero')
raises('mod_by_zero_raises', lambda: 1.0 % 0.0, ZeroDivisionError,
       'division by zero')
raises('divmod_by_zero_raises', lambda: divmod(1.0, 0.0), ZeroDivisionError,
       'division by zero')
raises('fmod_by_zero_is_a_domain_error', lambda: math.fmod(1.0, 0.0), ValueError)
raises('fmod_of_infinity_is_a_domain_error',
       lambda: math.fmod(INF, 1.0), ValueError)


# --------------------------------------------------- the ordinary cases hold

check('ordinary_floordiv', (7.5 // 2.0, -7.5 // 2.0), (3.0, -4.0))

check('ordinary_mod', (7.5 % 2.0, -7.5 % 2.0), (1.5, 0.5))

check('ordinary_divmod', divmod(7.5, 2.0), (3.0, 1.5))

check('an_int_divisor_still_yields_floats', divmod(7.5, 2), (3.0, 1.5))

check('the_identity_holds', [a == b * (a // b) + a % b
                             for a, b in ((7.5, 2.0), (-7.5, 2.0), (3.0, 0.5))],
      [True, True, True])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
