"""Fixture: an imported module's source is read in the encoding its PEP 263 declaration names.

CPython decodes a module file as it decodes any source
(Parser/tokenizer/string_tokenizer.c:54-117): by the encoding a ``coding``
comment on its first or second line names, a UTF-8 BOM dropped, and a file
that is not UTF-8 refused with ``Non-UTF-8 code ... but no encoding
declared``.  Grail's import read every file as UTF-8, so a module declared
Latin-1 failed with a Smalltalk ``ill-formed Utf8`` error that no except
could name.  Every check here holds under CPython 3.14, which is what makes
it evidence.
"""

import importlib
import os
import shutil
import sys
import tempfile

r = {}

SOURCES = {
    'enc_latin': b'# coding: latin-1\nx = "\xe9"\n',
    'enc_cp1251': b'# -*- coding: cp1251 -*-\nx = "\xcf\xb3"\n',
    'enc_second_line': b'#!/usr/bin/env python\n# vim: set fileencoding=latin-1 :\nx = "\xe9"\n',
    'enc_bom': b'\xef\xbb\xbfx = "\xc3\xa9"\n',
    'enc_plain': b'x = "\xc3\xa9"\n',
    'enc_none_declared': b'x = "\xe9"\n',
    'enc_bom_latin': b'\xef\xbb\xbf# coding: latin-1\nx = 1\n',
    'enc_unknown': b'# coding: nonexistent\nx = 1\n',
}


def outcome(name):
    try:
        return ('ok', importlib.import_module(name).x)
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset)


directory = tempfile.mkdtemp()
try:
    for name, source in SOURCES.items():
        with open(os.path.join(directory, name + '.py'), 'wb') as f:
            f.write(source)
    sys.path.insert(0, directory)
    try:
        r['declared'] = [outcome('enc_latin'), outcome('enc_cp1251'), outcome('enc_second_line')]
        r['utf_8'] = [outcome('enc_bom'), outcome('enc_plain')]
        r['refused'] = [outcome('enc_none_declared'), outcome('enc_bom_latin'), outcome('enc_unknown')]
    finally:
        sys.path.remove(directory)
        for name in SOURCES:
            sys.modules.pop(name, None)
finally:
    shutil.rmtree(directory)

EXPECTED = {
    'declared': [('ok', 'é'), ('ok', 'Пі'), ('ok', 'é')],
    'utf_8': [('ok', 'é'), ('ok', 'é')],
    'refused': [("Non-UTF-8 code starting with '\\xe9' on line 1, but no encoding declared; "
                 "see https://peps.python.org/pep-0263/ for details", 1, 6),
                ('encoding problem: iso-8859-1 with BOM', 1, 0),
                ('unknown encoding: nonexistent', 0, -1)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-10s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
