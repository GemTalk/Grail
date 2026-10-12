"""A class-body def that takes no positional argument, called through an
instance (issue #1434).

Grail strips a def's first declared parameter into the Smalltalk receiver.
``def h()`` and ``def ko(*, x=3)`` have none to strip, so the receiver used to
be dropped: ``C().h()`` answered 'h' where CPython raises, because the instance
is a positional argument the def does not take.  Such a def now opens with
UnboundMethod >> ___refuseReceiver___:positional:kw:kwonly:qualifiedName:,
which lets through only the receiver a call with none runs it against.

The rows are the call paths that reach such a def: through the class, through
an instance, a bound handle, a subclass, super(), a decorator that forwards its
arguments, a generator, a @classmethod (whose class is an argument too many in
the same way), and the defs that DO take the receiver (``*args``,
@staticmethod), which must not change.  Each row records the value or the
exception's type and message, so the counts in CPython's wording are checked
too.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import functools
import operator

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = type(e).__name__ + ': ' + str(e)


class C:
    def h():
        return 'h'

    def ko(*, x=3):
        return x

    def gen():
        yield 1

    @classmethod
    def cm():
        return 'cm'

    @staticmethod
    def st():
        return 'st'

    def m(*a):
        return len(a)

    def ok(self):
        return 'ok'


class D(C):
    pass


class E:
    def h():
        return 'e'
    X = h()


class G:
    def h():
        return 'g'
    h = staticmethod(h)


def forward(f):
    @functools.wraps(f)
    def w(*a, **k):
        return f(*a, **k)
    return w


class H:
    @forward
    def h():
        return 'H'


class S(C):
    def via_super(self):
        return super().h()


class Host:
    def run(self):
        class L:
            def peek():
                return 'peek'
        return L


L = Host().run()


def assigns_nonlocal():
    # A receiverless call stores through a closure cell the class carries.
    seen = []

    class K:
        def f():
            nonlocal seen
            seen = seen + ['set']
    K.__dict__['f']()
    K.f()
    return seen

t('C().h()', lambda: C().h())
t('C.h()', lambda: C.h())
t("C.__dict__['h']()", lambda: C.__dict__['h']())
t('handle = C.h; handle()', lambda: (lambda f: f())(C.h))
t("getattr(C, 'h')()", lambda: getattr(C, 'h')())
t('bound = C().h; bound()', lambda: (lambda b: b())(C().h))
t('C().ko()', lambda: C().ko())
t('C().ko(1)', lambda: C().ko(1))
t('C().ko(x=1)', lambda: C().ko(x=1))
t('C().ko(1, x=1)', lambda: C().ko(1, x=1))
t('C.ko()', lambda: C.ko())
t('C.ko(x=5)', lambda: C.ko(x=5))
t('C.ko(1)', lambda: C.ko(1))
t('C().gen()', lambda: list(C().gen()))
t('C.gen()', lambda: list(C.gen()))
t('C.cm()', lambda: C.cm())
t('C().cm()', lambda: C().cm())
t('C.st()', lambda: C.st())
t('C().st()', lambda: C().st())
t('C().m()', lambda: C().m())
t('C.m()', lambda: C.m())
t('C().ok()', lambda: C().ok())
t('D.h()', lambda: D.h())
t('D().h()', lambda: D().h())
t('E.X', lambda: E.X)
t('G().h()', lambda: G().h())
t('G.h()', lambda: G.h())
t('H.h()', lambda: H.h())
t('H().h()', lambda: H().h())
t('S().via_super()', lambda: S().via_super())
t('type(C()).h()', lambda: type(C()).h())
t("methodcaller('h')(C())", lambda: operator.methodcaller('h')(C()))
t('L.peek()', lambda: L.peek())
t('L().peek()', lambda: L().peek())
t('nonlocal store, K.f() and K.__dict__', assigns_nonlocal)


EXPECTED = {
    'C().h()': 'TypeError: C.h() takes 0 positional arguments but 1 was given',
    'C.h()': "'h'",
    "C.__dict__['h']()": "'h'",
    'handle = C.h; handle()': "'h'",
    "getattr(C, 'h')()": "'h'",
    'bound = C().h; bound()': 'TypeError: C.h() takes 0 positional arguments but 1 was given',
    'C().ko()': 'TypeError: C.ko() takes 0 positional arguments but 1 was given',
    'C().ko(1)': 'TypeError: C.ko() takes 0 positional arguments but 2 were given',
    'C().ko(x=1)': 'TypeError: C.ko() takes 0 positional arguments but 1 positional argument (and 1 keyword-only argument) were given',
    'C().ko(1, x=1)': 'TypeError: C.ko() takes 0 positional arguments but 2 positional arguments (and 1 keyword-only argument) were given',
    'C.ko()': '3',
    'C.ko(x=5)': '5',
    'C.ko(1)': 'TypeError: C.ko() takes 0 positional arguments but 1 was given',
    'C().gen()': 'TypeError: C.gen() takes 0 positional arguments but 1 was given',
    'C.gen()': '[1]',
    'C.cm()': 'TypeError: C.cm() takes 0 positional arguments but 1 was given',
    'C().cm()': 'TypeError: C.cm() takes 0 positional arguments but 1 was given',
    'C.st()': "'st'",
    'C().st()': "'st'",
    'C().m()': '1',
    'C.m()': '0',
    'C().ok()': "'ok'",
    'D.h()': "'h'",
    'D().h()': 'TypeError: C.h() takes 0 positional arguments but 1 was given',
    'E.X': "'e'",
    'G().h()': "'g'",
    'G.h()': "'g'",
    'H.h()': "'H'",
    'H().h()': 'TypeError: H.h() takes 0 positional arguments but 1 was given',
    'S().via_super()': 'TypeError: C.h() takes 0 positional arguments but 1 was given',
    'type(C()).h()': "'h'",
    "methodcaller('h')(C())": 'TypeError: C.h() takes 0 positional arguments but 1 was given',
    'L.peek()': "'peek'",
    'L().peek()': 'TypeError: Host.run.<locals>.L.peek() takes 0 positional arguments but 1 was given',
    'nonlocal store, K.f() and K.__dict__': "['set', 'set']",
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
