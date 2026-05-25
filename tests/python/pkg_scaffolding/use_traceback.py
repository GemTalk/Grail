# from-import the symbols we need so the call sites don't go through
# `traceback.fn()`.  Grail's __pyAttrLoad__ for module unary methods
# invokes the method on read, so `(traceback.format_exc)()` runs the
# function and then tries to call the result string.
from traceback import (
    format_exception_only, format_exc, extract_tb,
    format_exception, format_list, walk_tb, TracebackException,
)


def format_exception_lines():
    try:
        raise ValueError("bad value")
    except ValueError as ex:
        return format_exception_only(type(ex), ex)


def format_exc_in_handler():
    try:
        raise TypeError("nope")
    except TypeError:
        return format_exc()


def extract_tb_empty():
    return extract_tb(None)


def format_exception_three_arg():
    """Legacy 3-arg form: format_exception(type, value, tb)."""
    try:
        raise RuntimeError("legacy")
    except RuntimeError as ex:
        return format_exception(type(ex), ex, None)


def format_exception_single_arg():
    """3.10+ single-exception form: format_exception(exc)."""
    try:
        raise ValueError("modern")
    except ValueError as ex:
        return format_exception(ex)


def format_list_renders():
    """format_list indents each frame-summary with two spaces."""
    return format_list(['frame-one', 'frame-two'])


def walk_tb_returns_iterator():
    """walk_tb returns an iterator (empty in Grail's stub).  Wrap in
    list to assert exhaustion."""
    return list(walk_tb(None))


def tracebackexception_from_exception():
    """TracebackException.from_exception(e) captures the type/value
    for deferred rendering."""
    try:
        raise TypeError("captured")
    except TypeError as ex:
        te = TracebackException.from_exception(ex)
        return list(te.format())


def tracebackexception_format_only():
    """TracebackException.format_exception_only() returns the
    one-line message form (no Traceback header)."""
    try:
        raise KeyError("x")
    except KeyError as ex:
        te = TracebackException(type(ex), ex, None)
        return te.format_exception_only()
