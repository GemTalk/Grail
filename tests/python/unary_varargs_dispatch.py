"""A 0-arg send whose only same-named method is the VARARGS form is a CALL.

`def __neg__(self, other=None)` compiles to `___neg__:kw:` with no 0-arg
`__neg__`, so `-x` -- which UnaryOpAst emits as the bare Smalltalk send
`x __neg__` -- missed and reached `object >> doesNotUnderstand:args:envId:`.
There a branch answered a BoundMethod for any 0-arg send whose class had a
same-named callable form, including the varargs one.

So `-Decimal(45)` evaluated to the bound method OBJECT rather than
`Decimal('-45')`: no exception, no warning, just the wrong value flowing
onward.  `test_decimal` reported it as
`<BoundMethod object at 0x12f34a6> != Decimal('45')`.

That branch was written "for `f = obj.method` patterns", and reading a
method as an attribute does NOT come through it -- `AttributeAst` emits
`___pyAttrLoad___:`, which probes every arity variant (varargs included)
and makes its own BoundMethod.  What reached the branch was operators.

The REGRESSION HALF is therefore the important half of this file: it has
to show that reading a method still yields something callable rather than
its result, for every shape -- 0-arg, 0-arg-with-defaults, dunder, and
argument-taking -- because that is what the branch was believed to be for.

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


# ------------------------------- unary operators with optional parameters

class WithOptional:
    """Unary dunders that take an optional extra parameter, as
    _pydecimal.Decimal's do."""

    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, WithOptional) and self.v == other.v

    def __repr__(self):
        return 'W(%r)' % self.v

    def __neg__(self, context=None):
        return WithOptional(-self.v)

    def __pos__(self, context=None):
        return WithOptional(self.v)

    def __abs__(self, context=None):
        return WithOptional(abs(self.v))

    def __invert__(self, context=None):
        return WithOptional(~self.v)


class Plain:
    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, Plain) and self.v == other.v

    def __repr__(self):
        return 'P(%r)' % self.v

    def __neg__(self):
        return Plain(-self.v)

    def __pos__(self):
        return Plain(self.v)

    def __abs__(self):
        return Plain(abs(self.v))

    def __invert__(self):
        return Plain(~self.v)


def _unary_operators_with_optional_parameter():
    w = WithOptional(-45)
    return (-w, +w, abs(w), ~w)


def _unary_operators_plain():
    p = Plain(-45)
    return (-p, +p, abs(p), ~p)


check('unary_operators_with_optional_parameter',
      _unary_operators_with_optional_parameter(),
      (WithOptional(45), WithOptional(-45), WithOptional(45),
       WithOptional(44)))
check('unary_operators_plain', _unary_operators_plain(),
      (Plain(45), Plain(-45), Plain(45), Plain(44)))


# --------------------------- other 0-arg dunders reached the same way

class Sized:
    def __len__(self, context=None):
        return 3

    def __hash__(self, context=None):
        return 7

    def __str__(self, context=None):
        return 'sized!'


def _other_zero_arg_dunders_with_optional_parameter():
    s = Sized()
    return (len(s), hash(s), str(s), bool(s))


check('other_zero_arg_dunders_with_optional_parameter',
      _other_zero_arg_dunders_with_optional_parameter(),
      (3, 7, 'sized!', True))


# ------------------------------------------ THE REGRESSION HALF: reads

class Shapes:
    """One class carrying every method shape the DNU branch tested for."""

    def zero(self):
        return 'zero-called'

    def zero_defaulted(self, context=None):
        return 'zero_defaulted-called'

    def one(self, a):
        return 'one-called:%s' % a

    def two(self, a, b):
        return 'two-called:%s%s' % (a, b)

    def starred(self, *args, **kw):
        return 'starred-called:%s' % (args,)

    def __neg__(self, context=None):
        return 'neg-called'


def _reading_a_method_does_not_call_it():
    """The property the branch existed for: `f = obj.method` yields
    something callable, NOT the method's result."""
    k = Shapes()
    reads = (k.zero, k.zero_defaulted, k.one, k.two, k.starred, k.__neg__)
    return tuple(callable(r) for r in reads)


def _a_read_method_is_still_callable_afterwards():
    k = Shapes()
    f0 = k.zero
    f0d = k.zero_defaulted
    f1 = k.one
    f2 = k.two
    fs = k.starred
    fn = k.__neg__
    return (f0(), f0d(), f1('a'), f2('a', 'b'), fs(1, 2), fn())


def _a_read_is_not_the_result():
    """Stated as its own check because the defect was exactly this
    confusion in the other direction: a value where a callable belonged."""
    k = Shapes()
    return (k.zero != 'zero-called',
            k.zero_defaulted != 'zero_defaulted-called',
            k.__neg__ != 'neg-called')


def _calling_directly_still_works():
    k = Shapes()
    return (k.zero(), k.zero_defaulted(), k.one('a'), k.two('a', 'b'),
            k.starred(1, 2), k.__neg__())


check('reading_a_method_does_not_call_it',
      _reading_a_method_does_not_call_it(),
      (True, True, True, True, True, True))
check('a_read_method_is_still_callable_afterwards',
      _a_read_method_is_still_callable_afterwards(),
      ('zero-called', 'zero_defaulted-called', 'one-called:a',
       'two-called:ab', 'starred-called:(1, 2)', 'neg-called'))
check('a_read_is_not_the_result', _a_read_is_not_the_result(),
      (True, True, True))
check('calling_directly_still_works', _calling_directly_still_works(),
      ('zero-called', 'zero_defaulted-called', 'one-called:a',
       'two-called:ab', 'starred-called:(1, 2)', 'neg-called'))


# ------------------------------------------------ preferring a call
# must not INVENT one

def _wrong_arity_still_raises():
    """A method that genuinely needs an argument must not be satisfied by
    a 0-arg call just because the branch now prefers calling.  This is the
    fixed-arity half, which still answers a BoundMethod -- calling it with
    no arguments has to fail the same way CPython's does."""
    return _outcome(lambda: Shapes().one())[0]


def _a_read_of_a_missing_name_still_raises():
    return _outcome(lambda: Shapes().nope)[0]


check('wrong_arity_still_raises', _wrong_arity_still_raises(), 'TypeError')
check('a_read_of_a_missing_name_still_raises',
      _a_read_of_a_missing_name_still_raises(), 'AttributeError')


# NOT ASSERTED HERE: `-x` on a class with NO __neg__ of any shape.  CPython
# raises TypeError("bad operand type for unary -: 'X'"); Grail raises a
# Smalltalk MessageNotUnderstood that Python code cannot catch, so a check
# for it would abort this module rather than fail.  Measured identical with
# and without the change under test -- this branch only fires when the
# varargs form EXISTS, so the no-dunder path is untouched -- and recorded in
# docs/Issues.md as its own open defect.


# ------------------------------------------------- builtins are untouched

def _builtin_unary_operators():
    return (-5, +5, abs(-5), ~5, -2.5, abs(-2.5), len('abc'), len([1, 2]))


check('builtin_unary_operators', _builtin_unary_operators(),
      (-5, 5, 5, -6, -2.5, 2.5, 3, 2))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
