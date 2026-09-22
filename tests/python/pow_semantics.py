# ``**'' and pow(): a negative base, a complex zero, and named parameters.
#
# THE SAME RULE, IMPLEMENTED ONCE.  A negative real raised to a non-integer
# power is COMPLEX in Python -- the angle of a negative real is pi, so the
# result is |base|**exp * (cos + i*sin)(exp*pi).  float>>__pow__: already knew
# that, in detail, down to the C99 special cases.  int>>__pow__: did not, and
# GemStone's raisedTo: answers NaN, so the same expression gave two different
# answers depending on how the base was SPELLED:
#
#     (-1.0) ** 0.5     (6.123233995736766e-17+1j)
#     (-1)   ** 0.5     nan
#
# A NaN is the shape of failure that travels: it propagates through every later
# operation and is reported far from the expression that produced it.
#
# complex ** negative had the same character.  CPython's complex_pow raises
# ZeroDivisionError for a zero base to a negative or complex power; Grail's
# polar form took log(0) and its integer form inverted 0, so both answered
# nan+nanj.
#
# pow()'s parameters have been nameable since 3.8 -- precisely so it composes
# with functools.partial -- and Grail read none of them, so every keyword
# spelling reported ``pow expected 2 or 3 arguments''.
#
# test_builtin's test_pow.

from functools import partial

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- a negative base to a non-integer power ----------------------------------
#
# Both spellings of each base, side by side: that the two AGREE is the point,
# and a fixture that checked only one of them would have passed throughout.

# RECORDED AS repr() STRINGS, and that is not cosmetic: repr() of a complex
# does NOT round-trip through source.  ``repr(1j ** -1)'' is ``-1j'', but the
# literal ``-1j'' parses as -(1j), whose real part is -0.0 and whose repr is
# ``(-0-1j)''.  An EXPECTED table generated with %r therefore holds a literal
# that re-reads as a DIFFERENT value -- equal under ==, because -0.0 == 0.0,
# and different under repr.  The first draft of this fixture did exactly that
# and produced a convincing-looking Grail/CPython disagreement that was
# entirely an artefact of writing the table.
#
# A string literal round-trips, so the comparison stays exact.
for _b_int, _b_float, _label in ((-1, -1.0, 'minus_one'), (-8, -8.0, 'minus_eight')):
    for _e, _elabel in ((0.5, 'half'), (1 / 3, 'third'), (1.5, 'three_halves')):
        r['neg_int_base_%s_%s' % (_label, _elabel)] = repr(_b_int ** _e)
        r['neg_float_base_%s_%s' % (_label, _elabel)] = repr(_b_float ** _e)
        r['neg_bases_agree_%s_%s' % (_label, _elabel)] = (
            _b_int ** _e == _b_float ** _e)

# An INTEGER exponent keeps the exact integer arithmetic -- a float would lose
# precision here, so the complex branch must not be entered.
r['neg_base_int_exp'] = [(-2) ** 3, (-2) ** 2, (-2) ** 0]
r['big_int_exact'] = 3 ** 40
r['neg_int_negative_exp'] = repr((-2) ** -3)
# Special cases float>>__pow__: documents and the int path must not disturb.
r['inf_base'] = repr(float('-inf') ** -0.5)
r['nan_exp_is_nan'] = repr((-2.0) ** float('nan'))


# --- a zero complex base -----------------------------------------------------
#
# The exponent being ZERO is excluded on purpose: ``0j ** 0'' is 1+0j, so the
# rule is "negative or complex exponent", not "non-zero".

for _e, _elabel in ((-1, 'neg_int'), (-2, 'neg_int2'), (-1.5, 'neg_float'),
                    (1j, 'imaginary'), (0, 'zero'), (1, 'one'), (2, 'two'),
                    (0.5, 'half')):
    r['zero_complex_pow_' + _elabel] = outcome(lambda e=_e: 0j ** e)
# A NON-zero complex to a negative power is ordinary arithmetic.
r['nonzero_complex_neg'] = repr(1j ** -1)
r['complex_zero_exponent'] = repr((1 + 1j) ** 0j)


# --- named parameters --------------------------------------------------------
#
# partial() is why these have names, and why the two spellings have to MIX: a
# partial supplies some slots by name and the call site supplies the rest by
# position.

