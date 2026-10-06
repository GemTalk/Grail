"""The TEXT of an f-string or t-string replacement field: what a t-string's
Interpolation.expression holds, what the debug form ``{x=}`` prints, and how
comments and quotes inside a field are scanned.

Three defects, fixed together because they are one piece of code:

* CPython 3.14.8 (gh-154719) keeps a t-string expression's trailing
  whitespace: t'{ x }' has expression ' x ', where 3.14.7 had ' x'.  Grail
  stripped it.
* A comment inside a field (PEP 701, legal since 3.12) failed to compile:
  Grail re-parsed the field as ``(x  # c)``, whose closing paren the comment
  swallowed.  And a quote or brace INSIDE such a comment was read as structure
  by the tokenizer, which then ran on through the following lines of source.
  CPython removes comments from the expression text and the debug text.
* A quote in a format spec is a literal character -- f'{s:"^7}' fills with
  double quotes -- but Grail's scan opened a string on it.

Every EXPECTED value was produced by running these functions under CPython
3.14.8 (``--emit``), not written by hand.
"""

import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


x = 255
w = 9
s = 'hi'
d = {'#': 1, '}': 2, 'w': 4}


def _fields(tmpl):
    return (tmpl.strings,
            tuple((i.expression, i.conversion, i.format_spec)
                  for i in tmpl.interpolations),
            tmpl.values)


def tstring_trailing_whitespace_is_kept():
    return (_fields(t'{ x }'), _fields(t'{x }'), _fields(t'{ x!r}'),
            _fields(t'{ x !r}'), _fields(t'{ x :>6}'), _fields(t'{x  !s:{w} }'),
            _fields(t'''{x
}'''), _fields(t'{"a" }'))


def tstring_debug_form():
    return (_fields(t'{x = }'), _fields(t'{ x = }'), _fields(t'{x=}'),
            _fields(t'{x =!r}'), _fields(t'{x = :>6}'))


def debug_equals_then_line_continuation():
    return (_fields(t'''{x = \
}'''), f'''{x = \
}''')


def comment_in_a_field():
    return (_fields(t'''{ x  # c
}'''), _fields(t'''{x # c
!r}'''), _fields(t'''{x # c
:>6}'''), f'''{x # c
}''', f'''{[y # c
  for y in (1, 2)]}''')


def comment_holding_quotes_and_braces():
    return (_fields(t'''{x # } { ' "
}'''), _fields(t'''{d['}'] # it's \' fine
}'''), f'''{d["#"] # " } '
!r}''')


def comment_in_the_debug_form():
    return (_fields(t'''{x # c
=}'''), _fields(t'''{x # c "q"
 = }'''), f'''{x # c
=}''', f'''{x # c "q"
 = }''')


def hash_in_a_string_or_a_spec():
    return (_fields(t'{d["#"] }'), _fields(t'{x:#x}'), _fields(t'{x :#06x}'),
            f'{x:#x}', f'{x:#010b}', f'{"#":>3}', f'{d["#"]:#x}', f'{x=:#x}')


def quote_in_a_format_spec():
    return (f'{s:"^7}', f"{s:'<6}", f'{s:{"<"}{w}}', f'{x:>{d["w"]}}',
            _fields(t'{s:"^7}'))


CHECKS = [
    tstring_trailing_whitespace_is_kept,
    tstring_debug_form,
    debug_equals_then_line_continuation,
    comment_in_a_field,
    comment_holding_quotes_and_braces,
    comment_in_the_debug_form,
    hash_in_a_string_or_a_spec,
    quote_in_a_format_spec,
]

EXPECTED = {
    'tstring_trailing_whitespace_is_kept': ((('', ''), ((' x ', None, ''),), (255,)), (('', ''), (('x ', None, ''),), (255,)), (('', ''), ((' x', 'r', ''),), (255,)), (('', ''), ((' x ', 'r', ''),), (255,)), (('', ''), ((' x ', None, '>6'),), (255,)), (('', ''), (('x  ', 's', '9 '),), (255,)), (('', ''), (('x\n', None, ''),), (255,)), (('', ''), (('"a" ', None, ''),), ('a',))),
    'tstring_debug_form': ((('x = ', ''), (('x ', 'r', ''),), (255,)), ((' x = ', ''), ((' x ', 'r', ''),), (255,)), (('x=', ''), (('x', 'r', ''),), (255,)), (('x =', ''), (('x ', 'r', ''),), (255,)), (('x = ', ''), (('x ', None, '>6'),), (255,))),
    'debug_equals_then_line_continuation': ((('x = \\\n', ''), (('x ', 'r', ''),), (255,)), 'x = \\\n255'),
    'comment_in_a_field': ((('', ''), ((' x  \n', None, ''),), (255,)), (('', ''), (('x \n', 'r', ''),), (255,)), (('', ''), (('x \n', None, '>6'),), (255,)), '255', '[1, 2]'),
    'comment_holding_quotes_and_braces': ((('', ''), (('x \n', None, ''),), (255,)), (('', ''), (("d['}'] \n", None, ''),), (2,)), '1'),
    'comment_in_the_debug_form': ((('x \n=', ''), (('x \n', 'r', ''),), (255,)), (('x \n = ', ''), (('x \n ', 'r', ''),), (255,)), 'x \n=255', 'x \n = 255'),
    'hash_in_a_string_or_a_spec': ((('', ''), (('d["#"] ', None, ''),), (1,)), (('', ''), (('x', None, '#x'),), (255,)), (('', ''), (('x ', None, '#06x'),), (255,)), '0xff', '0b11111111', '  #', '0x1', 'x=0xff'),
    'quote_in_a_format_spec': ('""hi"""', "hi''''", 'hi       ', ' 255', (('', ''), (('s', None, '"^7'),), ('hi',))),
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
