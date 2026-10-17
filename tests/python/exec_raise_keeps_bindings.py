"""``exec`` that raises still leaves in the dict what it bound first (#1695).

CPython's exec writes into the mapping as the code runs, so after ``exec('x
= 1\\nraise ValueError', g)`` the caller's ``except`` clause sees ``g['x']``.
Grail runs the code in a scope and copies the bindings back when the exec
returns -- which a raise never does, so everything bound before the
exception was lost.  doctest's examples that fail part-way are one victim.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def run(label, src, g=None, l=None):
    g = {} if g is None else g
    try:
        if l is None:
            exec(src, g)
        else:
            exec(src, g, l)
        out = 'returned'
    except BaseException as e:
        out = type(e).__name__
    d = l if l is not None else g
    r[label] = repr((out, sorted(k for k in d if not k.startswith('__'))))


run('simple', 'x = 1\nraise ValueError')
run('def_then_raise', 'def f(): return 2\ny = f()\n1/0')
run('class_then_raise', 'class C: pass\nraise KeyError')
run('separate_locals', 'a = 1\nraise ValueError', {}, {})
run('loop_partway', 'for i in range(5):\n    if i == 3:\n        raise ValueError\n    last = i')
run('caught_inside', 'try:\n    z = 1\n    raise ValueError\nexcept ValueError:\n    w = 2')
run('system_exit', 'v = 3\nraise SystemExit(4)')
run('name_error', 'u = 1\nundefined_name')
run('import_then_fail', 'import os\nraise RuntimeError')
run('nothing_bound', 'raise ValueError')


def seen_inside_except():
    g = {}
    try:
        exec('x = 1\nraise ValueError', g)
    except ValueError:
        return g.get('x')


def reused_dict():
    g = {}
    exec('a = 1', g)
    try:
        exec('b = a + 1\nraise ValueError', g)
    except ValueError:
        pass
    exec('c = b + 1', g)
    return (g['a'], g['b'], g['c'])


def callable_from_raising_exec():
    g = {}
    try:
        exec('def f(): return k\nk = 7\nraise ValueError', g)
    except ValueError:
        pass
    return g['f']()


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


t('seen_inside_except', seen_inside_except)
t('reused_dict', reused_dict)
t('callable_from_raising_exec', callable_from_raising_exec)


EXPECTED = {
    'callable_from_raising_exec': '7',
    'caught_inside': "('returned', ['w', 'z'])",
    'class_then_raise': "('KeyError', ['C'])",
    'def_then_raise': "('ZeroDivisionError', ['f', 'y'])",
    'import_then_fail': "('RuntimeError', ['os'])",
    'loop_partway': "('ValueError', ['i', 'last'])",
    'name_error': "('NameError', ['u'])",
    'nothing_bound': "('ValueError', [])",
    'reused_dict': '(1, 2, 3)',
    'seen_inside_except': '1',
    'separate_locals': "('ValueError', ['a'])",
    'simple': "('ValueError', ['x'])",
    'system_exit': "('SystemExit', ['v'])",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
