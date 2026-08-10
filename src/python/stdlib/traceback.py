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


def _safe_string(value, what, func=str):
    """CPython's traceback._safe_string: render ``value'' with ``func'', and
    describe the failure rather than propagating it when that raises -- a
    traceback must be printable even when the objects in it are not."""
    try:
        return func(value)
    except:
        return '<%s %s() failed>' % (what, 'repr' if func is repr else 'str')


def _format_notes(value):
    """PEP 678 (3.11+): the lines for ``value.__notes__'', or [] when there
    are none.

    CPython leaves ``__notes__'' ABSENT until the first add_note, so a
    getattr default of None is the "no notes" case -- distinct from a note
    list that is present but empty.

    A note is normally a str, and a multi-line note renders as several lines.
    But ``__notes__'' is a plain writable attribute, so it can be set to any
    object: CPython renders a non-str SEQUENCE element-wise, and anything
    else (including a non-sequence) as a single repr() line.  Both go through
    _safe_string, because a note's __str__/__repr__ may itself raise."""
    try:
        notes = getattr(value, '__notes__', None)
    except Exception as e:
        # getattr's default only absorbs AttributeError.  An exception with a
        # broken __getattr__ can raise anything else, and a traceback must
        # still print: CPython reports the swallowed error as a note of its
        # own rather than letting it escape the formatter.
        return ['Ignored error getting __notes__: '
                + _safe_string(e, '__notes__', func=repr) + '\n']
    if notes is None:
        return []
    # CPython's test is ``isinstance(notes, collections.abc.Sequence) and not
    # isinstance(notes, (str, bytes))''.  Narrowed to list/tuple here: that is
    # what add_note builds, and it keeps the check independent of how much of
    # collections.abc Grail has registered.  A custom Sequence subclass would
    # render as one repr() line where CPython renders it element-wise.
    if not isinstance(notes, (list, tuple)):
        return [_safe_string(notes, '__notes__', func=repr) + '\n']
    lines = []
    for note in notes:
        text = _safe_string(note, 'note')
        for piece in text.split('\n'):
            lines.append(piece + '\n')
    return lines


def _type_display_name(exc_type):
    """The name a traceback gives an exception class.

    CPython uses ``__qualname__`` (so a nested class shows its nesting) and
    QUALIFIES it with the defining module unless that module is ``builtins``
    or ``__main__`` -- so ValueError stays ``ValueError'' while a library's
    own exception renders as ``package.module.TheError''.  A ``__module__``
    that is not a str renders as ``<unknown>``: it is a plain writable
    attribute, so it can be anything.

    Every read is guarded because rendering an exception must never raise a
    second one, and the fallbacks step down: __qualname__, then __name__,
    then str(cls) -- the last covers shim classes exposing neither."""
    if exc_type is None:
        return ''
    try:
        name = exc_type.__qualname__
    except Exception:
        try:
            name = exc_type.__name__
        except Exception:
            return str(exc_type)
    if not isinstance(name, str):
        name = str(name)
    try:
        smod = exc_type.__module__
    except Exception:
        return name
    if smod is None or smod in ('__main__', 'builtins'):
        return name
    if not isinstance(smod, str):
        smod = '<unknown>'
    return smod + '.' + name


def format_exception_only(exc_type, value=_sentinel, show_group=False):
    """Return a list of strings ending in a newline that render the
    exception class + message.

    Accepts both the legacy ``(type, value)'' shape and the 3.10+
    single-argument ``(exc)'' shape -- ``value'' defaulting to a sentinel
    rather than None is what makes the two distinguishable.

    ``show_group=True`` (3.11+) additionally renders an ExceptionGroup's
    nested exceptions, indented, after the group's own line."""

    # Whether the type was DERIVED from the value (rather than passed by a
    # legacy caller).  If it was, the value is the exception and always
    # contributes a message -- including when it is None.
    derived = False
    if value is _sentinel:
        # Single-argument form: exc_type IS the exception.  type(None) is
        # NoneType, not None -- CPython does not special-case a None
        # exception, which is exactly why ``print_exception(None)'' renders
        # ``NoneType: None'' rather than a blank line.
        value = exc_type
        exc_type = type(value)
        derived = True
    elif exc_type is None and value is None:
        # Legacy three-argument form with the whole triple None --
        # ``print_exception(None, None, None)''.  Same rendering, same reason.
        exc_type = type(None)
        derived = True

    type_name = _type_display_name(exc_type)
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
        return lines + _format_notes(value)

    # A DERIVED type means the value is the exception, so it always contributes
    # a message -- ``None'' included, which is what makes print_exception(None)
    # render ``NoneType: None''.  A legacy caller that passed a type and an
    # explicit None value has no message, and keeps rendering the bare name.
    if value is None and not derived:
        msg = ''
    else:
        msg = _safe_string(value, 'exception')
    if msg:
        lines = [type_name + ': ' + msg + '\n']
    else:
        lines = [type_name + '\n']

    # PEP 678 notes go directly under the exception's own line, and ABOVE an
    # ExceptionGroup's nested exceptions -- the notes belong to the group.
    lines.extend(_format_notes(value))

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
    # No special case for "no active exception": format_exception(None, None,
    # None) now renders CPython's own answer for it, ``NoneType: None''.  This
    # used to short-circuit to 'None\n', which was neither CPython's text nor
    # reachable any other way.
    return ''.join(format_exception(exc_type, value, tb))


