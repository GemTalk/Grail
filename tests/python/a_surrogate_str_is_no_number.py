"""Fixture: a str holding lone surrogates is a malformed number, not a non-str.

int(), float() and complex() take any str and map every character that is
no digit and no space to an invalid one
(_PyUnicode_TransformDecimalAndSpaceToASCII), so a lone surrogate makes the
literal malformed: "invalid literal for int() with base 10: '\\ud800'",
"could not convert string to float: ...", "complex() arg is a malformed
string".

Grail refused the str as no str at all, "int() argument must be a string,
... not 'str'" (test_str test_codecs_errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


r['int'] = [outcome(lambda: int('\ud800')), outcome(lambda: int('\udf00')),
            outcome(lambda: int('1\ud800'))]
r['int_with_a_base'] = [outcome(lambda: int('\ud800', 16)), outcome(lambda: int('\ud800', 0))]
r['float'] = [outcome(lambda: float('\ud800')), outcome(lambda: float('1.5\ud800'))]
r['complex'] = [outcome(lambda: complex('\ud800')), outcome(lambda: complex('1+\ud800j'))]
r['an_ordinary_str_still_converts'] = (int('12'), int('ff', 16), float('1.5'), complex('1+2j'))

INT = "ValueError: invalid literal for int() with base %d: %r"
FLOAT = "ValueError: could not convert string to float: %r"
EXPECTED = {
    'int': [INT % (10, '\ud800'), INT % (10, '\udf00'), INT % (10, '1\ud800')],
    'int_with_a_base': [INT % (16, '\ud800'), INT % (0, '\ud800')],
    'float': [FLOAT % '\ud800', FLOAT % '1.5\ud800'],
    'complex': ['ValueError: complex() arg is a malformed string'] * 2,
    'an_ordinary_str_still_converts': (12, 255, 1.5, 1 + 2j),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
