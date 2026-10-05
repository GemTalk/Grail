"""str.format / str.format_map, as CPython's do_string_format.

Grail's str.format was a hand-written parser:

* ``{0.attr}`` and ``{0[i]}`` were unsupported -- ``'{0.real}'.format(3)``
  died in an uncatchable Smalltalk ArgumentError;
* ``'{0}{}'`` and ``'{}{0}'`` were accepted where CPython refuses to mix
  manual and automatic numbering;
* ``!a`` was ignored, and an unknown conversion was not an error;
* format_map accepted positional fields;
* a ``__format__`` answering a non-str was rendered anyway.

It is now a port of Objects/stringlib/unicode_format.h, the same routines
src/python/stdlib/_string.py exposes to string.Formatter.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


class NS:
    a = 'A'
    items = ['i0', 'i1']

    def __repr__(self):
        return 'NS()'


def field_access():
    ns = NS()
    return ('{0.real}'.format(3),
            '{0[1]}'.format([5, 6]),
            '{0[k]}|{0[1]}'.format({'k': 'v', 1: 'one'}),
            '{0.a}{0.items[1]}'.format(ns),
            '{n.items[0]:>4}'.format(n=ns),
            '{0.a!r:^7}'.format(ns),
            '{١}'.format('a', 'b'),
            '{0[١]}'.format(['x', 'y']),
            '{0[-1]}'.format({'-1': 'str key'}),
            _outcome(lambda: '{0.missing}'.format(ns)),
            _outcome(lambda: '{0[9]}'.format([1])),
            _outcome(lambda: '{0[x]}'.format([1])))


def numbering():
    return (_outcome(lambda: '{0}{}'.format(1, 2)),
            _outcome(lambda: '{}{0}'.format(1, 2)),
            '{a}{}{b}{}'.format(1, 2, a='A', b='B'),
            '{0}{a}{1}'.format(1, 2, a='A'),
            '{:{}}{}'.format('x', 3, 'y'),
            _outcome(lambda: '{:{0}}'.format('x', 3)),
            _outcome(lambda: '{}{}'.format(1)),
            _outcome(lambda: '{99999999999999999999}'.format(1)))


def conversions():
    return ('{!a}'.format('\xe9'),
            '{0!r}{0!s}{0!a}'.format('€'),
            _outcome(lambda: '{!x}'.format(1)),
            _outcome(lambda: '{!€}'.format(1)),
            _outcome(lambda: '{!}'.format(1)),
            _outcome(lambda: '{0!r'.format(1)))


def parse_errors():
    return tuple(_outcome(lambda s=s: s.format(1, a=2)) for s in (
        '{', '}', 'a}b', '{0', '{0:', '{a[}', '{0[}', '{0]}', '{0.}', '{0[]}',
        '{0[0]x}', '{{', '}}', '{{0}}', '{0:{a:{a}}}'))


def format_map_rules():
    class Default(dict):
        def __missing__(self, key):
            return '<' + key + '>'

    return ('{a}-{b}'.format_map(Default(a=1)),
            _outcome(lambda: '{0}'.format_map({})),
            _outcome(lambda: '{}'.format_map({})),
            _outcome(lambda: '{a}'.format_map({})),
            _outcome(lambda: '{a}'.format()),
            _outcome(lambda: '{a}'.format_map(None)))


def a_bad_format_result_is_refused():
    class Bad:
        def __format__(self, spec):
            return 5

    return (_outcome(lambda: '{}'.format(Bad())),
            _outcome(lambda: '{:x}'.format(Bad())),
            _outcome(lambda: '{0:{1}}'.format(1, Bad())))


def key_error_carries_the_key():
    try:
        '{missing}'.format()
    except KeyError as e:
        return e.args, str(e)


CHECKS = [
    field_access,
    numbering,
    conversions,
    parse_errors,
    format_map_rules,
    a_bad_format_result_is_refused,
    key_error_carries_the_key,
]

EXPECTED = {
    'field_access': ('3', '6', 'v|one', 'Ai1', '  i0', "  'A'  ", 'b', 'y', 'str key', ('AttributeError', "'NS' object has no attribute 'missing'"), ('IndexError', 'list index out of range'), ('TypeError', 'list indices must be integers or slices, not str')),
    'numbering': (('ValueError', 'cannot switch from manual field specification to automatic field numbering'), ('ValueError', 'cannot switch from automatic field numbering to manual field specification'), 'A1B2', '1A2', 'x  y', ('ValueError', 'cannot switch from automatic field numbering to manual field specification'), ('IndexError', 'Replacement index 1 out of range for positional args tuple'), ('ValueError', 'Too many decimal digits in format string')),
    'conversions': ("'\\xe9'", "'€'€'\\u20ac'", ('ValueError', 'Unknown conversion specifier x'), ('ValueError', 'Unknown conversion specifier \\x20ac'), ('ValueError', "unmatched '{' in format spec"), ('ValueError', "unmatched '{' in format spec")),
    'parse_errors': (('ValueError', "Single '{' encountered in format string"), ('ValueError', "Single '}' encountered in format string"), ('ValueError', "Single '}' encountered in format string"), ('ValueError', "expected '}' before end of string"), ('ValueError', "unmatched '{' in format spec"), ('ValueError', "expected '}' before end of string"), ('ValueError', "expected '}' before end of string"), ('KeyError', "'0]'"), ('ValueError', 'Empty attribute in format string'), ('ValueError', 'Empty attribute in format string'), ('TypeError', "'int' object is not subscriptable"), ('ok', '{'), ('ok', '}'), ('ok', '{0}'), ('ValueError', 'Max string recursion exceeded')),
    'format_map_rules': ('1-<b>', ('ValueError', 'Format string contains positional fields'), ('ValueError', 'Format string contains positional fields'), ('KeyError', "'a'"), ('KeyError', "'a'"), ('TypeError', "'NoneType' object is not subscriptable")),
    'a_bad_format_result_is_refused': (('TypeError', '__format__ must return a str, not int'), ('TypeError', '__format__ must return a str, not int'), ('TypeError', '__format__ must return a str, not int')),
    'key_error_carries_the_key': (('missing',), "'missing'"),
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
