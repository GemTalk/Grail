"""Fixtures for dividing by zero: that it raises at all, and what it says.

Driven by PythonTests>>DivisionByZeroTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

This started as a wording fix and turned out to be four bugs, because the guards
were written per operator and each one was wrong in a way the others hid.

1. THE WORDING.  CPython used to distinguish the operators -- ``integer division
   or modulo by zero'', ``float division by zero'', ``float floor division by
   zero'', ``float modulo'' -- and 3.14 collapsed every one of them into
   ``division by zero''.  Grail still said the 3.13 text.  Separately,
   ``0 ** -1'' says ``zero to a negative power'', where Grail said ``0.0 cannot
   be raised to a negative power'' (a wording no CPython has used for years).

2. FLOAT DIVISION DID NOT RAISE AT ALL.  ``1.0 / 0'' answered ``inf'' and
   ``1.0 % 0'' answered ``nan''.  IEEE 754 says those are the right values and
   GemStone obliges; Python's ``/'' is not IEEE division -- it checks the divisor
   first.  A silently wrong number is worse than a wrong message.

3. ``False'' WAS NOT RECOGNISED AS A ZERO.  A Python bool IS an int, so
   ``1 // False'' is division by zero.  Grail represents False as the Smalltalk
   ``false'', whose class is Boolean and NOT a Number, so every guard shaped
   ``(other isKindOf: Number) and: [other = 0]'' short-circuited on the first
   clause and never looked at the value -- even though the second clause would
   have said true.  ``1 // False'', ``1 % False'' and ``divmod(1, False)'' then
   reached the kernel and raised GemStone's ZeroDivide, which is not a Python
   exception and so could not be caught from Python at all.  ``1 / False'' took a
   different route and answered OverflowError, claiming the quotient was too
   large for a float.

4. A COMPLEX ZERO WAS NOT RECOGNISED EITHER.  ``(1+2j) / 0'' answered
   ``(nan-nanj)'', since the quotient of a zero denominator is NaN rather than an
   error.

The guard now lives in one place, ZeroDivisionError class>>___checkDivisor___:,
which is why these all move together.

Run this file under CPython (``python3 tests/python/division_by_zero.py'') to see
what it produces -- that is where the expectations come from.
"""


def _zde(fn):
    """The ZeroDivisionError message, or a description of what happened instead.

    Returns a str either way so a failing check reports the difference rather
    than propagating a second exception out of the fixture."""
    try:
        value = fn()
    except ZeroDivisionError as e:
        return str(e)
    except Exception as e:
        return 'RAISED %s: %s' % (type(e).__name__, e)
    return 'RETURNED %r' % (value,)


# ------------------------------------------------------------------ rule 1
def int_division_says_division_by_zero():
    return _zde(lambda: 1 / 0) == 'division by zero'


