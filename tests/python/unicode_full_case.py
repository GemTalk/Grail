"""Fixture: str's case methods use Unicode's full case data, as CPython's do.

CPython cases a string from its own Unicode database (Objects/unicodeobject.c,
Objects/unicodectype.c), and that is more than mapping one character to one:

* casefold() folds fully, which is not lowercasing: 'ß' -> 'ss', 'µ' -> 'μ';
* title() and capitalize() use the TITLECASE mapping: 'ǆ' -> 'ǅ', 'ﬁ' -> 'Fi';
* a capital sigma lowercases to final 'ς' where it ends a word (Final_Sigma);
* swapcase() maps by the full mappings too: 'ﬁ' -> 'FI';
* islower(), isupper() and istitle() read the Lowercase, Uppercase and
  Titlecase properties, so 'ⅷ' (U+2177) is lowercase though it is no letter.

Grail used the kernel's one-to-one mappings, from an older Unicode, plus a
table of multi-character expansions for upper() and lower() only, and judged
the predicates by isLetter.  Most strings below are test_str's own.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

r['lower_final_sigma'] = ['Σ'.lower(), 'AͅΣ'.lower(), 'AͅΣa'.lower(),
                          'AΣͅ'.lower(), 'Σͅ '.lower(), 'ΌΣΟΣ'.lower(),
                          'ΣΑΣ ΣΑΣ.'.lower()]
r['lower_expands'] = ['İ'.lower(), 'ﬁ'.lower(), '\U00010427\U0001044F'.lower()]
r['upper'] = ['ﬁ'.upper(), 'ß'.upper(), '\U0001044F'.upper(), 'ǆ'.upper()]
r['casefold'] = ['ß'.casefold(), 'ﬁ'.casefold(), 'Σ'.casefold(), 'AͅΣ'.casefold(),
                 'µ'.casefold(), 'Ꭰ'.casefold(), 'hELlo'.casefold()]
r['swapcase'] = ['ﬁ'.swapcase(), '\U0001044F\U00010427'.swapcase(), 'ǅ'.swapcase(),
                 'AΣ'.swapcase(), 'ß'.swapcase()]
r['capitalize'] = ['hİ'.capitalize(), 'ﬁnnish'.capitalize(), 'AͅΣ'.capitalize(),
                   'ǆemal'.capitalize(), 'ῒİ'.capitalize(), ''.capitalize()]
r['title'] = ['ﬁnnish ǆemal'.title(), "they're bill's friends".title(), 'ΣΑΣ ΣΑΣ.'.title(),
              '\U0001044F\U0001044F \U0001044F\U0001044F'.title()]
r['islower'] = ['ⅷ'.islower(), 'Ⅷ'.islower(), '\U00010429'.islower(),
                '\U0001F40D'.islower(), 'ǅ'.islower(), '\u00aa'.islower(), 'abc1'.islower(), ''.islower()]
r['isupper'] = ['Ⅷ'.isupper(), 'ⅷ'.isupper(), '\U00010401'.isupper(),
                'ǅ'.isupper(), 'ABC1'.isupper(), '中'.isupper()]
r['istitle'] = ['\U00010401\U00010429'.istitle(), 'ǅemal'.istitle(), 'ǅ'.istitle(),
                'Ⅷ ⅷ'.istitle(), 'A Title'.istitle(), 'A title'.istitle(), '中文'.istitle()]
r['results_are_exact_str'] = sorted({type(s).__name__ for s in
                                     [type('S', (str,), {})('ΣA').lower(), type('S', (str,), {})('ab').title()]})

EXPECTED = {
    'lower_final_sigma': ['σ', 'aͅς', 'aͅσa', 'aςͅ', 'σͅ ', 'όσος', 'σας σας.'],
    'lower_expands': ['i̇', 'ﬁ', '\U0001044F\U0001044F'],
    'upper': ['FI', 'SS', '\U00010427', 'Ǆ'],
    'casefold': ['ss', 'fi', 'σ', 'aισ', 'μ', 'Ꭰ', 'hello'],
    'swapcase': ['FI', '\U00010427\U0001044F', 'ǅ', 'aς', 'SS'],
    'capitalize': ['Hi\u0307', 'Finnish', 'A\u0345\u03c2', '\u01c5emal', '\u0399\u0308\u0300i\u0307', ''],
    'title': ['Finnish ǅemal', "They'Re Bill'S Friends", 'Σας Σας.', '\U00010427\U0001044F \U00010427\U0001044F'],
    'islower': [True, False, True, False, False, True, True, False],
    'isupper': [True, False, True, False, True, False],
    'istitle': [True, True, True, False, True, False, False],
    'results_are_exact_str': ['str'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
