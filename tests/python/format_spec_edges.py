"""Fixture: format() and the built-in __format__ methods refuse and render as CPython's do.

Four gaps in the format-spec engine, two of them uncatchable Smalltalk errors:
  * a width or precision past a C Py_ssize_t is CPython's ValueError ``Too many
    decimal digits in format string`` (get_integer); Grail padded by the
    LargeInteger and died with an OutOfRange;
  * a built-in __format__ handed a non-str -- ``(3).__format__(None)`` -- is
    ``__format__() argument must be str, not None``; Grail sent #isEmpty to it;
  * a float formatted with no presentation type is repr()'s text, so its
    exponent has a sign and two digits: ``format(1.25e200, '+')`` is
    ``+1.25e+200``, where Grail wrote ``+1.25e200``;
  * the alternate form's forced decimal point comes before ``%``: ``'#.0%'`` of
    1.0 is ``100.%``, where Grail wrote ``100%.``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(call):
    try:
        return call()
    except (ValueError, TypeError) as e:
        return type(e).__name__ + ': ' + str(e)


r['too_many_digits'] = [outcome(lambda: format(0, '1' * 10000 + 'd')),
                        outcome(lambda: format(0, '.' + '1' * 10000 + 'd')),
                        outcome(lambda: format(0.5, '1' * 30 + 'f')),
                        outcome(lambda: format('s', '9' * 25))]
r['non_str_spec'] = [outcome(lambda: (3).__format__(None)), outcome(lambda: (3).__format__(5)),
                     outcome(lambda: True.__format__(None)), outcome(lambda: (1.5).__format__(None)),
                     outcome(lambda: (1j).__format__(None)), outcome(lambda: 'a'.__format__(None)),
                     outcome(lambda: object().__format__(None)), outcome(lambda: format(3, None))]
r['typeless_float'] = [format(1.25e200, '+'), format(1.1e200, '+'), format(1.25e200, ' '),
                       format(1.25e200, '20'), format(1e16, '+'), format(1e100, '<20'),
                       format(1.5e300, '-'), format(12.5, '+'), format(2.5e-7, '010')]
r['alt_percent'] = [format(1.0, '#.0%'), format(0.5, '#.0%'), format(0.25, '.0%'), format(2.0, '#.0f')]

EXPECTED = {
    'too_many_digits': ['ValueError: Too many decimal digits in format string'] * 4,
    'non_str_spec': ['TypeError: __format__() argument must be str, not None',
                     'TypeError: __format__() argument must be str, not int',
                     'TypeError: __format__() argument must be str, not None',
                     'TypeError: __format__() argument must be str, not None',
                     'TypeError: __format__() argument must be str, not None',
                     'TypeError: __format__() argument must be str, not None',
                     'TypeError: __format__() argument must be str, not None',
                     'TypeError: format() argument 2 must be str, not None'],
    'typeless_float': ['+1.25e+200', '+1.1e+200', ' 1.25e+200', '           1.25e+200', '+1e+16',
                       '1e+100              ', '1.5e+300', '+12.5', '0002.5e-07'],
    'alt_percent': ['100.%', '50.%', '25%', '2.'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
