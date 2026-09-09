"""A traceback blames the ``and''/``or'' OPERAND that raised, not the whole
expression.

CPython's PEP 657 span for an exception is the RAISING OPERATION.  Grail records
one ``___curPos___'' store per statement, naming the statement's value
expression, so ``x = 1 / 0 and 2.0'' underlined the whole ``and'' -- columns
9..22 where CPython gives 9..14, the division.

A short-circuit was the one nested shape Grail could follow cheaply, because it
ALREADY emits its later operands inside blocks: the first operand is named by
the statement's own store (narrowed onto it) and each later one by a store at
the top of the block that guards it.

THE GENERAL CASE IS NOW COVERED TOO, by a different mechanism: every generated
method carries a map from Smalltalk source offset to Python node, and a raise
resolves to the innermost recorded node containing the send.  So ``1 / 0 + 5''
and a conditional expression -- the last two checks, which used to be CONTROLS
saying those were out of reach -- are exact.  They are kept, tightened from
``either answer is acceptable'' to CPython's exact span, because they are the
cases most likely to regress if the map stops being emitted for exec'd code:
every check in this file goes through exec(), which compiles a DOIT rather than
a module method, and doits were the last compile path to get a map.
"""

import traceback


def span_of(src):
    try:
        exec(compile(src, '<span>', 'exec'))
    except ZeroDivisionError as exc:
        fs = traceback.TracebackException.from_exception(exc).stack[-1]
        return (fs.colno, fs.end_colno)
    return None


def the_first_operand_of_and_is_blamed():
    return span_of('abcdef = 1 / 0 and 2.0') == (9, 14)


def the_second_operand_of_and_is_blamed():
    return span_of('abcdef = 2.0 and 1 / 0') == (17, 22)


def the_first_operand_of_or_is_blamed():
    return span_of('abcdef = 1 / 0 or 2.0') == (9, 14)


def the_second_operand_of_or_is_blamed():
    return span_of('abcdef = False or 1 / 0') == (18, 23)


def the_third_operand_of_a_chain_is_blamed():
    return span_of('abcdef = False or False or 1 / 0') == (27, 32)


def a_nested_short_circuit_reaches_the_inner_operand():
    return span_of('abcdef = (1 / 0 and 2.0) or 3.0') == (10, 15)


def a_statement_with_no_short_circuit_is_unchanged():
    return span_of('abcdef = 1 / 0') == (9, 14)


def a_return_inside_a_function_is_blamed_the_same_way():
    src = 'def f():\n    return 2.0 and 1 / 0\nf()'
    try:
        exec(compile(src, '<span>', 'exec'))
    except ZeroDivisionError as exc:
        fs = traceback.TracebackException.from_exception(exc).stack[-1]
        return (fs.lineno, fs.colno, fs.end_colno) == (2, 19, 24)
    return False


def the_frame_after_a_short_circuit_keeps_its_own_span():
    # The store inside the block must not leak to a LATER raise in the same
    # frame: that one is a plain division and must report its own columns.
    src = 'abcdef = 2.0 and 3.0\nghijkl = 1 / 0'
    try:
        exec(compile(src, '<span>', 'exec'))
    except ZeroDivisionError as exc:
        fs = traceback.TracebackException.from_exception(exc).stack[-1]
        return (fs.lineno, fs.colno, fs.end_colno) == (2, 9, 14)
    return False


# CONTROLS -- the general nested case is NOT addressed, and these pin what
# Grail actually does so a later change has to notice.
def a_binary_operand_is_narrowed():
    return span_of('abcdef = 1 / 0 + 5') == (9, 14)


def a_conditional_expression_is_narrowed():
    return span_of('abcdef = 1 if 1 / 0 else 2') == (14, 19)


CHECKS = [
    the_first_operand_of_and_is_blamed,
    the_second_operand_of_and_is_blamed,
    the_first_operand_of_or_is_blamed,
    the_second_operand_of_or_is_blamed,
    the_third_operand_of_a_chain_is_blamed,
    a_nested_short_circuit_reaches_the_inner_operand,
    a_statement_with_no_short_circuit_is_unchanged,
    a_return_inside_a_function_is_blamed_the_same_way,
    the_frame_after_a_short_circuit_keeps_its_own_span,
    a_binary_operand_is_narrowed,
    a_conditional_expression_is_narrowed,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
