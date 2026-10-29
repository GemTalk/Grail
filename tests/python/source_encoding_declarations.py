"""Fixture: compile() reads a bytes source in the encoding its PEP 263 declaration names.

CPython's tokenizer decodes a bytes source in the encoding named by a
``coding[:=]`` comment on its first line, or on its second when the first
holds no code, normalizing the UTF-8 and Latin-1 spellings
(Parser/tokenizer/string_tokenizer.c:54-117, Parser/tokenizer/helpers.c:306-435).
A UTF-8 BOM beside a declaration of anything else is ``encoding problem: X
with BOM``, and an encoding that cannot read the source is a SyntaxError
carrying the codec's message, at line 0 and offset -1.  Grail decoded every
bytes source as UTF-8, so a declared cp1251 or Latin-1 was ``Non-UTF-8 code
... but no encoding declared`` (test_exceptions testSyntaxErrorOffset).
Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        code = compile(source, '<fragment>', 'exec')
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)
    namespace = {}
    exec(code, namespace)
    return ('ok', namespace.get('x'))


CASES = {
    'declared_encodings': [
        (b'# -*- coding: cp1251 -*-\nx = "\xcf\xb3"\n',
         ('ok', 'Пі')),
        (b'# coding: latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'# coding=latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'#coding:latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'# coding: Latin_1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'# encoding: latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'# coding: euc-jp\nx = "\xa4\xa2"\n',
         ('ok', 'あ')),
        (b'\t\x0c# coding: latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'# -*- coding: latin-1 -*-\r\nx = "\xe9"\r\n',
         ('ok', 'é')),
        (b'# -*- coding: iso8859-7 -*-\nx = "\xe1"\n',
         ('ok', 'α')),
    ],
    'on_the_second_line': [
        (b'#!/usr/bin/python\n# vim: set fileencoding=latin-1 :\nx = "\xe9"\n',
         ('ok', 'é')),
        (b'\n# coding: latin-1\nx = "\xe9"\n',
         ('ok', 'é')),
    ],
    'not_a_declaration': [
        (b'x = 1\n# coding: latin-1\ny = "\xe9"\n',
         ("Non-UTF-8 code starting with '\\xe9' on line 3, but no encoding declared; see https://peps.python.org/pep-0263/ for details", 3, 6, 3, 6)),
        (b'x = 1 # coding: latin-1\ny = "\xe9"\n',
         ("Non-UTF-8 code starting with '\\xe9' on line 2, but no encoding declared; see https://peps.python.org/pep-0263/ for details", 2, 6, 2, 6)),
        (b'# coding latin-1\nx = "\xe9"\n',
         ("Non-UTF-8 code starting with '\\xe9' on line 2, but no encoding declared; see https://peps.python.org/pep-0263/ for details", 2, 6, 2, 6)),
        (b'#!python\n#!x\n# coding: latin-1\nx = "\xe9"\n',
         ("Non-UTF-8 code starting with '\\xe9' on line 4, but no encoding declared; see https://peps.python.org/pep-0263/ for details", 4, 6, 4, 6)),
        (b'# coding: utf-8\nx = "\xe9"\n',
         ("Non-UTF-8 code starting with '\\xe9' on line 2, but no encoding declared; see https://peps.python.org/pep-0263/ for details", 2, 6, 2, 6)),
    ],
    'utf_8_under_any_spelling': [
        (b'# coding: utf8\nx = "\xc3\xa9"\n',
         ('ok', 'é')),
        (b'# coding: UTF-8\nx = "\xc3\xa9"\n',
         ('ok', 'é')),
        (b'# coding: UTF_8\nx = "\xc3\xa9"\n',
         ('ok', 'é')),
        (b'# coding: utf-8-sig\nx = "\xc3\xa9"\n',
         ('ok', 'é')),
        (b'# coding: \nx = "\xc3\xa9"\n',
         ('ok', 'é')),
    ],
    'with_a_bom': [
        (b'\xef\xbb\xbf# coding: utf-8\nx = "\xc3\xa9"\n',
         ('ok', 'é')),
        (b'\xef\xbb\xbf# coding: UTF-8\nx = 1\n',
         ('ok', 1)),
        (b'\xef\xbb\xbf# coding: latin-1\nx = 1\n',
         ('encoding problem: iso-8859-1 with BOM', 1, 0, 1, 17)),
        (b'\xef\xbb\xbf#coding: utf8\nprint(1)\n',
         ('encoding problem: utf8 with BOM', 1, 0, 1, 13)),
        (b'\xef\xbb\xbfx = "\xc3\xa9"\n',
         ('ok', 'é')),
    ],
    'encodings_that_cannot_read_it': [
        (b'# coding: nonexistent\nx = 1\n',
         ('unknown encoding: nonexistent', 0, -1, None, None)),
        (b'# coding: ascii\nx = "\xe9"\n',
         ("'ascii' codec can't decode byte 0xe9 in position 21: ordinal not in range(128)", 0, -1, None, None)),
        (b'# coding: rot13\nx = 1\n',
         ("'rot13' is not a text encoding; use codecs.decode() to handle arbitrary codecs", 0, -1, None, None)),
    ],
    'errors_located_in_the_decoded_text': [
        (b'# -*- coding: cp1251 -*-\nPython = "\xcf\xb3\xf2\xee\xed" +',
         ('invalid syntax', 2, 19, 2, 20)),
        (b'# -*- coding: iso8859-7 -*-\n\xe1 = 0xI',
         ('invalid hexadecimal literal', 2, 6, 2, 6)),
        (b'# coding: latin-1\nx = "\xe9" +\n',
         ('invalid syntax', 2, 10, 2, 11)),
    ],
}

EXPECTED = {}
for key, cases in CASES.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [expected for _, expected in cases]

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-36s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES[key], r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
