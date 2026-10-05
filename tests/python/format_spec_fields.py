"""Two corners of the built-in format machinery that string.Formatter's own
tests reach (test_string's test_auto_numbering and
test_auto_numbering_reenterability).

* A format SPEC may hold replacement fields: ``'{:^{}}'.format('bar', 6)``.
  Grail's str.format passed the spec through unexpanded, and __format__
  refused '^{}' as an invalid specifier.  The nested fields share the outer
  auto numbering, expanding after the field's own value.
* A '0' before the width of a STR spec is a '0' fill with the default left
  alignment (since 3.10).  Grail defaulted the alignment to '=', as for a
  number, so ``format('X', '0')`` raised "'=' alignment not allowed".

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def nested_spec_fields():
    return ('{:^{}}'.format('bar', 6),
            '{:^{}} {}'.format('bar', 6, 'X'),
            '{:^{pad}}{}'.format('foo', 'bar', pad=6),
            '{0:{1}.{2}f}|{0:>{w}}'.format(3.14159, 8, 2, w=10),
            '{:{fill}{align}{width}}'.format('x', fill='*', align='^', width=5),
            '{:{}}'.format(7, '>4'),
            '{0:{1!s}}'.format('z', 3),
            '{:{}}'.format('{}', 3))


def nested_spec_errors():
    return (_outcome(lambda: '{:{:{}}}'.format(1, 2, 3)),
            _outcome(lambda: '{:{}}'.format('x')))


def zero_flag_on_a_str():
    return (format('X', '0'), format('X', '03'), format('X', '<03'),
            format('X', '>03'), format('X', '^05'), '{:05}'.format('ab'),
            _outcome(lambda: format('X', '=3')),
            _outcome(lambda: format('X', '0=3')),
            format(7, '03'), format(-7, '04'))


CHECKS = [
    nested_spec_fields,
    nested_spec_errors,
    zero_flag_on_a_str,
]

EXPECTED = {
    'nested_spec_fields': (' bar  ', ' bar   X', ' foo  bar', '    3.14|   3.14159', '**x**', '   7', 'z  ', '{} '),
    'nested_spec_errors': (('ValueError', 'Max string recursion exceeded'), ('IndexError', 'Replacement index 1 out of range for positional args tuple')),
    'zero_flag_on_a_str': ('X', 'X00', 'X00', '00X', '00X00', 'ab000', ('ValueError', "'=' alignment not allowed in string format specifier"), ('ValueError', "'=' alignment not allowed in string format specifier"), '007', '-007'),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
