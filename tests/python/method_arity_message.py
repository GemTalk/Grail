"""Fixture: a method's too-many-arguments TypeError counts its receiver.

CPython counts self (or cls) on both sides of ``takes N positional arguments
but M were given'': ``def m(self, a)'' called ``C().m(1, 2)'' takes 2 and was
given 3.  Grail compiles the receiver as the Smalltalk receiver, so its
parameter list and its positional Array both arrive without it, and both
numbers came out one short -- ``takes 1 positional argument but 2 were
given'' (#1472).  Module functions and staticmethods have no receiver and were
already right; they are the controls.

A @classmethod or @staticmethod with no defaults is not covered: it has no
keyword forwarder, so its arity error comes from BoundMethod's generic
fallback with different wording altogether (#1484).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def message(fn):
    try:
        fn()
    except TypeError as e:
        return str(e)
    return 'no error'


class C:
    def m(self, a):
        pass

    def d(self, a, b=1):
        pass

    def none(self):
        pass

    def kw(self, a, *, k=None):
        pass

    def po(self, a, /, b):
        pass

    def __init__(self, a=None, b=None):
        pass

    @classmethod
    def cmd(cls, a, b=2):
        pass

    @staticmethod
    def smd(a, b=2):
        pass


def f(a):
    pass


def g(a, b=2):
    pass


c = C()

r['method'] = message(lambda: c.m(1, 2))
r['method_with_default'] = message(lambda: c.d(1, 2, 3))
r['method_with_no_parameters'] = message(lambda: c.none(1))
r['method_with_keyword_only'] = message(lambda: c.kw(1, 2))
r['method_with_keyword_only_also_passed'] = message(lambda: c.kw(1, 2, k=3))
r['method_with_positional_only'] = message(lambda: c.po(1, 2, 3))
r['init'] = message(lambda: C(1, 2, 3))
r['classmethod_with_default'] = message(lambda: C.cmd(1, 2, 3))

# Controls: no receiver to count.
r['staticmethod_with_default'] = message(lambda: C.smd(1, 2, 3))
r['function'] = message(lambda: f(1, 2))
r['function_with_default'] = message(lambda: g(1, 2, 3))
r['too_few_is_unchanged'] = message(lambda: c.m())


EXPECTED = {
    'method': 'C.m() takes 2 positional arguments but 3 were given',
    'method_with_default': 'C.d() takes from 2 to 3 positional arguments but 4 were given',
    'method_with_no_parameters': 'C.none() takes 1 positional argument but 2 were given',
    'method_with_keyword_only': 'C.kw() takes 2 positional arguments but 3 were given',
    'method_with_keyword_only_also_passed':
        'C.kw() takes 2 positional arguments but 3 positional arguments '
        '(and 1 keyword-only argument) were given',
    'method_with_positional_only': 'C.po() takes 3 positional arguments but 4 were given',
    'init': 'C.__init__() takes from 1 to 3 positional arguments but 4 were given',
    'classmethod_with_default':
        'C.cmd() takes from 2 to 3 positional arguments but 4 were given',
    'staticmethod_with_default':
        'C.smd() takes from 1 to 2 positional arguments but 3 were given',
    'function': 'f() takes 1 positional argument but 2 were given',
    'function_with_default': 'g() takes from 1 to 2 positional arguments but 3 were given',
    'too_few_is_unchanged': "C.m() missing 1 required positional argument: 'a'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
