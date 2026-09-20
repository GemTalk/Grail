r"""`\d` matches Unicode decimal digits, so `Decimal` can parse them.

`Decimal('１')` answered NaN. The cause was three levels down from decimal: the
CPython shim's `Py_UNICODE_ISDECIMAL` delegated to C's `iswdigit`, under a
comment claiming it covered the Nd category. It cannot -- the C standard
defines `iswdigit` as exactly the ten ASCII digits, in every locale. So the
regex engine's `\d` (which is `CATEGORY_UNI_DIGIT`, which is
`Py_UNICODE_ISDECIMAL`) matched no non-ASCII digit, `_pydecimal`'s parser
rejected the string, and `InvalidOperation` became a quiet NaN under a context
with traps off.

The boundary worth holding is the one a sloppy table gets wrong: Nd is NOT the
same as "looks numeric". U+00B2 SUPERSCRIPT TWO is `isdigit` but not
`isdecimal`, and U+2167 ROMAN NUMERAL EIGHT is only `isnumeric` -- CPython's
`\d` matches neither, and neither may Grail's.

Every expectation here was measured against CPython 3.14.
"""

import re
import decimal

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + ascii(got)[:120])


def _matches(pattern, codepoints):
    return [('U+%04X' % cp) for cp in codepoints
            if re.match(pattern, chr(cp)) is not None]


# ------------------------------------------------ \d covers Nd, all scripts

check('decimal_digits_match_across_scripts',
      _matches(r'\d', [0xFF11,    # FULLWIDTH DIGIT ONE
                       0x0660,    # ARABIC-INDIC ZERO
                       0x0C68,    # TELUGU TWO
                       0x0966,    # DEVANAGARI ZERO
                       0x1D7CE]), # MATHEMATICAL BOLD ZERO, non-BMP
      ['U+FF11', 'U+0660', 'U+0C68', 'U+0966', 'U+1D7CE'])

check('ascii_digits_still_match', _matches(r'\d', [0x30, 0x39]),
      ['U+0030', 'U+0039'])

check('not_digit_is_the_exact_complement', _matches(r'\D', [0xFF11, 0x0660]),
      [])


# --------------------------- Nd is not "looks numeric" -- the boundary case

check('superscript_two_is_not_a_decimal_digit', _matches(r'\d', [0x00B2]), [])

check('roman_numeral_is_not_a_decimal_digit', _matches(r'\d', [0x2167]), [])

check('nothing_merely_numeric_looking_matches',
      _matches(r'\d', [0x00B2,    # SUPERSCRIPT TWO, No -- isdigit, not isdecimal
                       0x2460,    # CIRCLED DIGIT ONE, No
                       0x2167,    # ROMAN NUMERAL EIGHT, Nl
                       0x00BD,    # VULGAR FRACTION ONE HALF, No
                       0x3007]),  # IDEOGRAPHIC NUMBER ZERO, Nl
      [])


# ------------------------------------- the range table's edges are the edges

check('the_arabic_indic_range_starts_and_ends_where_it_should',
      _matches(r'\d', [0x065F, 0x0660, 0x0669, 0x066A]),
      ['U+0660', 'U+0669'])


# ------------------------------------------------ what this was blocking

check('decimal_reads_a_fullwidth_digit', str(decimal.Decimal('１')), '1')

check('decimal_reads_arabic_indic_with_an_exponent',
      str(decimal.Decimal('٠.٠٣٧٢e-٣')), '0.0000372')

check('decimal_reads_a_telugu_nan_payload',
      str(decimal.Decimal('-nan౨౪౦౦')), '-NaN2400')

check('int_still_reads_unicode_digits', int('٠٣٧٢'), 372)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
