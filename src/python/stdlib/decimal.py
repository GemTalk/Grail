# Minimal ``decimal'' stub for Grail.
#
# CPython's decimal is the IEEE 754-2008 reference for arbitrary-
# precision decimal arithmetic.  Grail's install.gs maps the bare
# ``Decimal'' name to ScaledDecimal already.  Flask only uses
# decimal.Decimal for an isinstance() check in its JSON encoder
# (flask/json/provider.py); a stub class is enough to make the
# import and the isinstance branch resolve (the check returns False
# for ScaledDecimal values until the stub becomes a real Decimal,
# which is fine — the JSON encoder falls through to other branches
# for them).


class Decimal:
    """Stub — real arithmetic is on Grail's built-in ScaledDecimal
    (mapped to the bare ``Decimal'' Python name in install.gs).
    Subclass when full IEEE 754-2008 semantics are needed.

    The optional ``context`` argument matches CPython's
    Decimal(value, context) form — twilio.base.deserialize calls
    ``Decimal(d, BasicContext)``.  The context is accepted and
    ignored (this stub doesn't round)."""

    def __init__(self, value=0, context=None):
        self._value = value

    def __repr__(self):
        return 'Decimal(' + repr(self._value) + ')'

    def __str__(self):
        return str(self._value)


class DecimalException(Exception):
    pass


class InvalidOperation(DecimalException):
    pass


# Context placeholder so ``decimal.getcontext()'' / ``setcontext()''
# don't blow up if a downstream caller probes them.
class Context:
    def __init__(self, prec=28):
        self.prec = prec


_default_context = Context()

# Named contexts from CPython's decimal — config-only placeholders.
BasicContext = Context(prec=9)
ExtendedContext = Context(prec=9)
DefaultContext = _default_context


def getcontext():
    return _default_context


def setcontext(ctx):
    global _default_context
    _default_context = ctx


# Rounding modes (string constants, as in CPython).
ROUND_DOWN = "ROUND_DOWN"
ROUND_HALF_UP = "ROUND_HALF_UP"
ROUND_HALF_EVEN = "ROUND_HALF_EVEN"
ROUND_CEILING = "ROUND_CEILING"
ROUND_FLOOR = "ROUND_FLOOR"
ROUND_UP = "ROUND_UP"
ROUND_HALF_DOWN = "ROUND_HALF_DOWN"
ROUND_05UP = "ROUND_05UP"


class Rounded(DecimalException):
    pass


class Inexact(DecimalException):
    pass


class Overflow(DecimalException):
    pass


class Underflow(Inexact, Rounded):
    pass


class Subnormal(DecimalException):
    pass


class DivisionByZero(DecimalException, ZeroDivisionError):
    pass


class Clamped(DecimalException):
    pass


class FloatOperation(DecimalException, TypeError):
    pass
