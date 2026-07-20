# ``decimal'' for Grail.
#
# CPython's decimal is the IEEE 754-2008 reference for arbitrary-precision
# decimal arithmetic.  This module is a pragmatic subset that is nonetheless
# EXACT: a Decimal carries its value as a rational (_num / _den), so
# construction from a float captures the float's exact value and +, -, *, **
# are exact.  ``sqrt'' returns the correctly-rounded double of the exact
# rational (refined from the hardware sqrt via exact rational midpoint
# comparisons), and __float__ converts the exact rational to the nearest
# double.  Context/prec is a placeholder (arithmetic is already exact).
#
# TWO Grail gotchas shape the style below:
#  1. install.gs maps the bare name ``Decimal'' to GemStone's ScaledDecimal,
#     and in a method body that name resolves to ScaledDecimal (NOT this
#     class), so we use ``type(self)'' for every self-reference.
#  2. In a module literally named ``decimal'', a MODULE-LEVEL import or
#     function referenced from a method body mis-resolves (constructing a
#     Decimal then blew up in ___instance___).  So methods take no module-
#     level helpers: ratio conversion is inlined and ``import math'' is done
#     LOCALLY inside the one method that needs it (sqrt).


class Decimal:
    """A decimal value carried as an exact rational.  ``from decimal import
    Decimal'' binds this.  The optional ``context'' argument matches CPython's
    Decimal(value, context) form (twilio passes one); it is accepted and
    ignored."""

    def __init__(self, value=0, context=None):
        if isinstance(value, tuple):
            # internal fast construction from a pre-made (num, den) rational
            # (see _new) -- avoids re-deriving the ratio
            n, d = value
            if d < 0:
                n, d = -n, -d
            self._num = n
            self._den = d
            return
        if isinstance(value, type(self)):
            self._num = value._num
            self._den = value._den
            return
        if isinstance(value, int):
            n, d = value, 1
        elif isinstance(value, float):
            n, d = value.as_integer_ratio()
        elif isinstance(value, str):
            s = value.strip()
            neg = s.startswith('-')
            if neg or s.startswith('+'):
                s = s[1:]
            # Special values: this Decimal is rational-backed and can't hold a
            # real inf/nan, but Fraction(Decimal('inf')) / from_decimal() only
            # need construction + the right as_integer_ratio() exception, so a
            # marker suffices (arithmetic on specials is out of scope here).
            sl = s.lower()
            if sl == 'inf' or sl == 'infinity':
                self._special = 'inf'
                self._num, self._den = (-1 if neg else 1), 1
                return
            if sl == 'nan' or sl == 'snan':
                self._special = 'nan'
                self._num, self._den = 0, 1
                return
            s = s.replace('E', 'e')
            exp = 0
            if 'e' in s:
                s, estr = s.split('e')
                exp = int(estr)
            if '.' in s:
                whole, frac = s.split('.')
            else:
                whole, frac = s, ''
            n = int((whole + frac) or '0')
            if neg:
                n = -n
            shift = exp - len(frac)      # value = n * 10**shift
            if shift >= 0:
                n = n * 10 ** shift
                d = 1
            else:
                d = 10 ** (-shift)
        else:
            n, d = float(value).as_integer_ratio()
        if d < 0:
            n, d = -n, -d
        self._num = n
        self._den = d

    def _ratio(self, other):
        """(num, den) of another operand, or None if not coercible."""
        if isinstance(other, type(self)):
            return other._num, other._den
        if isinstance(other, int):
            return other, 1
        if isinstance(other, float):
            return other.as_integer_ratio()
        return None

    def _new(self, n, d):
        """Build a sibling Decimal from a pre-made rational (via the tuple
        fast path in __init__ -- cls.__new__(cls) mis-dispatches in Grail)."""
        return type(self)((n, d))

    def __repr__(self):
        return "Decimal('" + str(float(self)) + "')"

    def __str__(self):
        return str(float(self))

    def __float__(self):
        # NB: in Grail ``int / int'' yields a Fraction (not a Python float);
        # float() of that Fraction is the correctly-rounded double.
        return float(self._num / self._den)

    def __int__(self):
        return self._num // self._den

    def as_integer_ratio(self):
        """Exact value as a coprime (numerator, denominator) pair with a
        positive denominator.  ``Fraction(Decimal(...))'' and
        ``Fraction.from_decimal()'' consume this (the internal _num/_den are
        not kept reduced, so divide out the gcd here).  math is imported
        LOCALLY -- a module-level import mis-resolves in a module named
        ``decimal'' (see the header note)."""
        sp = getattr(self, '_special', None)
        if sp == 'inf':
            raise OverflowError("cannot convert Infinity to integer ratio")
        if sp == 'nan':
            raise ValueError("cannot convert NaN to integer ratio")
        import math
        g = math.gcd(self._num, self._den)
        if g == 0:
            g = 1
        return (self._num // g, self._den // g)

    def __bool__(self):
        return self._num != 0

    def __hash__(self):
        return hash(float(self._num / self._den))

    def __neg__(self):
        return self._new(-self._num, self._den)

    def __pos__(self):
        return self._new(self._num, self._den)

    def __abs__(self):
        return self._new(abs(self._num), self._den)

    # --- exact rational arithmetic ---

    def __add__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(self._num * od + on * self._den, self._den * od)

    __radd__ = __add__

    def __sub__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(self._num * od - on * self._den, self._den * od)

    def __rsub__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(on * self._den - self._num * od, self._den * od)

    def __mul__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(self._num * on, self._den * od)

    __rmul__ = __mul__

    def __truediv__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(self._num * od, self._den * on)

    def __rtruediv__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._new(on * self._den, od * self._num)

    def __pow__(self, exp):
        if isinstance(exp, type(self)) and exp._den == 1:
            exp = exp._num
        if not isinstance(exp, int):
            return NotImplemented
        if exp >= 0:
            return self._new(self._num ** exp, self._den ** exp)
        return self._new(self._den ** (-exp), self._num ** (-exp))

    def sqrt(self, context=None):
        """Correctly-rounded double sqrt of the exact rational value: start
        from the hardware sqrt, then step toward the true root while the exact
        value lies past the squared midpoint to a float neighbour.  math is
        imported LOCALLY (a module-level import mis-resolves in a method of a
        module named ``decimal'')."""
        import math
        n, d = self._num, self._den
        if n == 0:
            return type(self)(0.0)
        approx = math.sqrt(n / d)
        # The midpoint between two adjacent doubles needs one extra bit, so it
        # must be formed as an EXACT rational -- (approx + nb) / 2 in float
        # rounds the half away and mis-rounds the result by 1 ulp.
        while True:
            up = math.nextafter(approx, math.inf)
            an, ad = approx.as_integer_ratio()
            un, ud = up.as_integer_ratio()
            mn = an * ud + un * ad            # midpoint numerator (over 2*ad*ud)
            md = 2 * ad * ud
            if n * md * md > mn * mn * d:      # value > midpoint**2 -> go up
                approx = up
            else:
                break
        while True:
            down = math.nextafter(approx, -math.inf)
            an, ad = approx.as_integer_ratio()
            dn, dd = down.as_integer_ratio()
            mn = an * dd + dn * ad
            md = 2 * ad * dd
            if n * md * md < mn * mn * d:      # value < midpoint**2 -> go down
                approx = down
            else:
                break
        return type(self)(approx)

    # --- comparisons (exact rational cross-multiply; den > 0) ---

    def __eq__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od == on * self._den

    def __ne__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od != on * self._den

    def __lt__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od < on * self._den

    def __le__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od <= on * self._den

    def __gt__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od > on * self._den

    def __ge__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od >= on * self._den


class DecimalException(Exception):
    pass


class InvalidOperation(DecimalException):
    pass


class Context:
    """Precision/rounding context placeholder.  ``prec'' is stored but does
    not truncate -- the rational arithmetic above is already exact."""

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
    decimal.localcontext(ctx):'' just scopes the context object.  It does NOT
    swap a module global: the arithmetic here is already exact so ``prec'' is
    unused, and referencing a module-level global from a method of a module
    named ``decimal'' mis-resolves in Grail (see the module header)."""

    def __init__(self, ctx):
        self._ctx = ctx

    def __enter__(self):
        return self._ctx

    def __exit__(self, exc_type, exc_value, tb):
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