def print_exception(exc_type, value=None, tb=None, file=None):
    """Print exception lines to ``file'' (default sys.stderr).
    Accepts either the legacy 3-arg form or the 3.10+ single-
    exception form."""
    if file is None:
        file = sys.stderr
    for line in format_exception(exc_type, value, tb):
        file.write(line)


def print_last(limit=None, file=None, chain=True):
    """CPython's ``print_last(...)'': render the exception the interactive
    interpreter recorded, from ``sys.last_exc'' (3.12+) or the legacy
    ``sys.last_type'' / ``last_value'' / ``last_traceback'' triple.

    Raises ValueError when neither is set, which is CPython's answer for "there
    is no last exception" -- callers distinguish that from an empty render.

    ``limit'' / ``chain'' are accepted and not yet acted on, as in print_exc."""
    have_exc = hasattr(sys, 'last_exc')
    if not have_exc and not hasattr(sys, 'last_type'):
        raise ValueError('no last exception')
    if have_exc:
        print_exception(sys.last_exc, file=file)
    else:
        print_exception(sys.last_type, sys.last_value,
                        getattr(sys, 'last_traceback', None), file=file)


def print_exc(limit=None, file=None, chain=True):
    """CPython's ``print_exc(limit=None, file=None, chain=True)''.

    ``limit'' is the FIRST positional parameter, not ``file'' -- the signature
    here used to be ``print_exc(file=None)'', so a caller writing CPython's
    ``print_exc(None, file=f)'' bound None to the wrong parameter.  ``limit''
    and ``chain'' are accepted and not yet acted on (limit needs multi-frame
    tracebacks, chain needs __cause__/__context__ rendering); taking them keeps
    such a call working instead of raising TypeError."""
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
            # Through _safe_string, so a local whose repr() raises renders as
            # '<local repr() failed>' rather than taking the whole traceback
            # down -- capturing locals must never be riskier than not.
            self.locals = dict((k, _safe_string(v, 'local', func=repr))
                               for k, v in locals.items())
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


def _code_positions_at(code, lasti):
    """The PEP 657 ``(lineno, end_lineno, colno, end_colno)'' for the
    instruction at ``lasti``, read from the code object's ``co_positions()``.

    This is where CPython gets a frame's columns from -- ``co_positions()``
    yields one tuple per instruction and the traceback's ``tb_lasti`` indexes
    it (two bytes per instruction).  Grail's own PyTraceback carries the values
    directly, but anything DUCK-TYPED as a traceback will not: test_traceback
    builds its fakes as namedtuples with only tb_frame/tb_lineno/tb_next/
    tb_lasti, and supplies the positions through co_positions on the code
    object, exactly as a real interpreter would."""
    if lasti is None or lasti < 0:
        return (None, None, None, None)
    try:
        positions = code.co_positions()
    except Exception:
        return (None, None, None, None)
    try:
        for index, pos in enumerate(positions):
            if index == lasti // 2:
                pos = tuple(pos)
                # Pad, so a short tuple cannot IndexError the caller.
                return pos + (None,) * (4 - len(pos))
    except Exception:
        pass
    return (None, None, None, None)


