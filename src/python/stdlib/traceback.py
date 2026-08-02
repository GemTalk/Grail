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

    Grail exceptions now carry a real ``__traceback__'' (a PyTraceback
    or None), so the single-arg form auto-pulls it when the caller did
    not pass one — matching CPython's ``format_exception(exc)''."""
    # 3.10+ single-arg form: a BaseException instance in exc_type.
    if isinstance(exc_type, BaseException):
        exc = exc_type
        exc_type = type(exc)
        if value is None:
            value = exc
        if tb is None:
            tb = getattr(exc, '__traceback__', None)
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
        try:
            # A real traceback object (PyTraceback linked list).
            lines.extend(format_tb(tb))
        except Exception:
            # Legacy callers sometimes pass a plain list of frame entries.
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


class FrameSummary:
    """A single frame of an extracted traceback.

    Carries the classic ``(filename, lineno, name, line)`` tuple shape plus
    CPython 3.11+ PEP 657 fine-grained columns (``colno`` / ``end_colno`` /
    ``end_lineno``).  ``line`` is the source text stripped of surrounding
    whitespace, exactly as CPython stores it, so ``line[colno - indent :
    end_colno - indent]`` recovers the sub-expression the location points at."""

    def __init__(self, filename, lineno, name, line=None,
                 end_lineno=None, colno=None, end_colno=None):
        self.filename = filename
        self.lineno = lineno
        self.name = name
        self.end_lineno = end_lineno if end_lineno is not None else lineno
        self.colno = colno
        self.end_colno = end_colno
        self.line = line.strip() if isinstance(line, str) else line

    def __len__(self):
        return 4

    def __getitem__(self, pos):
        return (self.filename, self.lineno, self.name, self.line)[pos]

    def __iter__(self):
        return iter((self.filename, self.lineno, self.name, self.line))

    def __eq__(self, other):
        if isinstance(other, FrameSummary):
            return (self.filename, self.lineno, self.name, self.line) == \
                   (other.filename, other.lineno, other.name, other.line)
        if isinstance(other, tuple):
            return tuple(self) == other
        return NotImplemented

    def __repr__(self):
        return '<FrameSummary file %s, line %r in %s>' % (
            self.filename, self.lineno, self.name)

    def __str__(self):
        row = '  File "%s", line %s, in %s' % (self.filename, self.lineno, self.name)
        if self.line:
            row += '\n    ' + self.line
        return row


class StackSummary(list):
    """A list of FrameSummary, as returned by ``extract_tb``."""

    def format(self):
        # A FrameSummary's __str__ already carries CPython's 2-space "  File"
        # indent (and a 4-space source line); emit it directly.  format_list
        # adds a 2-space prefix for RAW (non-FrameSummary) entries, so routing
        # through it here would double-indent a real frame.
        return [str(fs) + '\n' for fs in self]


def extract_tb(tb, limit=None):
    """Walk a traceback into a StackSummary of FrameSummary, OUTERMOST frame
    first — so ``extract_tb(exc.__traceback__)[0]`` is the frame that caught
    the exception.  ``tb`` is a PyTraceback linked list (``tb_next`` chained,
    terminated by None) or None."""
    result = StackSummary()
    cur = tb
    count = 0
    while cur is not None:
        if limit is not None and count >= limit:
            break
        frame = cur.tb_frame
        code = frame.f_code
        result.append(FrameSummary(
            code.co_filename, cur.tb_lineno, code.co_name,
            line=cur.tb_line,
            end_lineno=cur.tb_end_lineno,
            colno=cur.tb_colno, end_colno=cur.tb_end_colno))
        cur = cur.tb_next
        count += 1
    return result


def extract_stack(f=None, limit=None):
    # No live-frame introspection yet; an empty StackSummary is the honest
    # answer (a real stack walk is a separate future feature).
    return StackSummary()


def format_tb(tb, limit=None):
    return extract_tb(tb, limit).format()


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
    """Yield (frame, lineno) pairs walking the traceback from the given
    node toward its ``tb_next`` tail."""
    cur = tb
    while cur is not None:
        yield cur.tb_frame, cur.tb_lineno
        cur = cur.tb_next


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
        # FrameSummary list extracted from the traceback (empty if none).
        try:
            self.stack = extract_tb(exc_traceback)
        except Exception:
            self.stack = StackSummary()

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
    'TracebackException', 'FrameSummary', 'StackSummary',
]
