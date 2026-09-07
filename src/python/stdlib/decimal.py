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

    def _ratio(self, other, comparison=False, equality_op=False):
        """(num, den) of another operand, or None if not coercible.

        Two widenings apply to COMPARISONS only, mirroring CPython's split
        between _convert_other (arithmetic) and _convert_for_comparison:
          * ``comparison'' admits any Rational (fractions.Fraction).  Mixed
            ARITHMETIC must keep raising TypeError -- ``Decimal + Fraction'' is
            a TypeError in CPython and test_fractions.testMixingWithDecimal
            asserts it in both directions.
          * ``equality_op'' additionally admits complex, which is legal for
            == / != only: no complex is ever ordered, so ``Decimal(1) < 1j''
            still raises TypeError (test_compare's assert_equality_only)."""
        if isinstance(other, type(self)):
            return other._num, other._den
        if isinstance(other, int):
            return other, 1
        if isinstance(other, float):
            return other.as_integer_ratio()
        # Any Rational (fractions.Fraction) is exact as numerator/denominator.
        # CPython's decimal reaches these through _convert_for_comparison;
        # without them Decimal('1001.0') == Fraction(2002, 2) was False, since
        # Fraction.__eq__ punts on a Decimal and the reflected side gave up too
        # (test_compare.test_numbers).  Comparisons only -- see the docstring.
        if comparison:
            num = getattr(other, "numerator", None)
            den = getattr(other, "denominator", None)
            if isinstance(num, int) and isinstance(den, int) and den != 0:
                return num, den
        # A complex with no imaginary part is EQUAL to its real part, as
        # everywhere else in the numeric tower (1001 == 1001+0j) -- but it is
        # never ORDERED, hence the equality_op gate.
        if equality_op and isinstance(other, complex):
            if other.imag == 0:
                return self._ratio(other.real)
            return None
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

    # --- rounding, truncated division and formatting ---
    #
    # All four are exactly computable on the rational form.  Two deliberate
    # semantic choices, both matching CPython's ``decimal'' rather than
    # Grail's own float behaviour:
    #
    #  * ROUNDING IS HALF-EVEN.  CPython's Decimal.__round__ rounds ties to
    #    even (round(Decimal('2.5')) == 2), and so does this.  Grail's
    #    builtin round() on a FLOAT is half-up (round(2.5) == 3), so a
    #    Decimal and a float deliberately disagree on a tie here -- the
    #    Decimal follows the decimal module it is part of.
    #  * // AND % TRUNCATE TOWARD ZERO and the remainder takes the sign of
    #    the DIVIDEND, per the General Decimal Arithmetic divide-integer and
    #    remainder operations.  That is CPython's Decimal behaviour and it
    #    differs from int/float, which floor: Decimal(-7) // Decimal(2) is
    #    Decimal('-3') where -7 // 2 is -4, and Decimal(-7) % Decimal(2) is
    #    Decimal('-1') where -7 % 2 is 1.
    #
    # Division by zero raises ZeroDivisionError -- the same error __truediv__
    # already produces here -- not CPython's DivisionByZero/InvalidOperation
    # split, since this module has no signal machinery to route them through.
    # DivisionByZero below IS a ZeroDivisionError subclass, so an ``except
    # ZeroDivisionError'' catches both implementations.

    def _round_half_even(self, n, d):
        """Nearest integer to the exact rational n/d, ties to even.

        d is always positive (__init__ normalizes the sign), so ``n // d''
        floors and the remainder lands in [0, d).  Comparing 2*r against d
        keeps the tie test exact -- no division, no float."""
        q = n // d
        r = n - q * d
        twice = r * 2
        if twice > d:
            return q + 1
        if twice == d and q % 2 != 0:
            return q + 1
        return q

    def _trunc_q(self, an, ad):
        """Quotient of the exact rational an/ad truncated toward zero."""
        if ad < 0:
            an, ad = -an, -ad
        if an < 0:
            return -((-an) // ad)
        return an // ad

    def _ten_scale(self, den):
        """Exponent k when den is exactly 10**k, else None.

        __init__ builds a literal as (all its digits, 10**places) and never
        reduces, so the denominator still carries the literal's own scale:
        Decimal('1.5') is (15, 10), Decimal('1.50') is (150, 100),
        Decimal('1.500') is (1500, 1000), Decimal('100') is (100, 1),
        Decimal('0.001') is (1, 1000).  Multiplying by an integer keeps it --
        Decimal('19.99') * 3 is (5997, 100).  That k IS the exponent CPython's
        Decimal carries, so it is what a fixed-point format with no precision
        should show.  A denominator that is not a power of ten (a float's
        power of two, an exact division) has no such scale; None says so."""
        if den < 1:
            return None
        k = 0
        d = den
        while d % 10 == 0:
            d = d // 10
            k = k + 1
        if d != 1:
            return None
        return k

    def _exact_places(self):
        """Decimal places the shortest EXACT rendering needs, or None when the
        value has no finite decimal expansion.

        The fallback for a denominator _ten_scale cannot read: reduce, then
        count how many times 2 and 5 divide the denominator.  This is what
        makes a float-derived value come out right -- Decimal(0.1) holds the
        exact binary value over 2**55, and the 55-digit expansion it produces
        here is byte-for-byte CPython's format(Decimal(0.1), 'f').  Any other
        prime factor left over means no finite expansion exists at all, a
        state a CPython Decimal can never be in but this module's exact
        division reaches (Decimal(1) / Decimal(3)); None says so.  math is
        imported LOCALLY -- a module-level import mis-resolves in a method of
        a module named ``decimal'' (see the header note)."""
        import math
        n = self._num
        d = self._den
        g = math.gcd(n, d)
        if g > 1:
            d = d // g
        twos = 0
        while d % 2 == 0:
            d = d // 2
            twos = twos + 1
        fives = 0
        while d % 5 == 0:
            d = d // 5
            fives = fives + 1
        if d != 1:
            return None
        if twos > fives:
            return twos
        return fives

    def __round__(self, ndigits=None):
        """round(d) -> int, round(d, n) -> Decimal, both half-even.

        Defined with a DEFAULTED parameter on purpose: Grail's Python-class
        compiler emits the varargs selector ``___round__:kw:'' for that
        shape, which is the first thing builtins' round:/round:_: probes.
        Without it, round(d, 2) fell through to the kernel arithmetic at the
        end of round:_: and sent an env-0 #* to this PythonInstance, which
        died as an UNCATCHABLE Smalltalk MessageNotUnderstood
        (``a Decimal does not understand #*'') rather than any Python error."""
        if ndigits is None:
            return self._round_half_even(self._num, self._den)
        if not isinstance(ndigits, int):
            raise TypeError("'" + type(ndigits).__name__ +
                            "' object cannot be interpreted as an integer")
        if ndigits >= 0:
            scale = 10 ** ndigits
            return self._new(
                self._round_half_even(self._num * scale, self._den), scale)
        scale = 10 ** (-ndigits)
        return self._new(
            self._round_half_even(self._num, self._den * scale) * scale, 1)

    def __floordiv__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if on == 0:
            raise ZeroDivisionError("division by zero")
        return self._new(self._trunc_q(self._num * od, self._den * on), 1)

    def __rfloordiv__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if self._num == 0:
            raise ZeroDivisionError("division by zero")
        return self._new(self._trunc_q(on * self._den, od * self._num), 1)

    def __mod__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if on == 0:
            raise ZeroDivisionError("division by zero")
        q = self._trunc_q(self._num * od, self._den * on)
        return self._new(self._num * od - q * on * self._den, self._den * od)

    def __rmod__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if self._num == 0:
            raise ZeroDivisionError("division by zero")
        q = self._trunc_q(on * self._den, od * self._num)
        return self._new(on * self._den - q * self._num * od, od * self._den)

    def __divmod__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if on == 0:
            raise ZeroDivisionError("division by zero")
        q = self._trunc_q(self._num * od, self._den * on)
        return (self._new(q, 1),
                self._new(self._num * od - q * on * self._den, self._den * od))

    def __rdivmod__(self, other):
        r = self._ratio(other)
        if r is None:
            return NotImplemented
        on, od = r
        if self._num == 0:
            raise ZeroDivisionError("division by zero")
        q = self._trunc_q(on * self._den, od * self._num)
        return (self._new(q, 1),
                self._new(on * self._den - q * self._num * od, od * self._den))

    def __format__(self, spec):
        """format(d, spec) for the part of the format mini-language an exact
        rational can honour:

            [[fill]align][sign][0][width][,][.precision][type]

        with type '' or 's' (the str() form) and 'f'/'F' (fixed point,
        half-even).  A fixed-point spec naming no precision shows the value's
        own digits, as CPython's Decimal does -- format(d, 'f') is '1.5', not
        float's '1.500000'.  'e', 'g' and '%' RAISE ValueError instead of
        guessing:
        they need a decimal exponent, and this representation carries a
        numerator and a denominator, not a coefficient and an exponent.

        object.__format__ -- what a Decimal inherited before this -- rejects
        every non-empty spec, so f'{d:.2f}' was a TypeError and there was no
        two-decimal-place path at all (this module has no quantize)."""
        if spec is None:
            spec = ""
        if not isinstance(spec, str):
            raise TypeError("__format__() argument must be str")
        fill = " "
        align = ""
        sign = "-"
        zero = False
        width = 0
        comma = False
        precision = None
        i = 0
        size = len(spec)
        if size - i >= 2 and spec[i + 1] in "<>^=":
            fill = spec[i]
            align = spec[i + 1]
            i = i + 2
        elif size - i >= 1 and spec[i] in "<>^=":
            align = spec[i]
            i = i + 1
        if i < size and spec[i] in "+- ":
            sign = spec[i]
            i = i + 1
        if i < size and spec[i] == "#":
            raise ValueError(
                "Alternate form (#) not allowed in Decimal format specifier")
        if i < size and spec[i] == "0":
            zero = True
            if align == "":
                align = "="
            i = i + 1
        while i < size and spec[i] in "0123456789":
            width = width * 10 + int(spec[i])
            i = i + 1
        if i < size and spec[i] == ",":
            comma = True
            i = i + 1
        if i < size and spec[i] == ".":
            i = i + 1
            precision = 0
            seen = 0
            while i < size and spec[i] in "0123456789":
                precision = precision * 10 + int(spec[i])
                seen = seen + 1
                i = i + 1
            if seen == 0:
                raise ValueError("Format specifier missing precision")
        code = ""
        if i < size:
            code = spec[i]
            i = i + 1
        if i != size:
            raise ValueError("Invalid format specifier")

        if code == "" or code == "s":
            if precision is not None:
                raise ValueError(
                    "Precision not allowed in Decimal format specifier "
                    "with type " + repr(code))
            body = str(self)
            negative = len(body) > 0 and body[0] == "-"
            if negative:
                body = body[1:]
            if align == "" and code == "s":
                align = "<"
        else:
            if code != "f" and code != "F":
                raise ValueError("Unknown format code '" + code +
                                 "' for object of type 'Decimal'")
            if precision is None:
                # NOT six places.  Six is FLOAT's rule -- format(1.5, 'f') is
                # '1.500000' -- and CPython's Decimal does not follow it: with
                # no precision named it shows the value's own digits, so
                # format(Decimal('1.5'), 'f') is '1.5' and
                # format(Decimal('1.50'), 'f') is '1.50'.  The denominator
                # carries that scale for a literal; failing that, the exact
                # expansion; failing that (a non-terminating rational, which
                # only this module's exact division can produce), six.
                precision = self._ten_scale(self._den)
                if precision is None:
                    precision = self._exact_places()
                if precision is None:
                    precision = 6
            scale = 10 ** precision
            q = self._round_half_even(self._num * scale, self._den)
            negative = q < 0
            if negative:
                q = -q
            whole = q // scale
            body = str(whole)
            if precision > 0:
                frac = str(q - whole * scale)
                while len(frac) < precision:
                    frac = "0" + frac
                body = body + "." + frac

        if comma:
            head = body
            tail = ""
            at = -1
            k = 0
            while k < len(body):
                if body[k] == ".":
                    at = k
                    k = len(body)
                else:
                    k = k + 1
            if at >= 0:
                head = body[:at]
                tail = body[at:]
            grouped = ""
            count = 0
            k = len(head)
            while k > 0:
                k = k - 1
                grouped = head[k] + grouped
                count = count + 1
                if count % 3 == 0 and k > 0:
                    grouped = "," + grouped
            body = grouped + tail

        if negative:
            prefix = "-"
        elif sign == "+":
            prefix = "+"
        elif sign == " ":
            prefix = " "
        else:
            prefix = ""

        text = prefix + body
        if len(text) >= width:
            return text
        pad = width - len(text)
        if zero:
            padchar = "0"
        else:
            padchar = fill
        if align == "=":
            return prefix + (padchar * pad) + body
        if align == "<":
            return text + (padchar * pad)
        if align == "^":
            left = pad // 2
            return (padchar * left) + text + (padchar * (pad - left))
        return (padchar * pad) + text

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
        r = self._ratio(other, comparison=True, equality_op=True)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od == on * self._den

    def __ne__(self, other):
        r = self._ratio(other, comparison=True, equality_op=True)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od != on * self._den

    def __lt__(self, other):
        r = self._ratio(other, comparison=True)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od < on * self._den

    def __le__(self, other):
        r = self._ratio(other, comparison=True)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od <= on * self._den

    def __gt__(self, other):
        r = self._ratio(other, comparison=True)
        if r is None:
            return NotImplemented
        on, od = r
        return self._num * od > on * self._den

    def __ge__(self, other):
        r = self._ratio(other, comparison=True)
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

# CPython sets this True when the current context is held in a ContextVar, so a
# coroutine or thread gets its own.  FALSE here, and deliberately: `getcontext`
# answers one module global and `localcontext` does not swap it (see
# _LocalContext), so two tasks share a context.  The value is read by
# test.test_asyncio.test_context, whose one test interleaves two coroutines at
# different precisions -- exactly what a shared context cannot do -- so the
# honest answer skips it instead of failing it.  Making this True is part of
# giving decimal a real per-task context, not a separate flag to flip.
HAVE_CONTEXTVAR = False

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
