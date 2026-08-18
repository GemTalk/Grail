"""Fixtures for PEP 657 caret lines: the anchor locator and the renderer.

Driven by PythonTests>>CaretAnchorTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHAT A CARET LINE IS.  CPython 3.11+ underlines the sub-expression that failed:

    File "t.py", line 2, in divide
      return a / b
             ~~^~~

``^'' marks the ANCHOR -- the operator for a binary op, the bracket for a call
or subscript -- and ``~'' marks the rest of the failing span.  Getting the split
right is the whole difficulty; an unsplit run of ``^'' is CPython's own
fallback, not a match.

WHY THIS WAS BLOCKED, AND WHY IT IS NOT.  CPython computes the anchor with
``ast'': it parses the segment and reads ``col_offset'' off the node.  Grail's
``ast'' is a stub with no positions, and section 9.33 recorded that as the
blocker gating every caret test -- "carets need three things, and two are
missing".

That reading was too pessimistic.  A full ``ast'' is sufficient but not
necessary: for the restricted grammar of "a valid Python expression segment"
the anchor can be found by SCANNING -- track bracket depth and string literals,
then take either the trailing call/subscript bracket or the loosest-binding
depth-0 binary operator.  The implementation is verified against CPython's own
ast-based extractor over EVERY BinOp/Subscript/Call node in the 3.14.6 stdlib:
36641 segments, 100% agreement.

WHAT IS STILL MISSING.  Grail's frames carry no columns -- ``colno'' is None on
every frame -- so nothing draws a caret in a real traceback yet.  That is
section 9.33's third item, per-operation spans in codegen, and it is now the
ONLY thing between this and the caret tests.  The checks below therefore build
FrameSummary objects with EXPLICIT columns, which is what the renderer will see
once codegen supplies them.

Run this file under CPython (``python3 tests/python/caret_anchors.py'') to see
what it produces -- that is where the expectations come from.  Every check here
answers identically under CPython and Grail.
"""

import traceback


def _anchors(segment):
    """(left, right) offsets of the ``^'' region, or None."""
    a = traceback._extract_caret_anchors_from_line_segment(segment)
    if a is None:
        return None
    return (a.left_end_offset, a.right_start_offset)


def _render(line, colno, end_colno, name='g'):
    """The caret line the renderer draws for a frame, or None when it draws
    none.  ``line'' is the RAW source line, indent included, exactly as a
    frame's source is stored."""
    fs = traceback.FrameSummary('t.py', 1, name, lookup_line=False, line=line,
                                colno=colno, end_colno=end_colno)
    rendered = traceback.StackSummary([fs]).format_frame_summary(fs)
    rows = rendered.rstrip('\n').split('\n')
    return rows[2] if len(rows) > 2 else None


# ------------------------------------------------------------ anchor locator
def a_call_anchors_its_parentheses():
    """``foo()'' -- the anchor is the bracket pair, not the whole call."""
    return _anchors('foo()') == (3, 5)


def a_binary_op_anchors_the_operator():
    return _anchors('a + b') == (2, 3)


def the_loosest_operator_is_the_anchor():
    """The root of the expression tree, so ``+'' beats ``*'' whichever side it
    is on.  Getting this backwards is the natural mistake: the tightest
    operator is the one the eye picks out."""
    return (_anchors('a * b + c') == (6, 7)
            and _anchors('a + b * c') == (2, 3)
            and _anchors('a | b & c') == (2, 3))


def a_two_character_operator_spans_two():
    return (_anchors('a // b') == (2, 4)
            and _anchors('a ** b') == (2, 4)
            and _anchors('a << b') == (2, 4))


def a_subscript_anchors_its_brackets():
    """A chain anchors only the LAST subscript -- that is the one that ran."""
    return (_anchors("x['a']") == (1, 6)
            and _anchors("x['a']['b']['c']") == (11, 16))


def brackets_inside_strings_are_not_brackets():
    """The scanner has to know string literals, or ``'lit(er)al''' derails the
    depth count and the anchor lands anywhere."""
    return (_anchors("s + 'lit(er)al'") == (2, 3)
            and _anchors("d['+']") == (1, 6)
            and _anchors("f('a)b')") == (1, 8))


