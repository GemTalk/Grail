"""Fixture: a format spec whose last character is not a presentation type of the value's.

CPython's spec parser takes the one character left after the flags as the
presentation type, whatever it is, and calls more than one an invalid
specifier (Python/formatter_unicode.c:303-325).  Each type's formatter then
refuses a code it lacks -- after the separator check, before its own
refusals -- naming the value's type: ``Unknown format code 'q' for object of
type 'bool'``.  Grail called every unknown code an invalid specifier, named
a bool ``int`` and a complex ``float``, accepted ``%`` for a complex, and
checked a complex's flags before its code (test_fstring test_errors,
test_format).  Every check here holds under CPython 3.14, which is what makes
it evidence.
"""

r = {}


class C(complex):
    pass


def outcome(value, spec):
    try:
        return repr(format(value, spec))
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


CASES = {
    'unknown_code': [
        (3, 'q', "ValueError: Unknown format code 'q' for object of type 'int'"),
        (1.5, 'q', "ValueError: Unknown format code 'q' for object of type 'float'"),
        ('a', 'q', "ValueError: Unknown format code 'q' for object of type 'str'"),
        (3j, 'q', "ValueError: Unknown format code 'q' for object of type 'complex'"),
        (True, 'q', "ValueError: Unknown format code 'q' for object of type 'bool'"),
    ],
    'unknown_code_after_flags': [
        (3, '10q', "ValueError: Unknown format code 'q' for object of type 'int'"),
        (1.5, '<10q', "ValueError: Unknown format code 'q' for object of type 'float'"),
        ('a', '10.3j', "ValueError: Unknown format code 'j' for object of type 'str'"),
        (3, 'zz', "ValueError: Unknown format code 'z' for object of type 'int'"),
        (1.5, '+q', "ValueError: Unknown format code 'q' for object of type 'float'"),
        ('a', '^5q', "ValueError: Unknown format code 'q' for object of type 'str'"),
    ],
    'more_than_one_left': [
        (3, 'x10', "ValueError: Invalid format specifier 'x10' for object of type 'int'"),
        (1.5, '%z', "ValueError: Invalid format specifier '%z' for object of type 'float'"),
        ('a', 'qq', "ValueError: Invalid format specifier 'qq' for object of type 'str'"),
        (3j, '10qq', "ValueError: Invalid format specifier '10qq' for object of type 'complex'"),
    ],
    'named_by_the_values_type': [
        (C(1j), 'q', "ValueError: Unknown format code 'q' for object of type 'C'"),
        (True, 's', "ValueError: Unknown format code 's' for object of type 'bool'"),
        (True, '#s', "ValueError: Unknown format code 's' for object of type 'bool'"),
    ],
    'a_complex_is_named_as_one': [
        (3j, ',d', "ValueError: Unknown format code 'd' for object of type 'complex'"),
        (3j, '.2d', "ValueError: Unknown format code 'd' for object of type 'complex'"),
        (3j, 'c', "ValueError: Unknown format code 'c' for object of type 'complex'"),
        (3j, 'b', "ValueError: Unknown format code 'b' for object of type 'complex'"),
        (3j, '%', "ValueError: Unknown format code '%' for object of type 'complex'"),
    ],
    'a_complex_checks_the_code_before_its_flags': [
        (3j, '=s', "ValueError: Unknown format code 's' for object of type 'complex'"),
        (3j, '0s', "ValueError: Unknown format code 's' for object of type 'complex'"),
        (3j, '=', "ValueError: '=' alignment flag is not allowed in complex format specifier"),
        (3j, '0', 'ValueError: Zero padding is not allowed in complex format specifier'),
    ],
    'the_separator_is_checked_first': [
        (3, ',q', "ValueError: Cannot specify ',' with 'q'."),
        (3, '_q', "ValueError: Cannot specify '_' with 'q'."),
        (3j, ',x', "ValueError: Cannot specify ',' with 'x'."),
        (1.5, ',s', "ValueError: Cannot specify ',' with 's'."),
        ('a', ',q', "ValueError: Cannot specify ',' with 'q'."),
        (True, ',x', "ValueError: Cannot specify ',' with 'x'."),
    ],
    'a_code_outside_printable_ascii': [
        (3, '\u20ac', "ValueError: Unknown format code '\\x20ac' for object of type 'int'"),
        (1.5, '\x01', "ValueError: Unknown format code '\\x1' for object of type 'float'"),
    ],
    'legal': [
        (3, 'x', "'3'"),
        (3j, '.1f', "'0.0+3.0j'"),
        (True, 'd', "'1'"),
        ('a', 's', "'a'"),
        (3, 'n', "'3'"),
        (1.5, '%', "'150.000000%'"),
        (3, 'e', "'3.000000e+00'"),
    ],
}

EXPECTED = {}
for key, cases in CASES.items():
    r[key] = [outcome(value, spec) for value, spec, _ in cases]
    EXPECTED[key] = [expected for _, _, expected in cases]

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-44s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (value, spec, want), got in zip(CASES[key], r[key]):
                if got != want:
                    print('    %r %r: got %r, want %r' % (value, spec, got, want))
    print(SUMMARY)
