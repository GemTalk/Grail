# GRAIL minimal traceback - format_exc / print_exc / format_exception
# enough for itsdangerous / Werkzeug / Flask error paths.
#
# Grail's exception objects don't carry a CPython-style traceback
# object, so format_exception falls back to a best-effort one-line
# render.  Most callers in Flask's stack just need to *print
# something* on failure; the exact frame walk isn't load-bearing.

import sys


def format_exception_only(exc_type, value):
    """Return a list of strings ending in a newline that render the
    exception class + message."""

    type_name = ''
    if exc_type is not None:
        # Class-side `__name__` returns a BoundMethod when read as an
        # attribute in Grail (metaclass attr load doesn't unwrap class
        # methods to values yet), so fall straight to str() of the
        # class which calls Object's __str__ -> class name.
        try:
            raw = exc_type.__name__()
            type_name = str(raw)
        except Exception:
            type_name = str(exc_type)
    msg = str(value) if value is not None else ''
    if msg:
        return [type_name + ': ' + msg + '\n']
    return [type_name + '\n']


def format_exception(exc_type, value=None, tb=None):
    """Return a list of strings ready to be joined.  Without a real
    traceback object the frame list is empty - we still emit the
    'Traceback (most recent call last):' header so the output looks
    familiar."""

    lines = ['Traceback (most recent call last):\n']
    if tb is not None:
        # If a list-like has been passed (some callers pass
        # frame info via a list), render each entry.
        try:
            for entry in tb:
                lines.append('  ' + str(entry) + '\n')
        except Exception:
            pass
    lines.extend(format_exception_only(exc_type, value))
    return lines


def format_exc(*args):
    """Return the current exception formatted as a string.  Pulls the
    type/value from sys.exc_info().

    Takes *args so the compiled selector becomes _format_exc:kw:
    (varargs) - that way Grail's module __pyAttrLoad__ wraps it as a
    BoundMethod instead of invoking on read.  The unary form would
    return the string, then `()` would try to call the string and
    surface as `value:value: not understood by Unicode7`."""

    try:
        info = sys.exc_info()
    except AttributeError:
        info = (None, None, None)
    exc_type, value, tb = info[0], info[1], info[2]
    if exc_type is None:
        return 'None\n'
    return ''.join(format_exception(exc_type, value, tb))


def print_exception(exc_type, value=None, tb=None, file=None):
    if file is None:
        file = sys.stderr
    for line in format_exception(exc_type, value, tb):
        file.write(line)


def print_exc(file=None):
    if file is None:
        file = sys.stderr
    file.write(format_exc())


def extract_tb(tb, limit=None):
    # CPython returns a list of FrameSummary - without a real tb we
    # return an empty list.
    return []


def extract_stack(f=None, limit=None):
    return []


def format_tb(tb, limit=None):
    return []


def format_stack(f=None, limit=None):
    return []


__all__ = [
    'format_exception_only', 'format_exception', 'format_exc',
    'print_exception', 'print_exc',
    'extract_tb', 'extract_stack', 'format_tb', 'format_stack',
]
