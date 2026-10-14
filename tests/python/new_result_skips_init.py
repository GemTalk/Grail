"""__init__ runs only on a __new__ result that is an instance of the class.

CPython's type.__call__ calls __init__ on what __new__ returned only when
it is an instance of the class called -- by its MRO, not __instancecheck__.
Grail called the returned object's __init__ anyway, with the original
arguments, so ``A(1)`` for a ``__new__`` returning ``Other()`` raised
``TypeError: Other() takes no arguments`` (#1425); pytz's LazyList and
LazySet rely on the rule.

The rows cover a foreign object, None, an int, a builtin-subclass instance
built inside __new__ (pytz's shape), an object whose __init__ would have
corrupted it, and a class with an __instancecheck__ that claims the result.
The guards: a subclass instance and a multiple-inheritance subclass that has
the class as its SECOND base do get __init__, and an ordinary class still
does.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class Other:
    pass


class ReturnsOther:
    def __new__(cls, x=None):
        return Other()

    def __init__(self, x=None):
        raise AssertionError('ReturnsOther.__init__ ran')


class ReturnsNone:
    def __new__(cls, *args):
        return None


class ReturnsInt:
    def __new__(cls, x):
        return x * 2


class Recorder:
    def __init__(self, *args):
        self.inits = getattr(self, 'inits', 0) + 1


class ReturnsRecorder:
    def __new__(cls, *args):
        return Recorder()

    def __init__(self, *args):
        raise AssertionError('ReturnsRecorder.__init__ ran')


class LazyList(list):
    """pytz.lazy.LazyList's shape: a fresh inner list subclass per call."""

    def __new__(cls, fill_iter=None):
        # type() rather than pytz's class statement: a class statement inside
        # __new__ is #1424 on the IR arm.
        Inner = type('Inner', (list,), {})
        inner = Inner()
        inner.extend(fill_iter or ())
        return inner


class Meta(type):
    def __instancecheck__(cls, obj):
        return True


class ClaimsEverything(metaclass=Meta):
    def __new__(cls, x):
        return Other()

    def __init__(self, x):
        raise AssertionError('ClaimsEverything.__init__ ran')


class Base:
    def __new__(cls, *args):
        if cls is Base:
            return object.__new__(Child)
        return object.__new__(cls)

    def __init__(self, x):
        self.x = x


class Child(Base):
    pass


class Mixin:
    pass


class Second:
    def __new__(cls, x):
        return object.__new__(Both)

    def __init__(self, x):
        self.x = x


class Both(Mixin, Second):
    pass


class Plain:
    def __init__(self, x):
        self.x = x


t('foreign object', lambda: type(ReturnsOther(1)).__name__)
t('None', lambda: ReturnsNone(1, 2))
t('an int', lambda: ReturnsInt(21))
t('init would have run again', lambda: ReturnsRecorder(1).inits)
t('pytz LazyList', lambda: (type(LazyList([1, 2])).__name__, list(LazyList([1, 2]))))
t('__instancecheck__ is not asked', lambda: type(ClaimsEverything(1)).__name__)
t('guard: subclass instance gets __init__', lambda: (type(Base(5)).__name__, Base(5).x))
t('guard: second-base subclass gets __init__', lambda: (type(Second(7)).__name__, Second(7).x))
t('guard: ordinary class', lambda: Plain(3).x)


EXPECTED = {
    'foreign object': "'Other'",
    'None': 'None',
    'an int': '42',
    'init would have run again': '1',
    'pytz LazyList': "('Inner', [1, 2])",
    '__instancecheck__ is not asked': "'Other'",
    'guard: subclass instance gets __init__': "('Child', 5)",
    'guard: second-base subclass gets __init__': "('Both', 7)",
    'guard: ordinary class': '3',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
