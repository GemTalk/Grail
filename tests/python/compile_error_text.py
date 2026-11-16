"""Fixture: a SyntaxError CPython's compiler raises has the compiler's text and columns.

CPython raises some SyntaxErrors in its parser and some later, in its symbol
table and compiler: 'return' outside function, 'await' outside function,
'break' outside loop, nonlocal at module level, a duplicate argument.  The
two kinds are filled in differently, and test_exceptions' test_string_source
pins the compiler's:

* its ``text`` is READ BACK FROM THE FILE the error is reported in
  (PyErr_ProgramTextObject), never taken from the source compiled -- so
  compile(src, '<string>', 'exec') has text None, a name that is no readable
  file has None, and a file that exists answers its own line, newline kept,
  even when it is not the source that was compiled;
* its ``offset`` and ``end_offset`` are UTF-8 BYTE columns, which only the
  parser's errors have converted to characters: ``return "\\xe4"`` ends at 12,
  though the line is ten characters long.

Grail gave every one of them the parser's shape: the source line as text and
character columns.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import os
import sys
import tempfile
from codecs import BOM_UTF8

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def located(source, filename='<string>'):
    try:
        compile(source, filename, 'exec')
    except SyntaxError as e:
        return (str(e), e.text, e.offset, e.end_offset, e.lineno, e.end_lineno)
    return 'compiled'


RET = 'return "\xe4"'

r['str source'] = _try(lambda: located(RET))
r['bytes source'] = _try(lambda: located(RET.encode()))
r['bytes source with a BOM'] = _try(lambda: located(BOM_UTF8 + RET.encode()))
r['latin-1 source with a coding line'] = _try(
    lambda: located(('# coding: latin1\n' + RET).encode('latin1')))
r['ascii line'] = _try(lambda: located('return "a"'))
r['second line'] = _try(lambda: located('x = 1\nreturn 5'))
r['await outside function'] = _try(
    lambda: located('def f():\n    yield 1\n    return 2\nawait x'))
r['break outside loop'] = _try(lambda: located('break'))
r['nonlocal at module level'] = _try(lambda: located('nonlocal x'))
r['duplicate argument'] = _try(lambda: located('def f(a, a): pass'))
r['a name that is no file'] = _try(
    lambda: located(RET, os.path.join(tempfile.gettempdir(),
                                      'grail-no-such-file-%d.py' % os.getpid())))
r['a directory'] = _try(lambda: located(RET, tempfile.gettempdir()))


def _from_file(contents, source):
    path = os.path.join(tempfile.gettempdir(),
                        'grail_compile_error_text_%d.py' % os.getpid())
    with open(path, 'w', encoding='utf-8') as f:
        f.write(contents)
    try:
        return located(source, path)[1:4]
    finally:
        os.remove(path)


r['a file holding the source'] = _try(lambda: _from_file(RET + '\n', RET))
r['a file holding something else'] = _try(
    lambda: _from_file('something else entirely\nline two\n', 'x = 1\n' + RET))


def _exec_error():
    try:
        exec('return 1')
    except SyntaxError as e:
        return (e.text, e.offset, e.end_offset, e.filename)


r['exec'] = _try(_exec_error)

MSG = "'return' outside function (<string>, line %d)"

EXPECTED = {
    'str source': ('ok', (MSG % 1, None, 1, 12, 1, 1)),
    'bytes source': ('ok', (MSG % 1, None, 1, 12, 1, 1)),
    'bytes source with a BOM': ('ok', (MSG % 1, None, 1, 12, 1, 1)),
    'latin-1 source with a coding line': ('ok', (MSG % 2, None, 1, 12, 2, 2)),
    'ascii line': ('ok', (MSG % 1, None, 1, 11, 1, 1)),
    'second line': ('ok', (MSG % 2, None, 1, 9, 2, 2)),
    'await outside function': (
        'ok', ("'await' outside function (<string>, line 4)", None, 1, 8, 4, 4)),
    'break outside loop': (
        'ok', ("'break' outside loop (<string>, line 1)", None, 1, 6, 1, 1)),
    'nonlocal at module level': (
        'ok', ('nonlocal declaration not allowed at module level '
               '(<string>, line 1)', None, 1, 11, 1, 1)),
    'duplicate argument': (
        'ok', ("duplicate argument 'a' in function definition "
               "(<string>, line 1)", None, 10, 11, 1, 1)),
    'a name that is no file': ('ok', None),
    'a directory': ('ok', None),
    'exec': ('ok', (None, 1, 9, '<string>')),
    'a file holding the source': ('ok', (RET + '\n', 1, 12)),
    'a file holding something else': ('ok', ('line two\n', 1, 12)),
}

# Only the text is checked for the two filename cases: their message names a
# per-run path.
r['a name that is no file'] = (r['a name that is no file'][0],
                               r['a name that is no file'][1][1])
r['a directory'] = (r['a directory'][0], r['a directory'][1][1])

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key, value in r.items():
            print('    %r: %r,' % (key, value))
        raise SystemExit
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
