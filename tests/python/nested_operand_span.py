"""A traceback blames the OPERATION that raised, however deeply it nests.

CPython's PEP 657 span for an exception is the raising operation, not the
statement containing it.  Grail used to recover a frame's position by
text-scanning the ``___curPos___'' store the codegen emits once per STATEMENT,
so a nested operand could not be reached: ``1 / 0 + 5'' underlined the addition.
PR #841 narrowed the one shape that was cheap -- a short-circuit operand, which
already emits inside a block -- and recorded the rest as out of reach.

They are reachable now, by a different route.  Every generated method carries a
map from Smalltalk source offset to Python node; GemStone answers, for any ip,
the Smalltalk offset of the send in flight; and the innermost recorded node
containing that offset is the operation CPython blames.  No store, no statement
boundary, and no per-shape special case -- the five shapes below all fall out of
the same rule.

THE FRAME THAT CATCHES ITS OWN RAISE is covered too, and it needed its own
step.  Such a frame is suspended at the ``on:do:'' send while the raise happened
in the protected BLOCK, so asking the map for the method's own ip answers
nothing; and its ip cannot be trusted for the LINE either, because with native
code enabled the caret lands past the whole block.  It therefore keeps
codegen's line and takes its columns from the block's span, which the map has
already narrowed -- see BaseException >> ___refineCatcherPos___:span:.

A FRAME'S LINE MOVES WITH THE SPAN, so a multi-line expression is blamed on the
line the operation is on rather than on the statement's first.  The LIVE frame
chain (sys._getframe, traceback.walk_stack) agrees with CPython for CPython's
own reason now, not by being coarse: walk_stack is a GENERATOR, so the chain is
captured while the caller sits at the call it is making.  Eager capture read a
line earlier, which statement granularity hid until the IR position map made it
a real divergence.  The traceback walk has no such problem -- see
BaseException >> ___tracebackLineForMethod___:ip:, and its ``ip kinds'' note.
"""

import traceback


def span_of(fn):
    """(lineno, colno, end_lineno, end_colno) of the frame that raised."""
    try:
        fn()
    except ZeroDivisionError as exc:
        fs = traceback.TracebackException.from_exception(exc).stack[-1]
        return (fs.lineno, fs.colno, fs.end_lineno, fs.end_colno)
    return None


def a_binary_operand():
    return 1 / 0 + 5


def a_tuple_element():
    return (1 / 0, 3)


def a_conditional_test():
    return 1 if 1 / 0 else 2


def a_subscript_operand():
    return [1, 2][1 / 0]


def an_argument_after_a_call():
    return len("ab") + 1 / 0


def a_deeply_nested_operand():
    return [(1, 2 + 1 / 0)][0]


def a_multi_line_operand():
    return (100 +
            1 / 0)


def catches_its_own_raise():
    try:
        return [7, 8, 9][0] + 1 / 0
    except ZeroDivisionError as exc:
        return traceback.TracebackException.from_exception(exc).stack[-1]


def the_operand_of_a_binary_op_is_blamed():
    return span_of(a_binary_operand) == (49, 11, 49, 16)


def a_tuple_element_is_blamed():
    return span_of(a_tuple_element) == (53, 12, 53, 17)


def the_test_of_a_conditional_is_blamed():
    return span_of(a_conditional_test) == (57, 16, 57, 21)


def a_subscript_operand_is_blamed():
    return span_of(a_subscript_operand) == (61, 18, 61, 23)


def an_argument_after_a_call_is_blamed():
    return span_of(an_argument_after_a_call) == (65, 23, 65, 28)


def a_deeply_nested_operand_is_blamed():
    return span_of(a_deeply_nested_operand) == (69, 20, 69, 25)


def a_frame_that_catches_its_own_raise_is_blamed():
    fs = catches_its_own_raise()
    return (fs.lineno, fs.colno, fs.end_lineno, fs.end_colno) == (79, 30, 79, 35)


def a_multi_line_expression_is_blamed_on_the_operations_line():
    """The statement starts on line 73 and the division is on 74; CPython
    blames 74, and so does Grail.  This was an XFAIL until the frame's LINE
    began to come from the same map lookup as its columns."""
    return span_of(a_multi_line_operand) == (74, 12, 74, 17)


def a_live_frame_is_blamed_on_the_call_it_is_making():
    """A live frame is blamed on the line of the call it is executing, which
    for a call split across two lines is the FIRST of them.

    This was a CONTROL asserting Grail kept a coarse statement line, and the
    explanation under it has since been measured false.  ``walk_stack'' used to
    be EAGER here where CPython's is a generator, so the chain was captured
    while this frame sat at ``walk_stack('' -- the second line -- rather than at
    ``extract(''.  A statement-granular scan answered the first line anyway, so
    Grail agreed with CPython by luck; under direct-to-IR codegen's precise
    position map the same code answered the second line, and the luck ran out:

        text path:  5  'return traceback.StackSummary.extract('   == CPython
        IR path:    6  'traceback.walk_stack(None), limit=1)'     != CPython

    walk_stack is a generator now, so both paths capture where CPython captures
    and both answer line 5.  The assertion is unchanged; only the reason it
    holds is, and it now holds for the reason CPython's does."""
    def some_inner():
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), limit=1)

    return some_inner()[0].line == 'return traceback.StackSummary.extract('


CHECKS = [
    the_operand_of_a_binary_op_is_blamed,
    a_tuple_element_is_blamed,
    the_test_of_a_conditional_is_blamed,
    a_subscript_operand_is_blamed,
    an_argument_after_a_call_is_blamed,
    a_deeply_nested_operand_is_blamed,
    a_frame_that_catches_its_own_raise_is_blamed,
    a_multi_line_expression_is_blamed_on_the_operations_line,
    a_live_frame_is_blamed_on_the_call_it_is_making,
]


if __name__ == '__main__':
    for _fn in CHECKS:
        print('%-4s %s' % ('OK' if _fn() is True else 'FAIL', _fn.__name__))
