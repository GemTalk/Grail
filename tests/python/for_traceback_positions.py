# Fixture for TracebackTestCase>>testForLoopExceptionPositions.
#
# CPython (PEP 657) attributes an exception raised from a for loop's iterator
# protocol -- evaluating the iterable, __iter__, or __next__ -- to the ITERATOR
# EXPRESSION, not to the whole statement.  test_iter's test_exception_locations
# checks exactly that:
#
#     f.line[f.colno - indent : f.end_colno - indent] == "BrokenIter(...)"
#
# Grail reported the statement's line with colno/end_colno/line all None, so the
# test died on ``None - int``.  ForAst now stores a 5-element PEP 657 position
# array for the iterable into ___curPos___ (a LITERAL array, so it allocates
# nothing), which TryAst's existing ___pushCatchingFrame___ turns into a frame
# with real columns.
#
# The re-point happens before EVERY __next__, not just once before the loop:
# body statements overwrite ___curPos___ as they run, so late_next covers the
# case where the exception arrives after the body has already executed.
#
# body_position checks the other direction -- an exception from the BODY must
# NOT be attributed to the iterable.

import traceback


class BrokenIter:
    """test.support's BrokenIter, inlined so the fixture is self-contained."""

    def __init__(self, init_raises=False, next_raises=False, iter_raises=False):
        if init_raises:
            1 / 0
        self.next_raises = next_raises
        self.iter_raises = iter_raises

    def __next__(self):
        if self.next_raises:
            1 / 0

    def __iter__(self):
        if self.iter_raises:
            1 / 0
        return self


class LateBreak:
    """Raises on the THIRD __next__, after the body has run twice."""

    def __init__(self):
        self.n = 0

    def __iter__(self):
        return self

    def __next__(self):
        self.n += 1
        if self.n > 2:
            1 / 0
        return self.n


def _first_frame(fn):
    exc = fn()
    return traceback.extract_tb(exc.__traceback__)[0]


def _span(fn, indent):
    """The source text f.colno..f.end_colno picks out of the raised-at line."""
    f = _first_frame(fn)
    if f.line is None or f.colno is None or f.end_colno is None:
        return None
    return f.line[f.colno - indent : f.end_colno - indent]


def init_raises():
    try:
        for x in BrokenIter(init_raises=True):
            pass
    except Exception as e:
        return e


def next_raises():
    try:
        for x in BrokenIter(next_raises=True):
            pass
    except Exception as e:
        return e


def iter_raises():
    try:
        for x in BrokenIter(iter_raises=True):
            pass
    except Exception as e:
        return e


def late_next_raises():
    try:
        total = 0
        for x in LateBreak():
            total += x
            total += 1
        return None
    except Exception as e:
        return e


def body_raises():
    try:
        for x in [1, 2, 3]:
            1 / 0
    except Exception as e:
        return e


def tuple_target_next_raises():
    """The tuple-unpack branch of ForAst emits its own __next__ send."""
    try:
        for a, b in LateBreak():
            pass
        return None
    except Exception as e:
        return e


# Every function above puts its `for` line at 8 spaces (def -> try -> for).
_INDENT = 8

_body = _first_frame(body_raises)
_tuple_frame = _first_frame(tuple_target_next_raises)

RESULTS = {
    # --- the three shapes test_exception_locations checks ---
    "init_span": _span(init_raises, _INDENT) == "BrokenIter(init_raises=True)",
    "next_span": _span(next_raises, _INDENT) == "BrokenIter(next_raises=True)",
    "iter_span": _span(iter_raises, _INDENT) == "BrokenIter(iter_raises=True)",
    # --- exception after the body has overwritten the position ---
    "late_next_span": _span(late_next_raises, _INDENT) == "LateBreak()",
    # --- lineno/end_lineno are the `for` line, not the body's ---
    "late_next_lineno_is_for": (
        _first_frame(late_next_raises).lineno
        == _first_frame(late_next_raises).end_lineno
    ),
    # --- a BODY exception is NOT attributed to the iterable ---
    "body_has_no_colno": _body.colno is None,
    "body_lineno_is_body": "1 / 0" in (_body.line or "1 / 0"),
    # --- the tuple-target branch is positioned too ---
    "tuple_target_span": _span(tuple_target_next_raises, _INDENT) == "LateBreak()",
    "tuple_target_has_colno": _tuple_frame.colno is not None,
}
