"""Arity errors from methods, counted as CPython counts them.

CPython's ``takes N positional arguments but M were given`` describes the
FUNCTION, which a bound method calls with its receiver first, so both numbers
include ``self`` (or a @classmethod's ``cls``): ``def ok(self)`` called
``C().ok(1)`` takes 1 positional argument but 2 were given.

Three fixes produce these messages, and this table checks them together across
the call shapes that reach each one: the generated arity checks count the
receiver (#1472), a fixed-arity @classmethod or @staticmethod reports a wrong
call from its signature (#1484), and a def that declares no parameter, called
with arguments through an instance, reports one too (BoundMethod >>
___instanceSideArityMessageFor___:given:) -- ``C().h(1)`` used to say ``h()
takes a different number of arguments (1 given)``.

The rows cover instance methods with plain, defaulted, keyword-only and
positional-only parameters, the explicit ``C.ok(C(), 1)`` form, __init__ through
the class call, @classmethod and @staticmethod both ways round, too few as well
as too many, and module and nested functions, whose counts have no receiver.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except TypeError as e:
        r[label] = 'TypeError: ' + str(e)

class C:
    def __init__(self, a=0): pass
    def ok(self): return 1
    def two(self, a): return a
    def d(self, a, b=1): return a
    def k(self, *, x): return x
    def kd(self, a, *, x=1): return a
    def po(self, a, /): return a
    def h(): return 'h'
    @classmethod
    def cm(cls, a): return a
    @staticmethod
    def st(a): return a
class I:
    def __init__(self, a): pass
def f(a): return a
def fd(a, b=2): return a
def outer():
    def g(a): return a
    return g
g = outer()
t('C().ok(1)', lambda: C().ok(1))
t('C().ok(1, 2)', lambda: C().ok(1, 2))
t('C().two(1, 2)', lambda: C().two(1, 2))
t('C().two()', lambda: C().two())
t('C().d(1, 2, 3)', lambda: C().d(1, 2, 3))
t('C().k(1)', lambda: C().k(1))
t('C().k(1, x=1)', lambda: C().k(1, x=1))
t('C().kd(1, 2)', lambda: C().kd(1, 2))
t('C().kd(1, 2, x=3)', lambda: C().kd(1, 2, x=3))
t('C().po(1, 2)', lambda: C().po(1, 2))
t('C().h(1)', lambda: C().h(1))
t('C.ok(C(), 1)', lambda: C.ok(C(), 1))
t('C.two(C(), 1, 2)', lambda: C.two(C(), 1, 2))
t('C.cm(1, 2)', lambda: C.cm(1, 2))
t('C().cm(1, 2)', lambda: C().cm(1, 2))
t('C.st(1, 2)', lambda: C.st(1, 2))
t('C().st(1, 2)', lambda: C().st(1, 2))
t('C(1, 2)', lambda: C(1, 2))
t('I(1, 2)', lambda: I(1, 2))
t('I()', lambda: I())
t('f(1, 2)', lambda: f(1, 2))
t('fd(1, 2, 3)', lambda: fd(1, 2, 3))
t('g(1, 2)', lambda: g(1, 2))
t('bound = C().two; bound(1, 2)', lambda: (lambda b: b(1, 2))(C().two))
t("getattr(C(), 'd')(1, 2, 3)", lambda: getattr(C(), 'd')(1, 2, 3))
t('C.cm()', lambda: C.cm())
t('C.st()', lambda: C.st())
t('C().h(1, 2)', lambda: C().h(1, 2))


EXPECTED = {
    'C().ok(1)': 'TypeError: C.ok() takes 1 positional argument but 2 were given',
    'C().ok(1, 2)': 'TypeError: C.ok() takes 1 positional argument but 3 were given',
    'C().two(1, 2)': 'TypeError: C.two() takes 2 positional arguments but 3 were given',
    'C().two()': "TypeError: C.two() missing 1 required positional argument: 'a'",
    'C().d(1, 2, 3)': 'TypeError: C.d() takes from 2 to 3 positional arguments but 4 were given',
    'C().k(1)': 'TypeError: C.k() takes 1 positional argument but 2 were given',
    'C().k(1, x=1)': 'TypeError: C.k() takes 1 positional argument but 2 positional arguments (and 1 keyword-only argument) were given',
    'C().kd(1, 2)': 'TypeError: C.kd() takes 2 positional arguments but 3 were given',
    'C().kd(1, 2, x=3)': 'TypeError: C.kd() takes 2 positional arguments but 3 positional arguments (and 1 keyword-only argument) were given',
    'C().po(1, 2)': 'TypeError: C.po() takes 2 positional arguments but 3 were given',
    'C().h(1)': 'TypeError: C.h() takes 0 positional arguments but 2 were given',
    'C.ok(C(), 1)': 'TypeError: C.ok() takes 1 positional argument but 2 were given',
    'C.two(C(), 1, 2)': 'TypeError: C.two() takes 2 positional arguments but 3 were given',
    'C.cm(1, 2)': 'TypeError: C.cm() takes 2 positional arguments but 3 were given',
    'C().cm(1, 2)': 'TypeError: C.cm() takes 2 positional arguments but 3 were given',
    'C.st(1, 2)': 'TypeError: C.st() takes 1 positional argument but 2 were given',
    'C().st(1, 2)': 'TypeError: C.st() takes 1 positional argument but 2 were given',
    'C(1, 2)': 'TypeError: C.__init__() takes from 1 to 2 positional arguments but 3 were given',
    'I(1, 2)': 'TypeError: I.__init__() takes 2 positional arguments but 3 were given',
    'I()': "TypeError: I.__init__() missing 1 required positional argument: 'a'",
    'f(1, 2)': 'TypeError: f() takes 1 positional argument but 2 were given',
    'fd(1, 2, 3)': 'TypeError: fd() takes from 1 to 2 positional arguments but 3 were given',
    'g(1, 2)': 'TypeError: outer.<locals>.g() takes 1 positional argument but 2 were given',
    'bound = C().two; bound(1, 2)': 'TypeError: C.two() takes 2 positional arguments but 3 were given',
    "getattr(C(), 'd')(1, 2, 3)": 'TypeError: C.d() takes from 2 to 3 positional arguments but 4 were given',
    'C.cm()': "TypeError: C.cm() missing 1 required positional argument: 'a'",
    'C.st()': "TypeError: C.st() missing 1 required positional argument: 'a'",
    'C().h(1, 2)': 'TypeError: C.h() takes 0 positional arguments but 3 were given',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r.get(key)
        print('%-4s %s -> %s' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('FAIL %s is not in EXPECTED' % extra)
