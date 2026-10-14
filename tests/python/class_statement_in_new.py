"""A class statement inside __new__ (and the implicit classmethods) works.

The IR arm compiles a class statement into a helper method on the enclosing
class's instance side and sends it to ``self``.  __new__, __init_subclass__
and __class_getitem__ compile instance-side but run with the CLASS as their
receiver, so the send looked on the metaclass, and the call died with an
uncatchable MessageNotUnderstood (#1424).  pytz's LazyList and LazySet define
a class in __new__, so ``import pytz`` failed on the IR arm.

The rows cover the issue's shape, a class statement in a def nested inside
__new__, pytz's LazyList / LazySet, a class capturing a __new__ local, and the
two implicit classmethods.  A class statement in a classmethod and in an
ordinary method -- already right -- are the guards.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class Plain:
    def __new__(cls):
        class Inner:
            pass
        obj = super().__new__(cls)
        obj.inner = Inner.__name__
        return obj


class Nested:
    def __new__(cls):
        def make():
            class Deep:
                pass
            return Deep
        obj = super().__new__(cls)
        obj.deep = make().__qualname__
        return obj


class Captures:
    def __new__(cls, n):
        class Holder:
            value = n * 2
        obj = super().__new__(cls)
        obj.value = Holder.value
        return obj


class LazyList(list):
    """pytz.lazy.LazyList, reduced: a fresh list subclass per call."""

    def __new__(cls, fill_iter=None):
        if fill_iter is None:
            return list()

        class LazyList(list):
            pass

        inner = LazyList()
        inner.extend(fill_iter)
        return inner


class LazySet(set):
    """pytz.lazy.LazySet, reduced."""

    def __new__(cls, fill_iter=None):
        if fill_iter is None:
            return set()

        class LazySet(set):
            pass

        inner = LazySet()
        inner.update(fill_iter)
        return inner


class Base:
    made = None

    def __init_subclass__(cls, **kw):
        class Tag:
            pass
        cls.made = Tag.__name__


class Sub(Base):
    pass


class Generic:
    def __class_getitem__(cls, item):
        class Alias:
            pass
        return (Alias.__name__, item)


class ClassMethodGuard:
    @classmethod
    def make(cls):
        class Inner:
            pass
        return Inner.__name__


class MethodGuard:
    def make(self):
        class Inner:
            pass
        return Inner.__name__


t('class statement in __new__', lambda: (type(Plain()).__name__, Plain().inner))
t('in a def nested in __new__', lambda: Nested().deep)
t('capturing a __new__ local', lambda: Captures(21).value)
t('pytz LazyList', lambda: (type(LazyList([3, 1])).__name__, list(LazyList([3, 1]))))
t('pytz LazySet', lambda: (type(LazySet([2])).__name__, sorted(LazySet([2]))))
t('twice', lambda: [type(LazyList([i])).__name__ for i in range(2)])
t('__init_subclass__', lambda: Sub.made)
t('__class_getitem__', lambda: Generic[int])
t('guard: classmethod', lambda: ClassMethodGuard.make())
t('guard: method', lambda: MethodGuard().make())


EXPECTED = {
    'class statement in __new__': "('Plain', 'Inner')",
    'in a def nested in __new__': "'Nested.__new__.<locals>.make.<locals>.Deep'",
    'capturing a __new__ local': '42',
    'pytz LazyList': "('LazyList', [3, 1])",
    'pytz LazySet': "('LazySet', [2])",
    'twice': "['LazyList', 'LazyList']",
    '__init_subclass__': "'Tag'",
    '__class_getitem__': "('Alias', <class 'int'>)",
    'guard: classmethod': "'Inner'",
    'guard: method': "'Inner'",
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
