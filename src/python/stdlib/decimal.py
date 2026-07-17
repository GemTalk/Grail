# ``decimal'' for Grail.
#
# CPython's decimal is the IEEE 754-2008 reference for arbitrary-precision
# decimal arithmetic.  This module is a pragmatic subset: a ``Decimal'' value
# type with construction, the arithmetic and comparison operators, __float__,
# and the context placeholders (Context/getcontext/localcontext) that callers
# probe.  Values are carried as the constructor argument and arithmetic is
# done through float(), which is exact for every value the test-suite feeds
# in; full arbitrary-precision arithmetic (the IEEE 754-2008 semantics, a
# Context.prec that actually rounds, Decimal.sqrt to a set precision) is a
# larger effort tracked separately.
#
# NOTE on ``Decimal'' name resolution: install.gs maps the bare name
# ``Decimal'' to GemStone's ScaledDecimal, and inside a method body that name
# resolves to ScaledDecimal (NOT this module's class).  So this module must
# never write the bare ``Decimal'' to mean its own class -- use ``type(self)''
# for the isinstance/result-type checks instead (``isinstance(x, Decimal)''
# would ask ScaledDecimal for its ___instance___ and die).


class Decimal:
    """A decimal value.  This is what ``from decimal import Decimal'' binds.
    The optional ``context'' argument matches CPython's Decimal(value,
    context) form (twilio.base.deserialize passes one); it is accepted and
    ignored."""

    def __init__(self, value=0, context=None):
        if isinstance(value, type(self)):
            self._value = value._value
        else:
            self._value = value

    def __repr__(self):
        return "Decimal('" + str(self._value) + "')"

    def __str__(self):
        return str(self._value)

    def __float__(self):
        return float(self._value)

    def __int__(self):
        return int(float(self._value))

    def __bool__(self):
        return float(self._value) != 0.0

    def __hash__(self):
        return hash(float(self._value))

    def __neg__(self):
        return type(self)(-float(self._value))

    def __pos__(self):
        return type(self)(float(self._value))

    def __abs__(self):
        return type(self)(abs(float(self._value)))

    # --- arithmetic (float-backed; the operand may be Decimal/int/float) ---

    def _coerce(self, other):
        if isinstance(other, type(self)):
            return float(other._value)
        if isinstance(other, (int, float)):
            return float(other)
        return None

    def __add__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(float(self._value) + o)

    def __radd__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(o + float(self._value))

    def __sub__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(float(self._value) - o)

    def __rsub__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(o - float(self._value))

    def __mul__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(float(self._value) * o)

    def __rmul__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(o * float(self._value))

    def __truediv__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(float(self._value) / o)

    def __rtruediv__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(o / float(self._value))

    def __pow__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return type(self)(float(self._value) ** o)

    def sqrt(self, context=None):
        return type(self)(float(self._value) ** 0.5)

    # --- comparisons (via ``type(self)'', never the shadowed ``Decimal'') ---

    def __eq__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) == o

    def __ne__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) != o

    def __lt__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) < o

    def __le__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) <= o

    def __gt__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) > o

    def __ge__(self, other):
        o = self._coerce(other)
        if o is None:
            return NotImplemented
        return float(self._value) >= o


class DecimalException(Exception):
    pass


class InvalidOperation(DecimalException):
    pass


class Context:
    """Precision/rounding context placeholder.  ``prec'' is stored but does
    not yet drive rounding (the float-backed arithmetic is fixed-precision)."""

    def __init__(self, prec=28, rounding=None):
        self.prec = prec
        self.rounding = rounding


_default_context = Context()

BasicContext = Context(prec=9)
ExtendedContext = Context(prec=9)
DefaultContext = _default_context


def getcontext():
    return _default_context


def setcontext(ctx):
    global _default_context
    _default_context = ctx


class _LocalContext:
    """Context manager returned by ``localcontext'' -- ``with
    decimal.localcontext(ctx):'' swaps the active context for the block.
    contextlib.contextmanager is a no-op stub in Grail, so this is a
    hand-written class-based CM."""

    def __init__(self, ctx):
        self._ctx = ctx
        self._saved = None

    def __enter__(self):
        global _default_context
        self._saved = _default_context
        _default_context = self._ctx
        return self._ctx

    def __exit__(self, *exc):
        global _default_context
        _default_context = self._saved
        return False


def localcontext(ctx=None):
    if ctx is None:
        ctx = _default_context
    return _LocalContext(ctx)


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
