"""int.from_bytes accepts any iterable of ints, as CPython's does.

Grail required a bytes-like argument and raised TypeError for anything else.
CPython takes ANY ITERABLE OF INTS, and the stdlib relies on it: CPython's own
ipaddress parses a dotted quad with

    int.from_bytes(map(cls._parse_octet, octets), 'big')

a MAP OBJECT, so that module could not even be imported under Grail.

What is refused is refused the way CPython refuses it: a str is rejected
before anything is iterated (iterating one would yield characters and a
confusing per-element error), an element that is not an integer gets the
__index__ wording, and an element outside 0..255 is a ValueError.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _error(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except (TypeError, ValueError) as exc:
        return (type(exc).__name__, str(exc))
    return 'no error'


class _Indexable:
    def __index__(self):
        return 7


# ----------------------------------------------------------- what it accepts

check('a_bytes_like_still_works',
      (int.from_bytes(b'\x01\x02'), int.from_bytes(bytearray(b'\x01\x02'))),
      (258, 258))
check('a_list_or_tuple_of_ints_works',
      (int.from_bytes([1, 2]), int.from_bytes((1, 2))), (258, 258))
check('a_generator_works',
      int.from_bytes(x for x in (1, 2)), 258)
check('a_map_object_works_which_is_what_ipaddress_passes',
      int.from_bytes(map(int, ('1', '2')), 'big'), 258)
check('byteorder_still_applies_to_an_iterable',
      (int.from_bytes([1, 2], 'little'), int.from_bytes([1, 2], 'big')),
      (513, 258))
check('signed_still_applies_to_an_iterable',
      (int.from_bytes([255], 'big', signed=True), int.from_bytes([255], 'big')),
      (-1, 255))
check('an_empty_iterable_is_zero',
      (int.from_bytes([]), int.from_bytes(b'')), (0, 0))
check('an_element_with_index_is_accepted',
      int.from_bytes([_Indexable()]), 7)
check('a_range_works_too', int.from_bytes(range(1, 3)), 258)

# ----------------------------------------------------------- what it refuses

check('a_str_is_refused_before_it_is_iterated',
      _error(int.from_bytes, 'ab'),
      ('TypeError', "cannot convert 'str' object to bytes"))
check('a_non_iterable_is_refused',
      _error(int.from_bytes, None),
      ('TypeError', "cannot convert 'NoneType' object to bytes"))
check('an_element_that_is_not_an_integer_is_refused',
      _error(int.from_bytes, ['a']),
      ('TypeError', "'str' object cannot be interpreted as an integer"))
check('an_element_out_of_range_is_refused',
      (_error(int.from_bytes, [256]), _error(int.from_bytes, [-1])),
      (('ValueError', 'bytes must be in range(0, 256)'),) * 2)

# ----------------------------------------------------------- bool inherits it

check('bool_from_bytes_narrows_an_iterable_too',
      (bool.from_bytes([1, 2], 'big'), bool.from_bytes([0], 'big')),
      (True, False))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
