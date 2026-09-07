"""A `*args` override must replace the inherited method it overrides.

Grail compiles `def m(self, x)` to a fixed-arity Smalltalk selector and
`def m(self, *a)` to a varargs one, so a call of `m(1)` sends the
fixed-arity selector.  `ClassDefAst` already emits fixed-arity FORWARDERS
so that an override written with a different signature still wins -- but
`FunctionDefAst >> fixedArityForwarderArities` enumerated NAMED positional
parameters, and a `*args` def has none.  Such a def therefore got no
forwarders and could not shadow a base method of any arity:

    class Mixin: pass
    class ACM:
        def __exit__(self, exc_type, exc_value, traceback): return 'BASE'
    class Sub(Mixin, ACM):
        def __exit__(self, *d): return 'OWN'

    Sub().__exit__(None, None, None)   # answered 'BASE'

Not a `with`-statement bug: a DIRECT call picked the base too, silently,
with no DNU.  It is how contextlib's ported ExitStack came to unwind
nothing -- every call reached `AbstractContextManager.__exit__`.

The forwarders are each gated on the superclass actually implementing
that selector, so offering candidates for a `*args` def costs nothing
where there is no base method to shadow.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# ------------------------------------------------ the shape that failed

class Mixin:
    pass


class ACM:
    def __exit__(self, exc_type, exc_value, traceback):
        return 'BASE'


class Sub(Mixin, ACM):
    def __exit__(self, *d):
        return 'OWN'


def _dunder_through_a_direct_call():
    return Sub().__exit__(None, None, None)


def _dunder_through_with():
    log = []

    class Base:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            log.append('BASE')
            return False

    class Over(Base):
        def __exit__(self, *d):
            log.append('OWN')
            return False

    with Over():
        pass
    return log


check('dunder_through_a_direct_call', _dunder_through_a_direct_call(), 'OWN')
check('dunder_through_with', _dunder_through_with(), ['OWN'])


# ------------------------------------------- every arity, not just three

class B0:
    def n(self):
        return 'base'


class S0(B0):
    def n(self, *a):
        return ('sub', a)


class B1:
    def m(self, x):
        return ('base', x)


class S1(B1):
    def m(self, *a):
        return ('sub', a)


class B4:
    def p(self, a, b, c, d):
        return 'base'


class S4(B4):
    def p(self, *a):
        return ('sub', len(a))


class BStar:
    def q(self, x, *rest):
        return 'base'


class SStar(BStar):
    def q(self, x, *rest):
        return ('sub', x, rest)


check('arity_zero', S0().n(), ('sub', ()))
check('arity_one', S1().m(5), ('sub', (5,)))
check('arity_four', S4().p(1, 2, 3, 4), ('sub', 4))
check('named_plus_star', SStar().q(1, 2, 3), ('sub', 1, (2, 3)))


# ------------------------------------------------- what must NOT change

def _the_base_still_answers_for_itself():
    return (B1().m(9), B0().n(), B4().p(1, 2, 3, 4))


def _a_star_method_still_takes_any_arity():
    """The forwarders bound which fixed-arity ENTRY POINTS exist; they do
    not bound what the def accepts."""
    class Free:
        def f(self, *a, **kw):
            return (a, kw)

    return (Free().f(), Free().f(1), Free().f(1, 2, 3, 4, 5, 6, 7),
            Free().f(1, k=2))


def _keywords_still_reach_a_star_override():
    class Base:
        def go(self, x):
            return 'base'

    class Over(Base):
        def go(self, *a, **kw):
            return ('over', a, kw)

    return (Over().go(1), Over().go(1, flag=True))


def _an_override_that_does_not_shadow_is_unaffected():
    """No base method of that name at all -- nothing to forward to."""
    class Lonely:
        def solo(self, *a):
            return ('solo', a)

    return Lonely().solo(1, 2)


check('the_base_still_answers_for_itself',
      _the_base_still_answers_for_itself(), (('base', 9), 'base', 'base'))
check('a_star_method_still_takes_any_arity',
      _a_star_method_still_takes_any_arity(),
      (((), {}), ((1,), {}), ((1, 2, 3, 4, 5, 6, 7), {}), ((1,), {'k': 2})))
check('keywords_still_reach_a_star_override',
      _keywords_still_reach_a_star_override(),
      (('over', (1,), {}), ('over', (1,), {'flag': True})))
check('an_override_that_does_not_shadow_is_unaffected',
      _an_override_that_does_not_shadow_is_unaffected(), ('solo', (1, 2)))


# --------------------------- an UNBOUND base call must reach the base

def _an_unbound_base_call_does_not_recurse():
    """The forwarder is a TRAMPOLINE: its body is a virtual re-send of the
    varargs form.  ``Base.m(self, ...)`` asks for BASE's implementation, so
    running the forwarder from there lands back on the subclass override
    that called it.  test_with's MockNested is exactly this shape and
    recursed until the stack ran out."""
    log = []

    class Base:
        def __exit__(self, *a):
            log.append('base')
            return False

    class Over(Base):
        def __exit__(self, *a):
            log.append('over')
            return Base.__exit__(self, *a)

    Over().__exit__(1, 2, 3)
    return log


def _an_unbound_base_call_from_a_fixed_override():
    """The mirror: a fixed-arity override calling a varargs base."""
    log = []

    class Base:
        def __exit__(self, *a):
            log.append('base')
            return False

    class Over(Base):
        def __exit__(self, exc_type, exc_value, traceback):
            log.append('over')
            return Base.__exit__(self, exc_type, exc_value, traceback)

    Over().__exit__(1, 2, 3)
    return log


def _an_unbound_base_call_through_with():
    log = []

    class Base:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            log.append('base')
            return False

    class Over(Base):
        def __enter__(self):
            return Base.__enter__(self)

        def __exit__(self, *a):
            log.append('over')
            return Base.__exit__(self, *a)

    with Over():
        pass
    return log


check('an_unbound_base_call_does_not_recurse',
      _an_unbound_base_call_does_not_recurse(), ['over', 'base'])
check('an_unbound_base_call_from_a_fixed_override',
      _an_unbound_base_call_from_a_fixed_override(), ['over', 'base'])
check('an_unbound_base_call_through_with',
      _an_unbound_base_call_through_with(), ['over', 'base'])


# ------------------------------------------------------------ __init__

def _init_is_still_excluded():
    """__init__ is deliberately varargs-only -- routing construction
    through varargs is what sidesteps the positional-arity cap, so it
    must not gain fixed-arity entry points."""
    class Base:
        def __init__(self, x):
            self.who = ('base', x)

    class Over(Base):
        def __init__(self, *a):
            self.who = ('over', a)

    return Over(1).who


check('init_is_still_excluded', _init_is_still_excluded(), ('over', (1,)))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
