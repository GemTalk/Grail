"""Fixture: a non-ASCII identifier is NFKC-normalized, as in CPython (#1502).

PEP 3131: "All identifiers are converted into the normal form NFKC while
parsing; comparison of identifiers is based on NFKC."  So U+00B5 MICRO SIGN
and U+03BC GREEK SMALL LETTER MU spell one name, and so do the mathematical
Fraktur letters and plain ASCII.  Grail kept every identifier as written, so
the second spelling was a NameError (test_unicode_identifiers' test_valid and
test_non_bmp_normalized).

What is NOT normalized, in CPython either: str.isidentifier, getattr and
other names that arrive as strings at run time, and keywords, which are
matched as written -- a name that normalizes to one (U+1D422 U+1D41F) binds
``if''.

The sources are built from escapes so this file stays ASCII.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ast

r = {}

MICRO = '\u00b5'                     # MICRO SIGN
MU = '\u03bc'                        # GREEK SMALL LETTER MU
FRAKTUR = ('\U0001d518\U0001d52b\U0001d526\U0001d520'    # 'Unicode', in
           '\U0001d52c\U0001d521\U0001d522')                # Fraktur
E_ACUTE_DECOMPOSED = 'e\u0301'
E_ACUTE = '\u00e9'
FI_LIGATURE = '\ufb01'
BOLD_IF = '\U0001d422\U0001d41f'
HEBREW = '\u05e2\u05b4\u05d1\u05e8\u05b4\u05d9\u05ea'      # pyparsing's name


def run(src):
    ns = {}
    exec(src, ns)
    ns.pop('__builtins__', None)
    return ns


r['micro_reads_as_mu'] = run(MICRO + ' = 1\nresult = ' + MU)['result']
r['fraktur_binds_ascii'] = sorted(run(FRAKTUR + ' = 1'))
r['decomposed_binds_composed'] = [ord(c) for c in
                                  run(E_ACUTE_DECOMPOSED + ' = 1')]
r['ligature_binds_fi'] = sorted(run(FI_LIGATURE + ' = 1'))
r['keyword_lookalike_binds_if'] = sorted(run(BOLD_IF + ' = 1'))
r['pyparsing_hebrew_round_trips'] = run(
    HEBREW + ' = 41\nresult = ' + HEBREW + ' + 1')['result']

ns = run('class T:\n    ' + MICRO + ' = 1\nresult = T.' + MU)
r['class_attribute'] = ns['result']
r['getattr_is_not_normalized'] = hasattr(ns['T'], MICRO)

ns = run('def f(' + MICRO + '=1):\n    return ' + MU + '\n'
         'result = f(' + MU + '=4)')
r['parameter_and_keyword_argument'] = ns['result']

ns = run('def g' + MICRO + '():\n    pass\nresult = g' + MU + '.__name__')
r['function_name'] = [ord(c) for c in ns['result']]

r['ast_name_id'] = [ord(c) for c in ast.parse(MICRO).body[0].value.id]
r['ascii_untouched'] = sorted(run('plain_name2 = 1'))
r['isidentifier_does_not_normalize'] = (MICRO.isidentifier(), MICRO != MU)


EXPECTED = {
    'micro_reads_as_mu': 1,
    'fraktur_binds_ascii': ['Unicode'],
    'decomposed_binds_composed': [0xe9],
    'ligature_binds_fi': ['fi'],
    'keyword_lookalike_binds_if': ['if'],
    'pyparsing_hebrew_round_trips': 42,
    'class_attribute': 1,
    'getattr_is_not_normalized': False,
    'parameter_and_keyword_argument': 4,
    'function_name': [ord('g'), 0x3bc],
    'ast_name_id': [0x3bc],
    'ascii_untouched': ['plain_name2'],
    'isidentifier_does_not_normalize': (True, True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-34s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
