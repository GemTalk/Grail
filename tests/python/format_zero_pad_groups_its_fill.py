"""A sign-aware zero pad takes part in the `_`/`,` grouping.

``format(x, '039_b')'' is a zero pad and a grouping at once, and the fill zeros
are grouped along with the real digits.  Grail grouped the real digits first and
let ___formatPadBody___ prepend the fill afterwards, where the grouping never
saw it, so the leading group came out ragged:

    0000_0001_0000_0010_0000_0011_0010_1010   CPython  (32 digits, 7 separators)
    000000001_0000_0010_0000_0011_0010_1010   Grail    (33 digits, 6 separators)

Both are 39 wide.  Only the grouping tells them apart, which is why a width
assertion alone would have passed.

The rule is not "pad, then group" nor "group, then pad": it is the smallest
digit count whose GROUPED form reaches the field width, and it routinely
OVERSHOOTS -- ``format(1234, '012,d')'' asks for 12 and answers 13, because 9
digits group to 11 and 10 group to 13, so the first count that reaches 12 wins
over the last that fits.

It applies only to the SIGN-AWARE pad: a `0` fill with an explicit `<`, `>` or
`^` alignment pads outside the grouping, and a non-zero fill never joins it.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


# ----------------------------------------------------------- the defect

check('a_zero_padded_binary_groups_its_fill',
      format(0x0102032a, '039_b'),
      '0000_0001_0000_0010_0000_0011_0010_1010')
check('the_128_bit_width_the_same_way',
      format(0x0102032a, '0159_b'),
      '0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000'
      '_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0001_0000_0010'
      '_0000_0011_0010_1010')
check('a_prefix_is_outside_the_grouped_digits',
      (format(0x0102032a, '#039_b'), format(0x0102032a, '#039_x')),
      ('0b00_0001_0000_0010_0000_0011_0010_1010',
       '0x00_0000_0000_0000_0000_0000_0102_032a'))
check('hex_groups_in_fours_too',
      (format(0x0102032a, '09_x'), format(0x0102032a, '010_x'),
       format(0x0102032a, '012_x')),
      ('0102_032a', '0_0102_032a', '00_0102_032a'))
check('a_width_already_reached_still_gains_separators',
      (format(255, '08_b'), format(255, '010_b')),
      ('1111_1111', '0_1111_1111'))

# ----------------------------------------------------------- the overshoot

check('the_result_may_be_wider_than_the_field',
      (format(1234, '012,d'), len(format(1234, '012,d'))),
      ('0,000,001,234', 13))
check('the_whole_ladder_of_widths',
      [format(1234, '0%d,d' % w) for w in range(5, 13)],
      ['1,234', '01,234', '001,234', '0,001,234', '0,001,234',
       '00,001,234', '000,001,234', '0,000,001,234'])
check('two_widths_can_answer_the_same_string',
      format(1234, '08,d') == format(1234, '09,d'), True)

# ----------------------------------------------------------- the sign

check('a_sign_is_outside_the_grouped_digits',
      (format(-1234, '012,d'), format(-1234, '+012,d')),
      ('-000,001,234', '-000,001,234'))
check('an_explicit_plus_counts_as_the_sign',
      format(1234, '+012,d'), '+000,001,234')

# ----------------------------------------------------------- unchanged

# Only the sign-aware pad joins the grouping.  An explicit alignment pads
# outside it, and a non-zero fill never joins -- these are what say the change
# did not leak into the ordinary padding path.
check('an_explicit_alignment_pads_outside_the_grouping',
      (format(1234, '<012,d'), format(1234, '>012,d'), format(1234, '^012,d')),
      ('1,2340000000', '00000001,234', '0001,2340000'))
check('a_non_zero_fill_never_joins_the_grouping',
      format(1234, '*>12,d'), '*******1,234')
check('the_explicit_equals_alignment_does_join',
      (format(1234, '=012,d'), format(1234, '0=12,d')),
      ('0,000,001,234', '0,000,001,234'))
check('grouping_without_a_width_is_unchanged',
      (format(0x0102032a, '_b'), format(1234, ',d')),
      ('1_0000_0010_0000_0011_0010_1010', '1,234'))
check('a_width_without_a_zero_fill_is_unchanged',
      format(1234, '12,d'), '       1,234')
check('zero_itself',
      (format(0, '05,d'), format(0, '_b'), format(0, '09_b')),
      ('0,000', '0', '0000_0000'))
check('decimal_still_groups_in_threes',
      (format(1234567, 'd'), format(1234567, ',d'), format(1234567, '_d')),
      ('1234567', '1,234,567', '1_234_567'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