def a_bytes_literal_can_be_subscripted():
    """``b'z'[0]'' -- a literal is a primary expression, so the bracket after
    its closing QUOTE is a subscript."""
    return _anchors("b'z'[0]") == (4, 7)


def a_float_exponent_sign_is_not_an_operator():
    """``2.5e+3 * r'' roots at the ``*''.  The ``+'' belongs to the literal,
    and reading it as a binary operator anchors the wrong character."""
    return _anchors('2.5e+3 * r') == (7, 8)


def redundant_parentheses_are_seen_through():
    """``ast'' drops them, so the root is the inner expression."""
    return (_anchors('((a + b))') == (4, 5)
            and _anchors('(f(x))') == (2, 5))


def a_parenthesised_operand_extends_the_operator():
    """CPython never tokenizes the operator: it takes the first operator
    character and extends by one when the next character still sits before the
    right operand.  ast reports a parenthesised operand from INSIDE the paren,
    so ``x*(a + b)'' anchors ``*('' -- two characters for a one-character
    operator.  Measured, not reasoned about."""
    return _anchors('x*(Mshift + y)') == (1, 3)


def a_tuple_operand_does_not_extend_it():
    """The mirror of the above, and the reason it cannot be simplified to
    "extend over a paren".  ast keeps the parens for a TUPLE, so the operand
    starts AT the paren and there is no gap: ``"%s"%(a, b)'' anchors just the
    ``%''."""
    return (_anchors('"%dx%d"%(width, height)') == (7, 8)
            and _anchors('p0+(e1*x+e0*y)/screen.xscale') == (2, 3))


def a_non_binary_expression_has_no_anchor():
    """Conditionals and comparisons are not BinOp, so CPython computes no
    anchors and the whole span renders ``^''."""
    return (_anchors('a if b else c') is None
            and _anchors('a == b') is None
            and _anchors('not a') is None)


# ------------------------------------------------------------------ renderer
def a_binary_op_renders_a_split_caret_line():
    return _render('    return a / b', 11, 16) == '           ~~^~~'


def a_call_renders_carets_on_its_brackets():
    """Only the BRACKETS take ``^''; the callee expression takes ``~''.

    The span decides the render, so the same source line draws differently
    depending on which operation failed -- an attribute error inside
    ``o.attr.meth'' carries a shorter span than the call does."""
    return (_render('    return o.attr.meth()', 11, 24)
            == '           ~~~~~~~~~~~^^')


def a_subscript_chain_renders_carets_on_the_last():
    return (_render("    return d['a']['b']['c']", 11, 27)
            == '           ~~~~~~~~~~~^^^^^')


def a_frame_without_columns_renders_no_caret_line():
    """The pre-PEP-657 shape, and the shape every Grail frame has today."""
    return _render('    return a / b', None, None) is None


def a_whole_line_call_suppresses_the_caret_line():
    """``return f()'' / ``x = f()'' where the call IS the statement: CPython
    draws nothing, because underlining everything says nothing.  It applies
    only when the callee is a plain NAME -- ``return o.attr.meth()'' above
    still draws."""
    return (_render('    return f()', 11, 14) is None
            and _render('    x = f()', 8, 11) is None)


def a_partial_span_still_draws_when_anchors_are_absent():
    """No anchors and no suppression: the span renders as an unsplit run of
    ``^'', which is CPython's fallback."""
    return _render('    return a == b', 11, 17) == '           ^^^^^^'


# scripts/check_python_fixtures.sh runs this under CPython in CI.

# ---- A SyntaxError's caret RANGE ----------------------------------------
#
# Distinct from the PEP 657 anchors above: these are the carets a SyntaxError
# renders under its own source line, from ``offset'' to ``end_offset''.
#
# Grail always emitted a SINGLE '^' here.  CPython emits a RANGE, and the branch
# it takes to do so is the counter-intuitive part: the underline runs to the END
# of the line whenever the error does not end on the line it started on -- and a
# SyntaxError built from the usual 4-tuple has end_lineno None, so
# ``lineno == end_lineno'' is False and the to-end-of-line branch is the
# ORDINARY case rather than a rare fallback.
#
# These construct the SyntaxError directly instead of provoking one from the
# parser, because Grail's parser does not populate lineno/offset/text at all
# (42 raise sites pass the position in the message string) -- so a provoked one
# renders no source block and would test nothing about carets.


