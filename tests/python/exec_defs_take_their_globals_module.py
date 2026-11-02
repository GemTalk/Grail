"""Fixture: a function defined by exec() takes its __module__ from the globals.

CPython gives every new function the ``__name__'' of the globals it runs in
(Objects/funcobject.c:181-186), so ``exec('def f(): pass', {'__name__':
'mod'})'' makes an ``f'' whose __module__ is 'mod' -- a def, a lambda, a def
nested in one, in 'exec' and in 'single' mode alike -- and an exec() given no
globals uses the caller's.  Messages that name a function name it by
``module.qualname'' (_PyObject_FunctionStr), so an exec'd function's errors
say 'mod.h()'.

Grail stamped a def's __module__ only when compiling a module, so every
function exec'd -- each one a doctest defines -- reported ``<closure>'', and
named itself ``<closure>.h()'' in its errors: test_unpack_ex and test_extcall.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def defined_in(source, mode='exec'):
    g = {'__name__': 'mod'}
    exec(compile(source, '<fixture>', mode), g)
    return g


g = defined_in("def f():\n    def inner(): pass\n    return inner\nlam = lambda: 0\n")
r['exec_mode'] = [g['f'].__module__, g['f']().__module__, g['lam'].__module__]

r['single_mode'] = defined_in("def f(): pass\n", 'single')['f'].__module__

r['a_string_exec'] = (lambda g: (exec("def e(): pass\n", g), g['e'].__module__)[1])({'__name__': 'named'})

g = defined_in("class K:\n    def m(self): pass\n")
r['classes_and_methods_too'] = [g['K'].__module__, g['K'].m.__module__]


def exec_without_globals():
    exec("def here(): pass\nseen.append(here.__module__)\n")
    return seen


seen = []
r['the_callers_name'] = exec_without_globals() == [__name__]


def message(source):
    g = {'__name__': 'mod'}
    try:
        exec(source, g)
    except TypeError as e:
        return str(e)
    return 'no error'


r['errors_name_the_module'] = [
    message("def h(**kw): pass\nh(**[])\n"),
    message("def h(**kw): pass\nh(**1)\n"),
]

EXPECTED = {
    'exec_mode': ['mod', 'mod', 'mod'],
    'single_mode': 'mod',
    'a_string_exec': 'named',
    'classes_and_methods_too': ['mod', 'mod'],
    'the_callers_name': True,
    'errors_name_the_module': ['mod.h() argument after ** must be a mapping, not list',
                               'mod.h() argument after ** must be a mapping, not int'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
