"""``center``/``ljust``/``rjust``: the fill character, and where the odd
one goes.

TWO DEFECTS, one loud and one silent.

The loud one: ``str`` had only the ONE-argument forms, so every
``'ab'.center(6, '-')`` raised ``center() takes a different number of
arguments``.  That is what kept CPython's ``test_decimal`` from importing
at all -- 368 tests lost to a missing optional parameter.  ``bytes`` had
the two-argument forms all along, which is why it never showed up.

The silent one, found while fixing the first: the odd margin went to the
WRONG SIDE, in both str and bytes.  CPython's rule is

    left = marg // 2 + (marg & width & 1)

so when the margin AND the width are both odd the extra character goes
LEFT: ``'ab'.center(7, '*')`` is ``'***ab**'``.  Grail answered
``'**ab***'``.  It had done so since long before the two-argument form
existed, and nobody had noticed, because the one-argument form pads with
SPACES and nobody counts spaces.

Also here because the same three methods were the ones getting it wrong:
a ``bytearray`` receiver answers a ``bytearray``, as ``upper`` and slicing
already did.  These three hardcoded ``bytes``.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


# ------------------------------------------------- the fill character

def _str_takes_a_fill():
    return ('ab'.center(6, '-'), 'ab'.ljust(5, '.'), 'ab'.rjust(5, '0'))


def _the_default_is_still_a_space():
    return ('ab'.center(6), 'ab'.ljust(5), 'ab'.rjust(5))


def _a_fill_must_be_one_character():
    return (_outcome(lambda: 'ab'.center(6, '--')),
            _outcome(lambda: 'ab'.center(6, '')),
            _outcome(lambda: 'ab'.ljust(6, '--'))[0],
            _outcome(lambda: 'ab'.rjust(6, ''))[0])


def _a_width_that_does_not_pad():
    """Narrower than the string: answered unchanged, fill irrelevant."""
    return ('abcd'.center(2, '-'), 'abcd'.ljust(4, '-'), 'abcd'.rjust(0, '-'))


_FILL_MSG = 'The fill character must be exactly one character long'

check('str_takes_a_fill', _str_takes_a_fill(), ('--ab--', 'ab...', '000ab'))
check('the_default_is_still_a_space', _the_default_is_still_a_space(),
      ('  ab  ', 'ab   ', '   ab'))
check('a_fill_must_be_one_character', _a_fill_must_be_one_character(),
      (('TypeError', _FILL_MSG), ('TypeError', _FILL_MSG),
       'TypeError', 'TypeError'))
check('a_width_that_does_not_pad', _a_width_that_does_not_pad(),
      ('abcd', 'abcd', 'abcd'))


# --------------------------------------- which side gets the odd one

def _the_odd_pad_goes_left():
    """marg and width both odd -> the extra character is on the LEFT."""
    return ('ab'.center(7, '*'), 'ab'.center(3, '*'), 'abcd'.center(9, '*'))


def _an_even_margin_splits_evenly():
    return ('ab'.center(6, '*'), 'abc'.center(7, '*'), 'a'.center(5, '*'))


def _an_odd_margin_with_an_even_width_goes_right():
    """marg odd, width even -> (marg & width & 1) is 0, so the extra is
    on the RIGHT.  The rule is not simply ``odd margin goes left''."""
    return ('abc'.center(6, '*'), 'a'.center(4, '*'))


def _the_same_rule_for_bytes():
    return (b'ab'.center(7, b'*'), b'ab'.center(3, b'*'),
            b'abcd'.center(9, b'*'), b'abc'.center(6, b'*'))


check('the_odd_pad_goes_left', _the_odd_pad_goes_left(),
      ('***ab**', '*ab', '***abcd**'))
check('an_even_margin_splits_evenly', _an_even_margin_splits_evenly(),
      ('**ab**', '**abc**', '**a**'))
check('an_odd_margin_with_an_even_width_goes_right',
      _an_odd_margin_with_an_even_width_goes_right(), ('*abc**', '*a**'))
check('the_same_rule_for_bytes', _the_same_rule_for_bytes(),
      (b'***ab**', b'*ab', b'***abcd**', b'*abc**'))


# ------------------------------------------- the receiver's own type

def _a_bytearray_answers_a_bytearray():
    return (type(bytearray(b'ab').center(6, b'-')).__name__,
            type(bytearray(b'ab').ljust(5, b'-')).__name__,
            type(bytearray(b'ab').rjust(5, b'-')).__name__)


def _and_the_right_bytes():
    return (bytes(bytearray(b'ab').center(6, b'-')),
            bytes(bytearray(b'ab').ljust(5, b'-')),
            bytes(bytearray(b'ab').rjust(5, b'-')))


def _bytes_still_answers_bytes():
    return type(b'ab'.center(6, b'-')).__name__


check('a_bytearray_answers_a_bytearray', _a_bytearray_answers_a_bytearray(),
      ('bytearray', 'bytearray', 'bytearray'))
check('and_the_right_bytes', _and_the_right_bytes(),
      (b'--ab--', b'ab---', b'---ab'))
check('bytes_still_answers_bytes', _bytes_still_answers_bytes(), 'bytes')


# ------------------------------------------------ what already worked

def _bytes_two_argument_forms():
    return (b'ab'.center(6, b'-'), b'ab'.ljust(5, b'.'), b'ab'.rjust(5, b'0'))


def _the_padding_is_the_right_length():
    return tuple(len('x'.center(w, '-')) for w in range(0, 8))


check('bytes_two_argument_forms', _bytes_two_argument_forms(),
      (b'--ab--', b'ab...', b'000ab'))
check('the_padding_is_the_right_length', _the_padding_is_the_right_length(),
      (1, 1, 2, 3, 4, 5, 6, 7))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
