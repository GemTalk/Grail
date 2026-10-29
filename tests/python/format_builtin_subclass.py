"""Fixture: format() of an instance of a subclass of int, float or str.

CPython formats the instance by its builtin value with the builtin's
__format__, names the subclass in an error (``Unknown format code 'q' for
object of type 'I'``), and answers an empty spec with str() of the instance,
so an overridden __str__ applies (Python/formatter_unicode.c format_obj).
Grail's int and float subclasses are rooted at Number, not at int or float,
so formatting reached object.__format__ and every non-empty spec was
``TypeError: unsupported format string passed to I.__format__``; a str
subclass was formatted, but named ``str`` and its __str__ ignored, and an
IntEnum, an HTTPStatus or a StrEnum member was named by its builtin.  Every
check here holds under CPython 3.14, which is what makes it evidence.
"""

import enum
import http

r = {}


class I(int):
    pass


class F(float):
    pass


class S(str):
    pass


class IS(int):
    def __str__(self):
        return 'IS!'


class FS(float):
    def __str__(self):
        return 'FS!'


class SS(str):
    def __str__(self):
        return 'SS!'


class Color(enum.IntEnum):
    RED = 1


class Shade(enum.StrEnum):
    DARK = 'dark'


def outcome(value, spec):
    try:
        return format(value, spec)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


r['int_subclass'] = [outcome(I(5), 'd'), outcome(I(5), '>4'), outcome(I(255), '#x'), outcome(I(5), '.2f'), outcome(I(5), '')]
r['float_subclass'] = [outcome(F(1.5), '.2f'), outcome(F(1.5), 'e'), outcome(F(1.5), '')]
r['str_subclass'] = [outcome(S('a'), '>3'), outcome(S('a'), '')]
r['errors_name_the_subclass'] = [outcome(I(5), 'q'), outcome(F(1.5), 'd'), outcome(S('a'), 'q')]
r['an_empty_spec_is_str_of_the_instance'] = [outcome(IS(5), ''), outcome(FS(1.5), ''), outcome(SS('a'), '')]
r['a_spec_formats_the_value'] = [outcome(IS(5), 'd'), outcome(FS(1.5), '.1f'), outcome(SS('a'), '>3')]
r['in_an_fstring'] = f'{I(7):03d}|{F(2.5):>6}|{S("z"):*^5}'
r['enum_members_and_http_status'] = [
    outcome(http.HTTPStatus.OK, 'd'), outcome(http.HTTPStatus.OK, 's'), outcome(http.HTTPStatus.OK, ''),
    outcome(Color.RED, '>4'), outcome(Color.RED, 's'),
    outcome(Shade.DARK, 'd'), outcome(Shade.DARK, ''), outcome(Shade.DARK, '>6')]

EXPECTED = {
    'int_subclass': ['5', '   5', '0xff', '5.00', '5'],
    'float_subclass': ['1.50', '1.500000e+00', '1.5'],
    'str_subclass': ['  a', 'a'],
    'errors_name_the_subclass': ["ValueError: Unknown format code 'q' for object of type 'I'",
                                 "ValueError: Unknown format code 'd' for object of type 'F'",
                                 "ValueError: Unknown format code 'q' for object of type 'S'"],
    'an_empty_spec_is_str_of_the_instance': ['IS!', 'FS!', 'SS!'],
    'a_spec_formats_the_value': ['5', '1.5', '  a'],
    'in_an_fstring': '007|   2.5|**z**',
    'enum_members_and_http_status': [
        '200', "ValueError: Unknown format code 's' for object of type 'HTTPStatus'", '200',
        '   1', "ValueError: Unknown format code 's' for object of type 'Color'",
        "ValueError: Unknown format code 'd' for object of type 'Shade'", 'dark', '  dark'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-38s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
