"""A metaclass's `__call__` owns instantiation.

`Owned(...)` is `type(Owned).__call__(Owned, ...)` in CPython, so a
metaclass that defines `__call__` replaces `__new__`/`__init__`
entirely.  Grail went straight to `__new__`/`__init__` and the metaclass
never ran -- the singleton and registry idioms built on this silently
produced a fresh ordinary instance every time, which is the wrong-answer
half of a conformance gap rather than the missing-error half.

The check has to live in BOTH entry points -- the per-class
`value:value:` ClassDefAst synthesizes and the built-in fallback on
`object` class -- or which one a class happens to use would decide
whether the metaclass runs.

It is emitted for every class rather than only for one written with a
`metaclass=` keyword, because a metaclass is INHERITED: `class
Sub(Owned)` has it too.

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


LOG = []


class CallMeta(type):
    def __call__(cls, *args, **kwargs):
        LOG.append('meta-call')
        return ('META', args, kwargs)


class Owned(metaclass=CallMeta):
    def __init__(self, *args, **kwargs):
        LOG.append('init-ran')


class Inheriting(Owned):
    """A metaclass is inherited, as in CPython."""


# ------------------------------------------- the metaclass takes over

def _call_replaces_instantiation():
    del LOG[:]
    return (Owned(), list(LOG))


def _arguments_reach_the_metaclass():
    return Owned(1, 2, k=3)


def _new_and_init_do_not_run():
    """__call__ that never delegates means the class's own __init__ is
    not called at all -- the log is the assertion."""
    del LOG[:]
    Owned(9)
    return list(LOG)


def _an_inherited_metaclass_too():
    del LOG[:]
    return (Inheriting(), list(LOG))


check('call_replaces_instantiation', _call_replaces_instantiation(),
      (('META', (), {}), ['meta-call']))
check('arguments_reach_the_metaclass', _arguments_reach_the_metaclass(),
      ('META', (1, 2), {'k': 3}))
check('new_and_init_do_not_run', _new_and_init_do_not_run(), ['meta-call'])
check('an_inherited_metaclass_too', _an_inherited_metaclass_too(),
      (('META', (), {}), ['meta-call']))


# --------------------------------- a __call__ that DOES delegate

# The singleton registry lives at MODULE level, not on the metaclass.
# CPython writes it as a metaclass class attribute (`_instances = {}`), but
# a metaclass's class-body ATTRIBUTE is not reachable from the class in
# Grail -- `cls._instances` raises AttributeError -- which is a separate
# gap recorded in docs/Issues.md.  Holding it here keeps this fixture
# measuring what it is for: that `super().__call__` still constructs.
_INSTANCES = {}


class SingletonMeta(type):
    """The idiom this gap made unusable."""

    def __call__(cls, *args, **kwargs):
        if cls not in _INSTANCES:
            _INSTANCES[cls] = super().__call__(*args, **kwargs)
        return _INSTANCES[cls]


class Singleton(metaclass=SingletonMeta):
    def __init__(self, value=None):
        self.value = value


def _super_call_still_constructs():
    a = Singleton(1)
    b = Singleton(2)
    return (a is b, a.value, isinstance(a, Singleton))


check('super_call_still_constructs', _super_call_still_constructs(),
      (True, 1, True))


# ------------------------------------------- what must NOT change

class Plain:
    def __init__(self, x=0):
        self.x = x


class QuietMeta(type):
    def unrelated(cls):
        return 'unrelated'


class Quiet(metaclass=QuietMeta):
    def __init__(self, x=0):
        self.x = x


class WithNew:
    def __new__(cls, *a):
        obj = object.__new__(cls)
        obj.made_by_new = True
        return obj

    def __init__(self, x=0):
        self.x = x


def _a_plain_class_still_constructs():
    p = Plain(7)
    return (type(p).__name__, p.x)


def _a_metaclass_without_call_still_constructs():
    q = Quiet(5)
    return (type(q).__name__, q.x, Quiet.unrelated())


def _new_and_init_still_run():
    w = WithNew(3)
    return (w.made_by_new, w.x)


def _builtins_still_construct():
    return (list('ab'), dict(a=1), set([1, 1]), tuple([2]))


check('a_plain_class_still_constructs', _a_plain_class_still_constructs(),
      ('Plain', 7))
check('a_metaclass_without_call_still_constructs',
      _a_metaclass_without_call_still_constructs(), ('Quiet', 5, 'unrelated'))
check('new_and_init_still_run', _new_and_init_still_run(), (True, 3))
check('builtins_still_construct', _builtins_still_construct(),
      (['a', 'b'], {'a': 1}, {1}, (2,)))


# ---------------------------------- __call__ may return anything

class NoneMeta(type):
    def __call__(cls, *args, **kwargs):
        return None


class ReturnsNone(metaclass=NoneMeta):
    pass


def _call_may_return_none():
    """None is a legal answer, so ``no metaclass __call__'' cannot be
    signalled by nil -- the implementation uses a distinct marker."""
    return ReturnsNone() is None


check('call_may_return_none', _call_may_return_none(), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