r['kw_exp_only'] = pow(0, exp=0)
r['kw_base_exp'] = pow(base=2, exp=4)
r['kw_all_three'] = pow(base=5, exp=2, mod=14)
r['partial_base'] = partial(pow, base=2)(exp=5)
r['partial_exp'] = partial(pow, exp=5)(2)
r['partial_mod_positional'] = partial(pow, mod=10)(2, 6)
r['partial_mod_named'] = partial(pow, mod=10)(exp=6, base=2)
r['no_args'] = outcome(lambda: pow())
r['one_arg'] = outcome(lambda: pow(2))


# --- controls: ordinary pow is untouched -------------------------------------

r['plain_two_arg'] = [pow(2, 3), pow(2.0, 3), pow(2, 3.0), pow(2, 0)]
r['plain_three_arg'] = [pow(2, 10, 1000), pow(-1, -2, 3), pow(5, 2, 14)]
r['three_arg_zero_mod'] = outcome(lambda: pow(1, 2, 0))
r['three_arg_float'] = outcome(lambda: pow(2.0, 10, 1000))
r['zero_to_negative'] = outcome(lambda: pow(0, -1))
r['zero_to_negative_float'] = outcome(lambda: pow(0.0, -1))


EXPECTED = {
    'big_int_exact': 12157665459056928801,
    'complex_zero_exponent': '(1+0j)',
    'inf_base': '0.0',
    'kw_all_three': 11,
    'kw_base_exp': 16,
    'kw_exp_only': 1,
    'nan_exp_is_nan': 'nan',
    'neg_base_int_exp': [-8, 4, 1],
    'neg_bases_agree_minus_eight_half': True,
    'neg_bases_agree_minus_eight_third': True,
    'neg_bases_agree_minus_eight_three_halves': True,
    'neg_bases_agree_minus_one_half': True,
    'neg_bases_agree_minus_one_third': True,
    'neg_bases_agree_minus_one_three_halves': True,
    'neg_float_base_minus_eight_half': '(1.7319121124709868e-16+2.8284271247461903j)',
    'neg_float_base_minus_eight_third': '(1.0000000000000002+1.7320508075688772j)',
    'neg_float_base_minus_eight_three_halves': '(-4.156589069930368e-15-22.627416997969522j)',
    'neg_float_base_minus_one_half': '(6.123233995736766e-17+1j)',
    'neg_float_base_minus_one_third': '(0.5000000000000001+0.8660254037844386j)',
    'neg_float_base_minus_one_three_halves': '(-1.8369701987210297e-16-1j)',
    'neg_int_base_minus_eight_half': '(1.7319121124709868e-16+2.8284271247461903j)',
    'neg_int_base_minus_eight_third': '(1.0000000000000002+1.7320508075688772j)',
    'neg_int_base_minus_eight_three_halves': '(-4.156589069930368e-15-22.627416997969522j)',
    'neg_int_base_minus_one_half': '(6.123233995736766e-17+1j)',
    'neg_int_base_minus_one_third': '(0.5000000000000001+0.8660254037844386j)',
    'neg_int_base_minus_one_three_halves': '(-1.8369701987210297e-16-1j)',
    'neg_int_negative_exp': '-0.125',
    'no_args': "TypeError: pow() missing required argument 'base' (pos 1)",
    'nonzero_complex_neg': '-1j',
    'one_arg': "TypeError: pow() missing required argument 'exp' (pos 2)",
    'partial_base': 32,
    'partial_exp': 32,
    'partial_mod_named': 4,
    'partial_mod_positional': 4,
    'plain_three_arg': [24, 1, 11],
    'plain_two_arg': [8, 8.0, 8.0, 1],
    'three_arg_float': 'TypeError: pow() 3rd argument not allowed unless all arguments are integers',
    'three_arg_zero_mod': 'ValueError: pow() 3rd argument cannot be 0',
    'zero_complex_pow_half': 'ok -> 0j',
    'zero_complex_pow_imaginary': 'ZeroDivisionError: zero to a negative or complex power',
    'zero_complex_pow_neg_float': 'ZeroDivisionError: zero to a negative or complex power',
    'zero_complex_pow_neg_int': 'ZeroDivisionError: zero to a negative or complex power',
    'zero_complex_pow_neg_int2': 'ZeroDivisionError: zero to a negative or complex power',
    'zero_complex_pow_one': 'ok -> 0j',
    'zero_complex_pow_two': 'ok -> 0j',
    'zero_complex_pow_zero': 'ok -> (1+0j)',
    'zero_to_negative': 'ZeroDivisionError: zero to a negative power',
    'zero_to_negative_float': 'ZeroDivisionError: zero to a negative power',
}

# A NAMED roll-up, not a count -- see the SUnit peer.
DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-38s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
