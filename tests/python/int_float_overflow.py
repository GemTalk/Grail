# An integer too large for a float raises, rather than becoming an infinity.
#
# ``float(x)'' has always raised here -- ``int too large to convert to float'',
# CPython's own wording, from float class >> ___intToFloatChecked___.  It was
# only MIXED ARITHMETIC that coerced silently, so the same conversion answered
# two different things depending on whether the caller spelled it out:
#
#     float(10**1000)      OverflowError
#     1.0 + 10**1000       inf
#
# An inf is the shape of failure that TRAVELS: it propagates through every
# later operation and is reported far from the expression that produced it, if
# at all.  sum() is the common way to reach one -- test_builtin test_sum adds a
# float to 10**1000 and expects the raise.
#
# EITHER SIDE can be the huge one, so both are checked: ``1.0 + BIG'' coerces
# the operand and ``BIG + 1.0'' coerces the receiver, and GemStone answered an
# infinity for both.
#
# test_builtin's test_sum.

r = {}

BIG = 10**1000          # far beyond a float
FITS = 10**300          # large, and exactly representable-ish -- the control


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- the conversion, spelled out ---------------------------------------------

r['float_of_big'] = outcome(lambda: float(BIG))
r['float_of_fits'] = outcome(lambda: float(FITS))


# --- mixed arithmetic, float on the left -------------------------------------

r['float_add_big'] = outcome(lambda: 1.0 + BIG)
r['float_sub_big'] = outcome(lambda: 1.0 - BIG)
r['float_mul_big'] = outcome(lambda: 1.0 * BIG)
r['float_div_big'] = outcome(lambda: 1.0 / BIG)

# --- and with the int on the left --------------------------------------------

r['big_add_float'] = outcome(lambda: BIG + 1.0)
r['big_sub_float'] = outcome(lambda: BIG - 1.0)
r['big_mul_float'] = outcome(lambda: BIG * 1.0)
r['big_div_float'] = outcome(lambda: BIG / 1.0)


# --- sum(), which is how the corpus reaches it -------------------------------

r['sum_float_then_big'] = outcome(lambda: sum([1.0, BIG]))
r['sum_big_then_float'] = outcome(lambda: sum([BIG, 1.0]))
r['sum_complex_then_big'] = outcome(lambda: sum([1j, BIG]))


# --- controls: nothing that worked may stop working --------------------------
#
# An int that FITS must still coerce silently, integer arithmetic must stay
# exact and unbounded, and a float overflow of the ordinary kind still answers
# inf -- CPython does not raise for ``1e308 * 10'', so a result-based check
# would have been wrong.

r['float_add_fits'] = outcome(lambda: 1.0 + FITS)
r['big_plus_big_is_exact'] = BIG + BIG == 2 * BIG
r['big_int_arithmetic'] = (BIG // 10**999, BIG % 7)
r['ordinary_float_overflow'] = outcome(lambda: 1e308 * 10)
r['small_mixed'] = [1.0 + 3, 3 + 1.0, 2.5 * 4, 7 / 2, 7.0 // 2, 7.5 % 2]
r['comparison_unaffected'] = (1.0 < BIG, BIG > 1.0)


EXPECTED = {
    'big_add_float': 'OverflowError: int too large to convert to float',
    'big_div_float': 'OverflowError: int too large to convert to float',
    'big_int_arithmetic': (10, 4),
    'big_mul_float': 'OverflowError: int too large to convert to float',
    'big_plus_big_is_exact': True,
    'big_sub_float': 'OverflowError: int too large to convert to float',
    'comparison_unaffected': (True, True),
    'float_add_big': 'OverflowError: int too large to convert to float',
    'float_add_fits': 'ok -> 1e+300',
    'float_div_big': 'OverflowError: int too large to convert to float',
    'float_mul_big': 'OverflowError: int too large to convert to float',
    'float_of_big': 'OverflowError: int too large to convert to float',
    'float_of_fits': 'ok -> 1e+300',
    'float_sub_big': 'OverflowError: int too large to convert to float',
    'ordinary_float_overflow': 'ok -> inf',
    'small_mixed': [4.0, 4.0, 10.0, 3.5, 3.0, 1.5],
    'sum_big_then_float': 'OverflowError: int too large to convert to float',
    'sum_complex_then_big': 'OverflowError: int too large to convert to float',
    'sum_float_then_big': 'OverflowError: int too large to convert to float',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
