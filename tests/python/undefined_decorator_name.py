"""A bare-name decorator bound nowhere raises NameError when the def runs (#1517).

Grail printed a bare-name decorator as a Smalltalk identifier.  Inside a
function, a name nothing binds -- undefined, or bound only at run time through
globals() -- was then not a NameError when the def ran but a COMPILE error for
the whole module: ``undefined symbol'', and the module did not load at all.
It now reads the module's globals and builtins at run time, as an ordinary
name read does.  The guards are the bindings a bare identifier must keep
reaching: a class-body sibling or attribute, an enclosing parameter or local,
a module import, a global defined after the function.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import functools

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def local_def():
    try:
        @undefined_decorator_name
        def g():
            pass
    except NameError as e:
        return 'caught NameError: %s' % e


def method_in_local_class():
    try:
        class C:
            @undefined_in_class_body
            def m(self):
                pass
    except NameError as e:
        return 'caught NameError: %s' % e


def class_decorator_in_function():
    try:
        @undefined_class_deco
        class C:
            pass
    except NameError as e:
        return 'caught NameError: %s' % e


def dotted_undefined():
    try:
        @undefined_outer.attr
        def g():
            pass
    except NameError as e:
        return 'caught NameError: %s' % e


def call_undefined():
    try:
        @undefined_call(1)
        def g():
            pass
    except NameError as e:
        return 'caught NameError: %s' % e


def defined_later():
    @late
    def g():
        return 1
    return g()


late = lambda fn: (lambda: ('late', fn()))


def bound_through_globals():
    globals()['dyn_deco'] = lambda f: (lambda: ('dyn', f()))

    def inner():
        @dyn_deco
        def g():
            return 4
        return g()
    return inner()


def deleted_then_used():
    globals()['gone_deco'] = lambda f: f

    def make():
        @gone_deco
        def g():
            return 5
        return g()
    first = make()
    del globals()['gone_deco']
    try:
        make()
    except NameError as e:
        return (first, 'then NameError: %s' % e)


class Sib:
    def deco(f):
        return lambda self: ('sib', f(self))

    @deco
    def m(self):
        return 1


class Cb:
    tagger = staticmethod(lambda f: (lambda self: ('cb', f(self))))

    @tagger
    def m(self):
        return 2


def outer(dec):
    class Inner:
        @dec
        def m(self):
            return 3
    return Inner().m()


def nested():
    def mine(f):
        return lambda: ('mine', f())

    def inner():
        @mine
        def g():
            return 6
        return g()
    return inner()


def module_import_decorator():
    @functools.wraps(len)
    def g(*a):
        return 7
    return g.__name__


try:
    @undefined_at_module_level
    def module_level():
        pass
except NameError as e:
    r['module-level def'] = 'caught NameError: %s' % e


t('function-local def', local_def)
t('method in a class in a function', method_in_local_class)
t('class decorator in a function', class_decorator_in_function)
t('dotted undefined', dotted_undefined)
t('call undefined', call_undefined)
t('global defined after the function', defined_later)
t('decorator bound only through globals()', bound_through_globals)
t('decorator deleted from globals()', deleted_then_used)
t('guard: class-body sibling', lambda: Sib().m())
t('guard: class-body attribute', lambda: Cb().m())
t('guard: enclosing parameter', lambda: outer(lambda f: (lambda self: ('param', f(self)))))
t('guard: closure two levels up', nested)
t('guard: module import', module_import_decorator)


EXPECTED = {
    'module-level def': "caught NameError: name 'undefined_at_module_level' is not defined",
    'function-local def': '"caught NameError: name \'undefined_decorator_name\' is not defined"',
    'method in a class in a function': '"caught NameError: name \'undefined_in_class_body\' is not defined"',
    'class decorator in a function': '"caught NameError: name \'undefined_class_deco\' is not defined"',
    'dotted undefined': '"caught NameError: name \'undefined_outer\' is not defined"',
    'call undefined': '"caught NameError: name \'undefined_call\' is not defined"',
    'global defined after the function': "('late', 1)",
    'decorator bound only through globals()': "('dyn', 4)",
    'decorator deleted from globals()': '(5, "then NameError: name \'gone_deco\' is not defined")',
    'guard: class-body sibling': "('sib', 1)",
    'guard: class-body attribute': "('cb', 2)",
    'guard: enclosing parameter': "('param', 3)",
    'guard: closure two levels up': "('mine', 6)",
    'guard: module import': "'len'",
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
