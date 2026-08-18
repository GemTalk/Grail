"""PEP 701 f-strings: the expression part is real source, not string data.

Before Python 3.12 an f-string was scanned by a special-cased mini-parser with
restrictions that had nothing to do with the language and everything to do with
that scanner.  PEP 701 moved f-strings into the ordinary grammar and the
restrictions went away.  The one that bites hardest:

    f'{' '.join(cmd)}'      SyntaxError before 3.12 -- the second quote ended
                            the literal.  CPython's own test.support.socket_helper
                            is written this way, so Grail could not read it.

Grail scanned an f-string to its matching quote with no idea braces existed.
The fix tracks brace depth in the tokenizer and, inside a replacement field,
consumes text VERBATIM -- which is what the backslash cases below are really
testing: decoding an escape there would hand the inner parser a string literal
with a raw newline in it rather than the two characters the author wrote.

The second half of this file is the regression half.  Brace tracking is easy to
get wrong in ways that only show up on doubled braces, format specs, slices, or
a brace inside a nested string -- all of which worked before and must keep
working.

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}

CMD = ['a', 'b']
D = {'k': 'v', '}': 'brace'}
W = 6
A = 10
B = 'hi'


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ---------------------------------------------------- PEP 701: same quotes

check('single_inside_single', lambda: f'{' '.join(CMD)}', 'a b')
check('double_inside_double', lambda: f"{" ".join(CMD)}", 'a b')
check('single_with_conversion', lambda: f'{' '.join(CMD)!r}', "'a b'")
check('subscript_same_quote', lambda: f'{D['k']}', 'v')
check('same_quote_amid_text', lambda: f'[{D['k']}]', '[v]')
# The classic mixed form still works -- it was never the problem.
check('mixed_quotes_still_work', lambda: f"{D['k']}", 'v')


# ------------------------------------------------- PEP 701: backslashes

check('backslash_escape_in_expr', lambda: f'{'\n'.join(CMD)}', 'a\nb')
check('backslash_tab_in_expr', lambda: f'{'\t'.join(CMD)}', 'a\tb')
# ...while an escape in the LITERAL part is still decoded as before.
check('literal_escape_still_decoded', lambda: f'x\ny{1}', 'x\ny1')
check('escape_both_sides', lambda: f'\t{'\n'.join(CMD)}\t', '\ta\nb\t')


# ---------------------------------------------------- PEP 701: nesting

check('nested_once', lambda: f'{f'{1 + 1}'}', '2')
check('nested_twice', lambda: f'{f'{f'{1 + 1}'}'}', '2')
check('nested_with_text', lambda: f'a{f'b{1 + 1}c'}d', 'ab2cd')


# ------------------------------------------------- must not have changed

# Doubled braces are literal, and the depth must not move for them.
check('doubled_open_brace', lambda: f'{{', '{')
check('doubled_close_brace', lambda: f'}}', '}')
check('doubled_braces_around_field', lambda: f'{{{1 + 1}}}', '{2}')
check('doubled_braces_only', lambda: f'{{}}', '{}')

# Conversions and format specs.
check('conversion_r', lambda: f'{'x'!r}', "'x'")
check('conversion_s', lambda: f'{'x'!s}', 'x')
check('format_spec', lambda: f'{42:>5}', '   42')
check('nested_format_spec', lambda: f'{42:>{W}}', '    42')
check('spec_with_quotes_in_expr', lambda: f'{D['k']:>3}', '  v')

# A brace inside a nested string literal is data, not structure.
check('brace_inside_nested_string', lambda: f'{D['}']}', 'brace')
check('close_brace_in_string_literal', lambda: f'{"}"}', '}')
check('open_brace_in_string_literal', lambda: f'{"{"}', '{')

# Slices and dict/set displays inside the field -- both use the tracked chars.
check('slice_in_expr', lambda: f'{CMD[0:1]}', "['a']")
check('dict_display_in_expr', lambda: f'{ {'a': 1}['a'] }', '1')
check('set_display_in_expr', lambda: f'{sorted({3, 1, 2})}', '[1, 2, 3]')

# Implicit concatenation across string kinds.
check('implicit_concat', lambda: f'{1}' 'lit' f'{2}', '1lit2')
check('concat_plain_then_f', lambda: 'lit' f'{1}', 'lit1')

# Triple-quoted f-strings, including one holding the other quote character.
check('triple_quoted', lambda: f'''{'x'}''', 'x')
check('triple_quoted_with_newline', lambda: f'''a
{1}''', 'a\n1')

# Raw f-strings keep the backslash in the literal part.
check('raw_fstring_literal_part', lambda: rf'\n{1}', '\\n1')

# Whitespace around the field.  Legal Python, but the child parse of the
# expression starts at column 1, so a leading space there tokenized as an
# INDENT -- and PEP 701 lets the field span lines, which makes a trailing
# newline the same problem at the other end.
check('leading_space_in_field', lambda: f'{ 1 }', '1')
check('space_around_nested_display', lambda: f'{ {'a': 1}['a'] }', '1')
check('multiline_field', lambda: f'{
    1 + 1
}', '2')
check('multiline_field_with_comment', lambda: f'{1 +  # trailing comment
    1}', '2')

# The ``=`` self-documenting form (Python 3.8).  Grail used to DROP the ``=``
# silently -- the child parse just stopped there -- and parsing the field as
# parenthesized turned that into a hard error, which is how it was noticed.
# The shape appears mostly inside assertion messages a passing test never reads,
# so nothing had ever caught the wrong output.
check('debug_eq_plain', lambda: f'{A=}', 'A=10')
check('debug_eq_reprs_by_default', lambda: f'{B=}', "B='hi'")
check('debug_eq_with_spec_formats', lambda: f'{A=:x}', 'A=a')
check('debug_eq_with_spec_pads', lambda: f'{A=:>6}', 'A=    10')
check('debug_eq_conversion_r', lambda: f'{A=!r}', 'A=10')
check('debug_eq_conversion_s', lambda: f'{A=!s}', 'A=10')
check('debug_eq_keeps_spacing', lambda: f'{ A = }', ' A = 10')
check('debug_eq_expression_source', lambda: f'{A+1=}', 'A+1=11')
# ...and an ``=`` belonging to an operator is NOT the debug form.
check('eq_operator_not_debug', lambda: f'{A==10}', 'True')
check('ne_operator_not_debug', lambda: f'{A!=9}', 'True')
check('ge_operator_not_debug', lambda: f'{A>=1}', 'True')
# Evaluated at module level rather than inside the lambda: a walrus inside a
# lambda fails Grail codegen on its own, with no f-string involved, so wrapping
# it here would test that limitation instead of this one.
_WALRUS = f'{(w:=3)}'
check('walrus_not_debug', lambda: _WALRUS, '3')

# Degenerate shapes.
check('empty_fstring', lambda: f'', '')
check('no_fields', lambda: f'plain', 'plain')
check('adjacent_fields', lambda: f'{1}{2}{3}', '123')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
