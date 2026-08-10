# GRAIL minimal traceback - format_exc / print_exc / format_exception
# enough for itsdangerous / Werkzeug / Flask error paths.
#
# Grail's exception objects don't carry a CPython-style traceback
# object, so format_exception falls back to a best-effort one-line
# render.  Most callers in Flask's stack just need to *print
# something* on failure; the exact frame walk isn't load-bearing.

import linecache
import sys


# Distinguishes "argument not supplied" from an explicit None, so the 3.10+
# one-argument ``format_exception_only(exc)'' can be told apart from the
# legacy two-argument ``format_exception_only(type, value)'' when value is
# genuinely None.  CPython uses a private sentinel for exactly this.
_sentinel = object()


def _safe_attr(obj, name):
    """getattr(obj, name) or None.  Every SyntaxError field read here is
    best-effort: rendering an exception must never raise a second one."""
    try:
        value = getattr(obj, name, None)
    except Exception:
        return None
    return value


def _is_syntax_error(value):
    try:
        return isinstance(value, SyntaxError)
    except Exception:
        return False


def format_exception_only(exc_type, value=_sentinel, show_group=False):
    """Return a list of strings ending in a newline that render the
    exception class + message.

    Accepts both the legacy ``(type, value)'' shape and the 3.10+
    single-argument ``(exc)'' shape -- ``value'' defaulting to a sentinel
    rather than None is what makes the two distinguishable.

    ``show_group=True`` (3.11+) additionally renders an ExceptionGroup's
    nested exceptions, indented, after the group's own line."""

    if value is _sentinel:
        # Single-argument form: exc_type IS the exception (or None).
        value = exc_type
        exc_type = type(exc_type) if exc_type is not None else None

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
    # A SyntaxError renders its location ABOVE the message, and CPython's
    # exact shape depends on which fields are set:
    #
    #   both filename and lineno ->   File "myfile.py", line 100
    #                                 SyntaxError: bad syntax
    #   lineno only              ->   File "<string>", line 100
    #                                 SyntaxError: bad syntax
    #   filename only            -> SyntaxError: bad syntax (myfile.py)
    #   neither                  -> SyntaxError: bad syntax
    #
    # The message itself is ``msg'', NOT str(value): str() of a SyntaxError
    # already appends its own "(file, line N)" decoration.
    header = []
    if _is_syntax_error(value):
        msg_attr = _safe_attr(value, 'msg')
        filename = _safe_attr(value, 'filename')
        lineno = _safe_attr(value, 'lineno')
        text = _safe_attr(value, 'text')
        offset = _safe_attr(value, 'offset')
        if msg_attr is not None:
            msg = str(msg_attr)
        else:
            msg = str(value) if value is not None else ''
        if lineno is not None:
            header.append('  File "%s", line %s\n'
                          % (filename if filename is not None else '<string>',
                             lineno))
            if text:
                stripped = text.strip()
                header.append('    ' + stripped + '\n')
                if offset is not None:
                    # offset is 1-based and measured against the RAW line, so
                    # discount the whitespace strip() removed.
                    indent = len(text) - len(text.lstrip())
                    caret = int(offset) - 1 - indent
                    if caret >= 0:
                        header.append('    ' + ' ' * caret + '^\n')
        elif filename is not None:
            msg = msg + ' (' + str(filename) + ')'
        lines = header + [type_name + ': ' + msg + '\n'] if msg \
            else header + [type_name + '\n']
        if show_group:
            return lines
        return lines

    msg = str(value) if value is not None else ''
    if msg:
        lines = [type_name + ': ' + msg + '\n']
    else:
        lines = [type_name + '\n']

    # An ExceptionGroup renders its nested exceptions under the group line,
    # indented, when the caller asks for them.
    if show_group:
        for sub in getattr(value, 'exceptions', None) or ():
            for line in format_exception_only(sub, show_group=True):
                lines.append('  ' + line)
    return lines


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
    single-argument ``(exc)'' shape.

    The ``Traceback (most recent call last):'' header is emitted only when
    there are FRAMES to introduce, which is CPython's rule (its
    TracebackException.format does ``if exc.stack:'' before yielding it).
    This used to emit it unconditionally, so ``format_exception(Exception,
    Exception('x'), None)'' produced a header labelling nothing --
    test_traceback's test_print_exception and the format_exc comparisons
    assert on exactly that."""

    exc_type, value, tb = _unpack_exc_args(exc_type, value, tb)
    frames = []
    if tb is not None:
        try:
            # A real traceback object (PyTraceback linked list).
            frames.extend(format_tb(tb))
        except Exception:
            # Legacy callers sometimes pass a plain list of frame entries.
            try:
                for entry in tb:
                    frames.append('  ' + str(entry) + '\n')
            except Exception:
                pass
    lines = []
    if frames:
        lines.append('Traceback (most recent call last):\n')
        lines.extend(frames)
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

    def __init__(self, filename, lineno, name, lookup_line=True, locals=None,
                 line=None, end_lineno=None, colno=None, end_colno=None):
        """``lookup_line`` / ``locals`` are CPython's, in CPython's order.

        They are keyword-only there, so no caller passes them positionally and
        accepting them as ordinary defaulted parameters is compatible.  Both
        were previously absent, which turned every lazy-lookup test into a
        TypeError on an unexpected keyword rather than a wrong value:
        test_lazy_lines, test_lookup_lines, test_extract_stack_lookup_lines.

        ``lookup_line=True`` resolves the source line NOW (CPython touches the
        property in __init__ for exactly this); False leaves it deferred until
        something reads ``.line``."""
        self.filename = filename
        self.lineno = lineno
        self.name = name
        self.end_lineno = end_lineno if end_lineno is not None else lineno
        self.colno = colno
        self.end_colno = end_colno
        self._line = line.strip() if isinstance(line, str) else line
        # CPython stores repr()s, not the live objects, so a FrameSummary cannot
        # keep a frame's locals alive.
        if locals:
            self.locals = dict((k, repr(v)) for k, v in locals.items())
        else:
            self.locals = None
        if lookup_line:
            self.line

    @property
    def line(self):
        """The source text of this frame's line, read lazily from linecache --
        CPython's shape, and the reason a code object's co_filename has to be a
        real path.

        This used to be a plain attribute, so it was None for every frame the
        interpreter did not hand source text to, and ``traceback`` printed a
        ``File ..., line N`` with no code line under it.  Lazy is what CPython
        does and is what keeps extract_tb cheap when the caller only wants
        filenames and line numbers."""
        if self._line is None:
            if self.filename is None or self.lineno is None:
                return None
            got = linecache.getline(self.filename, self.lineno)
            if not got:
                return None
            self._line = got
        return self._line.strip() if isinstance(self._line, str) else self._line

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

    @classmethod
    def extract(cls, frame_gen, limit=None, lookup_lines=True,
                capture_locals=False):
        """Build a StackSummary from an iterable of ``(frame, lineno)`` pairs
        -- the shape ``walk_tb`` / ``walk_stack`` yield.

        ``lookup_lines`` is now REAL: a code object's co_filename is the
        module's actual path, so linecache can read the source line, and
        deferring that read is observable (test_extract_stack_lookup_lines vs
        test_extract_stackup_deferred_lookup_lines assert the two behaviours
        apart).  The comment here used to say the co_filename was a placeholder
        and source text arrived with the frame instead; both halves changed.

        ``capture_locals`` passes the frame's f_locals through to FrameSummary,
        which stores repr()s.  A frame with no f_locals simply captures
        nothing."""

        result = cls()
        count = 0
        for frame, lineno in frame_gen or ():
            if limit is not None and count >= limit:
                break
            code = getattr(frame, 'f_code', None)
            filename = getattr(code, 'co_filename', None) if code else None
            name = getattr(code, 'co_name', None) if code else None
            f_locals = getattr(frame, 'f_locals', None) if capture_locals else None
            result.append(FrameSummary(filename, lineno, name,
                                       lookup_line=lookup_lines,
                                       locals=f_locals))
            count += 1
        return result

    @classmethod
    def from_list(cls, a_list):
        """Build a StackSummary from a list of FrameSummary objects or of
        plain ``(filename, lineno, name, line)`` 4-tuples -- the legacy
        ``extract_tb`` return shape CPython still accepts here."""

        result = cls()
        for entry in a_list or ():
            if isinstance(entry, FrameSummary):
                result.append(entry)
            else:
                filename, lineno, name, line = entry
                result.append(FrameSummary(filename, lineno, name, line=line))
        return result

    def format_frame_summary(self, frame_summary):
        """Render ONE frame, without the trailing newline -- the hook CPython
        exposes for subclasses that want custom frame rendering."""
        return str(frame_summary)

    def format(self):
        # A FrameSummary's __str__ already carries CPython's 2-space "  File"
        # indent (and a 4-space source line); emit it directly.  format_list
        # adds a 2-space prefix for RAW (non-FrameSummary) entries, so routing
        # through it here would double-indent a real frame.
        return [self.format_frame_summary(fs) + '\n' for fs in self]


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


def print_stack(f=None, limit=None, file=None):
    """Print the current stack to ``file`` (default sys.stderr).  Grail has no
    live-frame introspection, so extract_stack answers an empty StackSummary
    and this prints nothing -- but the NAME has to exist, because callers
    reach for it unconditionally."""
    if file is None:
        file = sys.stderr
    for line in format_stack(f, limit):
        file.write(line)


def print_tb(tb, limit=None, file=None):
    """Print a traceback's frames (no exception line) to ``file``."""
    if file is None:
        file = sys.stderr
    for line in format_tb(tb, limit):
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
                 compact=False, max_group_width=15, max_group_depth=10,
                 save_exc_type=True, **kwargs):
        """``max_group_width`` / ``max_group_depth`` / ``save_exc_type`` are
        accepted and not yet acted on: they only shape PEP 654 exception-GROUP
        tree rendering, which Grail does not implement (see §9 of
        docs/Python_Traceback_Design.md).  Accepting them keeps a caller that
        passes them at a FAILURE on unimplemented rendering rather than an
        ERROR on an unexpected keyword, which is the more truthful verdict --
        the same reason format() and format_exception_only() absorb
        ``colorize``.  ``**kwargs`` covers the rest of that family."""
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
        """CPython: ``cls(type(exc), exc, exc.__traceback__, **kwargs)``.

        The traceback used to be hardcoded to None, which threw away the
        frames the exception was carrying -- so a TracebackException built
        this way rendered without any, while the same exception through
        format_exception(exc) rendered with them.  Invisible before, because
        format() emitted the header unconditionally and the frames were the
        only thing missing."""
        return cls(type(exc), exc, getattr(exc, '__traceback__', None),
                   **kwargs)

    def format_exception_only(self, show_group=False, **kwargs):
        """The exception's own line(s), no frames.

        ``**kwargs`` swallows presentation-only options CPython grew (notably
        ``colorize``): Grail renders tracebacks as plain text -- _colorize's
        COLORIZE is False and can_colorize() answers False -- so honouring
        them would produce the same bytes.  Accepting and ignoring keeps
        callers that pass them working instead of raising TypeError."""
        return format_exception_only(self.exc_type, self._value,
                                     show_group=show_group)

    def format(self, chain=True, **kwargs):
        """Yield strings (header / frames / message).  Generators
        aren't iterated by CPython callers that join the result, so
        return a flat list — easier to test, identical from the
        caller's perspective.

        The header is emitted only when the captured stack actually has
        frames, matching CPython's ``if exc.stack:`` guard — see
        format_exception() above.

        ``**kwargs`` swallows ``colorize`` and friends, as above."""
        frames = []
        try:
            frames.extend(self.stack.format())
        except Exception:
            pass
        lines = []
        if frames:
            lines.append('Traceback (most recent call last):\n')
            lines.extend(frames)
        lines.extend(self.format_exception_only())
        return lines

    def __str__(self):
        """CPython renders a TracebackException as its exception message
        alone -- NOT the whole traceback."""
        return str(self._value) if self._value is not None else ''


__all__ = [
    'format_exception_only', 'format_exception', 'format_exc',
    'print_exception', 'print_exc',
    'extract_tb', 'extract_stack', 'format_tb', 'format_stack',
    'format_list', 'print_list', 'print_stack', 'print_tb',
    'walk_tb', 'walk_stack',
    'TracebackException', 'FrameSummary', 'StackSummary',
]