def _only(exc):
    import traceback
    return ''.join(traceback.format_exception_only(exc))


def a_syntaxerror_underlines_to_end_of_line():
    """offset 1 of 'text1' underlines all five characters, not one."""
    e = SyntaxError('msg', ('file.py', 1, 1, 'text1'))
    return _only(e) == '  File "file.py", line 1\n    text1\n    ^^^^^\nSyntaxError: msg\n'


def the_range_starts_at_the_offset():
    e = SyntaxError('msg', ('file.py', 1, 3, 'text3'))
    return _only(e) == '  File "file.py", line 1\n    text3\n      ^^^\nSyntaxError: msg\n'


def an_offset_at_end_of_line_gets_one_caret():
    """offset == len(text): the range collapses rather than going empty."""
    e = SyntaxError('msg', ('', 0, 5, 'hello'))
    return _only(e) == '  File "<string>", line 0\n    hello\n        ^\nSyntaxError: msg\n'


def an_offset_past_end_of_line_is_clamped():
    e = SyntaxError('msg', ('file.py', 1, 99, 'text9'))
    return _only(e) == '  File "file.py", line 1\n    text9\n         ^\nSyntaxError: msg\n'


def a_leading_indent_is_discounted_from_the_offset():
    """The source line is printed stripped, so the caret column is measured
    against the stripped text -- the bug this had before was double-counting."""
    e = SyntaxError('msg', ('file.py', 1, 3, '  text1'))
    return _only(e) == '  File "file.py", line 1\n    text1\n    ^^^^^\nSyntaxError: msg\n'


def an_explicit_end_offset_bounds_the_range():
    """With end_lineno == lineno the range is exactly offset..end_offset."""
    e = SyntaxError('msg', ('file.py', 1, 2, 'abcdef', 1, 4))
    return _only(e) == '  File "file.py", line 1\n    abcdef\n     ^^\nSyntaxError: msg\n'


def a_trailing_space_is_not_stripped_before_measuring():
    """CPython removes the trailing NEWLINE only.  strip() also removed trailing
    spaces, which shortened the line the range is measured against."""
    e = SyntaxError('msg', ('file.py', 1, 1, 'ab  \n'))
    return _only(e) == '  File "file.py", line 1\n    ab  \n    ^^^^\nSyntaxError: msg\n'


def a_none_offset_renders_the_line_without_carets():
    e = SyntaxError('msg', ('file.py', 1, None, 'text1'))
    return _only(e) == '  File "file.py", line 1\n    text1\nSyntaxError: msg\n'


if __name__ == '__main__':
    checks = [
        a_call_anchors_its_parentheses,
        a_binary_op_anchors_the_operator,
        the_loosest_operator_is_the_anchor,
        a_two_character_operator_spans_two,
        a_subscript_anchors_its_brackets,
        brackets_inside_strings_are_not_brackets,
        a_bytes_literal_can_be_subscripted,
        a_float_exponent_sign_is_not_an_operator,
        redundant_parentheses_are_seen_through,
        a_parenthesised_operand_extends_the_operator,
        a_tuple_operand_does_not_extend_it,
        a_non_binary_expression_has_no_anchor,
        a_binary_op_renders_a_split_caret_line,
        a_call_renders_carets_on_its_brackets,
        a_subscript_chain_renders_carets_on_the_last,
        a_frame_without_columns_renders_no_caret_line,
        a_whole_line_call_suppresses_the_caret_line,
        a_partial_span_still_draws_when_anchors_are_absent,
        a_syntaxerror_underlines_to_end_of_line,
        the_range_starts_at_the_offset,
        an_offset_at_end_of_line_gets_one_caret,
        an_offset_past_end_of_line_is_clamped,
        a_leading_indent_is_discounted_from_the_offset,
        an_explicit_end_offset_bounds_the_range,
        a_trailing_space_is_not_stripped_before_measuring,
        a_none_offset_renders_the_line_without_carets,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
