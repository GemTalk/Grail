"""A class body that assigns a name twice runs each assignment in its place (#1677).

Grail compiles a class body's ``NAME = value`` statements into class-attribute
stores, and interleaves the body's other statements with them by source
position.  It kept ONE position per name, the last assignment's, so every store
of a name assigned twice went out together at the second one.  A statement
between the two that read the name ran before either store:
``D = 9; print(D); D = 10`` raised ``NameError: name 'D' is not defined``.

A parameter default reading such a name had been placed after its last store
to avoid that, so ``v = 1; def f(self, d=v); v = 2`` gave f the default 2
where CPython gives 1.  That row is here too.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


seen = []


class A:
    D = 9
    seen.append(('call', D))
    if D == 9:
        x = 1
    for i in [D]:
        seen.append(('for', i))
    try:
        seen.append(('try', D))
    finally:
        pass
    v = 1

    def f(self, d=v):
        return d
    v = 2
    E = D
    D = 10
    seen.append(('after', D, E))
    D += 1
    import os
    seen.append(('import', os.__name__))
    import sys as os
    seen.append(('import_as', os.__name__))
    a = b = D
    a = 5


t('statements_in_order', lambda: seen)
t('final_values', lambda: (A.D, A.E, A.x, A.v, A.a, A.b, A.os.__name__))
t('default_reads_value_at_def', lambda: (A().f(), A.f.__defaults__))


class Deleted:
    W = 1
    w_first = W
    del W
    W = 2


t('del_between', lambda: (Deleted.W, Deleted.w_first))


class Recording(dict):
    def __init__(self):
        super().__init__()
        self.order = []

    def __setitem__(self, key, value):
        if not key.startswith('__'):
            self.order.append((key, value))
        super().__setitem__(key, value)


class Meta(type):
    @classmethod
    def __prepare__(mcls, name, bases):
        return Recording()

    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, dict(ns))
        cls.order = ns.order
        return cls


class Watched(metaclass=Meta):
    K = 1
    J = K + 1
    K = 3


t('namespace_sees_each_store', lambda: Watched.order)
t('namespace_values', lambda: (Watched.K, Watched.J))


def make():
    log = []

    class Local:
        N = 1
        log.append(N)
        N = 2
        log.append(N)
    return Local, log


t('local_class', lambda: (make()[0].N, make()[1]))


EXPECTED = {
    'default_reads_value_at_def': '(1, (1,))',
    'del_between': '(2, 1)',
    'final_values': "(11, 9, 1, 2, 5, 11, 'sys')",
    'local_class': '(2, [1, 2])',
    'namespace_sees_each_store': "[('K', 1), ('J', 2), ('K', 3)]",
    'namespace_values': '(3, 2)',
    'statements_in_order': "[('call', 9), ('for', 9), ('try', 9), ('after', 10, 9), ('import', 'os'), ('import_as', 'sys')]",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
