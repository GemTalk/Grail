"""Fixture: int(), float() and complex() read a StrEnum member as the str it is.

A StrEnum member is a str, so CPython's int(), float() and complex() parse
its value as they parse any str literal, and name a bad one by the
member's repr: "invalid literal for int() with base 10: <E.B: 'x'>",
"could not convert string to float: <E.B: 'x'>" (Objects/longobject.c,
PyLong_FromUnicodeObject; Objects/floatobject.c, PyFloat_FromString).

Grail boxes such a str (AbstractPyStr), which is no CharacterCollection,
so all three refused the member as no str at all: "int() argument must be
a string, a bytes-like object or a real number, not 'E'".

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import enum

r = {}


class Literal(enum.StrEnum):
    SPACED = ' 12 '
    UNDERSCORED = '1_0'
    HEX = 'ff'
    BAD = 'x'
    FLOATING = '1.5e1'
    COMPLEX = '1+2j'


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


r['int_parses_the_member'] = [
    int(Literal.SPACED), int(Literal.UNDERSCORED), int(Literal.UNDERSCORED, 0), int(Literal.HEX, 16)]
r['int_names_a_bad_member_by_its_repr'] = [
    outcome(lambda: int(Literal.BAD)), outcome(lambda: int(Literal.BAD, 16))]
r['float_parses_the_member'] = [float(Literal.FLOATING), float(Literal.SPACED)]
r['float_names_a_bad_member_by_its_repr'] = outcome(lambda: float(Literal.BAD))
r['complex_parses_the_member'] = [complex(Literal.COMPLEX), complex(Literal.SPACED)]
r['complex_refuses_a_bad_member'] = outcome(lambda: complex(Literal.BAD))

EXPECTED = {
    'int_parses_the_member': [12, 10, 10, 255],
    'int_names_a_bad_member_by_its_repr': [
        "ValueError: invalid literal for int() with base 10: <Literal.BAD: 'x'>",
        "ValueError: invalid literal for int() with base 16: <Literal.BAD: 'x'>"],
    'float_parses_the_member': [15.0, 12.0],
    'float_names_a_bad_member_by_its_repr': "ValueError: could not convert string to float: <Literal.BAD: 'x'>",
    'complex_parses_the_member': [1 + 2j, 12 + 0j],
    'complex_refuses_a_bad_member': 'ValueError: complex() arg is a malformed string',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
