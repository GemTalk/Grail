"""int.to_bytes defaults its length and byteorder, as CPython's does.

CPython has defaulted `length` to 1 and `byteorder` to 'big' since 3.11, so
`(12).to_bytes()` and `(258).to_bytes(4)` are what code written since then
says.  Grail had only the two- and three-argument forms, so both raised
TypeError -- and CPython's own ipaddress writes `self._ip.to_bytes(4)`, which
is one of the calls that stopped it running here.

All three arguments are nameable as keywords in CPython too.

The overflow errors are checked because they are the reason a defaulted
length is not merely a convenience: `(256).to_bytes()` has to fail, not
silently truncate.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _error(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except (TypeError, ValueError, OverflowError) as exc:
        return (type(exc).__name__, str(exc))
    return 'no error'


# ----------------------------------------------------------- the defaults

check('no_arguments_is_one_big_endian_byte', (12).to_bytes(), b'\x0c')
check('a_length_alone_is_big_endian',
      (258).to_bytes(4), b'\x00\x00\x01\x02')
check('a_length_of_zero_is_empty', (0).to_bytes(0), b'')
check('the_two_and_three_argument_forms_still_work',
      ((258).to_bytes(2, 'little'), (-1).to_bytes(1, 'big', signed=True)),
      (b'\x02\x01', b'\xff'))
check('every_argument_is_nameable',
      ((258).to_bytes(length=2, byteorder='little'),
       (255).to_bytes(1, byteorder='big'),
       (-1).to_bytes(1, 'big', signed=True)),
      (b'\x02\x01', b'\xff', b'\xff'))

# ----------------------------------------------------------- what it refuses

check('a_value_too_big_for_the_default_length_overflows',
      _error((256).to_bytes),
      ('OverflowError', 'int too big to convert'))
check('a_negative_value_needs_signed',
      _error((-1).to_bytes, 2),
      ('OverflowError', "can't convert negative int to unsigned"))

# ----------------------------------------------------------- bool inherits it

check('bool_to_bytes_defaults_too',
      (True.to_bytes(), False.to_bytes(), True.to_bytes(2, 'little')),
      (b'\x01', b'\x00', b'\x01\x00'))

# ----------------------------------------------------------- the round trip

check('to_bytes_and_from_bytes_answer_each_other',
      [int.from_bytes(n.to_bytes(4)) for n in (0, 1, 258, 16909060)],
      [0, 1, 258, 16909060])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
