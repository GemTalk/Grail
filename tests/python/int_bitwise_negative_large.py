"""Fixture: ``^'' and ``&'' are right for a negative large integer.

GemStone's kernel bitXor: and bitAnd: answer wrong bits when an operand is a
negative LargeInteger.  Measured on 4.0 over the operands below (powers of
two from 2**59 to 2**128, each +/- 2, both signs): 2,782 of 11,881 XOR pairs
and 290 AND pairs were wrong; OR, invert and shifts were right everywhere.
Grail handed Python's ``^'' and ``&'' straight to them, so
``-6148914691236517206 ^ -1'' was -12297829382473034411 instead of
6148914691236517205 -- test_long's test_bitop_identities.

The checksums fold every pair's result, so one wrong bit anywhere changes
them.  Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import operator

r = {}

_vals = set()
for _e in (59, 60, 61, 62, 63, 64, 65, 66, 120, 128):
    for _d in (-2, -1, 0, 1, 2):
        _b = 2 ** _e + _d
        _vals |= {_b, -_b}
_vals |= {0x5555555555555555, -0x5555555555555556, 0xAAAAAAAAAAAAAAAA,
          -0xAAAAAAAAAAAAAAAB, -1, 0, 1, -7, 12345}
_vals = sorted(_vals)


def _checksum(op):
    m = 2 ** 61 - 1
    c = 0
    for a in _vals:
        for b in _vals:
            c = (c * 31 + op(a, b)) % m
    return c


class _I(int):
    pass


_x = -6148914691236517206

r['operand_count'] = len(_vals)
r['xor_checksum'] = _checksum(operator.xor)
r['and_checksum'] = _checksum(operator.and_)
r['or_checksum'] = _checksum(operator.or_)
r['xor_minus_one'] = (_x ^ -1, -1 ^ _x, ~_x)
r['both_negative'] = (-2 ** 70 ^ -2 ** 64, -2 ** 70 & -(2 ** 64 + 1), -(2 ** 128 - 1) & -(2 ** 120 - 2))
r['one_negative'] = (2 ** 70 ^ -3, -3 ^ 2 ** 70, 2 ** 70 + 5 & -4, -4 & 2 ** 70 + 5)
r['operator_forms'] = (operator.xor(_x, -1), operator.and_(_x, -2 ** 70))
r['subclass_and_bool'] = (_I(_x) ^ -1, -1 ^ _I(_x), _I(-2 ** 70) & _x, True ^ _x, False & _x)


def _aug():
    a = _x
    a ^= -1
    b = -2 ** 70
    b &= _x
    return a, b


r['augmented'] = _aug()
r['identities'] = all(
    (a ^ b) == ((a | b) & ~(a & b)) and (a & b) == ~(~a | ~b) and (a ^ -1) == ~a
    for a in _vals for b in _vals)

EXPECTED = {
    'operand_count': 109,
    'xor_checksum': 1085571682340011358,
    'and_checksum': 2246544472118836590,
    'or_checksum': 1026273145245153997,
    'xor_minus_one': (6148914691236517205, 6148914691236517205, 6148914691236517205),
    'both_negative': (1162144876643701751808, -1180591620717411303424,
                      -340282366920938463463374607431768211456),
    'one_negative': (-1180591620717411303427, -1180591620717411303427,
                     1180591620717411303428, 1180591620717411303428),
    'operator_forms': (6148914691236517205, -1180591620717411303424),
    'augmented': (6148914691236517205, -1180591620717411303424),
    'subclass_and_bool': (6148914691236517205, 6148914691236517205,
                          -1180591620717411303424, -6148914691236517205, 0),
    'identities': True,
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-20s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
