"""The integer string conversion limit (sys.set_int_max_str_digits, CVE-2020-10735).

CPython words its ValueError differently in the two directions:

    int -> str:  Exceeds the limit (4300 digits) for integer string
                 conversion; use sys.set_int_max_str_digits() to increase
                 the limit
    str -> int:  Exceeds the limit (4300 digits) for integer string
                 conversion: value has 5000 digits; use ...

Grail gave the int -> str direction the str -> int wording, with a digit
count CPython does not report there.  Around it:

* '%d', b'%d' and format(n, 'd' / ',' / '_' / 'n') did not check at all;
* int(s, base) counted only DECIMAL digits, so int('z' * 5000, 36) passed,
  and took base 0 for decimal, refusing int('0x' + '1' * 5000, 0);
* an invalid literal quoted the whole string, where CPython's %.200R stops
  at 200 characters;
* set_int_max_str_digits(639) was worded differently.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import sys

r = {}

BIG = 10 ** 4300           # 4301 digits: one past the default limit
EDGE = 10 ** 4299          # 4300 digits: exactly at it


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def size(s):
    return len(s)


# int -> str, every spelling of it.
t('str_over', lambda: str(BIG))
t('str_negative_over', lambda: str(-BIG))
t('repr_over', lambda: repr(BIG))
t('percent_d_over', lambda: '%d' % BIG)
t('percent_s_over', lambda: '%s' % BIG)
t('fstring_over', lambda: f'{BIG}')
t('format_d_over', lambda: format(BIG, 'd'))
t('format_comma_over', lambda: format(BIG, ','))
t('str_at_limit', lambda: size(str(EDGE)))
t('str_negative_at_limit', lambda: size(str(-EDGE)))

# Power-of-two bases are exempt in CPython.
t('hex_over', lambda: size(hex(BIG)))
t('bin_over', lambda: size(bin(BIG)))
t('oct_over', lambda: size(oct(BIG)))

# str -> int.
t('int_str_over', lambda: int('1' * 4301))
t('int_str_at_limit', lambda: int('1' * 4300) % 1000)
t('int_negative_str_over', lambda: int('-' + '1' * 4301))
t('int_bytes_over', lambda: int(b'1' * 4301))
t('int_underscored_over', lambda: int('1_' * 4300 + '1'))
t('int_hex_str_exempt', lambda: int('f' * 5000, 16) % 1000)
t('int_base_36_over', lambda: int('z' * 5000, 36))
t('int_base_0_decimal_over', lambda: int('1' * 4301, 0))
t('int_base_0_hex_exempt', lambda: int('0x' + '1' * 5000, 0) % 1000)
t('int_base_0_octal_exempt', lambda: int('-0o' + '7' * 5000, 0) % 1000)
t('int_base_16_prefixed_exempt', lambda: int('0X' + 'a' * 5000, 16) % 1000)
t('int_base_10_trailing_garbage', lambda: int('1' * 4301 + 'x'))
t('int_base_10_garbage_first', lambda: int('x' + '1' * 4301))
t('int_base_36_signed_spaced', lambda: int('  -' + '1' * 4301 + '  ', 36))
t('int_base_36_at_limit', lambda: int('z' * 4300, 36) % 1000)
t('bytes_percent_d_over', lambda: b'%d' % BIG)

# An invalid literal's message quotes at most 200 characters (CPython's %.200R).
t('invalid_literal_199', lambda: int('x' * 199))
t('invalid_literal_200', lambda: int('x' * 200))
t('invalid_literal_201', lambda: int('x' * 201))
t('invalid_literal_wide', lambda: int('\u00e9' * 300))
t('invalid_literal_bytes', lambda: int(b'x' * 300))
t('invalid_literal_base_7', lambda: int('9' * 300, 7))
t('format_underscore_over', lambda: format(BIG, '_'))
t('format_n_over', lambda: format(BIG, 'n'))
t('format_x_exempt', lambda: size(format(BIG, 'x')))
t('percent_x_exempt', lambda: size('%x' % BIG))


# The limit is adjustable, and 0 turns it off.
def with_limit(n, thunk):
    old = sys.get_int_max_str_digits()
    sys.set_int_max_str_digits(n)
    try:
        return thunk()
    finally:
        sys.set_int_max_str_digits(old)


t('raised_limit_str', lambda: with_limit(5000, lambda: size(str(BIG))))
t('lowered_limit_str', lambda: with_limit(640, lambda: str(10 ** 640)))
t('lowered_limit_int', lambda: with_limit(640, lambda: int('1' * 641)))
t('disabled_limit_str', lambda: with_limit(0, lambda: size(str(BIG))))
t('below_minimum', lambda: sys.set_int_max_str_digits(639))


EXPECTED = {
    'below_minimum': 'ValueError: maxdigits must be >= 640 or 0 for unlimited',
    'bin_over': '14287',
    'bytes_percent_d_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'disabled_limit_str': '4301',
    'format_comma_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'format_d_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'format_n_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'format_underscore_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'format_x_exempt': '3572',
    'fstring_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'hex_over': '3574',
    'int_base_0_decimal_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_base_0_hex_exempt': '625',
    'int_base_0_octal_exempt': '625',
    'int_base_10_garbage_first': "ValueError: invalid literal for int() with base 10: 'x111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
    'int_base_10_trailing_garbage': "ValueError: invalid literal for int() with base 10: '1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
    'int_base_16_prefixed_exempt': '250',
    'int_base_36_at_limit': '375',
    'int_base_36_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 5000 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_base_36_signed_spaced': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_bytes_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_hex_str_exempt': '375',
    'int_negative_str_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_str_at_limit': '111',
    'int_str_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'int_underscored_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion: value has 4301 digits; use sys.set_int_max_str_digits() to increase the limit',
    'invalid_literal_199': "ValueError: invalid literal for int() with base 10: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    'invalid_literal_200': "ValueError: invalid literal for int() with base 10: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    'invalid_literal_201': "ValueError: invalid literal for int() with base 10: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    'invalid_literal_base_7': "ValueError: invalid literal for int() with base 7: '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999",
    'invalid_literal_bytes': "ValueError: invalid literal for int() with base 10: b'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    'invalid_literal_wide': "ValueError: invalid literal for int() with base 10: 'ééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé",
    'lowered_limit_int': 'ValueError: Exceeds the limit (640 digits) for integer string conversion: value has 641 digits; use sys.set_int_max_str_digits() to increase the limit',
    'lowered_limit_str': 'ValueError: Exceeds the limit (640 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'oct_over': '4764',
    'percent_d_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'percent_s_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'percent_x_exempt': '3572',
    'raised_limit_str': '4301',
    'repr_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'str_at_limit': '4300',
    'str_negative_at_limit': '4301',
    'str_negative_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
    'str_over': 'ValueError: Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
