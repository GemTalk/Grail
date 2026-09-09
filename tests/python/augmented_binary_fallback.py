"""`x += y` must find a binary dunder that has optional parameters.

`object >> ___augmentedOp___:inplace:binary:` tries the in-place dunder
(`__iadd__`) and falls back to the binary one (`__add__`).  For the
in-place half it probed BOTH shapes -- the fixed-arity `__iadd__:` and the
varargs `___iadd__:kw:` -- and for the binary half it probed only
`__add__:`.

That asymmetry is a real gap rather than a tidiness point, because
`__add__:` is not a selector every class with an `__add__` has:

    def __add__(self, other):                  ->  __add__:
    def __add__(self, other, context=None):    ->  ___add__:kw:

and the second gets no fixed-arity forwarder either -- correctly, since
those exist to OVERRIDE a superclass method and `object` has no
`__add__:` to override (its binary operators go through
`___binOpAdd___:`).

So `x + 5` worked and `x += 5` did not, for the same class and the same
method.  `_pydecimal`'s `Decimal` is exactly that shape -- every
arithmetic dunder there takes an optional `context` -- which cost
`test_decimal` eight tests, every one reported as `unsupported operand
type(s)`.

Most of what is below is the REGRESSION half.  This method carries
several hard-won behaviours -- a `None` in-place dunder disabling the
operator, `NotImplemented` falling through, an unbound local still
raising `UnboundLocalError`, the reflected fallback for a receiver with
no `__add__` at all -- and a new branch in the middle of it is exactly
the kind of change that quietly breaks one.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ------------------------------------ the shape that did not work

class WithOptional:
    """Every binary dunder takes an optional extra parameter, as
    _pydecimal.Decimal's do."""

    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return 'W(%r)' % self.v

    def __eq__(self, other):
        return isinstance(other, WithOptional) and self.v == other.v

    def __add__(self, other, context=None):
        return WithOptional(self.v + other)

    def __sub__(self, other, context=None):
        return WithOptional(self.v - other)

    def __mul__(self, other, context=None):
        return WithOptional(self.v * other)

    def __floordiv__(self, other, context=None):
        return WithOptional(self.v // other)


class Plain:
    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return 'P(%r)' % self.v

    def __eq__(self, other):
        return isinstance(other, Plain) and self.v == other.v

    def __add__(self, other):
        return Plain(self.v + other)


def _augmented_with_optional_parameter():
    a = WithOptional(1)
    a += 5
    b = WithOptional(10)
    b -= 3
    c = WithOptional(2)
    c *= 4
    d = WithOptional(9)
    d //= 2
    return (a, b, c, d)


def _the_plain_operator_still_works():
    return (WithOptional(1) + 5, WithOptional(1) - 5)


def _a_plain_dunder_is_unaffected():
    p = Plain(1)
    p += 5
    return (p, Plain(1) + 5)


check('augmented_with_optional_parameter', _augmented_with_optional_parameter(),
      (WithOptional(6), WithOptional(7), WithOptional(8), WithOptional(4)))
check('the_plain_operator_still_works', _the_plain_operator_still_works(),
      (WithOptional(6), WithOptional(-4)))
check('a_plain_dunder_is_unaffected', _a_plain_dunder_is_unaffected(),
      (Plain(6), Plain(6)))


# --------------------------------------------- the regression half

class HasInPlace:
    def __init__(self, v):
        self.v = v
        self.used = None

    def __iadd__(self, other):
        self.used = 'iadd'
        self.v += other
        return self

    def __add__(self, other):
        self.used = 'add'
        return HasInPlace(self.v + other)


class InPlaceDeclines:
    """__iadd__ answering NotImplemented must fall through to __add__."""

    def __init__(self, v):
        self.v = v

    def __iadd__(self, other):
        return NotImplemented

    def __add__(self, other, context=None):
        return InPlaceDeclines(self.v + other)


class InPlaceDisabled:
    """__iadd__ = None DISABLES the operator, and blocks the binary
    fallback too -- unlike a merely missing __iadd__."""

    __iadd__ = None

    def __add__(self, other):
        return 'should not be reached'


def _the_in_place_dunder_still_wins():
    x = HasInPlace(1)
    x += 5
    return (x.used, x.v)


def _not_implemented_falls_through():
    x = InPlaceDeclines(1)
    x += 5
    return x.v


def _none_disables_the_operator():
    def go():
        x = InPlaceDisabled()
        x += 5
        return x
    return _outcome(go)[0]


def _an_unbound_local_still_raises():
    def go():
        y += 1          # noqa: F821
        return y
    return _outcome(go)[0]


def _the_reflected_fallback_still_works():
    """A receiver with no __add__ at all reaches the right operand's
    __radd__."""
    class NoAdd:
        pass

    class Reflected:
        def __radd__(self, other):
            return 'radd'

    def go():
        x = NoAdd()
        x += Reflected()
        return x

    return _outcome(go)[1]


check('the_in_place_dunder_still_wins', _the_in_place_dunder_still_wins(),
      ('iadd', 6))
check('not_implemented_falls_through', _not_implemented_falls_through(), 6)
check('none_disables_the_operator', _none_disables_the_operator(), 'TypeError')
check('an_unbound_local_still_raises', _an_unbound_local_still_raises(),
      'UnboundLocalError')
check('the_reflected_fallback_still_works',
      _the_reflected_fallback_still_works(), 'radd')


def _a_varargs_dunder_answering_not_implemented_defers():
    """The in-place branch has always honoured a NotImplemented return by
    falling through; the varargs binary branch has to as well, or a
    defaulted-parameter __add__ that declines would swallow the reflected
    operation the fixed-arity one would have reached."""

    class Declines:
        def __add__(self, other, context=None):
            return NotImplemented

    class Accepts:
        def __radd__(self, other):
            return 'radd'

    def go():
        x = Declines()
        x += Accepts()
        return x

    return _outcome(go)[1]


def _a_varargs_dunder_declining_with_no_reflection_raises():
    class Declines:
        def __add__(self, other, context=None):
            return NotImplemented

    def go():
        x = Declines()
        x += 5
        return x

    return _outcome(go)[0]


check('a_varargs_dunder_answering_not_implemented_defers',
      _a_varargs_dunder_answering_not_implemented_defers(), 'radd')
check('a_varargs_dunder_declining_with_no_reflection_raises',
      _a_varargs_dunder_declining_with_no_reflection_raises(), 'TypeError')


# --------------------------------------- builtins are untouched

def _builtins_still_augment():
    n = 1
    n += 2
    s = 'a'
    s += 'b'
    lst = [1]
    lst += [2]
    t = (1,)
    t += (2,)
    f = 1.5
    f += 0.5
    return (n, s, lst, t, f)


def _an_unsupported_pair_still_raises():
    def go():
        x = 1
        x += 'a'
        return x
    return _outcome(go)[0]


check('builtins_still_augment', _builtins_still_augment(),
      (3, 'ab', [1, 2], (1, 2), 2.0))
check('an_unsupported_pair_still_raises',
      _an_unsupported_pair_still_raises(), 'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
