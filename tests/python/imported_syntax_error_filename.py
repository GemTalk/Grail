"""Fixture: a SyntaxError in an imported module names the module's file.

CPython's loader hands a module's source and its path to compile()
(Lib/importlib/_bootstrap_external.py:896-897, 822-827), so whatever refuses
the module -- its decoding, the parser, the compiler -- reports that file, and
so do the tokenizer's warnings.  Grail's import parsed the text alone, and
every one of them said ``<string>``, the name exec() uses, so a traceback
could not show the module's line.  An error from an exec() the module body
runs keeps ``<string>``.  Every check here holds under CPython 3.14, which is
what makes it evidence.

The modules are named after the temporary directory, so no run can bind a
module an earlier run built and skip compiling it.
"""

import importlib
import os
import shutil
import sys
import tempfile
import warnings

r = {}

directory = tempfile.mkdtemp(prefix='sef')
tag = os.path.basename(directory)

SOURCES = {
    'paren': b'x = 1\ny = (\n',
    'indent': b'def f():\n  return 1\n    x = 2\n',
    'outside': b'return 5\n',
    'encoding': b'# coding: nonexistent\nx = 1\n',
    'undecodable': b'x = 1\n\xff\n',
    'star_target': b'a b\n',
    'star': b'from %s_star_target import *\n' % tag.encode(),
    'escape': b'x = "\\d"\n',
    'runs_exec': b"try:\n    exec('a b')\nexcept SyntaxError as e:\n    filename = e.filename\n",
    'pkg/__init__': b'',
    'pkg/sub': b'a b\n',
}


def module_name(key):
    return '%s_%s' % (tag, key.replace('/', '.'))


def shown(path):
    return path.replace(directory, '<dir>').replace(tag, '<tag>')


def refused(key):
    try:
        importlib.import_module(module_name(key))
    except SyntaxError as exc:
        return exc
    return None


def refusal(key):
    exc = refused(key)
    return 'imported' if exc is None else (type(exc).__name__, shown(exc.filename), exc.lineno)


try:
    os.mkdir(os.path.join(directory, tag + '_pkg'))
    for key, source in SOURCES.items():
        with open(os.path.join(directory, '%s_%s.py' % (tag, key)), 'wb') as f:
            f.write(source)
    sys.path.insert(0, directory)
    try:
        r['parser'] = [refusal('paren'), refusal('indent')]
        r['compiler'] = [refusal('outside')]
        r['decoding'] = [refusal('encoding'), refusal('undecodable')]
        r['submodule'] = [refusal('pkg/sub')]
        r['star_import'] = [refusal('star')]
        r['args_name_the_file'] = [exc.args[1][0] == exc.filename for exc in (refused('paren'), refused('outside'))]
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            importlib.import_module(module_name('escape'))
        r['tokenizer_warning'] = [(w.category.__name__, shown(w.filename), w.lineno) for w in caught]
        r['exec_in_body'] = importlib.import_module(module_name('runs_exec')).filename
    finally:
        sys.path.remove(directory)
        for key in SOURCES:
            sys.modules.pop(module_name(key), None)
        sys.modules.pop(tag + '_pkg', None)
finally:
    shutil.rmtree(directory)

EXPECTED = {
    'parser': [('SyntaxError', '<dir>/<tag>_paren.py', 2),
               ('IndentationError', '<dir>/<tag>_indent.py', 3)],
    'compiler': [('SyntaxError', '<dir>/<tag>_outside.py', 1)],
    'decoding': [('SyntaxError', '<dir>/<tag>_encoding.py', 0),
                 ('SyntaxError', '<dir>/<tag>_undecodable.py', 2)],
    'submodule': [('SyntaxError', '<dir>/<tag>_pkg/sub.py', 1)],
    'star_import': [('SyntaxError', '<dir>/<tag>_star_target.py', 1)],
    'args_name_the_file': [True, True],
    'tokenizer_warning': [('SyntaxWarning', '<dir>/<tag>_escape.py', 1)],
    'exec_in_body': '<string>',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-18s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
