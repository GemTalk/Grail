"""Fixture: f.__call__(...) is f(...), as CPython's method-wrapper makes it.

Grail's functions, bound methods and method bindings answered __call__ with a
Smalltalk-internal entry point that took its one argument for an ARRAY of
arguments.  So ``deco.__call__(A)`` sent #do: to the class A -- an uncatchable
MessageNotUnderstood, which is what test_grammar's test_classdef
(``@[class_decorator][0].__call__.__call__``) and test_funcdef died on -- and
``m.__call__([1, 2])`` called m(1, 2).  No other arity, and no keyword, was
accepted at all.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def deco(x):
    return x


def two(a, b=0, *, c=0):
    return (a, b, c)


def none():
    return 'none'


class A:
    def m(self, x):
        return ('m', x)


a = A()

r['one_argument'] = deco.__call__(A) is A
r['call_of_call'] = deco.__call__.__call__(A) is A
r['as_a_decorator'] = outcome(lambda: [deco][0].__call__.__call__(A)) is A
r['no_arguments'] = none.__call__()
r['two_arguments'] = two.__call__(1, 2)
r['keyword'] = two.__call__(1, c=3)
r['lambda'] = (lambda y: y).__call__(5)
r['bound_method_list_argument'] = a.m.__call__([1, 2])
r['bound_method_call_of_call'] = a.m.__call__.__call__(7)
r['builtin'] = len.__call__([1])
r['wrong_arity_is_a_type_error'] = outcome(lambda: deco.__call__()).split(':')[0]

EXPECTED = {
    'one_argument': True,
    'call_of_call': True,
    'as_a_decorator': True,
    'no_arguments': 'none',
    'two_arguments': (1, 2, 0),
    'keyword': (1, 0, 3),
    'lambda': 5,
    'bound_method_list_argument': ('m', [1, 2]),
    'bound_method_call_of_call': ('m', 7),
    'builtin': 1,
    'wrong_arity_is_a_type_error': 'TypeError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
