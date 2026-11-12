"""Fixture: a regular expression's \\w and \\s are CPython's Unicode classes.

_sre is CPython's C engine, but the character predicates it calls come from
Grail's shim, and two of them were approximations:

* \\w (and so \\W and \\b) asked _grail_unicode_isalnum, which answered true for
  EVERY non-ASCII code point.  So \\w+ took an em dash, a euro sign, a no-break
  space, U+2028 or an emoji as part of a word.
* \\s asked isspace() and iswspace(): isspace() leaves out the separators
  0x1C-0x1F, and iswspace() follows the C library's locale, so NEL (U+0085)
  was not whitespace on a Mac.

CPython's \\w is str.isalnum() or '_', character by character, and its \\s is
str.isspace() (Modules/_sre/sre.c:167-170).  The sweep checks say exactly
that over the whole Basic Multilingual Plane; the samples name the kinds of
character that differed.  Every check holds under CPython 3.14, which is what
makes it evidence.
"""

import re

r = {}

SAMPLES = {
    'latin_letter': 'é', 'sharp_s': 'ß', 'greek': 'Ω', 'han': '中',
    'arabic_digit': '٣', 'superscript_two': '²', 'vulgar_half': '½',
    'roman_twelve': 'Ⅻ', 'combining_acute': '́', 'em_dash': '—',
    'middle_dot': '·', 'ideographic_full_stop': '。', 'inverted_question': '¿',
    'euro': '€', 'copyright': '©', 'emoji': chr(0x1F600), 'no_break_space': ' ',
    'line_separator': ' ', 'ideographic_space': '　', 'next_line': '\u0085',
    'file_separator': '\x1c', 'unit_separator': '\x1f', 'zero_width_space': '​',
    'private_use': '', 'unassigned': '͸', 'lone_surrogate': chr(0xDCC2),
    'math_bold_a': chr(0x1D400), 'cuneiform': chr(0x12000),
}
r['each_sample_as_word_space_and_nonword'] = {
    name: [re.fullmatch(r'\w', ch) is not None, re.fullmatch(r'\s', ch) is not None,
           re.fullmatch(r'\W', ch) is not None]
    for name, ch in SAMPLES.items()}

text = 'café — naïve x €5 。中文 ' + chr(0x1F600) + ' ²'
r['words_of_mixed_text'] = re.findall(r'\w+', text)
r['slug_keeps_only_words_spaces_and_hyphens'] = re.sub(r'[^\w\s-]', '', 'Hello — wörld! €5 x-y')
r['boundaries_beside_a_dash'] = re.sub(r'\b', '|', 'a—b')
r['split_on_unicode_whitespace'] = re.split(r'\s+', 'a\u0085b\x1cc　d')

plane = ''.join(map(chr, range(0x10000)))
words = re.findall(r'\w', plane)
spaces = re.findall(r'\s', plane)
r['plane_counts_of_word_and_space'] = [len(words), len(spaces)]
r['plane_word_is_isalnum_or_underscore'] = set(words) == {ch for ch in plane if ch.isalnum() or ch == '_'}
r['plane_space_is_isspace'] = set(spaces) == {ch for ch in plane if ch.isspace()}
r['plane_nonword_is_the_rest'] = len(re.findall(r'\W', plane)) == len(plane) - len(words)

EXPECTED = {
    'each_sample_as_word_space_and_nonword': {
        'latin_letter': [True, False, False], 'sharp_s': [True, False, False],
        'greek': [True, False, False], 'han': [True, False, False],
        'arabic_digit': [True, False, False], 'superscript_two': [True, False, False],
        'vulgar_half': [True, False, False], 'roman_twelve': [True, False, False],
        'combining_acute': [False, False, True], 'em_dash': [False, False, True],
        'middle_dot': [False, False, True], 'ideographic_full_stop': [False, False, True],
        'inverted_question': [False, False, True], 'euro': [False, False, True],
        'copyright': [False, False, True], 'emoji': [False, False, True],
        'no_break_space': [False, True, True], 'line_separator': [False, True, True],
        'ideographic_space': [False, True, True], 'next_line': [False, True, True],
        'file_separator': [False, True, True], 'unit_separator': [False, True, True],
        'zero_width_space': [False, False, True], 'private_use': [False, False, True],
        'unassigned': [False, False, True], 'lone_surrogate': [False, False, True],
        'math_bold_a': [True, False, False], 'cuneiform': [True, False, False],
    },
    'words_of_mixed_text': ['café', 'naïve', 'x', '5', '中文', '²'],
    'slug_keeps_only_words_spaces_and_hyphens': 'Hello  wörld 5 x-y',
    'boundaries_beside_a_dash': '|a|—|b|',
    'split_on_unicode_whitespace': ['a', 'b', 'c', 'd'],
    'plane_counts_of_word_and_space': [49709, 29],
    'plane_word_is_isalnum_or_underscore': True,
    'plane_space_is_isspace': True,
    'plane_nonword_is_the_rest': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
