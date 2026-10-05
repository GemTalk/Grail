"""The string module, as CPython 3.14's pure-Python ``string`` package.

Grail's was a hand-written Smalltalk module:

* ``string.Template`` was None;
* ``string.Formatter()`` -- the literal module-attribute call -- answered the
  CLASS, because a unary native-module method is performed on read and the
  call was spent on it;
* Formatter.format took a fixed (format_string, args, kwargs) rather than
  ``*args, **kwargs``, had no ``parse``, and treated ``!a`` as ``!r``; a
  subclass overriding get_value/format_field never took part.

It is now CPython's string/__init__.py over a pure-Python ``_string`` (a port
of Objects/stringlib/unicode_format.h).  Every EXPECTED value was produced by
running these functions under CPython 3.14 (``--emit``), not written by hand.
"""

import string
import sys

import _string


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def constants_and_capwords():
    return (string.ascii_letters, string.digits, string.hexdigits,
            string.octdigits, string.punctuation, string.whitespace,
            len(string.printable),
            string.capwords('  hello   wORLD  '),
            string.capwords('a-b-c', '-'), string.capwords(''),
            sorted(string.__all__))


def template_substitutes():
    t = string.Template('$who likes ${what}, $$5')
    return (t.substitute(who='tim', what='kung pao'),
            t.substitute({'who': 'tim'}, what='x'),
            t.safe_substitute(who='tim'),
            _outcome(lambda: t.substitute(who='tim')),
            _outcome(lambda: string.Template('$').substitute()),
            t.get_identifiers(), t.is_valid(), t.template)


def template_subclasses():
    class Percent(string.Template):
        delimiter = '%'

    class Dotted(string.Template):
        idpattern = r'[a-z]+(?:\.[a-z]+)*'

    return (Percent('%x and %%').substitute(x=1),
            Dotted('$a.b').substitute({'a.b': 'ok'}))


def formatter_is_callable_as_a_module_attribute():
    f = string.Formatter()
    return type(f).__name__, type(f).__module__, isinstance(f, string.Formatter)


def formatter_formats():
    f = string.Formatter()
    class P:
        x = 'attr'
    return (f.format('{0} {x!r:>5} {0}', 1, x='a'),
            f.format('{0.x} {1[k]} {1[0]}', P, {'k': 'v', 0: 'zero'}),
            f.format('{:{w}.{p}f}', 3.14159, w=8, p=2),
            f.format('{!a}', 'caf\xe9'),
            f.vformat('{a}{b}', (), {'a': 1, 'b': 2}),
            list(f.parse('x{0!r:>3}y{{z}}')),
            _outcome(lambda: f.format('{0}{}', 1, 2)),
            _outcome(lambda: f.format('{}{0}', 1, 2)),
            _outcome(lambda: f.format('{', 1)),
            _outcome(lambda: f.format('{0!x}', 1)),
            _outcome(lambda: f.format('{9}', 1)),
            _outcome(lambda: f.format(format_string='{}')))


def formatter_subclasses_take_part():
    class Defaults(string.Formatter):
        def get_value(self, key, args, kwargs):
            if isinstance(key, str):
                return kwargs.get(key, '<%s>' % key)
            return super().get_value(key, args, kwargs)

    class Upper(string.Formatter):
        def format_field(self, value, format_spec):
            return format(value, format_spec).upper()

    class Strict(string.Formatter):
        def check_unused_args(self, used_args, args, kwargs):
            unused = set(kwargs) - used_args
            if unused:
                raise ValueError('unused: %s' % sorted(unused))

    return (Defaults().format('{a} {b} {0}', 'p', a=1),
            Upper().format('{} {x}', 'abc', x='def'),
            _outcome(lambda: Strict().format('{a}', a=1, b=2)),
            Strict().format('{a}', a=1))


def the_parser_helpers():
    first, rest = _string.formatter_field_name_split('obj.attr[0][key]')
    return (list(_string.formatter_parser('a{{b}}{0.x!s:^9}c')),
            first, list(rest),
            _outcome(lambda: list(_string.formatter_parser('{0!r'))),
            _outcome(lambda: list(_string.formatter_parser('}'))),
            _outcome(lambda: _string.formatter_parser(5)))


CHECKS = [
    constants_and_capwords,
    template_substitutes,
    template_subclasses,
    formatter_is_callable_as_a_module_attribute,
    formatter_formats,
    formatter_subclasses_take_part,
    the_parser_helpers,
]

EXPECTED = {
    'constants_and_capwords': ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '0123456789abcdefABCDEF', '01234567', '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~', ' \t\n\r\x0b\x0c', 100, 'Hello World', 'A-B-C', '', ['Formatter', 'Template', 'ascii_letters', 'ascii_lowercase', 'ascii_uppercase', 'capwords', 'digits', 'hexdigits', 'octdigits', 'printable', 'punctuation', 'whitespace']),
    'template_substitutes': ('tim likes kung pao, $5', 'tim likes x, $5', 'tim likes ${what}, $5', ('KeyError', "'what'"), ('ValueError', 'Invalid placeholder in string: line 1, col 1'), ['who', 'what'], True, '$who likes ${what}, $$5'),
    'template_subclasses': ('1 and %', 'ok'),
    'formatter_is_callable_as_a_module_attribute': ('Formatter', 'string', True),
    'formatter_formats': ("1   'a' 1", 'attr v zero', '    3.14', "'caf\\xe9'", '12', [('x', '0', '>3', 'r'), ('y{', None, None, None), ('z}', None, None, None)], ('ValueError', 'cannot switch from manual field specification to automatic field numbering'), ('ValueError', 'cannot switch from automatic field numbering to manual field specification'), ('ValueError', "Single '{' encountered in format string"), ('ValueError', 'Unknown conversion specifier x'), ('IndexError', 'tuple index out of range'), ('TypeError', "Formatter.format() missing 1 required positional argument: 'format_string'")),
    'formatter_subclasses_take_part': ('1 <b> p', 'ABC DEF', ('ValueError', "unused: ['b']"), '1'),
    'the_parser_helpers': ([('a{', None, None, None), ('b}', None, None, None), ('', '0.x', '^9', 's'), ('c', None, None, None)], 'obj', [(True, 'attr'), (False, 0), (False, 'key')], ('ValueError', "unmatched '{' in format spec"), ('ValueError', "Single '}' encountered in format string"), ('TypeError', 'expected str, got int')),
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
