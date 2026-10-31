"""Fixture: importing a module emits the code generator's SyntaxWarnings.

CPython compiles an imported module as compile() compiles any source, and its
code generator warns there (Python/codegen.c): ``x is 1'', an always-true
``assert (x, 'msg')'', a literal called where a comma was meant.  Grail emitted
them from compile() but not on import, so a module with ``x is 1'' imported in
silence.  The warnings name the module's file and line, and a filter that
makes them errors makes the import a SyntaxError naming that file.  Every
check here holds under CPython 3.14, which is what makes it evidence.

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

directory = tempfile.mkdtemp(prefix='icw')
tag = os.path.basename(directory)

SOURCES = {
    'warns': b'x = 1\ny = x is 1\nassert (x, "msg")\nz = [1, 2] if 0 else None\n',
    'calls': b'def f():\n    return 1(2)\n',
    'strict': b'y = 1 is 1\n',
}


def module_name(key):
    return '%s_%s' % (tag, key)


def shown(path):
    return path.replace(directory, '<dir>').replace(tag, '<tag>')


def caught(key):
    with warnings.catch_warnings(record=True) as ws:
        warnings.simplefilter('always')
        importlib.import_module(module_name(key))
    return [(w.category.__name__, str(w.message).split('.')[0], shown(w.filename), w.lineno)
            for w in ws]


try:
    for key, source in SOURCES.items():
        with open(os.path.join(directory, module_name(key) + '.py'), 'wb') as f:
            f.write(source)
    sys.path.insert(0, directory)
    try:
        r['is_and_assert'] = caught('warns')
        r['call_in_a_def'] = caught('calls')
        with warnings.catch_warnings():
            warnings.simplefilter('error', SyntaxWarning)
            try:
                importlib.import_module(module_name('strict'))
                r['as_error'] = 'imported'
            except SyntaxError as exc:
                r['as_error'] = (type(exc).__name__, shown(exc.filename), exc.lineno)
    finally:
        sys.path.remove(directory)
        for key in SOURCES:
            sys.modules.pop(module_name(key), None)
finally:
    shutil.rmtree(directory)

EXPECTED = {
    'is_and_assert': [('SyntaxWarning', '"is" with \'int\' literal', '<dir>/<tag>_warns.py', 2),
                      ('SyntaxWarning', 'assertion is always true, perhaps remove parentheses?',
                       '<dir>/<tag>_warns.py', 3)],
    'call_in_a_def': [('SyntaxWarning', "'int' object is not callable; perhaps you missed a comma?",
                       '<dir>/<tag>_calls.py', 2)],
    'as_error': ('SyntaxError', '<dir>/<tag>_strict.py', 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-14s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
