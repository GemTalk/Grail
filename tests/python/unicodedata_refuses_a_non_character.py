"""Fixture: unicodedata's functions refuse a non-character as CPython does.

Each of them takes one character, which Argument Clinic checks
(Modules/clinic/unicodedata.c.h): anything but a str is ``f() argument must be
a unicode character, not T'', with None named ``None'' rather than by its type
(Python/getargs.c:628), and a str of another length is ``f(): argument must be
a unicode character, not a string of length N''.  Grail's name() had a check of
its own: it answered a name for b'a', said ``not str'' for a string of the
wrong length and raised a len() error for an int.  Every function said
``NoneType'' for None.  Every check holds under CPython 3.14, which is what
makes it evidence.
"""

import unicodedata

r = {}


class Text(str):
    pass


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as error:
        return '%s: %s' % (type(error).__name__, error)


LOW = chr(0xDC80)
r['name_refuses_a_string_of_another_length'] = [outcome(lambda: unicodedata.name('ab')),
                                                outcome(lambda: unicodedata.name(''))]
r['name_refuses_what_is_not_a_str'] = [outcome(lambda: unicodedata.name(b'a')),
                                       outcome(lambda: unicodedata.name(bytearray(b'a'))),
                                       outcome(lambda: unicodedata.name(5)), outcome(lambda: unicodedata.name(None))]
r['every_function_names_none_as_none'] = [outcome(lambda: unicodedata.category(None)),
                                          outcome(lambda: unicodedata.decimal(None)),
                                          outcome(lambda: unicodedata.east_asian_width(None))]
r['name_still_answers_a_character'] = [unicodedata.name('a'), unicodedata.name(Text('b')),
                                       unicodedata.name('\x00', 'no name'), outcome(lambda: unicodedata.name('\x00')),
                                       unicodedata.name(LOW, 'no name')]
r['name_counts_its_arguments_first'] = outcome(lambda: unicodedata.name('ab', 'd', 'e'))

EXPECTED = {
    'name_refuses_a_string_of_another_length': [
        'TypeError: name(): argument 1 must be a unicode character, not a string of length 2',
        'TypeError: name(): argument 1 must be a unicode character, not a string of length 0'],
    'name_refuses_what_is_not_a_str': [
        'TypeError: name() argument 1 must be a unicode character, not bytes',
        'TypeError: name() argument 1 must be a unicode character, not bytearray',
        'TypeError: name() argument 1 must be a unicode character, not int',
        'TypeError: name() argument 1 must be a unicode character, not None'],
    'every_function_names_none_as_none': [
        'TypeError: category() argument must be a unicode character, not None',
        'TypeError: decimal() argument 1 must be a unicode character, not None',
        'TypeError: east_asian_width() argument must be a unicode character, not None'],
    'name_still_answers_a_character': ['LATIN SMALL LETTER A', 'LATIN SMALL LETTER B', 'no name',
                                       'ValueError: no such name', 'no name'],
    'name_counts_its_arguments_first': 'TypeError: name expected at most 2 arguments, got 3',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
