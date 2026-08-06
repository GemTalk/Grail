# Fixture for FormatSpecAndComplexTestCase.
#
# Six roots found working CPython's test_format down from 13 failures/errors
# to 3:
#
# 1. Format-spec error WORDING.  A duplicate grouping char fell through to the
#    type check, whose generic "Invalid format specifier" matched none of
#    CPython's four exact messages; and CPython 3.14 names the value's type in
#    that generic message.
#
# 2. PRECISION was unbounded.  Grail's precision is an arbitrary-precision
#    Integer, so a huge one tried to build the result and died on an UNCATCHABLE
#    NumericError (or hung).  Three separate engines needed the cap -- the
#    format-spec parser (ValueError), str's %-format and bytes' own %-format
#    (both OverflowError, which is what CPython raises there) -- plus a bound on
#    float digit generation, which scales by 10^precision and so is limited by
#    GemStone's LargeInteger ceiling.
#
# 3. complex.__format__ IGNORED the spec entirely (it returned __repr__), so
#    format(complex(1.2), '.3f') was '(1.2+0j)' and width/fill did nothing.
#
# 4. PEP 682's 'z' (negative-zero coercion) was unimplemented.
#
# 5. The LEXER mis-read two float literals: '0.j' (trailing dot + imaginary
#    suffix) and '1.e+300' (trailing dot + exponent) both parsed as attribute
#    access on an int.
#
# 6. The %-format "unsupported format character" message did not name the
#    character.

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


# --- 1. format-spec error wording -------------------------------------------

_run("dup_comma", lambda: '{:,,}'.format(1))
_run("dup_underscore", lambda: '{:__}'.format(1))
_run("comma_then_underscore", lambda: '{:,_}'.format(1))
_run("underscore_then_comma", lambda: '{:_,}'.format(1))
# the same diagnosis after the precision (fraction-grouping position)
_run("frac_comma_then_underscore", lambda: '{:.,_f}'.format(1.1))
_run("frac_underscore_then_comma", lambda: '{:._,f}'.format(1.1))
# CPython 3.14 names the type
_run("bad_spec_names_int", lambda: '{:%M}'.format(12))
_run("bad_spec_names_str", lambda: '{:%M}'.format('12'))
_run("bad_spec_names_float", lambda: '{:%M}'.format(12.0))
_run("bad_spec_names_complex", lambda: '{:%M}'.format(12j))
# grouping vs the 'n' type keeps its own existing message
_run("grouping_with_n", lambda: '{:,n}'.format(1))


# --- 2. precision bounds, all catchable -------------------------------------

import sys

_run("spec_precision_too_big", lambda: format(1.2, ".%sf" % (sys.maxsize + 1)))
_run("str_mod_precision_too_big", lambda: '%.*d' % (sys.maxsize, 1))
_run("bytes_mod_precision_too_big", lambda: b'%.*d' % (sys.maxsize, 1))
_run("bytearray_mod_precision_too_big", lambda: bytearray(b'%.*d') % (sys.maxsize, 1))
_run("float_precision_beyond_vm", lambda: '%12.*f' % (123456, 1.0))
# ordinary precision is untouched
_run("normal_spec_precision", lambda: format(1.2, '.3f'))
_run("normal_mod_precision", lambda: '%.3f' % 1.2)
_run("normal_star_precision", lambda: '%.*f' % (3, 1.2))
_run("big_but_ok_precision", lambda: len('%.200f' % 1.0))


# --- 3. complex.__format__ honours the spec ---------------------------------

_run("complex_empty_spec", lambda: format(complex(1.2), ''))
_run("complex_f0", lambda: format(complex(1.2), '.0f'))
_run("complex_f3", lambda: format(complex(1.2), '.3f'))
_run("complex_negative", lambda: format(-1 - 2j, '.1f'))
# a type-less spec pads str(self); str already drops a +0.0 real part
_run("complex_pad_left", lambda: format(0j, '_<4'))
_run("complex_pad_right", lambda: format(0j, '_>4'))
_run("complex_pad_center", lambda: format(0j, '_^4'))
_run("complex_parens_pad", lambda: format(1 + 2j, '_>8'))


# --- 4. PEP 682 'z' ---------------------------------------------------------

_run("z_neg_zero", lambda: format(-0.0, 'z.1f'))
_run("z_rounds_to_zero", lambda: format(-0.001, 'z.2f'))
_run("z_does_not_round_to_zero", lambda: format(-0.001, 'z.2e'))
_run("z_space_sign", lambda: format(-0.0, ' z.0f'))
_run("z_plus_sign", lambda: format(-0.0, '+z.0f'))
_run("z_nonzero_keeps_sign", lambda: format(-1.0, ' z.0f'))
_run("z_as_fill_char", lambda: format(-0.0, 'z>z6.1f'))
_run("z_on_complex", lambda: format(complex(0.0, 0.0), 'z.1f'))
# wrong position stays an invalid spec; int/str presentation types reject it
_run("z_wrong_position_prefix", lambda: format(0, 'z+f'))
_run("z_wrong_position_suffix", lambda: format(0, 'fz'))
_run("z_on_int_type", lambda: format(0, 'zd'))
_run("z_on_str_type", lambda: format('x', 'zs'))


# --- 5. float literals the lexer mis-read -----------------------------------


def _complex_trailing_dot():
    return repr(0.j)


def _negative_complex_trailing_dot():
    return repr(-0.j)


def _exponent_after_trailing_dot():
    return 1.e+300 == 1e300


_run("literal_0_dot_j", _complex_trailing_dot)
_run("literal_neg_0_dot_j", _negative_complex_trailing_dot)
_run("literal_1_dot_e300", _exponent_after_trailing_dot)
# the forms that already worked must keep working
_run("literal_1_5j", lambda: repr(1.5j))
_run("literal_dot01j", lambda: repr(.01j))
_run("literal_1e3j", lambda: repr(1e3j))
_run("literal_trailing_dot", lambda: 1. == 1.0)
# an attribute read on a number is NOT stolen by the exponent lookahead
_run("attr_after_space", lambda: (0).bit_length())


# --- 6. %-format names the offending character ------------------------------

_run("percent_z_message", lambda: '%z.1f' % 0)
_run("percent_bytes_z_message", lambda: b'%z.1f' % 0)
_run("percent_unknown_char", lambda: '%q' % 0)

RESULTS = out
