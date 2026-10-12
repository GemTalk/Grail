"""Fixture: an identifier is XID_Start then XID_Continue, as in CPython.

PEP 3131: a Python identifier starts with an XID_Start character or ``_''
and continues with XID_Continue characters.  XID_Continue adds the combining
marks (Mn, Mc), decimal digits (Nd) and connector punctuation (Pc) to the
letters, plus a few named extras such as U+00B7 MIDDLE DOT.

Grail's tokenizer and str.isidentifier accepted only ``isLetter'', ``isDigit''
and ``_'', and GemStone's Unicode tables are older than CPython's.  So:

  * every combining mark was refused -- pyparsing's unicode.py names a class
    attribute with Hebrew vowel points and could not be tokenized (#1419);
  * U+E0100, a variation selector (Mn) on the supplementary plane, was a
    SyntaxError (#1378, test_unicode_identifiers);
  * letters assigned since GemStone's tables (U+0870, Unicode 14) were refused.

The sources are built from escapes so this file stays ASCII.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def binds(name):
    """Does ``name = 1'' compile and run?  Only that: CPython NFKC-normalizes
    an identifier, so the name it binds is not always the one written
    (``e'' + U+0301 binds U+00E9), and Grail does not normalize -- a separate
    gap this fixture leaves alone."""
    try:
        exec(name + ' = 1', {})
    except SyntaxError:
        return 'SyntaxError'
    return True


hebrew = '\u05e2\u05b4\u05d1\u05e8\u05b4\u05d9\u05ea'      # pyparsing's name

ACCEPTED = {
    'hebrew_with_vowel_points': hebrew,
    'combining_acute': 'e\u0301',
    'spacing_mark_mc': 'a\u0903',
    'connector_pc': 'a\u203fb',
    'arabic_indic_digit': 'x\u0660',
    'middle_dot': 'a\u00b7b',
    'variation_selector_e0100': 'a\U000e0100',
    'unicode_14_letter': '\u0870',
    'math_alphanumeric': '\U0001d400',
    'plain_ascii': '_private2',
}

REFUSED = {
    'starts_with_a_mark': '\u05b4a',
    'starts_with_a_digit': '1a',
    'starts_with_middle_dot': '\u00b7a',
    'starts_with_arabic_digit': '\u0660x',
    'lm_not_in_xid_start': '\u2e2f',
    'nfkc_excluded_037a': '\u037a',
    'contains_a_space': 'a b',
    'contains_a_symbol': 'a\u2603',
}

r['accepted_by_isidentifier'] = {k: v.isidentifier() for k, v in ACCEPTED.items()}
r['refused_by_isidentifier'] = {k: v.isidentifier() for k, v in REFUSED.items()}
r['accepted_by_the_tokenizer'] = {k: binds(v) for k, v in ACCEPTED.items()}
r['refused_by_the_tokenizer'] = {k: binds(v) for k, v in REFUSED.items()
                                 if k != 'contains_a_space'}

# The name binds, and reads back under the same spelling.
ns = {}
exec(hebrew + ' = 41\nresult = ' + hebrew + ' + 1', ns)
r['hebrew_name_round_trips'] = ns['result']


EXPECTED = {
    'accepted_by_isidentifier': {k: True for k in ACCEPTED},
    'refused_by_isidentifier': {k: False for k in REFUSED},
    'accepted_by_the_tokenizer': {k: True for k in ACCEPTED},
    'refused_by_the_tokenizer': {k: 'SyntaxError' for k in REFUSED
                                 if k != 'contains_a_space'},
    'hebrew_name_round_trips': 42,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-28s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
