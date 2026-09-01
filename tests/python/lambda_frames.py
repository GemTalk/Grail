"""Fixtures for the source span of a ``<lambda>'' traceback frame.

Driven by PythonTests>>LambdaFrameTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHAT A FRAME'S SPAN IS.  PEP 657 gives every traceback frame the columns of the
operation in flight, which is what the ``~~~^^^'' line underlines.  For a lambda
that operation is its BODY: CPython underlines ``foo(*args)'' in the <lambda>
frame of

    return (lambda *args: foo(*args))(1,2,3,4)

and the whole ``(lambda ...)(1,2,3,4)'' call in the frame that made it.  The two
frames sit on the SAME source line and are told apart only by their columns.

HOW GRAIL RECORDS IT, AND WHY THE LAMBDA HAD NONE.  Codegen emits
``___curPos___ := #(line col endLine endCol 'src')'' before each statement, and a
frame's span is recovered by scanning the generated Smalltalk backwards from the
ip for the last such store.  A lambda body is an EXPRESSION, not a statement, so
no store was emitted inside its block: the scan ran past the block's opening
bracket and found the enclosing statement's store, and the <lambda> frame
underlined its caller's call site.

The block now stores its own span, into a ___curPos___ that SHADOWS the
enclosing scope's temp of that name -- so the enclosing frame's position is
untouched at run time -- and puts the enclosing store back, for the scan, as a
comment after the closing bracket.  Both halves are checked below: the lambda's
own span, and the caller's span surviving it.

EVERY HELPER HERE IS MODULE-LEVEL, and deliberately so.  A nested ``def'' whose
body holds a lambda is misnamed ``<lambda>'' by Grail's frame-name scan (both
sit on one line, and the scan resolves a name from the line alone), and a frame
whose function comes from ANOTHER module is given the catching module's
filename.  Both are separate, pre-existing defects; keeping the fixture to one
module and to top-level defs measures the span rule rather than those.

Run this file under CPython (``python3 tests/python/lambda_frames.py'') to see
what it produces.  Every check here answers identically under CPython and Grail.
"""

import linecache
import traceback


def _span(fs):
    """The source the frame's columns select, or None when it has none.

    Read from the RAW line rather than from ``fs.line'', which traceback strips:
    colno is an absolute column, so the two do not line up."""
    if fs.colno is None or fs.end_lineno != fs.lineno:
        return None
    raw = linecache.getline(fs.filename, fs.lineno).rstrip('\n')
    return raw[fs.colno:fs.end_colno]


def _frames(exc):
    return [(fs.name, _span(fs))
            for fs in traceback.extract_tb(exc.__traceback__)]


def _boom(*args):
    """Fails inside a RETURN, whose span both implementations report, so the
    checks below turn on the lambda frames rather than on the innermost one."""
    return 1 / 0


def _calls_a_lambda():
    return (lambda *args: _boom(*args))(1, 2)


def _passes_a_lambda_then_fails():
    return _boom(lambda: 1 + 1)


def _calls_nested_lambdas():
    return (lambda: (lambda: _boom())())()


def _catches_around_a_lambda():
    try:
        (lambda: _boom())()
    except ZeroDivisionError as inner:
        return _frames(inner)[0]


def _calls_a_lambda_with_a_quote():
    return (lambda: _boom("a\"b"))()


def a_lambda_frame_spans_its_body():
    """The <lambda> frame underlines the body; the frame that CALLED it, on the
    very same source line, underlines the whole call."""
    try:
        _calls_a_lambda()
    except ZeroDivisionError as e:
        return _frames(e)[1:] == [
            ('_calls_a_lambda', '(lambda *args: _boom(*args))(1, 2)'),
            ('<lambda>', '_boom(*args)'),
            ('_boom', '1 / 0'),
        ]
    return False


def a_lambda_does_not_disturb_its_callers_span():
    """A lambda that is merely PASSED, and never called, still records a span
    while it is being built.  The frame that fails afterwards -- on the same
    statement, at an ip past the lambda's closing bracket -- must report the
    statement, not the lambda body it stepped over."""
    try:
        _passes_a_lambda_then_fails()
    except ZeroDivisionError as e:
        return _frames(e)[1] == (
            '_passes_a_lambda_then_fails', '_boom(lambda: 1 + 1)')
    return False


def a_nested_lambda_spans_its_own_body():
    """Each lambda blames its own body, and the outermost statement is still
    restored for the frame that called into them."""
    try:
        _calls_nested_lambdas()
    except ZeroDivisionError as e:
        return _frames(e)[1:] == [
            ('_calls_nested_lambdas', '(lambda: (lambda: _boom())())()'),
            ('<lambda>', '(lambda: _boom())()'),
            ('<lambda>', '_boom()'),
            ('_boom', '1 / 0'),
        ]
    return False


def a_lambda_does_not_move_the_catching_frame():
    """A lambda called from inside a ``try'' must not leave its own position
    standing for the frame that catches: the handler's frame is blamed on the
    try-body statement, not on the lambda body."""
    return _catches_around_a_lambda() == (
        '_catches_around_a_lambda', '(lambda: _boom())()')


def a_quote_in_the_line_keeps_the_callers_span():
    """A double quote on the statement's line does not cost the caller its
    columns.  Grail restores the enclosing position as a Smalltalk COMMENT,
    which a double quote would end early, so such a line is restored without its
    embedded text -- the columns, which is what is checked here, survive."""
    try:
        _calls_a_lambda_with_a_quote()
    except ZeroDivisionError as e:
        return _frames(e)[1] == (
            '_calls_a_lambda_with_a_quote', '(lambda: _boom("a\\"b"))()')
    return False


CHECKS = [
    a_lambda_frame_spans_its_body,
    a_lambda_does_not_disturb_its_callers_span,
    a_nested_lambda_spans_its_own_body,
    a_lambda_does_not_move_the_catching_frame,
    a_quote_in_the_line_keeps_the_callers_span,
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
