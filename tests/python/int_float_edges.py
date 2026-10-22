"""int and float at their edges: what CPython raises, and comparing exactly.

* ``int(float('inf'))`` and ``int(float('nan'))`` raise OverflowError and
  ValueError (PyLong_FromDouble); Grail said ``__int__ returned non-int (type
  Float)``, and ``math.trunc`` answered the infinity itself.
* An infinity compares with an int as if the int were 0 (float_richcompare);
  the kernel converted ``2**2000`` to a float, itself an infinity, so
  ``float('inf') == 2**2000`` was True.
* An int too large for a float, as either side of ``**`` with a float, is
  OverflowError (float_pow's CONVERT_TO_DOUBLE); ``1.0 ** 2**30000`` was 1.0
  and ``(2**30000) ** 1.0`` inf.
* ``int.to_bytes(..., signed=True)`` checks the signed range; ``128`` and
  ``-129`` both "fitted" one byte.

Self-running: ``python3 int_float_edges.py`` prints one line per check against
what CPython 3.14 answers.
"""

import math
import operator
import sys

INF = float('inf')
NAN = float('nan')
BIG = 2 ** 2000
HUGE = 2 ** 30000
COMPARISONS = (operator.eq, operator.ne, operator.lt, operator.le, operator.gt, operator.ge)


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _compared(left, right):
    return tuple(op(left, right) for op in COMPARISONS)


r = {
    "int_of_a_nonfinite_float": (_outcome(lambda: int(INF)), _outcome(lambda: int(-INF)), _outcome(lambda: int(NAN))),
    "trunc_of_a_nonfinite_float": (_outcome(lambda: math.trunc(INF)), _outcome(lambda: math.trunc(NAN))),
    "floor_ceil_round_still_raise": (_outcome(lambda: math.floor(INF)), _outcome(lambda: math.ceil(NAN)),
                                     _outcome(lambda: round(-INF))),
    "finite_floats_still_convert": (int(2.9), int(-2.9), math.trunc(-2.5), math.floor(-2.5), math.ceil(2.1), round(2.5)),
    "inf_against_a_huge_int": _compared(INF, BIG),
    "minus_inf_against_a_huge_negative_int": _compared(-INF, -BIG),
    "a_huge_int_against_inf": _compared(BIG, INF),
    "nan_against_a_huge_int": _compared(NAN, BIG),
    "finite_comparisons_stay_exact": (float(2 ** 53) == 2 ** 53 + 1, 1e308 == 10 ** 308, 1e308 > 10 ** 308,
                                      sys.float_info.max < 2 ** 1024, INF > 10 ** 308, 3.0 == 3),
    "pow_with_an_int_too_large_for_a_float": (_outcome(lambda: 1.0 ** HUGE), _outcome(lambda: HUGE ** 1.0),
                                              _outcome(lambda: 2.0 ** -HUGE)),
    "pow_that_fits_is_unchanged": (2.0 ** 3, 2 ** 0.5, 1.5 ** 2, 10 ** -2.0, (-8.0) ** 3, 2 ** 1000 * 1.0 > 0),
    "to_bytes_signed_out_of_range": (_outcome(lambda: (128).to_bytes(1, 'big', signed=True)),
                                     _outcome(lambda: (-129).to_bytes(1, 'little', signed=True)),
                                     _outcome(lambda: (1).to_bytes(0, 'big', signed=True))),
    "to_bytes_signed_in_range": ((127).to_bytes(1, 'big', signed=True), (-128).to_bytes(1, 'big', signed=True),
                                 (-1).to_bytes(2, 'little', signed=True), (0).to_bytes(0, 'big', signed=True)),
    "to_bytes_unsigned": ((255).to_bytes(1, 'big'), _outcome(lambda: (256).to_bytes(1, 'big')),
                          _outcome(lambda: (-1).to_bytes(1, 'big')), (0).to_bytes(0, 'big')),
}

EXPECTED = {
    'a_huge_int_against_inf': (False, True, True, True, False, False),
    'finite_comparisons_stay_exact': (False, False, True, True, True, True),
    'finite_floats_still_convert': (2, -2, -2, -3, 3, 2),
    'floor_ceil_round_still_raise': (
        'OverflowError: cannot convert float infinity to integer',
        'ValueError: cannot convert float NaN to integer',
        'OverflowError: cannot convert float infinity to integer',
    ),
    'inf_against_a_huge_int': (False, True, False, False, True, True),
    'int_of_a_nonfinite_float': (
        'OverflowError: cannot convert float infinity to integer',
        'OverflowError: cannot convert float infinity to integer',
        'ValueError: cannot convert float NaN to integer',
    ),
    'minus_inf_against_a_huge_negative_int': (False, True, True, True, False, False),
    'nan_against_a_huge_int': (False, True, False, False, False, False),
    'pow_that_fits_is_unchanged': (8.0, 1.4142135623730951, 2.25, 0.01, -512.0, True),
    'pow_with_an_int_too_large_for_a_float': (
        'OverflowError: int too large to convert to float',
        'OverflowError: int too large to convert to float',
        'OverflowError: int too large to convert to float',
    ),
    'to_bytes_signed_in_range': (b'\x7f', b'\x80', b'\xff\xff', b''),
    'to_bytes_signed_out_of_range': (
        'OverflowError: int too big to convert',
        'OverflowError: int too big to convert',
        'OverflowError: int too big to convert',
    ),
    'to_bytes_unsigned': (b'\xff', 'OverflowError: int too big to convert',
                          "OverflowError: can't convert negative int to unsigned", b''),
    'trunc_of_a_nonfinite_float': (
        'OverflowError: cannot convert float infinity to integer',
        'ValueError: cannot convert float NaN to integer',
    ),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-38s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
