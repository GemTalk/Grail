"""Fixture: which functions a yield makes generators.

A yield in a nested def's or lambda's BODY belongs to that nested scope.  Its
default values and decorators are different: they are evaluated in the
enclosing function, when the def or lambda is created, so a yield there makes
the ENCLOSING function a generator.

Grail's generator test skipped a nested def or lambda wholesale.  So
``def f(): lambda x=(yield): 1'' compiled f as an ordinary function, and its
yield named an unbound ___gen___.  That is a Smalltalk CompileError, not a
Python error, and it ended test_generators' coroutine doctest midway.

The same functions are also run through exec(), which compiles on Grail's
other code path.

The ``outside function'' SyntaxError also names the form CPython names:
``'yield from' outside function'' for a yield from.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

SOURCE = '''
def f1(): lambda x=(yield 1): x
def f2(): lambda *, k=(yield 2): k
def f3():
    def inner(a=(yield 3)):
        return a
    return inner
def f4():
    def deco(fn):
        return fn
    @(yield 4) or deco
    def inner():
        return 'i'
    return inner
def f5(): lambda: (yield 5)
def f6(): [i for i in (yield 6)]
'''


def _run(f):
    g = f()
    if type(g).__name__ != 'generator':
        return type(g).__name__
    out = [next(g)]
    try:
        g.send([7] if f.__name__ == 'f6' else None)
    except StopIteration as e:
        v = e.value
        out.append(v() if callable(v) else v)
    return out


def _try(thunk):
    try:
        return thunk()
    except BaseException as e:
        return 'EXC ' + type(e).__name__ + ': ' + str(e)


exec(SOURCE)
for _name in ('f1', 'f2', 'f3', 'f4', 'f5', 'f6'):
    r['module ' + _name] = _try(lambda: _run(globals()[_name]))

_ns = {}
_compiled = _try(lambda: exec(compile(SOURCE, '<detect>', 'exec'), _ns))
for _name in ('f1', 'f2', 'f3', 'f4', 'f5', 'f6'):
    r['exec ' + _name] = _try(lambda: _run(_ns[_name])) if _compiled is None else _compiled


def _message(src, mode='exec'):
    try:
        compile(src, '<s>', mode)
        return 'compiled'
    except SyntaxError as e:
        return e.msg


r['yield outside function'] = _try(lambda: _message('yield 1'))
r['yield from outside function'] = _try(lambda: _message('yield from [1,2]'))
r['yield from in single mode'] = _try(lambda: _message('yield from [1,2]', 'single'))
r['yield from in a lambda default'] = _try(lambda: _message(
    'f=lambda: (yield from (1,2)), (yield from (3,4))', 'single'))
r['yield from in a class body'] = _try(lambda: _message('class C:\n    yield from x\n'))

_GEN = {
    'f1': [1, None], 'f2': [2, None], 'f3': [3, None], 'f4': [4, 'i'],
    'f5': 'NoneType', 'f6': [6, None],
}

EXPECTED = {}
for _name, _value in _GEN.items():
    EXPECTED['module ' + _name] = _value
    EXPECTED['exec ' + _name] = _value
EXPECTED.update({
    'yield outside function': "'yield' outside function",
    'yield from outside function': "'yield from' outside function",
    'yield from in single mode': "'yield from' outside function",
    'yield from in a lambda default': "'yield from' outside function",
    'yield from in a class body': "'yield from' outside function",
})

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-36s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
