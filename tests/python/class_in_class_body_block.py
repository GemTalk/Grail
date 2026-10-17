"""A class nested in a class-body try / for / while / with compiles (#1696).

A class statement directly inside one of those blocks in a class body named
its class as a bare variable that nothing declared, so the WHOLE MODULE
failed to compile -- an uncatchable CompileError at module scope, a
codegen-gap SystemError under exec.  A class in an ``if`` branch already
worked: that emit builds it in a block temp and stores it into the enclosing
class, and the other blocks now do the same.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import contextlib

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)



M = 'previous'
try:
    class M:
        x = 1 / 0
except ZeroDivisionError:
    pass
r['module_keeps_previous'] = repr(M)
# Under exec, and in a function on the text arm, a class whose body raises
# still leaves the half-built class bound -- the rest of #1696.


class InTry:
    try:
        class Inner:
            y = 1
    except ZeroDivisionError:
        pass


class InFor:
    for _i in range(2):
        class Inner:
            y = 'for'


class InWhile:
    n = 0
    while n < 1:
        n += 1

        class Inner:
            y = 'w'


class InWith:
    with contextlib.nullcontext():
        class Inner:
            y = 'with'


class Private:
    try:
        class __Hidden:
            z = 1
    except ZeroDivisionError:
        pass


def deco(cls):
    cls.decorated = True
    return cls


class Decorated:
    try:
        @deco
        class Inner:
            pass
    except ZeroDivisionError:
        pass


class NestedFails:
    try:
        class Inner:
            y = 1 / 0
    except ZeroDivisionError:
        caught = True


t('nested_in_try', lambda: (InTry.Inner.y, InTry.Inner.__qualname__))
t('nested_in_for', lambda: InFor.Inner.y)
t('nested_in_while', lambda: InWhile.Inner.y)
t('nested_in_with', lambda: InWith.Inner.y)
t('under_exec', lambda: (lambda g: (exec('class O:\n    try:\n        class I:\n            v = 5\n    except KeyError:\n        pass', g), g['O'].I.v)[1])({}))
t('nested_private_mangled', lambda: (hasattr(Private, '_Private__Hidden'), hasattr(Private, '__Hidden')))
t('nested_decorated', lambda: Decorated.Inner.decorated)
t('nested_body_raises', lambda: (hasattr(NestedFails, 'Inner'), NestedFails.caught))


EXPECTED = {
    'module_keeps_previous': "'previous'",
    'nested_body_raises': '(False, True)',
    'nested_decorated': 'True',
    'nested_in_for': "'for'",
    'nested_in_try': "(1, 'InTry.Inner')",
    'nested_in_while': "'w'",
    'nested_in_with': "'with'",
    'nested_private_mangled': '(True, False)',
    'under_exec': '5',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
