"""Fixture: int edge cases that killed the session or lost a sign.

* A shift count that is itself a large integer reached GemStone's bitShift:,
  which refused it with an uncatchable ArgumentTypeError: ``-42 >> (1 << 1000)''
  (CPython -1) and ``0 << (1 << 1000)'' (CPython 0) ended the run
  (test_long's test_huge_rshift, test_lshift_of_zero).
* ``round(3, 'brian')'' compared the string with 0 in the kernel, another
  uncatchable error; CPython takes ndigits through __index__ and raises
  TypeError (test_round).
* A zero quotient lost its sign: ``0 / -2**70'' was 0.0, CPython -0.0
  (test_correctly_rounded_true_division).

Grail's integers stop at GemStone's LargeInteger ceiling (~130144 bits), so
``1 << 200000'' raises a catchable OverflowError where CPython answers; that
divergence is pinned below.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


_h = 1 << 1000

r['huge_rshift'] = (42 >> _h, -42 >> _h, 2 ** 128 >> _h, -2 ** 128 >> _h,
                    _h.__rrshift__(5), _h.__rrshift__(-5))
r['huge_lshift_of_zero'] = (0 << _h, _h.__rlshift__(0), 0 << 0, 0 << 10)
r['negative_counts'] = (_err(lambda: 0 << -1), _err(lambda: 0 << -_h), _err(lambda: 5 >> -_h),
                        _err(lambda: 1 << -1))
r['huge_lshift'] = _err(lambda: (1 << _h).bit_length())
r['ordinary_shifts'] = ((1 << 1000) >> 990, -1 >> 2 ** 62, 7 << 3, -7 >> 1)
r['round_bad_ndigits'] = (_err(lambda: round(3, 'brian')), _err(lambda: round(3, 2.0)),
                          _err(lambda: round(3, 0j)))
r['round_good_ndigits'] = (round(3, None), round(15, -1), round(25, -1), round(-150, -2),
                           round(31415926535, -999), round(8979323, 2 ** 100))
r['zero_quotient_sign'] = tuple(repr(v) for v in (
    0 / -3, 0 / -2 ** 70, 0 / 2 ** 70, -1 / 2 ** 2000, 1 / -2 ** 2000, -1 / -2 ** 2000))
r['beyond_the_ceiling'] = _err(lambda: (1 << 200000).bit_length())

EXPECTED = {
    'huge_rshift': (0, -1, 0, -1, 0, -1),
    'huge_lshift_of_zero': (0, 0, 0, 0),
    'negative_counts': ('ValueError: negative shift count',) * 4,
    'huge_lshift': 'OverflowError: too many digits in integer',
    'ordinary_shifts': (1024, -1, 56, -4),
    'round_bad_ndigits': ("TypeError: 'str' object cannot be interpreted as an integer",
                          "TypeError: 'float' object cannot be interpreted as an integer",
                          "TypeError: 'complex' object cannot be interpreted as an integer"),
    'round_good_ndigits': (3, 20, 20, -200, 0, 8979323),
    'zero_quotient_sign': ('-0.0', '-0.0', '0.0', '-0.0', '-0.0', '0.0'),
}

KNOWN_DIVERGENCES = {
    # CPython: 200001.  GemStone's LargeInteger stops at ~130144 bits.
    'beyond_the_ceiling': 'OverflowError: result exceeds Grail integer capacity',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-22s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == expected else 'XFAIL', key, actual))
    print(SUMMARY)
