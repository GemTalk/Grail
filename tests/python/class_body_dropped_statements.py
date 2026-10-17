"""Every statement in a class body runs (#1696).

Grail emits a class body statement by statement, and a statement kind it had
no emit for was DROPPED -- silently, with no error.  ``raise`` and ``assert``
were among them, so ``class C: raise X`` built C, bound it, and carried on;
a class body that refuses to define itself defined itself anyway.  Inside an
``if`` branch ``del`` and ``import`` were dropped too, and a ``match`` or a
``type X = ...`` alias anywhere in the body.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}
log = []


def run(label, src):
    g = {'log': log}
    try:
        exec(src, g)
        out = 'ok'
    except Exception as e:
        out = type(e).__name__
    r[label] = repr((out, list(log)))
    log.clear()


run('raise', 'class C:\n    raise ValueError("x")')
run('raise_after_attrs', 'class C:\n    a = 1\n    raise ValueError\nlog.append("unreached")')
run('raise_from', 'class C:\n    raise ValueError("a") from KeyError("b")')
run('bare_reraise', 'class C:\n    try:\n        1/0\n    except ZeroDivisionError:\n        raise')
run('assert_false', 'class C:\n    assert False, "x"')
run('assert_true', 'class C:\n    assert True\n    b = 2\nlog.append(C.b)')
run('if_raise', 'class C:\n    if True:\n        raise KeyError')
run('elif_raise', 'class C:\n    if False:\n        pass\n    elif True:\n        raise TypeError')
run('if_assert', 'class C:\n    if True:\n        assert 0, "no"')
run('if_del', 'class C:\n    x = 1\n    if True:\n        del x\nlog.append(hasattr(C, "x"))')
run('if_import', 'class C:\n    if True:\n        import os\nlog.append(hasattr(C, "os"))')
run('if_from_import', 'class C:\n    if True:\n        from os import path as p\nlog.append(hasattr(C, "p"))')
run('match', 'class C:\n    match 1:\n        case 1:\n            log.append("m1")\n            y = 2\nlog.append(getattr(C, "y", None))')
run('match_no_case', 'class C:\n    match 3:\n        case 1:\n            y = 2\nlog.append(hasattr(C, "y"))')
run('type_alias', 'class C:\n    type T = int\nlog.append(C.T.__value__)')
run('call_statement', 'class C:\n    log.append(1)')
run('top_level_del', 'class C:\n    x = 1\n    del x\nlog.append(hasattr(C, "x"))')
run('top_level_import', 'class C:\n    import os\nlog.append(hasattr(C, "os"))')


J = 'previous'
try:
    class J:
        a = 1
        raise ValueError('body')
except ValueError:
    pass
r['module_name_keeps_previous_binding'] = repr(J)
# Inside a function the name is unbound afterwards too on the IR arm; the
# text arm still leaves the half-built class bound, and so does exec -- the
# rest of #1696.




EXPECTED = {
    'assert_false': "('AssertionError', [])",
    'assert_true': "('ok', [2])",
    'bare_reraise': "('ZeroDivisionError', [])",
    'call_statement': "('ok', [1])",
    'elif_raise': "('TypeError', [])",
    'if_assert': "('AssertionError', [])",
    'if_del': "('ok', [False])",
    'if_from_import': "('ok', [True])",
    'if_import': "('ok', [True])",
    'if_raise': "('KeyError', [])",
    'match': "('ok', ['m1', 2])",
    'match_no_case': "('ok', [False])",
    'module_name_keeps_previous_binding': "'previous'",
    'raise': "('ValueError', [])",
    'raise_after_attrs': "('ValueError', [])",
    'raise_from': "('ValueError', [])",
    'top_level_del': "('ok', [False])",
    'top_level_import': "('ok', [True])",
    'type_alias': "('ok', [<class 'int'>])",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
