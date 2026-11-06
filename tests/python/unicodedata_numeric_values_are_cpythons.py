"""Fixture: unicodedata's decimal, digit, numeric, mirrored and east_asian_width are CPython's.

CPython answers them from its Unicode Character Database
(Modules/unicodedata.c).  Grail's unicodedata had no decimal, digit, numeric
or mirrored at all, and east_asian_width answered 'N' for every character.
They are now read from tables scripts/generate_ucd.py generates from
CPython's own database and checks against it on every code point, as it
already did for category and the rest.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import unicodedata

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


SAMPLES = ('5', '٣', '²', '①', '½', '万', '\U00016b61', 'a')

r['decimal_answers_a_decimal_digit_only'] = [
    outcome(lambda: unicodedata.decimal(ch, None)) for ch in SAMPLES]
r['digit_answers_a_digit_too'] = [
    outcome(lambda: unicodedata.digit(ch, None)) for ch in SAMPLES]
r['numeric_answers_any_numeric_value_as_a_float'] = [
    outcome(lambda: unicodedata.numeric(ch, None)) for ch in SAMPLES]
r['without_a_default_no_value_raises'] = [
    outcome(lambda: unicodedata.decimal('a')), outcome(lambda: unicodedata.digit('a')),
    outcome(lambda: unicodedata.numeric('a'))]
r['any_default_is_answered'] = [
    outcome(lambda: unicodedata.decimal('a', -1)), outcome(lambda: unicodedata.numeric('a', 'none'))]
r['the_argument_is_one_character'] = [
    outcome(lambda: unicodedata.decimal('12')), outcome(lambda: unicodedata.digit(b'1')),
    outcome(lambda: unicodedata.numeric('1', None, None)), outcome(lambda: unicodedata.mirrored(''))]
r['mirrored_answers_one_or_zero'] = [
    outcome(lambda: unicodedata.mirrored(ch)) for ch in ('(', ')', '∈', 'a', '«')]
r['east_asian_width_is_the_characters'] = [
    outcome(lambda: unicodedata.east_asian_width(ch))
    for ch in ('a', '一', 'Ａ', '｡', '¡', '\x00', '\U0001f600')]
r['an_unassigned_code_point_has_its_blocks_width'] = [
    outcome(lambda: unicodedata.east_asian_width(ch)) for ch in ('䶿', '\U0002fffd', '\U000e0080')]
r['a_bad_argument_is_named_as_cpython_names_it'] = [
    outcome(lambda: unicodedata.east_asian_width('ab')), outcome(lambda: unicodedata.category(1))]
r['ucd_3_2_0_answers_from_unicode_3_2_0'] = [
    outcome(lambda: unicodedata.ucd_3_2_0.east_asian_width('\U0001f600')),
    outcome(lambda: unicodedata.ucd_3_2_0.numeric('⅓', None)),
    outcome(lambda: unicodedata.ucd_3_2_0.decimal('\U0001d7ce', None)),
    outcome(lambda: unicodedata.ucd_3_2_0.mirrored('∈'))]
r['a_whole_block_agrees_with_str_isdecimal'] = outcome(lambda: all(
    (unicodedata.decimal(chr(point), None) is not None) == chr(point).isdecimal()
    for point in range(0x0660, 0x0700)))

EXPECTED = {
    'decimal_answers_a_decimal_digit_only': [5, 3, None, None, None, None, None, None],
    'digit_answers_a_digit_too': [5, 3, 2, 1, None, None, None, None],
    'numeric_answers_any_numeric_value_as_a_float': [
        5.0, 3.0, 2.0, 1.0, 0.5, 10000.0, 1000000000000.0, None],
    'without_a_default_no_value_raises': [
        'ValueError: not a decimal', 'ValueError: not a digit',
        'ValueError: not a numeric character'],
    'any_default_is_answered': [-1, 'none'],
    'the_argument_is_one_character': [
        'TypeError: decimal(): argument 1 must be a unicode character, not a string of length 2',
        'TypeError: digit() argument 1 must be a unicode character, not bytes',
        'TypeError: numeric expected at most 2 arguments, got 3',
        'TypeError: mirrored(): argument must be a unicode character, not a string of length 0'],
    'mirrored_answers_one_or_zero': [1, 1, 1, 0, 1],
    'east_asian_width_is_the_characters': ['Na', 'W', 'F', 'H', 'A', 'N', 'W'],
    'an_unassigned_code_point_has_its_blocks_width': ['W', 'W', 'N'],
    'a_bad_argument_is_named_as_cpython_names_it': [
        'TypeError: east_asian_width(): argument must be a unicode character, not a string of length 2',
        'TypeError: category() argument must be a unicode character, not int'],
    'ucd_3_2_0_answers_from_unicode_3_2_0': ['N', 0.3333333333333333, 0, 1],
    'a_whole_block_agrees_with_str_isdecimal': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
