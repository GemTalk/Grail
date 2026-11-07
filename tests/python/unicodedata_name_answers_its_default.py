"""Fixture: unicodedata.name answers the default it is given, None too.

CPython's unicodedata.name(chr, default, /) answers default for a character
without a name whenever one is passed, and raises ValueError only when none
is (unicodedata_UCD_name_impl, Modules/unicodedata.c:1613-1645).  Grail's
took a default of None for no default at all, so ``name(c, None)'' -- the
usual way to ask "has it a name?" -- raised for every unnamed character.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import unicodedata

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


r['a_none_default_is_answered'] = [
    outcome(lambda: unicodedata.name(ch, None)) for ch in ('\x00', '\U000e0080', '\ud800')]
r['any_other_default_is_answered'] = [
    outcome(lambda: unicodedata.name('\x00', 'unnamed')), outcome(lambda: unicodedata.name('\x00', 0))]
r['a_named_character_answers_its_name_whatever_the_default'] = [
    outcome(lambda: unicodedata.name('a', None)), outcome(lambda: unicodedata.name('あ'))]
r['without_a_default_an_unnamed_character_raises'] = outcome(lambda: unicodedata.name('\x00'))
r['it_takes_at_most_two_arguments'] = outcome(lambda: unicodedata.name('a', 1, 2))

EXPECTED = {
    'a_none_default_is_answered': [None, None, None],
    'any_other_default_is_answered': ['unnamed', 0],
    'a_named_character_answers_its_name_whatever_the_default': [
        'LATIN SMALL LETTER A', 'HIRAGANA LETTER A'],
    'without_a_default_an_unnamed_character_raises': 'ValueError: no such name',
    'it_takes_at_most_two_arguments': 'TypeError: name expected at most 2 arguments, got 3',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-56s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
