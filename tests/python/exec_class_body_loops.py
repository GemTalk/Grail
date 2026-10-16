"""A class body run by exec() reads a name bound by the statement it is in (#1683).

exec() and runpy.run_path compile in a doit scope, where a class-body read of
a sibling name only used the class when a statement BEFORE the current one
had bound the name.  A loop target or an ``if`` binding is read inside the
very statement that binds it, so ``for i in xs: j = i`` compiled ``i`` as an
undeclared doit variable: ``CompileError 1001, undefined symbol i``.  That
error was a Smalltalk one, so no ``except`` caught it and the process ended.

The same source imported as a module always worked; every row runs it
through exec.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, src, read):
    g = {'log': []}
    try:
        exec(src, g)
        r[label] = repr(eval(read, g))
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


t('assign_in_loop', '''
class A:
    for i in [1, 2]:
        j = i * 10
''', '(A.i, A.j)')

t('call_in_loop', '''
class A:
    for i in [1, 2]:
        log.append(i)
''', '(A.i, log)')

t('nested_loops', '''
class A:
    for i in [1, 2]:
        for k in 'ab':
            log.append((i, k))
''', '(A.i, A.k, log)')

t('loop_else', '''
class A:
    for i in [3]:
        pass
    else:
        last = i
''', 'A.last')

t('tuple_target', '''
class A:
    for i, k in [(1, 'x'), (2, 'y')]:
        log.append(k * i)
''', '(A.i, A.k, log)')

t('loop_target_shadows_global', '''
i = 'global'
class A:
    before = i
    for i in [5]:
        inside = i
    after = i
''', '(A.before, A.inside, A.after, i)')

t('if_binding_read_in_same_if', '''
class A:
    if True:
        k = 1
        m = k + 1
''', '(A.k, A.m)')

t('while_loop', '''
class A:
    n = 0
    while n < 3:
        n = n + 1
        log.append(n)
''', '(A.n, log)')

t('comprehension_in_loop', '''
class A:
    for i in [2]:
        squares = [x * x for x in range(i)]
''', 'A.squares')

t('function_local_class', '''
def make():
    class A:
        for i in [7]:
            log.append(i)
    return A
''', '(make().i, log)')


def by_path():
    import os
    import runpy
    import shutil
    import tempfile
    d = tempfile.mkdtemp()
    path = os.path.join(d, 'loops.py')
    with open(path, 'w') as f:
        f.write('log = []\nclass A:\n    for i in [1, 2]:\n        log.append(i)\n')
    try:
        g = runpy.run_path(path)
    finally:
        shutil.rmtree(d)
    return (g['A'].i, g['log'])


try:
    r['runpy_run_path'] = repr(by_path())
except Exception as e:
    r['runpy_run_path'] = '%s: %s' % (type(e).__name__, e)


EXPECTED = {
    'assign_in_loop': '(2, 20)',
    'call_in_loop': '(2, [1, 2])',
    'comprehension_in_loop': '[0, 1]',
    'function_local_class': '(7, [7])',
    'if_binding_read_in_same_if': '(1, 2)',
    'loop_else': '3',
    'loop_target_shadows_global': "('global', 5, 5, 'global')",
    'nested_loops': "(2, 'b', [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')])",
    'runpy_run_path': '(2, [1, 2])',
    'tuple_target': "(2, 'y', ['x', 'yy'])",
    'while_loop': '(3, [1, 2, 3])',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
