"""Rebinding a module global to a string Python can tell apart from the old
one -- but GemStone's Unicode collation cannot.

Grail skips a module-global store whose new value is "the same immutable
value" as the old one, so a re-run module body does not dirty a committed
module.  For strings that test was the kernel's ``=``, an ICU collation:
an NFD 'e' + combining acute equals the precomposed letter, and an
Arabic-Indic digit equals its ASCII twin.  So ``x = A; x = B`` left x holding
A, and a module-level ``for s in [A, B]`` yielded A twice -- which silently
dropped cases from table-driven tests.  The test is now Python's own,
by codepoint.

Every EXPECTED value was produced by running this file under CPython 3.14.8
(``--emit``), not written by hand.
"""

import sys

x = 'é'
x = 'é'
REBOUND_NFC = ascii(x)

y = '1٢'
y = '١2'
REBOUND_DIGITS = ascii(y)

SEEN = []
for s in ['1٢', '١2', 'é', 'é']:
    SEEN.append(ascii(s))
LOOP = tuple(SEEN)

z = 'same'
z = 'same'
UNCHANGED = z


def _results():
    return {'rebound_nfc': REBOUND_NFC, 'rebound_digits': REBOUND_DIGITS,
            'loop': LOOP, 'unchanged': UNCHANGED}


EXPECTED = {
    'rebound_nfc': "'\\xe9'",
    'rebound_digits': "'\\u06612'",
    'loop': ("'1\\u0662'", "'\\u06612'", "'e\\u0301'", "'\\xe9'"),
    'unchanged': 'same',
}

RESULTS = {k: (v == EXPECTED.get(k)) or 'got: %r' % (v,)
           for k, v in _results().items()}


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for k, v in _results().items():
            print('    %r: %r,' % (k, v))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