def extract_tb(tb, limit=None, lookup_lines=True, capture_locals=False):
    """Walk a traceback into a StackSummary of FrameSummary, OUTERMOST frame
    first — so ``extract_tb(exc.__traceback__)[0]`` is the frame that caught
    the exception.  ``tb`` is a PyTraceback linked list (``tb_next`` chained,
    terminated by None) or None.

    Every attribute beyond ``tb_frame`` / ``tb_lineno`` / ``tb_next`` is read
    with getattr and a fallback.  Those three are the whole of the traceback
    protocol CPython documents; the ``tb_line`` / ``tb_colno`` extras are
    Grail's own shortcut for the common case, and requiring them made
    extract_tb raise AttributeError on any other traceback-shaped object --
    which TracebackException then swallowed into an EMPTY stack, so the caller
    saw an IndexError from ``exc.stack[0]`` with nothing to say why.

    ``lookup_lines=False`` defers the linecache read (CPython's contract: the
    cache must be untouched until something asks for ``.line``), and
    ``capture_locals`` snapshots each frame's f_locals as repr()s."""
    result = StackSummary()
    cur = tb
    count = 0
    while cur is not None:
        if limit is not None and count >= limit:
            break
        frame = cur.tb_frame
        code = frame.f_code
        line = getattr(cur, 'tb_line', None)
        end_lineno = getattr(cur, 'tb_end_lineno', None)
        colno = getattr(cur, 'tb_colno', None)
        end_colno = getattr(cur, 'tb_end_colno', None)
        if colno is None and end_colno is None:
            pos_lineno, pos_end_lineno, colno, end_colno = _code_positions_at(
                code, getattr(cur, 'tb_lasti', -1))
            if end_lineno is None:
                end_lineno = pos_end_lineno
        f_locals = getattr(frame, 'f_locals', None) if capture_locals else None
        result.append(FrameSummary(
            code.co_filename, cur.tb_lineno, code.co_name,
            lookup_line=lookup_lines, locals=f_locals,
            line=line, end_lineno=end_lineno,
            colno=colno, end_colno=end_colno))
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
        # CPython stores the exception's MESSAGE, not the exception -- ``_str''
        # -- and that is what makes two TracebackExceptions built from two
        # distinct-but-equivalent exceptions compare equal (see __eq__).
        self._str = _safe_string(exc_value, 'exception') if exc_value is not None else ''
        self.__cause__ = None
        self.__context__ = None
        self.__suppress_context__ = False
        # FrameSummary list extracted from the traceback (empty if none).
        # ``limit'' has to reach the extraction: it changes which frames appear,
        # so a TracebackException built with one is not equal to one without.
        #
        # Deliberately extract_tb rather than StackSummary.extract(walk_tb(..)):
        # only extract_tb carries the PEP 657 columns (colno / end_colno) off
        # the traceback, and test_dictcomps / test_setcomps assert on those.
        self._capture_locals = capture_locals
        try:
            self.stack = extract_tb(exc_traceback, limit=limit,
                                    lookup_lines=lookup_lines,
                                    capture_locals=capture_locals)
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

    def _eq_key(self):
        """The fields that shape this TracebackException's output.

        CPython's __eq__ is ``self.__dict__ == other.__dict__``, which works
        there because every field it stores is value-like -- notably ``_str``,
        the exception's MESSAGE, rather than the exception object.  Grail also
        keeps ``_value`` (the live exception) for rendering, and comparing THAT
        would compare by identity, so two equivalent exceptions would never be
        equal.  Enumerate the output-shaping fields instead, which is the same
        rule CPython's __dict__ comparison expresses."""
        return (self.exc_type, self._str, list(self.stack),
                _format_notes(self._value), self._capture_locals,
                self.__cause__, self.__context__, self.__suppress_context__)

    def __eq__(self, other):
        """NotImplemented -- not False -- for a non-TracebackException, so
        Python falls back to the OTHER operand's __eq__.  That is what makes
        ``exc == object()'' false while ``exc == ALWAYS_EQ'' is true; returning
        False would break the second (test_comparison_basic asserts both)."""
        if isinstance(other, TracebackException):
            return self._eq_key() == other._eq_key()
        return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result


__all__ = [
    'format_exception_only', 'format_exception', 'format_exc',
    'print_exception', 'print_exc', 'print_last',
    'extract_tb', 'extract_stack', 'format_tb', 'format_stack',
    'format_list', 'print_list', 'print_stack', 'print_tb',
    'walk_tb', 'walk_stack',
    'TracebackException', 'FrameSummary', 'StackSummary',
]
