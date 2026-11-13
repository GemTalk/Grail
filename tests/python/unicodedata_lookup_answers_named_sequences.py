"""Fixture: unicodedata.lookup() answers Unicode's named sequences (#1562).

Unicode's NamedSequences.txt names 461 sequences of code points --
``KEYCAP NUMBER SIGN'' is U+0023 U+FE0F U+20E3 -- and CPython's
unicodedata.lookup() answers each one as the several characters it is.  Grail
raised KeyError for all of them.

Only lookup() answers a sequence.  The \\N{} escape refuses one, in a string
literal, in a regex and in the unicode_escape codec, and so does CPython's; a
character's own name and the name aliases are unaffected.  Every check holds
under CPython 3.14, which is what makes it evidence.
"""

import codecs
import re
import unicodedata

BACKSLASH = chr(92)
r = {}


def outcome(call):
    try:
        return call()
    except (KeyError, SyntaxError, TypeError, UnicodeDecodeError, re.error) as error:
        return type(error).__name__


def code_points(name):
    return outcome(lambda: ['%04X' % ord(c) for c in unicodedata.lookup(name)])


r['a_keycap_is_its_three_characters'] = code_points('KEYCAP NUMBER SIGN')
r['a_letter_with_two_marks'] = code_points('LATIN CAPITAL LETTER A WITH MACRON AND GRAVE')
r['the_longest_is_four_characters'] = code_points('TAMIL SYLLABLE SHRII')
r['cpythons_own_sample'] = [outcome(lambda: unicodedata.lookup(name)) == text for name, text in [
    ('LATIN SMALL LETTER R WITH TILDE', 'r\u0303'),
    ('TAMIL SYLLABLE SAI', '\u0BB8\u0BC8'),
    ('TAMIL SYLLABLE MOO', '\u0BAE\u0BCB'),
    ('TAMIL SYLLABLE NNOO', '\u0BA3\u0BCB'),
    ('TAMIL CONSONANT KSS', '\u0B95\u0BCD\u0BB7\u0BCD')]]
r['matched_case_insensitively'] = [code_points('keycap number sign') == code_points('KEYCAP NUMBER SIGN'),
                                   code_points('Hiragana Letter Bidakuon Nga')]
r['a_string_literal_refuses_one'] = outcome(
    lambda: compile('"' + BACKSLASH + 'N{KEYCAP NUMBER SIGN}"', '<fixture>', 'eval'))
r['a_regex_refuses_one'] = outcome(lambda: re.compile(BACKSLASH + 'N{KEYCAP NUMBER SIGN}'))
r['the_unicode_escape_codec_refuses_one'] = outcome(
    lambda: codecs.decode((BACKSLASH + 'N{KEYCAP NUMBER SIGN}').encode('ascii'), 'unicode_escape'))
r['name_of_a_sequence_is_a_type_error'] = outcome(lambda: unicodedata.name('0\uFE0F\u20E3'))
r['an_unknown_name_is_still_a_key_error'] = [outcome(lambda: unicodedata.lookup('KEYCAP NUMBER SIGNS')),
                                             outcome(lambda: unicodedata.lookup('KEYCAP'))]
r['names_and_aliases_are_unchanged'] = [code_points('LATIN SMALL LETTER A'), code_points('BYTE ORDER MARK'),
                                        code_points('NULL'), code_points('HANGUL SYLLABLE GAG'),
                                        code_points('CJK UNIFIED IDEOGRAPH-4E00')]

EXPECTED = {
    'a_keycap_is_its_three_characters': ['0023', 'FE0F', '20E3'],
    'a_letter_with_two_marks': ['0100', '0300'],
    'the_longest_is_four_characters': ['0BB6', '0BCD', '0BB0', '0BC0'],
    'cpythons_own_sample': [True, True, True, True, True],
    'matched_case_insensitively': [True, ['304B', '309A']],
    'a_string_literal_refuses_one': 'SyntaxError',
    'a_regex_refuses_one': 'PatternError',
    'the_unicode_escape_codec_refuses_one': 'UnicodeDecodeError',
    'name_of_a_sequence_is_a_type_error': 'TypeError',
    'an_unknown_name_is_still_a_key_error': ['KeyError', 'KeyError'],
    'names_and_aliases_are_unchanged': [['0061'], ['FEFF'], ['0000'], ['AC01'], ['4E00']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
