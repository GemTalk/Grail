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
        # ``cls.__name__`` returns the class's name string directly
        # (Grail's ___pyAttrLoad___ unwraps Behavior-side __name__ to
        # a value).  Fall back to str(cls) if the attribute read
        # raises for any reason — covers exotic shim classes that
        # don't expose __name__.
        try:
            type_name = exc_type.__name__
        except Exception:
            type_name = str(exc_type)
    msg = str(value) if value is not None else ''
    if msg:
        return [type_name + ': ' + msg + '\n']
    return [type_name + '\n']


def _unpack_exc_args(exc_type, value, tb):
    """Resolve the (type, value, tb) triple from either legacy
    3-arg ``format_exception(type, value, tb)'' or the 3.10+ single-
    exception ``format_exception(exc)'' form.  Returns the triple
    with None-safe defaults.

    Grail's exception objects don't carry a real ``__traceback__''
    object — they expose the attribute as a BoundMethod accessor.
    Skip the auto-pull of tb and leave it as the caller supplied
    (most callers pass None anyway)."""
    # 3.10+ single-arg form: a BaseException instance in exc_type.
    if isinstance(exc_type, BaseException):
        exc = exc_type
        exc_type = type(exc)
        if value is None:
            value = exc
    return exc_type, value, tb


def format_exception(exc_type, value=None, tb=None):
    """Return a list of strings ready to be joined.  Accepts either
    the legacy 3-arg ``(type, value, tb)'' shape or the 3.10+
    single-argument ``(exc)'' shape.  Without a real traceback
    object the frame list is empty — we still emit the ``Traceback
    (most recent call last):'' header so the output looks
    familiar."""

    exc_type, value, tb = _unpack_exc_args(exc_type, value, tb)
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
    """Print exception lines to ``file'' (default sys.stderr).
    Accepts either the legacy 3-arg form or the 3.10+ single-
    exception form."""
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


def format_list(extracted_list):
    """Format a list of FrameSummary-like entries.  Each entry is
    rendered with a two-space indent — matches CPython's output
    layout.  Accepts any iterable of values that respond to
    ``__str__''."""
    return ['  ' + str(entry) + '\n' for entry in (extracted_list or [])]


def print_list(extracted_list, file=None):
    if file is None:
        file = sys.stderr
    for line in format_list(extracted_list):
        file.write(line)


def walk_tb(tb):
    """Yield (frame, lineno) pairs walking the traceback.  Grail has
    no real traceback objects so the generator is empty."""
    return iter(())


def walk_stack(f):
    """Yield (frame, lineno) pairs walking the stack starting at ``f''.
    Grail has no real frame objects so the generator is empty."""
    return iter(())


class TracebackException:
    """CPython's reusable exception-formatting helper.  Captures the
    exception's type / value (and chain) at construction time so the
    rendering can be deferred or repeated.  Grail's minimal version
    skips the frame walk; ``format()'' produces the same shape as
    ``format_exception''."""

    def __init__(self, exc_type, exc_value, exc_traceback,
                 limit=None, lookup_lines=True, capture_locals=False,
                 compact=False):
        # Use the same input unpacking as format_exception so
        # ``TracebackException(exc)'' single-arg works.
        exc_type, exc_value, exc_traceback = _unpack_exc_args(
            exc_type, exc_value, exc_traceback)
        self.exc_type = exc_type
        # CPython exposes ``value'' (the message) plus the chain
        # attributes (__cause__ / __context__ / __suppress_context__).
        # Without real chained-exception support and with Grail's
        # exception attributes accessible only as BoundMethods, we
        # leave the chain attrs at None.
        self._value = exc_value
        self._tb = exc_traceback
        self.__cause__ = None
        self.__context__ = None
        self.__suppress_context__ = False
        self.stack = []  # FrameSummary list; empty without real tb

    @classmethod
    def from_exception(cls, exc, **kwargs):
        return cls(type(exc), exc, None, **kwargs)

    def format_exception_only(self):
        return format_exception_only(self.exc_type, self._value)

    def format(self, chain=True):
        """Yield strings (header / frames / message).  Generators
        aren't iterated by CPython callers that join the result, so
        return a flat list — easier to test, identical from the
        caller's perspective."""
        lines = ['Traceback (most recent call last):\n']
        lines.extend(self.format_exception_only())
        return lines


__all__ = [
    'format_exception_only', 'format_exception', 'format_exc',
    'print_exception', 'print_exc',
    'extract_tb', 'extract_stack', 'format_tb', 'format_stack',
    'format_list', 'print_list', 'walk_tb', 'walk_stack',
    'TracebackException',
]
