"""Fixture: str.translate refuses a mapping it cannot use, as CPython does.

charmaptranslate_lookup (Objects/unicodeobject.c:9287-9338) takes a mapped
int only in range(0x110000) -- ValueError "character mapping must be in
range(0x110000)" otherwise -- and a value that is not an int, None or str is
TypeError "character mapping must return integer, None or str".

Grail wrote the int straight into a Character, and GemStone's Character
refused it with an OutOfRange no Python code can catch: test_str's
test_maketrans_translate ended the session.  A float went the same way as a
MessageNotUnderstood.  And str.maketrans refused a key of the wrong
length with a TypeError where CPython raises ValueError (:13400-13402).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return ascii(thunk())
    except (ValueError, TypeError) as e:
        return '%s: %s' % (type(e).__name__, e)


r['the_last_code_point'] = outcome(lambda: 'abc'.translate({ord('a'): 0x10FFFF}))
r['one_past_it'] = outcome(lambda: 'abc'.translate({ord('a'): 0x110000}))
r['a_negative_one'] = outcome(lambda: 'abc'.translate({ord('b'): -1}))
r['through_maketrans'] = outcome(lambda: 'abc'.translate(str.maketrans({'c': 0x110000})))
r['a_float'] = outcome(lambda: 'abc'.translate({ord('a'): 1.5}))
r['unmapped_text_is_untouched'] = outcome(lambda: 'xyz'.translate({ord('a'): 0x110000}))
r['the_valid_shapes'] = outcome(lambda: 'abcd'.translate({ord('a'): 'AA', ord('b'): None, ord('c'): 0x41}))
r['maketrans_key_too_long'] = outcome(lambda: str.maketrans({'xy': 2}))
r['maketrans_key_of_no_kind'] = outcome(lambda: str.maketrans({(1,): 2}))

RANGE = 'ValueError: character mapping must be in range(0x110000)'

EXPECTED = {
    'the_last_code_point': "'\\U0010ffffbc'",
    'one_past_it': RANGE,
    'a_negative_one': RANGE,
    'through_maketrans': RANGE,
    'a_float': 'TypeError: character mapping must return integer, None or str',
    'unmapped_text_is_untouched': "'xyz'",
    'the_valid_shapes': "'AAAd'",
    # CPython's own words: its two string literals concatenate without a space.
    'maketrans_key_too_long': 'ValueError: string keys in translatetable must be of length 1',
    'maketrans_key_of_no_kind': 'TypeError: keys in translate table mustbe strings or integers',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
