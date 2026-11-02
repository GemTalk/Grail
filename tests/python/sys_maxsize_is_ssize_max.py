"""Fixture: sys.maxsize is PY_SSIZE_T_MAX, 2**63 - 1.

Grail reported 2**60 - 1, GemStone's largest SmallInteger -- a value no
platform CPython runs on reports.  Code compares against the real one:
test_grammar fails on 'Weird maxsize value', and _pydecimal picks its 32-bit
limits for anything that is not 2**63 - 1.  Grail's ints are unbounded, so the
bound costs nothing where it is only a number; what has to agree is the
places that refuse a size past it.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import _pydecimal

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Length:
    def __init__(self, n):
        self.n = n

    def __len__(self):
        return self.n


r['maxsize'] = sys.maxsize == 2 ** 63 - 1
r['decimal_limits'] = [_pydecimal.MAX_PREC, _pydecimal.MAX_EMAX, _pydecimal.MIN_EMIN]
r['len_at_the_limit'] = [len(Length(sys.maxsize)) == sys.maxsize, len(range(sys.maxsize)) == sys.maxsize]
r['len_past_it'] = outcome(lambda: len(Length(sys.maxsize + 1)))
r['star_width_past_it'] = outcome(lambda: '%*d' % (sys.maxsize + 1, 1))
r['literal_width_past_it'] = outcome(lambda: ('%' + str(sys.maxsize + 1) + 'd') % 1)
r['bytes_repeat_past_it'] = [outcome(lambda: b'a' * (sys.maxsize + 1)), outcome(lambda: b'ab' * (sys.maxsize // 2 + 1))]
r['slices_at_it'] = ['abc'[0:sys.maxsize], [1, 2][-sys.maxsize:sys.maxsize], b'abc'[1:sys.maxsize]]

EXPECTED = {
    'maxsize': True,
    'decimal_limits': [999999999999999999, 999999999999999999, -999999999999999999],
    'len_at_the_limit': [True, True],
    'len_past_it': "OverflowError: cannot fit 'int' into an index-sized integer",
    'star_width_past_it': 'OverflowError: Python int too large to convert to C ssize_t',
    'literal_width_past_it': 'ValueError: width too big',
    'bytes_repeat_past_it': ["OverflowError: cannot fit 'int' into an index-sized integer",
                             'OverflowError: repeated bytes are too long'],
    'slices_at_it': ['abc', [1, 2], b'bc'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
