"""Fixture: ``Cls.f(...)`` for a def with no parameter to be the receiver.

Python 3 has no unbound methods: ``Cls.f`` is the plain function, so
``Cls.f(1, 2)`` binds ``f``'s parameters to 1 and 2 and nothing else.  Grail
compiles a class-body def to a Smalltalk method whose first declared parameter
IS the receiver, and UnboundMethod substitutes the first argument for it.  A
def whose parameters do not start with such a name -- ``def f(*a)``,
``def f(*, x)``, ``def f(**kw)`` -- has nothing to substitute into:

  * ``Cls.f()`` asked the class for the unary method ``f``, but such a def
    compiles to the packed ``_f:kw:``.  The kernel's LookupError 2021 escaped
    -- a Smalltalk error that no Python ``except`` matches, so the program
    died -- and keyword arguments were dropped on the way.

  * ``Cls.f(1)`` refused the int as a receiver ("descriptor 'f' for 'C'
    objects doesn't apply to a 'int' object").

  * once the call ran with no receiver, a closure read inside the body
    looked for its cell through the receiver's class and found none, and
    ``Cls.g(x)`` with any non-instance ``x`` did the same.

UnboundMethod now runs such a def against its ``___noReceiver___`` object,
which the body's ``*args`` binding leaves out, and a closure cell missed
through the receiver is found through the running method's own class.

KNOWN_DIVERGENCES are refusals that remain, each a catchable TypeError:
the receiver parameter's own default (``def g(x=7)`` called as ``C.g()``),
a packed def with an int first argument (``def k(self, *a)`` called as
``C.k(1)``), and the extra argument CPython counts when a no-parameter def is
called on an instance.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__


class Star:
    def f(*a):
        return len(a)

    def fk(*a, **kw):
        return (a, sorted(kw))

    def ko(*, x):
        return x

    def ko_default(*, x=3):
        return x

    def none():
        return 'none'


r['star_no_args'] = Star.f()
r['star_int_args'] = (Star.f(1), Star.f(1, 2), Star.f(None), Star.f(True, 2.5))
r['star_object_args'] = (Star.f('s'), Star.f('s', 't'))
r['star_on_instance'] = Star().f()
r['star_kwargs'] = (Star.fk(), Star.fk(x=1), Star.fk(1, y=2))
r['star_bound_later'] = (lambda g: g())(Star.f)
r['star_getattr'] = getattr(Star, 'f')()
r['kwonly'] = (Star.ko(x=5), Star.ko_default(), Star.ko_default(x=4))
r['kwonly_missing'] = _err(lambda: Star.ko())
r['kwonly_positional'] = _err(lambda: Star.ko(1, x=2))
r['no_params'] = Star.none()
r['no_params_kwarg'] = _err(lambda: Star.none(x=1))


class Base:
    def f(*a):
        return ('base', len(a))


class Sub(Base):
    pass


r['inherited'] = (Sub.f(), Sub.f(1), Sub().f())


def make(v):
    class Local:
        def f(*a):
            return (v, len(a))

        def g(self):
            return v

        def h():
            return v

        def k(*, x):
            return (v, x)
    return Local


Local = make(9)
r['closure'] = (Local.f(), Local.f(1, 2), Local.h(), Local.k(x=3))
r['closure_foreign_receiver'] = (Local.g('foreign'), Local.g(Star()))
r['closure_instance'] = (Local().f(), Local().g())
r['closure_called_inside'] = (lambda: make(4).f())()


def uncaught_used_to_escape():
    """The original report: no handler could see the error."""
    try:
        return make(1).f()
    except BaseException as e:
        return type(e).__name__


r['uncaught_used_to_escape'] = uncaught_used_to_escape()


class Remaining:
    def g(x=7):
        return x

    def k(self, *a):
        return len(a)

    def ko(*, x=3):
        return x


r['receiver_default'] = _err(lambda: Remaining.g())
r['packed_int_receiver'] = _err(lambda: Remaining.k(1))
r['instance_extra_arg'] = _err(lambda: Remaining().ko())


EXPECTED = {
    'star_no_args': 0,
    'star_int_args': (1, 2, 1, 2),
    'star_object_args': (1, 2),
    'star_on_instance': 1,
    'star_kwargs': (((), []), ((), ['x']), ((1,), ['y'])),
    'star_bound_later': 0,
    'star_getattr': 0,
    'kwonly': (5, 3, 4),
    'kwonly_missing': 'TypeError',
    'kwonly_positional': 'TypeError',
    'no_params': 'none',
    'no_params_kwarg': 'TypeError',
    'inherited': (('base', 0), ('base', 1), ('base', 1)),
    'closure': ((9, 0), (9, 2), 9, (9, 3)),
    'closure_foreign_receiver': (9, 9),
    'closure_instance': ((9, 1), 9),
    'closure_called_inside': (4, 0),
    'uncaught_used_to_escape': (1, 0),
}

KNOWN_DIVERGENCES = {
    # CPython calls g() with its default; Grail raises TypeError (unbound
    # method), because x is compiled as the receiver.
    'receiver_default': 7,
    # CPython binds self = 1; the packed _k:kw: form cannot take a special
    # receiver, so Grail raises the descriptor TypeError.
    'packed_int_receiver': 0,
    # CPython: "ko() takes 0 positional arguments but 1 was given"; Grail
    # drops the instance and answers 3.
    'instance_extra_arg': 'TypeError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(KNOWN_DIVERGENCES)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
