# from-import the symbols we need so the call sites don't go through
# `traceback.fn()`.  Grail's __pyAttrLoad__ for module unary methods
# invokes the method on read, so `(traceback.format_exc)()` runs the
# function and then tries to call the result string.
from traceback import format_exception_only, format_exc, extract_tb


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
