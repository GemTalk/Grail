"""A format spec CPython refuses is refused, with CPython's message.

From Python/formatter_unicode.c (CPython 3.14):

* a thousands separator goes only with d e f g E G % F or no type, and '_'
  also with b o x X -- ``format(1234567890, ',x')`` is a ValueError, and a str
  refuses one outright (its absent type is 's');
* an int refuses a precision and a ``z``, and its 'c' a sign -- an explicit
  '-' included -- or '#' (format_long_internal);
* a str refuses a sign (a space has its own message), a ``z`` and '#'
  (format_string_internal);
* "Unknown format code" names the code;
* bool formats as the int it is: ``f'{True:>6}'`` is '     1'.

Grail grouped ',x' into '4996,02d2', ignored all of the int and str refusals,
left the code out of "Unknown format code", and answered every non-empty spec
on a bool with ``unsupported format string passed to bool.__format__``.

Self-running: ``python3 format_spec_validation.py`` prints one line per check
against what CPython 3.14 answers.
"""


def _formatted(value, spec):
    try:
        return repr(format(value, spec))
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _all(value, specs):
    return tuple(_formatted(value, spec) for spec in specs)


r = {
    "a_separator_with_bin_oct_hex": _all(1234567890, (',x', ',o', ',b', ',X')),
    "an_underscore_with_bin_oct_hex_groups_by_four": _all(1234567890, ('_x', '_b', '_o')),
    "a_separator_with_decimal_or_no_type": _all(1234567890, (',d', '_d', ',', '_')),
    "a_separator_with_c_or_n": _all(65, (',c', '_c', ',n')),
    "an_int_refuses_a_precision": _all(3, ('1.3', '.2', '.2d', '.2x')),
    "an_int_with_a_float_type_takes_one": _all(3, ('.2f', '.0%')),
    "c_refuses_a_sign_or_alternate_form": _all(65, ('+c', '-c', ' c', '#c')),
    "c_without_them": _all(65, ('c', '>5c')),
    "an_int_refuses_z": _all(3, ('zd', 'z')),
    "a_str_refuses_a_separator": _all('abc', (',s', ',', '_')),
    "a_str_refuses_a_sign_z_or_alternate_form": _all('abc', ('+', '-s', ' s', 'z', '#')),
    "a_str_unknown_code_names_it": _formatted('abc', 'd'),
    "a_float_refuses_a_separator_with_x_first": _formatted(1.5, ',x'),
    "a_float_unknown_code_names_it": _formatted(1.5, 'x'),
    "a_float_keeps_its_separators_and_z": _all(1.5, (',f', '_g', ',e', 'z.2f')) + (_formatted(1234567, ',.2f'),),
    "a_bool_formats_as_an_int": _all(True, ('d', '5', '>6', 'x', '+d', '#b')) + (_formatted(False, '03'),),
    "a_bool_with_an_empty_spec_is_its_str": (format(True, ''), format(False, ''), f'{True}'),
    "a_bool_is_refused_as_an_int_is": _all(True, (',x', '.2')),
    "a_huge_int_is_refused_too": _formatted(2 ** 70, ',x'),
}

EXPECTED = {
    'a_bool_formats_as_an_int': ("'1'", "'    1'", "'     1'", "'1'", "'+1'", "'0b1'", "'000'"),
    'a_bool_is_refused_as_an_int_is': ("ValueError: Cannot specify ',' with 'x'.",
                                       'ValueError: Precision not allowed in integer format specifier'),
    'a_bool_with_an_empty_spec_is_its_str': ('True', 'False', 'True'),
    'a_float_keeps_its_separators_and_z': ("'1.500000'", "'1.5'", "'1.500000e+00'", "'1.50'", "'1,234,567.00'"),
    'a_float_refuses_a_separator_with_x_first': "ValueError: Cannot specify ',' with 'x'.",
    'a_float_unknown_code_names_it': "ValueError: Unknown format code 'x' for object of type 'float'",
    'a_huge_int_is_refused_too': "ValueError: Cannot specify ',' with 'x'.",
    'a_separator_with_bin_oct_hex': ("ValueError: Cannot specify ',' with 'x'.", "ValueError: Cannot specify ',' with 'o'.",
                                     "ValueError: Cannot specify ',' with 'b'.", "ValueError: Cannot specify ',' with 'X'."),
    'a_separator_with_c_or_n': ("ValueError: Cannot specify ',' with 'c'.", "ValueError: Cannot specify '_' with 'c'.",
                                "ValueError: Cannot specify ',' with 'n'."),
    'a_separator_with_decimal_or_no_type': ("'1,234,567,890'", "'1_234_567_890'", "'1,234,567,890'", "'1_234_567_890'"),
    'a_str_refuses_a_separator': ("ValueError: Cannot specify ',' with 's'.", "ValueError: Cannot specify ',' with 's'.",
                                  "ValueError: Cannot specify '_' with 's'."),
    'a_str_refuses_a_sign_z_or_alternate_form': (
        'ValueError: Sign not allowed in string format specifier',
        'ValueError: Sign not allowed in string format specifier',
        'ValueError: Space not allowed in string format specifier',
        'ValueError: Negative zero coercion (z) not allowed in string format specifier',
        'ValueError: Alternate form (#) not allowed in string format specifier',
    ),
    'a_str_unknown_code_names_it': "ValueError: Unknown format code 'd' for object of type 'str'",
    'an_int_refuses_a_precision': ('ValueError: Precision not allowed in integer format specifier',) * 4,
    'an_int_refuses_z': ('ValueError: Negative zero coercion (z) not allowed in integer format specifier',) * 2,
    'an_int_with_a_float_type_takes_one': ("'3.00'", "'300%'"),
    'an_underscore_with_bin_oct_hex_groups_by_four': ("'4996_02d2'", "'100_1001_1001_0110_0000_0010_1101_0010'",
                                                      "'111_4540_1322'"),
    'c_refuses_a_sign_or_alternate_form': (
        "ValueError: Sign not allowed with integer format specifier 'c'",
        "ValueError: Sign not allowed with integer format specifier 'c'",
        "ValueError: Sign not allowed with integer format specifier 'c'",
        "ValueError: Alternate form (#) not allowed with integer format specifier 'c'",
    ),
    'c_without_them': ("'A'", "'    A'"),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-46s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
