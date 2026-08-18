"""A parse error carries its LOCATION, so a traceback can draw a caret.

Driven by PythonTests>>ParseErrorLocationTestCase.  Each check answers True when
the behaviour matches CPython, so a failure names the specific rule.

``compile()'' and ``exec()'' used to answer a SyntaxError with filename, lineno,
offset and text all absent, so traceback.py had no source line to draw under and
rendered a single line:

    SyntaxError: invalid syntax

against CPython's four:

    File "<test>", line 2
        return x!
               ^
    SyntaxError: invalid syntax

The position was never missing -- Grail's parser put it in the MESSAGE STRING
('... at line 3') at 42 raise sites -- so this is about where it was reported,
not about computing it.

WHAT IS ASSERTED, AND WHAT IS NOT.  These checks read the location fields and
the SHAPE of the render (how many lines, where the caret sits).  They do NOT
compare the message: Grail's parser says "Unexpected token: NEWLINE ''" where
CPython says "invalid syntax", and making the two agree is a separate matter
from locating the error.  Asserting the message here would make this file fail
under CPython for a reason it is not about.

Run under CPython (``python3 tests/python/parse_error_location.py'') to see what
it produces.
"""

import traceback


def _err(src):
    """The SyntaxError from compiling src, or None."""
    try:
        compile(src, '<test>', 'exec')
    except SyntaxError as e:
        return e
    return None


def _only(exc):
    return ''.join(traceback.format_exception_only(exc)).splitlines()


def a_parse_error_reports_its_line():
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and e.lineno == 2


def a_parse_error_reports_a_column():
    """offset is 1-BASED against the RAW line, indentation included."""
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and e.offset == 13


def a_parse_error_reports_its_source_line():
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and e.text is not None and e.text.strip() == 'return x!'


def the_end_fields_are_set():
    """Left unset, the renderer underlines to end-of-line; a parse error gets
    exactly one caret, which needs end_offset == offset + 1."""
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and e.end_lineno == 2 and e.end_offset == 14


def the_render_has_four_lines():
    """File / source / caret / message -- the shape test_caret asserts."""
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and len(_only(e)) == 4


def the_caret_sits_under_the_offending_character():
    e = _err("def fact(x):\n    return x!\n")
    if e is None:
        return 'no error'
    lines = _only(e)
    return lines[1].find('!') == lines[2].find('^')


def exactly_one_caret_is_drawn():
    e = _err("def fact(x):\n    return x!\n")
    return e is not None and _only(e)[2].count('^') == 1


def a_tab_indent_keeps_the_caret_aligned():
    """Non-space whitespace is preserved in the caret padding rather than
    blanked, or the caret drifts on a tab-indented line."""
    e = _err("def fact(x):\n\treturn x!\n")
    if e is None:
        return 'no error'
    lines = _only(e)
    return lines[1].find('!') == lines[2].find('^')


def an_error_at_end_of_line_points_past_the_last_character():
    """``1 +'' fails at the newline, so the offset is one past the text."""
    e = _err("1 +\n")
    return e is not None and e.lineno == 1 and e.offset == 4


def a_first_line_error_reports_line_one():
    e = _err("x = 5 | 4 |")
    return e is not None and e.lineno == 1


def an_unlocated_error_still_answers_none_rather_than_raising():
    """A tokenizer failure has no token list to take a position from, so its
    location stays absent -- and absent must read as None, not raise.  Storing
    Smalltalk nil in those slots made ``e.lineno'' raise AttributeError."""
    e = _err("def spam():\n  print(1)\n print(2)")
    if e is None:
        return 'no error'
    try:
        e.lineno, e.offset, e.text
        return True
    except AttributeError:
        return 'reading a missing location raised AttributeError'



# ---- strictness: two constructs Grail used to ACCEPT ---------------------
#
# These are not about locating an error but about raising one at all.  Grail
# parsed both of these happily, so code CPython refuses to compile ran here --
# and for the generator expression the meaning Grail gave it is not obviously the
# one the author intended.  They are in this file because what makes them
# testable is the location: both are asserted through the rendered caret.


def an_unparenthesized_genexp_among_arguments_is_rejected():
    """``f(a, x for x in y)'' -- legal only as the SOLE argument."""
    e = _err("f(x, y for y in range(30), z)")
    return e is not None and e.msg == 'Generator expression must be parenthesized'


def the_genexp_error_underlines_the_whole_genexp():
    """CPython underlines all of ``y for y in range(30)'', not one character --
    the error is about the construct, so the span is the construct."""
    e = _err("f(x, y for y in range(30), z)")
    if e is None:
        return 'no error'
    lines = _only(e)
    return (lines[1].find('y') == lines[2].find('^')
            and lines[2].count('^') == len('y for y in range(30)'))


def a_sole_argument_genexp_is_still_legal():
    """The rule must not over-reach: this is the form the whole feature exists
    for, and rejecting it would break ``sum(x for x in y)''."""
    return _err("f(x for x in range(3))") is None


def a_genexp_before_other_arguments_is_rejected():
    return _err("f(x for x in range(3), z)") is not None


def a_genexp_after_a_keyword_is_rejected():
    return _err("f(a=1, x for x in range(3))") is not None


def an_unclosed_bracket_is_rejected():
    e = _err("blech  (  ")
    return e is not None and e.msg == "'(' was never closed"


def the_unclosed_bracket_error_points_at_the_bracket():
    """At the bracket, not at end of input -- the bracket is the only position
    that says where to look."""
    e = _err("blech  (  ")
    if e is None:
        return 'no error'
    lines = _only(e)
    return (lines[1].find('(') == lines[2].find('^')
            and lines[2].count('^') == 1)


def the_innermost_unclosed_bracket_is_named():
    e = _err("f([  ")
    return e is not None and e.msg == "'[' was never closed"


def a_balanced_bracket_is_fine():
    return _err("f([1, 2])") is None


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_parse_error_reports_its_line,
        a_parse_error_reports_a_column,
        a_parse_error_reports_its_source_line,
        the_end_fields_are_set,
        the_render_has_four_lines,
        the_caret_sits_under_the_offending_character,
        exactly_one_caret_is_drawn,
        a_tab_indent_keeps_the_caret_aligned,
        an_error_at_end_of_line_points_past_the_last_character,
        a_first_line_error_reports_line_one,
        an_unlocated_error_still_answers_none_rather_than_raising,
        an_unparenthesized_genexp_among_arguments_is_rejected,
        the_genexp_error_underlines_the_whole_genexp,
        a_sole_argument_genexp_is_still_legal,
        a_genexp_before_other_arguments_is_rejected,
        a_genexp_after_a_keyword_is_rejected,
        an_unclosed_bracket_is_rejected,
        the_unclosed_bracket_error_points_at_the_bracket,
        the_innermost_unclosed_bracket_is_named,
        a_balanced_bracket_is_fine,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