def int_floor_division_says_the_same():
    """3.13 said ``integer division or modulo by zero'' here."""
    return _zde(lambda: 1 // 0) == 'division by zero'


def int_modulo_says_the_same():
    return _zde(lambda: 1 % 0) == 'division by zero'


def int_divmod_says_the_same():
    return _zde(lambda: divmod(1, 0)) == 'division by zero'


def zero_to_a_negative_power_has_its_own_message():
    """The one division-by-zero that is NOT worded ``division by zero''."""
    return _zde(lambda: 0 ** -1) == 'zero to a negative power'


def a_float_zero_to_a_negative_power_says_it_too():
    return (_zde(lambda: 0.0 ** -1) == 'zero to a negative power'
            and _zde(lambda: 0.0 ** -0.5) == 'zero to a negative power')


def the_builtin_pow_says_it_too():
    return _zde(lambda: pow(0, -1)) == 'zero to a negative power'


def zero_to_a_non_negative_power_is_fine():
    """The guard must not fire on the exponents that have answers."""
    return 0 ** 0 == 1 and 0 ** 1 == 0


# ------------------------------------------------------------------ rule 2
def float_true_division_raises():
    """Answered ``inf'' before: IEEE's result, not Python's."""
    return _zde(lambda: 1.0 / 0) == 'division by zero'


def float_modulo_raises():
    """Answered ``nan'' before."""
    return _zde(lambda: 1.0 % 0) == 'division by zero'


def float_floor_division_raises():
    return _zde(lambda: 1.0 // 0) == 'division by zero'


def float_divmod_raises():
    return _zde(lambda: divmod(1.0, 0)) == 'division by zero'


def a_float_zero_divisor_is_a_zero():
    """0.0 rather than 0 on the right-hand side, which is a different guard."""
    return (_zde(lambda: 1 / 0.0) == 'division by zero'
            and _zde(lambda: 1 // 0.0) == 'division by zero'
            and _zde(lambda: 1 % 0.0) == 'division by zero')


def negative_zero_is_a_zero_too():
    """-0.0 == 0 is true, and Python raises for it as readily as for +0.0."""
    return (_zde(lambda: 1.0 / -0.0) == 'division by zero'
            and _zde(lambda: 1.0 % -0.0) == 'division by zero'
            and _zde(lambda: 1.0 // -0.0) == 'division by zero')


# ------------------------------------------------------------------ rule 3
def false_is_a_zero_divisor():
    """A bool IS an int, so this is 1/0 written differently."""
    return _zde(lambda: 1 / False) == 'division by zero'


def false_is_a_zero_for_floor_division_too():
    """This one raised an UNCATCHABLE GemStone ZeroDivide, so it could not be
    worked around from Python at all."""
    return _zde(lambda: 1 // False) == 'division by zero'


def false_is_a_zero_for_modulo_and_divmod():
    return (_zde(lambda: 1 % False) == 'division by zero'
            and _zde(lambda: divmod(1, False)) == 'division by zero')


def a_float_divided_by_false_raises():
    return (_zde(lambda: 1.0 / False) == 'division by zero'
            and _zde(lambda: 1.0 // False) == 'division by zero')


def true_is_one_and_still_divides():
    """The other bool must keep working: this is the check that would catch a
    guard that treated every Boolean as zero."""
    return 1 / True == 1.0 and 7 // True == 7


# ------------------------------------------------------------------ rule 4
def a_complex_divided_by_zero_raises():
    """Answered (nan-nanj) before."""
    return _zde(lambda: (1 + 2j) / 0) == 'division by zero'


def a_complex_zero_is_a_zero_divisor():
    """0j on the right, where both parts are zero."""
    return (_zde(lambda: 1 / 0j) == 'division by zero'
            and _zde(lambda: (1 + 2j) / 0j) == 'division by zero')


def a_complex_divided_by_a_nonzero_still_works():
    return (1 + 2j) / 2 == (0.5 + 1j)


# ------------------------------------------------- it is a Python exception
def the_error_is_catchable_as_arithmeticerror():
    """The whole point of not letting GemStone's ZeroDivide escape: this is a
    Python exception in the Python hierarchy."""
    try:
        1 // False
    except ArithmeticError as e:
        return type(e).__name__ == 'ZeroDivisionError'
    return False


def a_bare_except_catches_it():
    try:
        divmod(1, False)
    except Exception:
        return True
    return False


# ------------------------------------------- no false positives on the guard
def an_object_merely_equal_to_zero_is_not_a_zero_divisor():
    """A deliberate limit on the guard.  A class may define __eq__ to say it
    equals 0 without being a zero DIVISOR, and its __rtruediv__ still has to get
    its turn -- so the guard tests the TYPE, not just ``== 0''."""
    class EqualsZero:
        def __eq__(self, other):
            return True

        def __rtruediv__(self, other):
            return 'rtruediv ran'

        def __rfloordiv__(self, other):
            return 'rfloordiv ran'

    return (1 / EqualsZero() == 'rtruediv ran'
            and 1 // EqualsZero() == 'rfloordiv ran')


def ordinary_division_is_untouched():
    """The guards run on every division, so the cheapest way to be wrong is to
    break the ones that should succeed."""
    return (1 / 2 == 0.5 and 7 // 2 == 3 and 7 % 2 == 1
            and divmod(7, 2) == (3, 1) and 1.0 / 2 == 0.5
            and 7.0 // 2 == 3.0 and 7.0 % 2 == 1.0)


if __name__ == '__main__':
    checks = [
        int_division_says_division_by_zero,
        int_floor_division_says_the_same,
        int_modulo_says_the_same,
        int_divmod_says_the_same,
        zero_to_a_negative_power_has_its_own_message,
        a_float_zero_to_a_negative_power_says_it_too,
        the_builtin_pow_says_it_too,
        zero_to_a_non_negative_power_is_fine,
        float_true_division_raises,
        float_modulo_raises,
        float_floor_division_raises,
        float_divmod_raises,
        a_float_zero_divisor_is_a_zero,
        negative_zero_is_a_zero_too,
        false_is_a_zero_divisor,
        false_is_a_zero_for_floor_division_too,
        false_is_a_zero_for_modulo_and_divmod,
        a_float_divided_by_false_raises,
        true_is_one_and_still_divides,
        a_complex_divided_by_zero_raises,
        a_complex_zero_is_a_zero_divisor,
        a_complex_divided_by_a_nonzero_still_works,
        the_error_is_catchable_as_arithmeticerror,
        a_bare_except_catches_it,
        an_object_merely_equal_to_zero_is_not_a_zero_divisor,
        ordinary_division_is_untouched,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
