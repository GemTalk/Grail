"""An ``except`` clause must match a class reached through MULTIPLE INHERITANCE.

Grail resolves handlers through Smalltalk's ``on:do:``, which walks the single
superclass chain, so a Python class's SECONDARY bases were invisible to
``except`` even though ``issubclass`` and ``__mro__`` both reported them.

_pydecimal is where this bites in the stdlib -- it declares five such classes:

    class DivisionByZero(DecimalException, ZeroDivisionError)
    class DivisionUndefined(InvalidOperation, ZeroDivisionError)
    class FloatOperation(DecimalException, TypeError)
    class Overflow(Inexact, Rounded)
    class Underflow(Inexact, Rounded, Subnormal)

so ``except ZeroDivisionError:`` let a DivisionByZero escape while ``except
ArithmeticError:`` -- ZeroDivisionError's OWN superclass, reachable through the
primary chain -- caught it (issue #867).

Every expectation here is CPython's, measured; the checks that assert a MISS
matter as much as the ones that assert a hit, since a fix that simply widened
matching would pass the hits alone.
"""

import decimal
from decimal import Decimal as D


def _caught_by(fn, exc_type):
    """True if ``except exc_type`` catches, False if something else escapes,
    None if nothing was raised at all -- three outcomes, because a check that
    only distinguished caught-or-not would score a NO-RAISE as a pass."""
    try:
        fn()
    except exc_type:
        return True
    except BaseException:
        return False
    return None


def _divide_by_zero():
    """Division by zero with the DivisionByZero TRAP explicitly on.

    The trap is on by default, so under CPython this is what the bare expression
    already does.  It is set anyway because the decimal CONTEXT is session state
    that outlives a test: with the trap off, ``D("7") // D("0")`` answers
    Decimal('Infinity') and raises nothing at all, so every ``except`` check
    below would pass vacuously -- and did, in a suite worker where an earlier
    test had turned it off, while passing when run alone.  Restored afterwards
    so this fixture does not become the next test's version of that."""
    ctx = decimal.getcontext()
    saved = ctx.traps[decimal.DivisionByZero]
    ctx.traps[decimal.DivisionByZero] = True
    try:
        return D("7") // D("0")
    finally:
        ctx.traps[decimal.DivisionByZero] = saved


def _raise_division_undefined():
    """DivisionUndefined is a SIGNAL class _pydecimal raises through
    ``_raise_error``; no arithmetic expression produces it directly (``D(0) //
    D(0)`` raises the InvalidOperation condition instead, measured).  Raising it
    by hand is what exercises a SECOND class with the same MI shape."""
    raise decimal.DivisionUndefined("constructed")


class _UserMixed(ValueError, KeyError):
    """The general case, owing nothing to _pydecimal: a user class whose second
    base is reachable only through the MRO."""


def _raise_user_mixed():
    raise _UserMixed("constructed")


def _division_by_zero_class():
    """The class an actual raise produces.

    Read from the RAISE rather than from ``decimal.DivisionByZero`` because the
    two can disagree in Grail: against a repository where the decimal closure is
    deployed, a fresh session answers ``__bases__ == ('DecimalException',)`` and
    ``issubclass(..., ZeroDivisionError) is False`` until something has forced
    the class's first touch, after which both are right.  That is a separate
    defect and not what this fixture is about, so take the reading from the
    object the ``except`` clauses here actually see.  Under CPython the two are
    the same class either way."""
    try:
        _divide_by_zero()
    except BaseException as exc:
        return type(exc)
    return None


def multiple_inheritance_is_what_the_fixture_assumes():
    """Guard: if _pydecimal ever drops the second base -- or if nothing raises at
    all -- these checks would go quiet, so fail loudly here instead."""
    cls = _division_by_zero_class()
    if cls is None:
        return 'nothing raised'
    got = [b.__name__ for b in cls.__bases__]
    if got == ['DecimalException', 'ZeroDivisionError']:
        return True
    return 'bases=%r from %r' % (got, cls)


def introspection_says_it_is_a_zerodivisionerror():
    cls = _division_by_zero_class()
    return (issubclass(cls, ZeroDivisionError) is True
            and ZeroDivisionError in cls.__mro__)


def except_catches_the_secondary_base():
    """The reported case."""
    return _caught_by(_divide_by_zero, ZeroDivisionError) is True


def except_catches_the_primary_base():
    """Worked before the fix -- kept so a regression here is distinguishable
    from one in the secondary base."""
    return _caught_by(_divide_by_zero, decimal.DecimalException) is True


def except_catches_the_primary_chain_above_it():
    """ArithmeticError is reached through DecimalException, not through
    ZeroDivisionError.  This is the one that made the bug confusing: the
    SUPERCLASS of the class that missed was matching all along."""
    return _caught_by(_divide_by_zero, ArithmeticError) is True


def except_catches_the_exact_class():
    return _caught_by(_divide_by_zero, decimal.DivisionByZero) is True


def except_catches_a_second_class_with_the_same_shape():
    """DivisionUndefined(InvalidOperation, ZeroDivisionError) -- a different
    primary base, the same secondary one."""
    return _caught_by(_raise_division_undefined, ZeroDivisionError) is True


def a_user_defined_mi_exception_matches_its_secondary_base():
    """Nothing here is decimal-specific; the stdlib is only where it was found."""
    return _caught_by(_raise_user_mixed, KeyError) is True


def a_user_defined_mi_exception_still_matches_its_primary_base():
    return _caught_by(_raise_user_mixed, ValueError) is True


def a_user_defined_mi_exception_still_misses_an_unrelated_class():
    return _caught_by(_raise_user_mixed, TypeError) is False


def except_does_not_catch_an_unrelated_class():
    return _caught_by(_divide_by_zero, TypeError) is False


def except_does_not_catch_another_unrelated_class():
    return _caught_by(_divide_by_zero, KeyError) is False


def a_plain_zerodivisionerror_still_matches():
    """The ordinary single-inheritance path must be untouched."""
    return _caught_by(lambda: 1 / 0, ZeroDivisionError) is True


def a_plain_zerodivisionerror_still_misses_an_unrelated_class():
    return _caught_by(lambda: 1 / 0, ValueError) is False


def an_unrelated_builtin_pair_still_does_not_cross_match():
    return (_caught_by(lambda: [].pop(), IndexError) is True
            and _caught_by(lambda: [].pop(), KeyError) is False
            and _caught_by(lambda: {}['k'], KeyError) is True
            and _caught_by(lambda: {}['k'], IndexError) is False)


CHECKS = [
    multiple_inheritance_is_what_the_fixture_assumes,
    introspection_says_it_is_a_zerodivisionerror,
    except_catches_the_secondary_base,
    except_catches_the_primary_base,
    except_catches_the_primary_chain_above_it,
    except_catches_the_exact_class,
    except_catches_a_second_class_with_the_same_shape,
    a_user_defined_mi_exception_matches_its_secondary_base,
    a_user_defined_mi_exception_still_matches_its_primary_base,
    a_user_defined_mi_exception_still_misses_an_unrelated_class,
    except_does_not_catch_an_unrelated_class,
    except_does_not_catch_another_unrelated_class,
    a_plain_zerodivisionerror_still_matches,
    a_plain_zerodivisionerror_still_misses_an_unrelated_class,
    an_unrelated_builtin_pair_still_does_not_cross_match,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        # The RAW answer, not ``is True'': a check that can explain itself
        # returns a string, and coercing here would throw the explanation away
        # exactly when it is needed.  Success is still the True the harness and
        # the __main__ block below both test for.
        RESULTS[_fn.__name__] = _fn()
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
