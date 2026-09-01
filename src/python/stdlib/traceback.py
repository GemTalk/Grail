# GRAIL minimal traceback - format_exc / print_exc / format_exception
# enough for itsdangerous / Werkzeug / Flask error paths.
#
# Grail's exception objects don't carry a CPython-style traceback
# object, so format_exception falls back to a best-effort one-line
# render.  Most callers in Flask's stack just need to *print
# something* on failure; the exact frame walk isn't load-bearing.

import linecache
import sys

# CPython's internal colour module.  Imported UNCONDITIONALLY, as CPython
# imports it: every emit site interpolates a theme now, and the no-colour theme
# supplies empty strings, so there is no plain-text code path that could survive
# the import being optional.
import _colorize


# Distinguishes "argument not supplied" from an explicit None, so the 3.10+
# one-argument ``format_exception_only(exc)'' can be told apart from the
# legacy two-argument ``format_exception_only(type, value)'' when value is
# genuinely None.  CPython uses a private sentinel for exactly this.
#
# THIS IS A PYTHON-LEVEL SENTINEL, and deliberately NOT Smalltalk's nil.  Grail
# reads nil as "undefined / unbound" and None as an explicit Python value (see
# NoneType.gs), so nil is the natural "I have no argument" marker for a
# Smalltalk caller -- but these are Python entry points following CPython's
# contract, where the marker has to be a value no CALLER can produce, and an
# omitted Python parameter is bound to its default rather than left unbound.
#
# The consequence, measured rather than assumed: a Smalltalk caller that fills
# the optional slots with nil does NOT get the one-argument form.  nil is not
# the sentinel, so it is taken as an explicit value and the type is derived
# from it:
#
#   tb @env1:format_exception: exc _: nil _: nil
#       -> 'UndefinedObject: <UndefinedObject object at 0x101>'
#
# That is out of contract, not a bug to work around here: OMIT the optional
# arguments (``tb @env1:format_exception: exc'') rather than passing nil, which
# answers 'ValueError: v' correctly.  Handling nil would mean teaching the
# Smalltalk -> Python boundary to map it onto each function's default, which is
# a dispatch-wide decision and not traceback.py's to make.
class _Sentinel:
    """CPython's ``traceback._Sentinel``.

    A bare ``object()`` would do for the identity test the two-argument /
    one-argument forms below use it for, and that is what this was.  The
    __repr__ is the point: ``print_exception`` declares ``value=_sentinel``, so
    the sentinel's repr is what ``inspect.signature`` prints as that parameter's
    default -- ``<implicit>``, which is what test_traceback's test_signatures
    asserts and what a reader of ``help(print_exception)`` should see instead of
    an address."""

    def __repr__(self):
        return "<implicit>"


_sentinel = _Sentinel()


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
        rendered = func(value)
    except:
        return '<%s %s() failed>' % (what, 'repr' if func is repr else 'str')
    # The contract is a STRING, not "whatever func returned".  CPython's str()
    # either returns a str or raises, so it cannot hand back anything else; in
    # Grail a class with ``__str__ = None'' yields None from str() rather than
    # raising TypeError, and a None leaking out of here poisons every caller
    # that concatenates the message (test_getattr_suggestions_invalid_args
    # builds exactly that object).  Treat a non-str result as a failed render,
    # which is what it is.
    if not isinstance(rendered, str):
        return '<%s %s() failed>' % (what, 'repr' if func is repr else 'str')
    return rendered


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


# ---------------------------------------------------------------- suggestions
#
# CPython appends "Did you mean: 'x'?" to an AttributeError / NameError /
# ImportError whose misspelled name is close to a real one.  The algorithm is
# Python/suggestions.c, mirrored in CPython's own traceback.py; these constants
# and costs are its, not ours, because the tests assert which candidate WINS
# (test_getattr_suggestions pins substitution over elimination over addition,
# and a case change over any of them).

_MAX_CANDIDATE_ITEMS = 750
_MAX_STRING_SIZE = 40
_MOVE_COST = 2
_CASE_COST = 1


def _substitution_cost(ch_a, ch_b):
    """Cost of turning ch_a into ch_b: free if equal, cheap for a case change,
    full price otherwise.  The cheap case is what makes 'BLuch' beat 'fluch' as
    a suggestion for 'bluch'."""
    if ch_a == ch_b:
        return 0
    if ch_a.lower() == ch_b.lower():
        return _CASE_COST
    return _MOVE_COST


def _levenshtein_distance(a, b, max_cost):
    """Weighted edit distance, giving up as soon as it exceeds max_cost.

    A port of CPython's, including its optimizations, because the early bail is
    not just a speed trick -- callers rely on the ``> max_cost'' answer to mean
    "no suggestion", and a plain distance would suggest wildly unrelated names.
    Keeps one row rather than the full matrix."""
    if a == b:
        return 0

    # Trim the common prefix and suffix: they contribute nothing.
    pre = 0
    while a[pre:] and b[pre:] and a[pre] == b[pre]:
        pre += 1
    a = a[pre:]
    b = b[pre:]
    post = 0
    while a[:post or None] and b[:post or None] and a[post - 1] == b[post - 1]:
        post -= 1
    a = a[:post or None]
    b = b[:post or None]
    if not a or not b:
        return _MOVE_COST * (len(a) + len(b))
    if len(a) > _MAX_STRING_SIZE or len(b) > _MAX_STRING_SIZE:
        return max_cost + 1

    # Prefer the shorter string as the row, and fail fast when the length
    # difference alone already costs too much.
    if len(b) < len(a):
        a, b = b, a
    if (len(b) - len(a)) * _MOVE_COST > max_cost:
        return max_cost + 1

    row = list(range(_MOVE_COST, _MOVE_COST * (len(a) + 1), _MOVE_COST))
    result = 0
    for bindex in range(len(b)):
        bchar = b[bindex]
        distance = result = bindex * _MOVE_COST
        minimum = None
        for index in range(len(a)):
            substitute = distance + _substitution_cost(bchar, a[index])
            distance = row[index]
            insert_delete = min(result, distance) + _MOVE_COST
            result = min(insert_delete, substitute)
            row[index] = result
            if minimum is None or result < minimum:
                minimum = result
        if minimum is not None and minimum > max_cost:
            # Every cell in this row is already too expensive.
            return max_cost + 1
    return result


def _get_safe___dir__(obj):
    """``dir(obj)'' without dir()'s sort, then filtered to strings.

    Upstream's own helper (gh-131001, gh-139933).  ``dir()'' SORTS what __dir__
    returns, so a custom ``__dir__'' that mixes non-strings in with names makes
    dir() itself raise TypeError -- and a suggestion must never raise.  Calling
    ``obj.__dir__()'' directly skips the sort, and the non-strings are dropped
    before sorting here instead.

    The TypeError fallback is for a CLASS receiver: ``Cls.__dir__()'' finds the
    plain function in the class's own MRO and calling it with no argument is
    missing ``self'', so the metaclass __dir__ is reached explicitly.
    """
    try:
        d = obj.__dir__()
    except TypeError:  # when obj is a class
        d = type(obj).__dir__(obj)
    return sorted(x for x in d if isinstance(x, str))


def _raising_frame_self(exc_value):
    """The object whose method was running in the innermost frame at raise time,
    or ``_sentinel`` when that frame declared no receiver.

    CPython reads ``frame.f_locals['self']`` for this.  Grail cannot: a Python
    method's ``self`` is the Smalltalk RECEIVER rather than a frame temporary, and
    by the time a traceback is rendered the stack has unwound.  The receiver is
    snapshotted at raise time instead, under the name the source declared for it
    -- see BaseException>>___captureFrameLocalsIfSuggestible___ -- so asking
    whether ``self`` is among those names is the same question CPython asks of
    f_locals, and it answers no for a module-level function, whose frame has a
    Smalltalk receiver but no declared name for one.

    ``_sentinel`` rather than None as the no-answer, because None is itself a
    perfectly good receiver and callers compare the result by identity.
    """
    names = getattr(exc_value, '___frameLocalNames___', None)
    if not names:
        return _sentinel
    try:
        if 'self' not in list(names):
            return _sentinel
    except Exception:
        return _sentinel
    return getattr(exc_value, '___frameSelf___', _sentinel)


def _candidates_for(exc_value, tb, wrong_name):
    """The names a suggestion may be drawn from, or None when there are none to
    be had.  Which names depends on the exception:

    AttributeError -> _get_safe___dir__(obj), which is why Grail's object.__dir__
    had to learn about class attributes and instance attributes first (it
    reported neither for an instance, so every candidate list was empty).

    NameError -> the frame's locals, globals and builtins.  The locals come off
    the exception rather than the frame (see below); f_globals the frame derives
    for itself.

    ImportError -> the module's dir().
    """
    if isinstance(exc_value, AttributeError):
        obj = getattr(exc_value, 'obj', _sentinel)
        if obj is _sentinel:
            return None
        try:
            d = _get_safe___dir__(obj)
        except Exception:
            return None
        # An underscored candidate is only offered for an underscored typo --
        # UNLESS the failing access came from inside the object's own method, in
        # which case CPython stops hiding them: code in the class is entitled to
        # be reminded of the class's own private names.  CPython's test is that
        # the raising frame's ``self'' IS the object, by identity, and that is
        # reproduced here from the raise-time snapshot rather than from the frame
        # -- see _raising_frame_self.
        if wrong_name[:1] != '_' and _raising_frame_self(exc_value) is not obj:
            d = [x for x in d if x[:1] != '_']
        return d
    if isinstance(exc_value, ImportError):
        try:
            mod = __import__(exc_value.name)
            d = _get_safe___dir__(mod)
        except Exception:
            return None
        if wrong_name[:1] != '_':
            d = [x for x in d if x[:1] != '_']
        return d
    if isinstance(exc_value, NameError):
        d = []
        frame = _last_frame_of(tb)
        # No frame means no candidates AT ALL, including builtins.  CPython gates
        # the whole NameError branch on having one, so
        # ``format_exception_only(exc)'' -- which passes no traceback -- offers no
        # suggestion even for a misspelled builtin.  Grail must not be more
        # helpful than CPython here: the tests that assert a suggestion use
        # format_exc(), which carries the traceback.
        if frame is None:
            return None
        # LOCALS COME OFF THE EXCEPTION, NOT THE FRAME.  A Python function's
        # locals are Smalltalk method temporaries, and by the time a traceback is
        # rendered the stack has unwound: the VM's capture records only
        # (method, ip, receiver), so the frame object cannot answer f_locals no
        # matter how it is asked.  They are snapshotted at RAISE time instead,
        # for the three exception types that can carry a suggestion -- see
        # BaseException>>___captureFrameLocalsIfSuggestible___.
        snapshot = getattr(exc_value, '___frameLocalNames___', None)
        if snapshot:
            try:
                d.extend(list(snapshot))
            except Exception:
                pass
        if frame is not None:
            # f_globals IS derivable after the fact, from the frame's
            # co_filename (PyFrame>>f_globals), so it stays on the frame.
            for attr in ('f_locals', 'f_globals'):
                ns = getattr(frame, attr, None)
                if ns:
                    try:
                        d.extend(list(ns))
                    except Exception:
                        pass
        # CPython reads frame.f_builtins, a real dict.  Grail's builtins are
        # methods on the builtins class rather than dict entries, so there is no
        # such mapping to read; dir() of the builtins module lists exactly the
        # names a bare-name read can resolve, which is what a candidate list
        # needs.  Guarded: a suggestion is a courtesy and must never raise.
        try:
            import builtins as _builtins
            d.extend(dir(_builtins))
        except Exception:
            pass
        return [x for x in d if isinstance(x, str)] or None
    return None


def _last_frame_of(tb):
    """The innermost frame of a traceback, or None."""
    if tb is None:
        return None
    try:
        while getattr(tb, 'tb_next', None) is not None:
            tb = tb.tb_next
        return getattr(tb, 'tb_frame', None)
    except Exception:
        return None


def _compute_suggestion_error(exc_value, tb, wrong_name):
    """The closest real name to ``wrong_name'', or None.

    The thresholds are CPython's: no more than a third of the characters
    involved may need changing, and a candidate is only taken if it beats every
    one seen so far -- so ties go to the FIRST in sorted order, which is what
    makes the expectations in test_getattr_suggestions deterministic."""
    if wrong_name is None or not isinstance(wrong_name, str):
        return None
    d = _candidates_for(exc_value, tb, wrong_name)
    if not d:
        return None
    if len(d) > _MAX_CANDIDATE_ITEMS:
        return None
    # Before measuring any distance, CPython asks whether an undefined bare name
    # is an attribute of the instance whose method is running: inside a method,
    # ``self.blech`` is a better answer than the nearest-looking local.  Kept in
    # CPython's position -- after the candidate-count bail-out, before the search
    # -- so a frame with too many names declines here too.
    #
    # hasattr is guarded because it RUNS USER CODE: a __getattr__ that raises
    # anything other than AttributeError would otherwise escape from the
    # formatting of an unrelated exception (gh-132385, and test_traceback's
    # test_unbound_local_error_with_side_effect pins it).
    if isinstance(exc_value, NameError):
        instance = _raising_frame_self(exc_value)
        if instance is not _sentinel:
            try:
                has_wrong_name = hasattr(instance, wrong_name)
            except Exception:
                has_wrong_name = False
            if has_wrong_name:
                return 'self.' + wrong_name
    wrong_name_len = len(wrong_name)
    if wrong_name_len > _MAX_STRING_SIZE:
        return None
    best_distance = wrong_name_len
    suggestion = None
    for possible_name in d:
        if possible_name == wrong_name:
            continue
        max_distance = (len(possible_name) + wrong_name_len + 3) * _MOVE_COST // 6
        max_distance = min(max_distance, best_distance - 1)
        current_distance = _levenshtein_distance(
            possible_name, wrong_name, max_distance)
        if current_distance > max_distance:
            continue
        if not suggestion or current_distance < best_distance:
            suggestion = possible_name
            best_distance = current_distance
    return suggestion


def _suggestion_suffix(exc_type, value, tb=None):
    """What CPython appends to the message line, or ''.

    Two separate additions, and a NameError can get both: the closest name, and
    -- when the undefined name is a stdlib module -- a reminder to import it."""
    if value is None or exc_type is None:
        return ''
    try:
        if not issubclass(exc_type, (NameError, AttributeError, ImportError)):
            return ''
    except TypeError:
        return ''
    try:
        if issubclass(exc_type, ImportError):
            wrong_name = getattr(value, 'name_from', None)
        else:
            wrong_name = getattr(value, 'name', None)
        if wrong_name is None or not isinstance(wrong_name, str):
            return ''
        suffix = ''
        suggestion = _compute_suggestion_error(value, tb, wrong_name)
        if suggestion:
            suffix = ". Did you mean: '" + suggestion + "'?"
        if issubclass(exc_type, NameError):
            if wrong_name in getattr(sys, 'stdlib_module_names', ()):
                if suggestion:
                    suffix += " Or did you forget to import '" + wrong_name + "'?"
                else:
                    suffix = ". Did you forget to import '" + wrong_name + "'?"
        return suffix
    except Exception:
        # A suggestion is a courtesy; failing to compute one must never replace
        # the error the user actually needs to see.
        return ''


# ``_tb'' below is private and carries a traceback the CALLER already holds, for
# the NameError suggestion (whose candidates come from the frame).  CPython
# computes that suggestion in TracebackException.__init__, where the traceback is
# in hand; this function has no public traceback parameter there either, and must
# NOT go looking for one on the exception.  ``format_exception_only(exc)'' offers
# no suggestion in CPython even for a misspelled builtin, so reading
# exc.__traceback__ here would make Grail MORE helpful than CPython -- a
# conformance bug, and one an earlier draft actually had.
# tests/python/frame_globals.py pins it.
def format_exception_only(exc, /, value=_sentinel, *, show_group=False,
                          **kwargs):
    """Return a list of strings ending in a newline that render the
    exception class + message.

    CPython's EXACT public signature, which is asserted by
    test_traceback's TracebackCases.test_signatures.  The three private
    parameters this used to carry in the same list -- ``_tb`` / ``_depth`` /
    ``_keep_type``, all of them internal threading described on
    ``_format_exception_only`` below -- showed up in that signature and in
    help(), so they now live on the private worker and this is a thin
    forwarder.  ``show_group`` is keyword-only here for the same reason: CPython
    declares it after ``*``."""
    return _format_exception_only(exc, value, show_group=show_group, **kwargs)


def _format_exception_only(exc, value=_sentinel, show_group=False,
                           _tb=None, _depth=0, _keep_type=False, **kwargs):
    """The implementation behind format_exception_only, plus the private
    threading its recursive and TracebackException callers need.

    The first parameter is named ``exc'' and is POSITIONAL-ONLY, as CPython
    3.10+ has it.  Grail called it ``exc_type'', which made ``exc=e'' a
    TypeError about an unexpected KEYWORD argument where CPython reports a
    missing REQUIRED POSITIONAL one -- test_format_exception_exc asserts the
    latter.  Rebound to ``exc_type'' immediately below so the legacy
    ``(type, value, tb)'' logic in the body reads as it did.

    Accepts both the legacy ``(type, value)'' shape and the 3.10+
    single-argument ``(exc)'' shape -- ``value'' defaulting to a sentinel
    rather than None is what makes the two distinguishable.

    ``show_group=True'' (3.11+) additionally renders an ExceptionGroup's
    nested exceptions, indented, after the group's own line.

    ``_depth'' is that nesting level, and it is private for the same reason
    CPython's is: callers pass ``show_group'', never a depth.  It has to be
    THREADED through the recursion rather than each level prefixing the level
    below, because it decides two things that only the absolute depth can
    answer -- the indent is ``3 * _depth'' spaces, and a multi-line MESSAGE is
    split into one string per line only when nested.  At depth 0 CPython yields
    the message whole, embedded newlines and all.
    test_format_exception_group_multiline_messages asserts both halves at once:
    the group's own ``A\\n1'' stays one string while the nested ``B\\n2'' becomes
    two, each carrying the indent."""

    exc_type = exc
    if value is _sentinel:
        # Single-argument form: exc_type IS the exception.  type(None) is
        # NoneType, not None -- CPython does not special-case a None
        # exception, which is exactly why ``print_exception(None)'' renders
        # ``NoneType: None'' rather than a blank line.
        value = exc_type
        exc_type = type(value)
    elif not _keep_type:
        # Legacy two-argument form.  CPython IGNORES the type it was handed and
        # derives it from the value (see _unpack_exc_args), so
        # ``format_exception_only(ValueError, None)'' is 'NoneType: None'.
        #
        # This used to keep exc_type and carry a ``derived'' flag, reading
        # "value is None and not derived" as "no message at all" -- which
        # rendered a bare 'ValueError' and matched neither CPython path.
        exc_type = type(value)
    # ...and _keep_type is the TracebackException path, which KEEPS the type it
    # was constructed with: the class renders 'ValueError: None' where the
    # module-level function renders 'NoneType: None'.  Same arguments, two
    # different answers, and both are CPython.

    theme = _traceback_theme(kwargs.get('colorize', False))
    type_name = _type_display_name(exc_type)
    # NOT ``indent'': the SyntaxError branch below already binds that name to a
    # WIDTH (how much whitespace strip() removed from the source line), and the
    # two collided -- every SyntaxError whose text was indented then rendered as
    # ``int + str'' (test_syntax_error_various_offsets, add=2).
    nesting_indent = 3 * _depth * ' '
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
            # ``or'', not ``is not None'': CPython writes ``self.filename or
            # "<string>"'', so an EMPTY filename also falls back.  Grail printed
            # ``File ""'' for SyntaxError('msg', ('', 0, 5, 'hello')) -- the shape
            # test_syntax_error_offset_at_eol builds.
            header.append('  File %s"%s"%s, line %s%s%s\n'
                          % (theme.filename,
                             filename if filename else '<string>', theme.reset,
                             theme.line_no, lineno, theme.reset))
            # SyntaxError's location fields are a plain writable tuple, so any of
            # them can be any object -- ``SyntaxError('error', 'abcd')'' gives
            # lineno='b', offset='c', text='d' (gh-128894).  CPython's rules,
            # measured rather than guessed:
            #
            #   text not a str           -> no source block at all
            #   offset None              -> source line, no caret
            #   offset an int            -> source line + caret
            #   offset present, not int  -> no source block at all
            #
            # The last is the surprising one: an unusable offset suppresses the
            # source LINE too, not just the caret.  ``lineno'' needs no check --
            # it is only ever printed, and ``line b'' is what CPython shows.
            # NOT text.strip(): CPython removes the trailing NEWLINE only, then
            # leading blanks.  strip() also ate trailing spaces, which shortens
            # the line the caret RANGE below is measured against.
            if isinstance(text, str):
                rtext = text.rstrip('\n')
                ltext = rtext.lstrip(' \n\f')
                spaces = len(rtext) - len(ltext)
                if offset is None:
                    header.append('    ' + ltext + '\n')
                elif isinstance(offset, int):
                    # A CARET RANGE, not a single caret.  This is where Grail
                    # differed: it always emitted one '^'.  CPython underlines
                    # from the offset to the END of the line whenever the error
                    # does not end on the line it started on -- and a SyntaxError
                    # built from the usual 4-tuple has end_lineno None, so
                    # ``lineno == end_lineno'' is False and the to-end-of-line
                    # branch is the ORDINARY case, not an exotic one.  That is
                    # the part worth stating: it looks like a rare fallback and
                    # it is what nearly every hand-built SyntaxError takes.
                    end_lineno = _safe_attr(value, 'end_lineno')
                    end_offset = _safe_attr(value, 'end_offset')
                    off = offset
                    if lineno == end_lineno:
                        end_off = end_offset \
                            if (isinstance(end_offset, int) and end_offset != 0) \
                            else off
                    else:
                        end_off = len(rtext) + 1
                    # Clamp against the RAW text, report against rtext.
                    if text and off > len(text):
                        off = len(rtext) + 1
                    if text and end_off > len(text):
                        end_off = len(rtext) + 1
                    if off >= end_off or end_off < 0:
                        end_off = off + 1
                    colno = off - 1 - spaces
                    end_colno = end_off - 1 - spaces
                    if colno >= 0:
                        # Non-space whitespace is KEPT rather than blanked, so
                        # carets stay aligned under a tab-indented line.
                        pad = ''.join([c if c.isspace() else ' '
                                       for c in ltext[:colno]])
                        caret_row = pad + '^' * (end_colno - colno)
                        src_row = ltext
                        # The same pairing the frame renderer uses: a SyntaxError
                        # has no anchors, so the whole underlined span is the
                        # highlight and there is no ``~'' range.
                        if kwargs.get('colorize', False):
                            src_row, caret_row = _colorize_caret_row(
                                src_row, caret_row, theme)
                        header.append('    ' + src_row + '\n')
                        header.append('    ' + caret_row + '\n')
                    else:
                        header.append('    ' + ltext + '\n')
                # An offset that is present but not an int suppresses the source
                # LINE too, not just the caret -- CPython's if/elif has no else.
                # Preserved deliberately; it looks like an omission.
        elif filename is not None:
            msg = msg + ' (' + str(filename) + ')'
        coloured_type = theme.type + type_name + theme.reset
        lines = header + [coloured_type + ': '
                          + theme.message + msg + theme.reset + '\n'] if msg \
            else header + [coloured_type + '\n']
        lines = lines + _format_notes(value)
        # A nested SyntaxError is indented but NOT split: CPython prefixes each
        # already-separate line of the location block and leaves a multi-line
        # ``msg'' alone, so the location lines end up at indent+2 and indent+4
        # (test_format_exception_group_syntax_error's 5 and 7 spaces).
        if nesting_indent:
            lines = [nesting_indent + line for line in lines]
        return lines

    # The value ALWAYS contributes a message, ``None'' included -- which is what
    # makes print_exception(None) render ``NoneType: None'', and what makes the
    # class path render ``ValueError: None''.  There is no longer a case that
    # suppresses it: the old "legacy caller passed a type and an explicit None"
    # branch produced a bare name that no CPython path produces.
    msg = _safe_string(value, 'exception')
    # "Did you mean: 'x'?" rides on the message line.  CPython computes it once
    # in TracebackException.__init__ and stores it in _str; doing it here instead
    # covers BOTH entry points -- the module-level function and
    # TracebackException.format_exception_only, which delegates to it -- without
    # the suggestion having to be threaded through construction.
    # Appended even when the message is EMPTY: ``raise AttributeError()'' has no
    # message, and CPython still renders "AttributeError: . Did you mean: 'x'?"
    # -- the colon form is chosen from the COMBINED string, not from the message
    # alone (test_getattr_suggestions_no_args).
    msg = msg + _suggestion_suffix(exc_type, value, _tb)
    # Coloured HERE and not at the newline, so that the nested-group branch
    # below still splits on the message's own newlines: the escape sequences sit
    # inside the pieces rather than around them.
    final = (theme.type + type_name + theme.reset + ': '
             + theme.message + msg + theme.reset) if msg \
        else theme.type + type_name + theme.reset
    if _depth > 0:
        # Nested: one string per line, so a multi-line message carries the
        # indent on every line of it rather than only the first.
        lines = [nesting_indent + piece + '\n' for piece in final.split('\n')]
    else:
        lines = [final + '\n']

    # PEP 678 notes go directly under the exception's own line, and ABOVE an
    # ExceptionGroup's nested exceptions -- the notes belong to the group.
    # _format_notes has already split a multi-line note into one string per
    # line, so indenting is a straight prefix.
    notes = _format_notes(value)
    if nesting_indent:
        notes = [nesting_indent + line for line in notes]
    lines.extend(notes)

    # An ExceptionGroup renders its nested exceptions under the group line,
    # indented, when the caller asks for them.
    if show_group:
        for sub in getattr(value, 'exceptions', None) or ():
            lines.extend(_format_exception_only(sub, show_group=True,
                                                _depth=_depth + 1))
    return lines


def _require_exception(value):
    """CPython's guard for the single-argument form: ``print_exception(42)'' is a
    TypeError, not a render of ``int: 42''.

    Only the ONE-argument form is checked.  The legacy three-argument form is left
    alone deliberately -- CPython 3.14 fails it too, but with whatever the value
    happens to raise (``print_exception(ValueError, 'x', None)'' answers
    AttributeError on __suppress_context__), and tightening it here would break
    Grail callers that pass a type and a message.  None stays legal, which is what
    makes ``print_exception(None)'' render ``NoneType: None''."""
    if value is None:
        return
    try:
        ok = isinstance(value, BaseException)
    except Exception:
        ok = False
    if not ok:
        raise TypeError('Exception expected for value, %s found'
                        % (type(value).__name__,))


def _unpack_exc_args(exc_type, value, tb):
    """Resolve the (type, value, tb) triple from either legacy
    3-arg ``format_exception(type, value, tb)'' or the 3.10+ single-
    exception ``format_exception(exc)'' form.  Returns the triple
    with None-safe defaults.

    Grail exceptions now carry a real ``__traceback__'' (a PyTraceback
    or None), so the single-arg form auto-pulls it when the caller did
    not pass one — matching CPython's ``format_exception(exc)''."""
    # The two shapes are told apart by whether value/tb were passed AT ALL,
    # which is why their defaults are a SENTINEL and not None.  They used to
    # default to None and be told apart by ``value is None and tb is None'',
    # and that cannot distinguish ``format_exception(exc)'' from an explicit
    # ``format_exception(ValueError, None, None)'' -- so the latter took the
    # single-argument path and raised TypeError out of _require_exception,
    # where CPython renders 'NoneType: None'.
    if (value is _sentinel) != (tb is _sentinel):
        raise ValueError('Both or neither of value and tb must be given')
    if value is _sentinel:
        # Single-argument form: exc_type IS the exception (or None).
        _require_exception(exc_type)
        if isinstance(exc_type, BaseException):
            return (type(exc_type), exc_type,
                    getattr(exc_type, '__traceback__', None))
        # None is the one non-exception CPython accepts, and type(None) is
        # NoneType -- which is what makes print_exception(None) render
        # ``NoneType: None'' rather than a blank line.
        return type(None), None, None
    # Legacy triple.  THE TYPE PASSED IS IGNORED: CPython derives it from the
    # value, because the value is the only argument that can carry a message.
    # So format_exception(ValueError, None, None) is 'NoneType: None'.
    #
    # The CLASS deliberately does NOT do this -- TracebackException keeps the
    # type it is constructed with and renders 'ValueError: None' for the same
    # arguments.  Only the module-level entry points normalise.
    return type(value), value, tb


def _seen_set():
    """A fresh cycle guard: a set of ``id()`` values, which is CPython's own
    representation for this (``_seen`` in TracebackException).

    Deliberately ids rather than the exceptions themselves.  A set of the
    OBJECTS would consult __hash__ / __eq__, and an exception may define either
    (test_unhashable builds one with no __hash__ at all); a LIST scanned by
    identity avoids that too but costs O(n) per link, so guarding an n-link
    chain is O(n^2).  Chains get long enough for that to show: a runaway
    recursion contributes one link per frame, and rendering a 20 000-link chain
    took 33.2s with the list scan against 11.8s with this set."""
    return set()


_cause_message = (
    "\nThe above exception was the direct cause of the following exception:\n\n")

_context_message = (
    "\nDuring handling of the above exception, another exception occurred:\n\n")


def _chain_of(exc):
    """CPython's chain as a list of ``(connector, exception)`` pairs, in the
    order they are rendered -- deepest first, each connector introducing the
    exception it precedes.

    The rule per link is CPython's: an explicit __cause__ wins and prints "the
    direct cause of"; otherwise __context__ prints "During handling of", unless
    __suppress_context__, which ``raise X from ...`` sets either way (including
    ``from None``).

    Iterative, and guarded by IDENTITY against a chain that loops back on
    itself -- re-raising the exception being handled can produce one, and a
    recursive walk would hang or exhaust the stack.
    """
    links = []
    seen = _seen_set()
    while exc is not None:
        key = id(exc)
        if key in seen:
            break
        seen.add(key)
        cause = getattr(exc, '__cause__', None)
        context = getattr(exc, '__context__', None)
        suppress = getattr(exc, '__suppress_context__', False)
        if cause is not None:
            nxt, msg = cause, _cause_message
        elif context is not None and not suppress:
            nxt, msg = context, _context_message
        else:
            nxt, msg = None, None
        # msg introduces THIS exception, so it belongs with it once reversed.
        links.append((msg, exc))
        exc = nxt
    # The DEEPEST exception introduces nothing: when the walk stopped on a cycle
    # its link still carries the connector it would have used for the link we
    # refused to follow, which rendered a stray "direct cause of" ahead of the
    # first block (test_cause_recursive: 5 blocks where CPython has 3).
    if links:
        links[-1] = (None, links[-1][1])
    links.reverse()
    return links


def _is_exception_group(value):
    """Whether ``value'' is a PEP 654 group, i.e. renders as a tree.

    ``isinstance(value, BaseExceptionGroup)'' rather than a duck-typed
    ``hasattr(value, 'exceptions')'': CPython gates on the type, and an
    ordinary exception is free to carry an attribute of that name."""
    try:
        return isinstance(value, BaseExceptionGroup)
    except Exception:
        return False


def _chain_has_group(value):
    """Whether a group appears anywhere in ``value''s cause/context chain.

    Guarded by identity like _chain_of, for the same reason: re-raising the
    exception being handled can close the chain into a cycle."""
    seen = _seen_set()
    while value is not None:
        key = id(value)
        if key in seen:
            return False
        seen.add(key)
        if _is_exception_group(value):
            return True
        cause = getattr(value, '__cause__', None)
        if cause is not None:
            value = cause
            continue
        context = getattr(value, '__context__', None)
        if context is not None and not getattr(
                value, '__suppress_context__', False):
            value = context
            continue
        return False
    return False


def format_exception(exc, /, value=_sentinel, tb=_sentinel, limit=None,
                     chain=True, **kwargs):
    """Return a list of strings ready to be joined.  Accepts either
    the legacy 3-arg ``(type, value, tb)'' shape or the 3.10+
    single-argument ``(exc)'' shape.

    ``exc'' is POSITIONAL-ONLY and so named to match CPython 3.10+; see
    format_exception_only for why the name is load-bearing.

    ``**kwargs'' is load-bearing too, and not merely for the signature to
    match.  It changes the ERROR for ``format_exception(exc=e)'': with it, the
    keyword lands in kwargs and Python then reports the POSITIONAL parameter as
    missing (``missing 1 required positional argument''), which is what
    test_format_exception_exc asserts.  Without it the call fails earlier and
    differently (``got some positional-only arguments passed as keyword
    arguments''), so positional-only alone was not enough.  CPython carries
    ``colorize'' through here; Grail does not colorize yet, so the value is
    accepted and ignored rather than rejected.

    The ``Traceback (most recent call last):'' header is emitted only when
    there are FRAMES to introduce, which is CPython's rule (its
    TracebackException.format does ``if exc.stack:'' before yielding it).
    This used to emit it unconditionally, so ``format_exception(Exception,
    Exception('x'), None)'' produced a header labelling nothing --
    test_traceback's test_print_exception and the format_exc comparisons
    assert on exactly that."""

    exc_type = exc

    exc_type, value, tb = _unpack_exc_args(exc_type, value, tb)
    # PEP 654 tree rendering lives in TracebackException.format, because the
    # margin it draws (``  | '' / ``+-+---- 1 ----'') is carried in a context
    # object threaded through the WHOLE chain -- the sub-exceptions of a group
    # are indented relative to the group that contains them, across links.  This
    # function's link-by-link walk has nowhere to keep that, so hand a group
    # over rather than reproduce it.
    #
    # CPython routes every exception through TracebackException; Grail does so
    # only for groups on purpose.  Moving wholesale would re-route the rendering
    # of every exception in the language to gain the groups, and this function's
    # own walk is what the rest of the suite currently measures.
    if value is not None and _chain_has_group(value):
        return list(TracebackException(exc_type, value, tb,
                                       limit=limit).format(chain=chain))
    if chain and value is not None:
        links = _chain_of(value)
        if len(links) > 1:
            lines = []
            for connector, exc in links:
                if connector is not None:
                    lines.append(connector)
                lines.extend(format_exception(
                    type(exc), exc, getattr(exc, '__traceback__', None),
                    limit=limit, chain=False))
            return lines
    frames = []
    if tb is not None:
        try:
            # A real traceback object (PyTraceback linked list).
            frames.extend(format_tb(tb, limit))
        except Exception:
            # Legacy callers sometimes pass a plain list of frame entries.
            # format_list is the renderer for that shape (FrameSummary objects
            # or 4-tuples); it used to be str() here, which stopped rendering a
            # frame at all once FrameSummary lost its fabricated __str__.
            try:
                frames.extend(format_list(tb))
            except Exception:
                pass
    lines = []
    if frames:
        lines.append('Traceback (most recent call last):\n')
        lines.extend(frames)
    lines.extend(_format_exception_only(exc_type, value, _tb=tb))
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


def print_exception(exc, /, value=_sentinel, tb=_sentinel, limit=None,
                    file=None, chain=True, **kwargs):
    """Print exception lines to ``file'' (default sys.stderr).
    Accepts either the legacy 3-arg form or the 3.10+ single-
    exception form.

    ``exc'' is POSITIONAL-ONLY and so named to match CPython 3.10+; see
    format_exception_only."""
    exc_type = exc
    if file is None:
        file = sys.stderr
    for line in format_exception(exc_type, value, tb, limit):
        file.write(line)


def print_last(limit=None, file=None, chain=True):
    """CPython's ``print_last(...)'': render the exception the interactive
    interpreter recorded, from ``sys.last_exc'' (3.12+) or the legacy
    ``sys.last_type'' / ``last_value'' / ``last_traceback'' triple.

    Raises ValueError when neither is set, which is CPython's answer for "there
    is no last exception" -- callers distinguish that from an empty render.

    ``limit'' is honoured; ``chain'' is accepted and not yet acted on (it needs
    __cause__/__context__ rendering)."""
    have_exc = hasattr(sys, 'last_exc')
    if not have_exc and not hasattr(sys, 'last_type'):
        raise ValueError('no last exception')
    if have_exc:
        print_exception(sys.last_exc, limit=limit, file=file)
    else:
        print_exception(sys.last_type, sys.last_value,
                        getattr(sys, 'last_traceback', None),
                        limit=limit, file=file)


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


# ---------------------------------------------------------------- PEP 657
# Caret anchors, WITHOUT ast.
#
# CPython's _extract_caret_anchors_from_line_segment parses the segment and
# reads col_offset off the node.  Grail's ast'' is a stub -- parse() returns
# a wrapper and there is no col_offset to read -- and section 9.33 recorded
# that as the blocker gating every caret test.
#
# It is not a blocker.  For the restricted grammar of "a valid Python
# expression segment" the anchor can be found by SCANNING: track bracket depth
# and string literals, then either take the trailing call/subscript bracket or
# the loosest-binding depth-0 binary operator.  Verified against CPython's own
# ast-based extractor over EVERY BinOp/Subscript/Call node in the 3.14.6
# stdlib -- 36641 segments, 100% agreement -- plus a hand-written corpus of 82
# covering the shapes the sweep does not reach (bytes literals, float
# exponents, walrus, parenthesised tuples, strings containing brackets).
#
# The quirks below are CPython's, not conveniences: it never tokenizes the
# operator, it extends the span by exactly one character under conditions that
# depend on how ast reports the RIGHT operand's start, and it sees through
# redundant parentheses.  Each was found by the corpus, not by reading.


class _Anchors:
    """The ^ region inside a caret line; everything else renders ~."""

    def __init__(self, left_end_lineno, left_end_offset,
                 right_start_lineno, right_start_offset):
        self.left_end_lineno = left_end_lineno
        self.left_end_offset = left_end_offset
        self.right_start_lineno = right_start_lineno
        self.right_start_offset = right_start_offset


_CLOSERS = {')': '(', ']': '[', '}': '{'}
_OPENERS = {'(': ')', '[': ']', '{': '}'}

# Binary operators, longest first so '**' beats '*' and '//' beats '/'.
_BINOPS = ['**', '//', '<<', '>>', '@', '+', '-', '*', '/', '%', '|', '^', '&']


def _scan(segment):
    """Yield (index, char, depth, in_string) over a single-line segment."""
    depth = 0
    i = 0
    n = len(segment)
    out = []
    while i < n:
        ch = segment[i]
        if ch in ('"', "'"):
            quote = ch
            j = i + 1
            if segment[i:i + 3] in ('"""', "'''"):
                quote = segment[i:i + 3]
                j = i + 3
            while j < n:
                if segment[j] == '\\':
                    j += 2
                    continue
                if segment.startswith(quote, j):
                    j += len(quote)
                    break
                j += 1
            for k in range(i, min(j, n)):
                out.append((k, segment[k], depth, True))
            i = j
            continue
        if ch in _OPENERS:
            out.append((i, ch, depth, False))
            depth += 1
        elif ch in _CLOSERS:
            depth -= 1
            out.append((i, ch, depth, False))
        else:
            out.append((i, ch, depth, False))
        i += 1
    return out


def _matching_open(toks, close_idx):
    """Index of the opener matching the closer at position close_idx."""
    target = None
    for (i, ch, depth, s) in toks:
        if i == close_idx:
            target = depth
            break
    if target is None:
        return None
    for (i, ch, depth, s) in reversed(toks):
        if i < close_idx and not s and ch in _OPENERS and depth == target:
            return i
    return None


def _is_trailer_open(segment, open_idx):
    """True when the bracket at open_idx is a CALL/SUBSCRIPT trailer -- i.e. it
    follows a primary expression rather than starting a literal/grouping."""
    j = open_idx - 1
    while j >= 0 and segment[j].isspace():
        j -= 1
    if j < 0:
        return False
    ch = segment[j]
    # A closing QUOTE counts: ``b'z'[0]`` subscripts a bytes literal, and a
    # string literal is as much a primary expression as a name is.
    return (ch.isalnum() or ch == '_' or ch in ')]}\'"' or ord(ch) > 127)


def _extract_anchor_offsets(segment):
    """(left_end_offset, right_start_offset) or None -- single-line only."""
    if '\n' in segment:
        return None
    seg = segment.rstrip()
    if not seg:
        return None

    # Redundant enclosing parentheses: ``ast`` sees through them, so
    # ``((a + b))`` roots at the BinOp and ``(f(x))`` at the Call.  Strip only
    # when the leading '(' MATCHES the final character -- ``(a, b)[0]`` must
    # keep its parens, since there the '(' closes before the end.  The offset
    # is tracked because anchors are reported against the ORIGINAL segment.
    base = 0
    while len(seg) > 1 and seg[0] == '(' and seg[-1] == ')':
        toks = _scan(seg)
        if _matching_open(toks, len(seg) - 1) != 0:
            break
        seg = seg[1:-1].rstrip()
        base += 1
    if not seg:
        return None
    if base:
        inner = _extract_anchor_offsets(seg)
        return None if inner is None else (inner[0] + base, inner[1] + base)

    toks = _scan(seg)

    # A trailing ')' or ']' whose opener is a trailer => Call / Subscript.
    if seg[-1] in (')', ']'):
        close_idx = len(seg) - 1
        # the closer must balance the whole segment
        open_idx = _matching_open(toks, close_idx)
        if open_idx is not None and _is_trailer_open(seg, open_idx):
            # Only if nothing at depth 0 follows the close (it is the last char)
            # and no depth-0 binary operator sits outside the brackets.
            if not _depth0_binop(toks, seg, stop=open_idx):
                return (open_idx, len(segment))

    op = _depth0_binop(toks, seg)
    if op is not None:
        return op
    return None


def _depth0_binop(toks, seg, stop=None):
    """The LAST lowest-precedence binary operator at depth 0, as CPython's ast
    would anchor it: a left-associative tree puts the final operator at the
    root.  Returns (start, end) of the operator token."""
    best = None
    best_rank = None
    limit = len(seg) if stop is None else stop
    i = 0
    n = limit
    while i < n:
        found = None
        for (idx, ch, depth, in_str) in toks:
            if idx == i:
                found = (ch, depth, in_str)
                break
        if found is None:
            i += 1
            continue
        ch, depth, in_str = found
        if in_str or depth != 0:
            i += 1
            continue
        for opstr in _BINOPS:
            if seg.startswith(opstr, i):
                # unary +/- : preceded by nothing or by another operator
                if opstr in '+-' and i >= 2 and seg[i - 1] in 'eE' \
                        and (seg[i - 2].isdigit() or seg[i - 2] == '.'):
                    break
                j = i - 1
                while j >= 0 and seg[j].isspace():
                    j -= 1
                if j < 0 or (not (seg[j].isalnum() or seg[j] == '_' or seg[j] in ')]}"\'.')):
                    break
                rank = _PRECEDENCE[opstr]
                # The ROOT of the expression tree is the LOOSEST-binding
                # operator; among equals the last one, since these are all
                # left-associative.  (** is right-associative, so an earlier
                # one wins -- handled by the strict < for that rank.)
                if best_rank is None or rank < best_rank or (
                        rank == best_rank and opstr != '**'):
                    best_rank = rank
                    best = (i, i + _op_span(seg, i))
                i += len(opstr) - 1
                break
        i += 1
    return best


# Lower number binds LOOSER, so the root of the tree is the loosest operator.
_PRECEDENCE = {
    '|': 0, '^': 1, '&': 2, '<<': 3, '>>': 3,
    '+': 4, '-': 4,
    '*': 5, '@': 5, '/': 5, '//': 5, '%': 5,
    '**': 6,
}


def _op_span(seg, start):
    """Length CPython reports for the operator at `start`.

    Not the operator's own length: CPython never tokenizes it.  It takes the
    FIRST operator character and extends by one iff the next character is
    non-space and still sits BEFORE the right operand begins.  That covers the
    two-character operators (``//``, ``**``, ``<<``, ``>>``) and, less
    obviously, a parenthesised right operand -- ``x*(a + b)`` anchors ``*(``,
    because ast reports the right operand at the paren's INSIDE.  A unary sign
    (``a*-b``) is part of the right operand, so it does not extend.

    Measured against CPython over 13782 real stdlib segments."""
    nxt = start + 1
    if nxt >= len(seg):
        return 1
    ch = seg[nxt]
    if ch in '*/<>':
        return 2
    if ch == '(':
        # Only when the parenthesised group IS the whole right operand.  In
        # ``p0+(e1*x+e0*y)/screen.xscale`` the right operand is the DIVISION,
        # which ast reports as starting AT the paren -- so there is nothing
        # between the operator and the operand and no extension happens.
        toks = _scan(seg)
        depth = None
        for (i, c, d, in_str) in toks:
            if i == nxt and not in_str:
                depth = d
                break
        if depth is None:
            return 1
        for (i, c, d, in_str) in toks:
            if i > nxt and not in_str and c == ')' and d == depth:
                if i != len(seg) - 1:
                    return 1
                inner = seg[nxt + 1:i]
                if _has_top_level_comma_or_for(inner):
                    return 1
                return 2
    return 1


def _has_top_level_comma_or_for(inner):
    """True when a parenthesised group is a TUPLE or a generator expression.

    ast keeps the parentheses for those -- the node's col_offset is the paren
    itself -- so there is no gap between the operator and the operand and
    CPython reports a one-character operator.  ``"%s"%(a, b)`` anchors just the
    ``%``, while ``x*(a + b)`` anchors ``*(``."""
    for (i, ch, depth, in_str) in _scan(inner):
        if in_str or depth != 0:
            continue
        if ch == ',':
            return True
    for (i, ch, depth, in_str) in _scan(inner):
        if not in_str and depth == 0 and inner.startswith('for ', i) \
                and (i == 0 or inner[i - 1].isspace()):
            return True
    return False


def _extract_caret_anchors_from_line_segment(segment):
    """CPython's name and contract: anchors for a segment, or None.

    Single-line only.  A multi-line segment answers None, which makes the
    renderer emit an unsplit run of ^ -- CPython's own behaviour when it
    cannot compute anchors, so the degradation is the documented one."""
    got = _extract_anchor_offsets(segment)
    if got is None:
        return None
    return _Anchors(0, got[0], 0, got[1])


def _rhs_start_offset(line):
    """Offset in ``line`` where a ``return``'s value or a simple assignment's
    value begins, else None.

    The two statement shapes CPython suppresses carets for.  It recognises them
    by parsing; the shapes are narrow enough to scan for, and the comparison
    that matters is done by the caller -- the value must span EXACTLY the
    instruction's columns."""
    if line.startswith('return ') or line.startswith('return\t'):
        i = 6
        while i < len(line) and line[i].isspace():
            i += 1
        return i
    for (i, ch, depth, in_str) in _scan(line):
        if in_str or depth != 0 or ch != '=':
            continue
        if i and line[i - 1] in '=!<>+-*/%&|^:':
            return None
        if i + 1 < len(line) and line[i + 1] == '=':
            return None
        if not line[:i].strip().isidentifier():
            return None
        j = i + 1
        while j < len(line) and line[j].isspace():
            j += 1
        return j
    return None


def _byte_offset_to_character_offset(s, offset):
    """CPython indexes columns in UTF-8 BYTES; the render is in characters."""
    as_utf8 = s.encode('utf-8')
    return len(as_utf8[:offset].decode('utf-8', errors='replace'))


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
        # ``_lines'' and not ``_line'': that is the slot name CPython 3.14 uses, and
        # test_lazy_lines reads it directly to check that lookup_line=False leaves it
        # unfilled.  Stored RAW rather than stripped, because the ``line'' property
        # strips on the way out -- keeping the original is what lets a caller that
        # wants columns line them up against the text they were measured from.
        self._lines = line
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
        if self._lines is None:
            if self.filename is None or self.lineno is None:
                return None
            got = linecache.getline(self.filename, self.lineno)
            if not got:
                return None
            self._lines = got
        if not isinstance(self._lines, str):
            return self._lines
        # The FIRST line only, stripped: a multi-line statement's cached text can
        # hold several, which is CPython's shape too.
        return self._lines.partition('\n')[0].strip()

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

    # NO __str__.  CPython's FrameSummary does not define one, so ``str(fs)''
    # answers the repr above -- verified against 3.14.6, where
    # ``str(extract_stack()[-1])'' is ``<FrameSummary file <string>, line 9 in
    # <module>>''.  Grail had one that rendered the ``  File ..., line N, in f''
    # row, which existed only because format_list/print_list rendered frames by
    # str() instead of routing through StackSummary.  Both now do what CPython
    # does, so the fabricated __str__ has no caller and would only mislead the
    # next reader into rendering frames through str() again.


def _colorize_caret_row(line, carets, theme):
    """``(line, carets)`` recoloured in the runs the CARETS mark out.

    CPython's scheme, and the reason the two strings are produced together: the
    caret row is what says which COLUMNS of the source are implicated, so the
    source line and the carets under it are coloured from one grouping and
    cannot disagree.  A run under ``^`` (the anchor -- the operator, the call
    parens, the subscript) takes ``error_highlight``; a run under ``~`` (the
    rest of the offending expression) takes ``error_range``; a run under a space
    is left alone.

    ``carets`` may be shorter than ``line`` -- the row stops at the end of the
    instruction, while the source line runs on -- and the tail is then
    uncoloured, which is what the missing-column case wants.

    Written as a run-length scan rather than with itertools.groupby +
    zip_longest, which is how CPython spells it: the loop is the part worth
    reading here, and it keeps the module's imports unchanged."""

    out_line = []
    out_carets = []
    width = max(len(line), len(carets))
    i = 0
    while i < width:
        mark = carets[i] if i < len(carets) else ''
        j = i
        while j < width and (carets[j] if j < len(carets) else '') == mark:
            j += 1
        if mark == '^':
            colour = theme.error_highlight
        elif mark == '~':
            colour = theme.error_range
        else:
            colour = ''
        if colour:
            out_line.append(colour + line[i:j] + theme.reset)
            out_carets.append(colour + carets[i:j] + theme.reset)
        else:
            out_line.append(line[i:j])
            out_carets.append(carets[i:j])
        i = j
    return ''.join(out_line), ''.join(out_carets)


def _traceback_theme(colorize):
    """The theme to interpolate at every emit site.

    Answers a theme whose every key is EMPTY when not colorizing, so the emit
    sites have one code path instead of a branch each -- see _colorize's
    no_colour_theme."""

    if colorize:
        return _colorize.get_theme(force_color=True).traceback
    return _colorize.get_theme(force_no_color=True).traceback


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

    def _should_show_carets(self, start_offset, end_offset, line, anchors):
        """CPython suppresses the caret line for a whole-line call assigned to
        a plain name, or returned -- ``x = foo(...)`` / ``return foo(...)``.

        It decides that with ast; the shape is narrow enough to recognise by
        scanning.  The point of the rule is that underlining the entire line
        adds nothing when the line IS the call, so the suppression only applies
        when the span covers everything."""
        rhs_start = _rhs_start_offset(line)
        if rhs_start is not None and rhs_start == start_offset \
                and end_offset == len(line.rstrip()):
            head = line[rhs_start:].rstrip()
            if head.endswith(')'):
                got = _extract_anchor_offsets(head)
                # A CALL whose func is a bare NAME: the anchor's left edge is
                # the '(' and everything before it is a plain identifier.
                if got is not None and got[1] == len(head):
                    func = head[:got[0]]
                    if func.isidentifier():
                        return False
        if anchors:
            return True
        # A span that covers the whole line, with nothing either side, tells
        # the reader nothing -- but a span that leaves ANY code uncovered does.
        if line[:start_offset].lstrip() or line[end_offset:].rstrip():
            return True
        return False

    def format_frame_summary(self, frame_summary, **kwargs):
        """Render ONE frame, INCLUDING its trailing newline -- the hook CPython
        exposes for subclasses that want custom frame rendering.

        The newline belongs here and not in ``format`` because CPython puts it
        here: ``format`` appends what this answers verbatim.  Grail had it the
        other way round, which is invisible for every frame Grail itself renders
        (the newline lands in the same place either way) and wrong the moment a
        SUBCLASS overrides this -- test_custom_format_frame's override answers
        ``f'{filename}:{lineno}''' and expects exactly that back from format(),
        while Grail appended a newline the override never asked for.

        Emits PEP 657 carets when the frame carries columns.  Single-line
        frames only: a span crossing lines answers no anchors and falls back to
        the plain source line, which is what CPython does when it cannot
        compute anchors.

        ``**kwargs`` is where ``colorize`` arrives, as it does in CPython -- the
        signature is a subclass hook, so it stays permissive.

        CAPTURED LOCALS come last, after any caret row, one ``    name = repr``
        line each and SORTED BY NAME -- CPython sorts here rather than relying on
        the dict, so the rendering is stable whatever order the frame reported its
        variables in.  Grail's frames come off a Smalltalk method's temporaries,
        whose order is the compiler's rather than the source's, so the sort is
        doing real work here and not just matching upstream."""
        row = self._frame_summary_row(
            frame_summary, colorize=kwargs.get('colorize', False)) + '\n'
        if frame_summary.locals:
            for name, value in sorted(frame_summary.locals.items()):
                row += '    {} = {}\n'.format(name, value)
        return row

    def _frame_summary_row(self, frame_summary, colorize=False):
        """format_frame_summary's body, without the trailing newline.

        Split out so the several early returns below do not each have to
        remember the newline.

        THE SOURCE LINE IS HELD BACK until the carets are known, because
        colourising it needs them: the caret row says which columns are
        implicated, and _colorize_caret_row recolours the pair together.  Every
        early return below therefore emits the line plain, which is also what
        CPython does -- it colours the line only in the branch that shows
        carets."""
        theme = _traceback_theme(colorize)
        header = '  File %s"%s"%s, line %s%s%s, in %s%s%s' % (
            theme.filename, frame_summary.filename, theme.reset,
            theme.line_no, frame_summary.lineno, theme.reset,
            theme.frame, frame_summary.name, theme.reset)
        row = header
        line = frame_summary.line
        if not line:
            return row
        row += '\n    ' + line

        colno = frame_summary.colno
        end_colno = frame_summary.end_colno
        if colno is None or end_colno is None:
            return row
        if frame_summary.end_lineno != frame_summary.lineno:
            return row

        raw = frame_summary._lines
        if raw is None:
            return row
        first_line = raw.splitlines()[0] if raw.splitlines() else line
        start_offset = _byte_offset_to_character_offset(first_line, colno)
        end_offset = _byte_offset_to_character_offset(first_line, end_colno)
        # ``line`` is the DEDENTED text; the columns index the raw line.
        dedent = len(first_line) - len(line)
        start_offset = max(0, start_offset - dedent)
        end_offset = max(0, end_offset - dedent)
        # A ZERO-WIDTH span (start == end) is legal and meaningful: it is what
        # instruction 0 of a code object reports, and CPython renders it as a
        # caret row with no carets in it -- see _entry_positions.  Only an
        # INVERTED span is nonsense.
        if end_offset > len(line) or start_offset > end_offset:
            return row

        segment = line[start_offset:end_offset]
        anchors = None
        try:
            anchors = _extract_caret_anchors_from_line_segment(segment)
        except Exception:
            anchors = None
        if not self._should_show_carets(start_offset, end_offset, line, anchors):
            return row

        left = start_offset
        right = end_offset
        if anchors is not None:
            left = start_offset + anchors.left_end_offset
            right = start_offset + anchors.right_start_offset
        carets = []
        for i in range(start_offset, end_offset):
            carets.append('^' if left <= i < right else '~')
        caret_row = ' ' * start_offset + ''.join(carets)
        if colorize:
            line, caret_row = _colorize_caret_row(line, caret_row, theme)
        return header + '\n    ' + line + '\n    ' + caret_row

    def format(self, **kwargs):
        colorize = kwargs.get('colorize', False)
        # Each piece is appended VERBATIM: format_frame_summary owns the
        # trailing newline, as it does in CPython, so that an override which
        # answers something else (test_custom_format_frame answers
        # ``filename:lineno'') is reproduced exactly.
        #
        # A format_frame_summary override may answer None to DROP a frame, which
        # CPython supports and test_dropping_frames relies on.  Grail could not
        # reach that case until nested functions grew frames of their own -- the
        # test's ``f`` and ``g`` are nested defs, so the loop had nothing to hand
        # the override, and the None went straight into a string concatenation.
        formatted = []
        for fs in self:
            # ``colorize`` passed EXPLICITLY, as CPython passes it, rather than
            # forwarded as **kwargs: format_frame_summary is a documented
            # subclass hook, and an override written against CPython's signature
            # accepts exactly this keyword.
            piece = self.format_frame_summary(fs, colorize=colorize)
            if piece is None:
                continue
            formatted.append(piece)
        return formatted


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
        # A Grail code object has no bytecode and so no co_positions at all --
        # the ENTRY position is still knowable; see _entry_positions.
        return _entry_positions(lasti)
    try:
        for index, pos in enumerate(positions):
            if index == lasti // 2:
                pos = tuple(pos)
                # Pad, so a short tuple cannot IndexError the caller.
                return pos + (None,) * (4 - len(pos))
    except Exception:
        pass
    return _entry_positions(lasti)


def _entry_positions(lasti):
    """The columns for instruction 0 -- a code object's ENTRY -- when
    ``co_positions()`` could not supply them, which for a Grail code object is
    always: there is no bytecode to enumerate.

    CPython's instruction 0 is RESUME, and its recorded position is the
    function header with a ZERO-WIDTH column span, columns 0 to 0.  That is not
    just a compiler detail: ``types.TracebackType(next, frame, 0, lineno)`` is
    how a caller says "this frame had not executed anything yet", and the
    zero-width span is what makes the report draw an EMPTY caret line rather
    than underline the whole ``def`` (GH-93249, asserted by test_traceback's
    test_KeyboardInterrupt_at_first_line_of_frame).

    Columns only.  The LINES come from the traceback node, which is where the
    caller put them -- a reconstructed live frame's PyCode carries
    co_firstlineno 0, and answering that would move the frame to line 0.

    Only lasti == 0 can be answered this way.  Any other instruction index is a
    position Grail genuinely does not have, and inventing one would draw a
    caret under code that never ran."""
    if lasti != 0:
        return (None, None, None, None)
    return (None, None, 0, 0)


def _resolve_limit(limit):
    """CPython's rule for a frame limit, which is subtler than one number.

    An EXPLICIT limit is used as given: ``>= 0'' keeps the first N frames,
    negative keeps the LAST abs(N).  When no limit is passed, ``sys.tracebacklimit''
    supplies the default -- but a negative tracebacklimit is clamped to 0, i.e.
    "show nothing", NOT "show the last N".  test_traceback's LimitTests asserts
    both halves: ``extract(limit=-2) == nolim[-2:]'' but
    ``sys.tracebacklimit = -1'' then ``extract() == []''."""
    if limit is None:
        limit = getattr(sys, 'tracebacklimit', None)
        if limit is not None and limit < 0:
            limit = 0
    return limit


def _apply_limit(frames, limit):
    """Slice a StackSummary to ``limit'' per _resolve_limit's rule."""
    if limit is None:
        return frames
    kept = frames[:limit] if limit >= 0 else frames[limit:]
    trimmed = StackSummary()
    for frame in kept:
        trimmed.append(frame)
    return trimmed


def clear_frames(tb):
    """Clear the local variables of every frame in a traceback.

    CPython's purpose is to break the reference cycles a caught exception's
    traceback keeps alive.  Grail's traceback frames hold a raise-time SNAPSHOT of
    the innermost frame's locals rather than live frames, so there is no cycle to
    break -- but the references are real, and releasing them is what this is for.

    Errors are swallowed per frame, as CPython does: it ignores the RuntimeError a
    still-executing frame raises, and one unclearable frame must not stop the rest
    from being cleared."""
    while tb is not None:
        try:
            tb.tb_frame.clear()
        except Exception:
            pass
        tb = tb.tb_next


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
    limit = _resolve_limit(limit)
    # Build every frame, then slice: a NEGATIVE limit keeps the last abs(N), so
    # the walk cannot stop early.  limit == 0 short-circuits, since it keeps
    # nothing and each frame costs a line derivation.
    if limit == 0:
        return result
    while cur is not None:
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
    return _apply_limit(result, limit)


def extract_stack(f=None, limit=None):
    """A StackSummary for the live stack at ``f'' (the caller when f is None).

    CPython is ``StackSummary.extract(walk_stack(f), limit=limit)'', and now that
    walk_stack is real, so is this -- it used to answer an empty StackSummary,
    which was honest when there were no frame objects to walk and is not any
    more.

    Note the ORDER: walk_stack yields innermost-first, and a StackSummary is
    outermost-first (the same ``most recent call last'' order a traceback
    prints), so the walk is reversed.  Getting this backwards renders a stack
    upside down, which reads as plausible until compared with CPython.

    THE LIMIT IS APPLIED BEFORE THAT REVERSAL, which is the whole reason this
    function cannot just hand ``limit'' to StackSummary.extract after
    reversing.  CPython slices the walk -- innermost-first -- and reverses the
    RESULT, so a positive ``limit`` keeps the INNERMOST N and a negative one the
    outermost abs(N).  Reversing first inverted both: ``extract_stack(f,
    limit=2)`` answered the two outermost frames, i.e. the two furthest from
    where anything interesting happened.  A stack deep enough for the
    difference to show is exactly the stack someone passes a limit for.

    ``_resolve_limit'' also brings in ``sys.tracebacklimit'', which this path
    ignored entirely -- extract_tb has honoured it all along."""
    if f is None:
        # _live_frames_of_caller already excludes this module's frames, so there
        # is no count to get wrong.
        frames = [(fr, _safe_lineno(fr)) for fr in _live_frames_of_caller()]
    else:
        frames = walk_stack(f)
    if not frames:
        return StackSummary()
    limit = _resolve_limit(limit)
    if limit is not None:
        frames = frames[:limit] if limit >= 0 else frames[limit:]
    if not frames:
        return StackSummary()
    try:
        summary = StackSummary.extract(iter(reversed(frames)))
    except Exception:
        return StackSummary()
    return summary


def format_tb(tb, limit=None):
    return extract_tb(tb, limit).format()


def format_stack(f=None, limit=None):
    """The live stack rendered as a list of strings, one entry per frame.

    CPython: ``format_list(extract_stack(f, limit=limit))''.  As with
    extract_stack, this answered [] only because there was no stack to walk."""
    return format_list(extract_stack(f, limit=limit))


def format_list(extracted_list):
    """Format a list of FrameSummary objects, or of the legacy
    ``(filename, lineno, name, line)'' 4-tuples, for printing.

    CPython is exactly ``StackSummary.from_list(extracted_list).format()'' and
    now so is this.  It used to be ``'  ' + str(entry) + '\\n''', which had two
    consequences: a FrameSummary carries the ``  File ...'' indent itself, so
    every frame came out indented FOUR spaces (visible in format_stack /
    print_stack, whose output is nothing but format_list); and a 4-tuple came out
    as its repr rather than as a rendered frame.  Routing through StackSummary
    also means carets, and the format_frame_summary hook, apply to these entries
    as they do everywhere else.

    Note what this gives up: ``format_list(['some string'])'' used to answer
    ``['  some string\\n']''.  CPython raises ValueError (too many values to
    unpack) there, because an entry that is not a FrameSummary must be a 4-tuple
    -- verified on 3.14.6."""
    return StackSummary.from_list(extracted_list).format()


def print_list(extracted_list, file=None):
    """The format_list rendering, written to ``file'' (default sys.stderr)."""
    if file is None:
        file = sys.stderr
    for line in format_list(extracted_list):
        file.write(line)


def print_stack(f=None, limit=None, file=None):
    """Print the current stack to ``file`` (default sys.stderr).

    The docstring here used to say Grail had no live-frame introspection and
    that this printed nothing.  It does now (BaseException
    ___liveFrameChain___), so the only thing left to say is what CPython says."""
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


def _safe_lineno(frame):
    """A frame's f_lineno, or None.  Reading it must never raise: a frame whose
    ip does not resolve to a Python line reports 0 rather than going missing."""
    try:
        return frame.f_lineno
    except Exception:
        return None


def _own_filename():
    """This module's file, used to keep traceback.py's own frames out of a live
    stack walk.

    CPython's format_stack() stops at its CALLER: walk_stack / extract_stack /
    format_stack never appear in their own output.  The obvious way to arrange
    that is to drop a fixed number of innermost frames -- and that is exactly
    what broke under native code, where a frame whose ip does not resolve can go
    missing, so "drop one" silently dropped the CALLER instead.  Identifying the
    frames by FILE cannot miscount however many of them survive."""
    try:
        return __file__
    except NameError:
        pass
    try:
        return _own_filename.__code__.co_filename
    except Exception:
        return None


def _live_frames_of_caller():
    """The caller's frames, innermost first, with this module's own removed."""
    try:
        frame = sys._getframe()
    except Exception:
        return []
    chain = []
    # Bounded: f_back is reconstructed rather than owned by the VM, and a cycle
    # would hang the formatter whose job is to report a problem.
    while frame is not None and len(chain) < 10000:
        chain.append(frame)
        try:
            frame = frame.f_back
        except Exception:
            break
    mine = _own_filename()
    if mine is not None:
        while chain:
            try:
                if chain[0].f_code.co_filename != mine:
                    break
            except Exception:
                break
            chain.pop(0)
    return chain


def walk_stack(f):
    """Yield (frame, lineno) pairs walking the stack starting at ``f''.

    ``f=None'' means the CALLER's stack, which is what every caller in the
    stdlib passes.  This used to answer an empty iterator, on the grounds that
    Grail had no frame objects; sys._getframe now reconstructs them from the
    VM's raise-time capture, so the walk is real.

    Returns a LIST rather than a generator, as everything else in this module
    does: callers either iterate it once or join it, and a list is easier to
    assert on."""
    if f is None:
        chain = _live_frames_of_caller()
        return [(fr, _safe_lineno(fr)) for fr in chain]
    frames = []
    # Bounded, because f_back is reconstructed rather than owned by the VM: a
    # cycle would hang the formatter whose job is to report a problem.
    while f is not None and len(frames) < 10000:
        try:
            lineno = f.f_lineno
        except Exception:
            lineno = None
        frames.append((f, lineno))
        try:
            f = f.f_back
        except Exception:
            break
    return frames


def _indent_lines(text, prefix):
    """``textwrap.indent(text, prefix, lambda line: True)''.

    Written out rather than imported: the predicate matters (EVERY line gets the
    margin, blank ones included, or a blank line inside a group would break the
    ``|'' rule), and this is the only place traceback.py would need textwrap --
    which is itself a Python module Grail has to import and compile.

    One string can hold several lines: a frame with a caret line under it is a
    single entry in stack.format(), so indenting has to reach inside."""
    if not text or not prefix:
        return text
    parts = text.split('\n')
    # A trailing '' means the text ENDED with a newline.  That is not a line of
    # its own and gets no prefix -- textwrap.indent's rule, and the reason
    # ``a\nb\n'' indents to ``Xa\nXb\n'' rather than ``Xa\nXb\nX''.
    tail = ''
    if parts[-1] == '':
        parts = parts[:-1]
        tail = '\n'
    return '\n'.join([prefix + part for part in parts]) + tail


class _ExceptionPrintContext:
    """The state a group tree is drawn with, shared across a whole format().

    ``exception_group_depth'' is how deeply nested the exception being rendered
    is, which fixes both the left indent (two spaces per level) and whether a
    margin is drawn at all.  ``need_close'' remembers that the last child of a
    group still owes a closing ``+-----'' rule -- it is set before recursing and
    cleared by whoever emits the rule, so the DEEPEST nesting closes first and
    each level closes exactly once."""

    def __init__(self):
        self.seen = set()
        self.exception_group_depth = 0
        self.need_close = False

    def indent(self):
        return ' ' * (2 * self.exception_group_depth)

    def emit(self, text_gen, margin_char=None):
        """The lines of ``text_gen'' (one string or a list) with this context's
        indent and margin.  CPython yields; Grail returns a list, as everywhere
        else in this module."""
        if margin_char is None:
            margin_char = '|'
        indent_str = self.indent()
        if self.exception_group_depth:
            indent_str += margin_char + ' '
        if isinstance(text_gen, str):
            return [_indent_lines(text_gen, indent_str)]
        return [_indent_lines(text, indent_str) for text in text_gen]


class TracebackException:
    """CPython's reusable exception-formatting helper.  Captures the
    exception's type / value (and chain) at construction time so the
    rendering can be deferred or repeated.  Grail's minimal version
    skips the frame walk; ``format()'' produces the same shape as
    ``format_exception''."""

    def __init__(self, exc_type, exc_value, exc_traceback,
                 limit=None, lookup_lines=True, capture_locals=False,
                 compact=False, max_group_width=15, max_group_depth=10,
                 save_exc_type=True, _seen=None, **kwargs):
        """``max_group_width`` / ``max_group_depth`` bound PEP 654 group-tree
        rendering: how many children of one group are shown before the rest
        become "and N more exceptions", and how deep the nesting is drawn before
        it becomes "... (max_group_depth is N)".  ``save_exc_type`` is accepted
        and not acted on -- it controls a DeprecationWarning on a field Grail
        does not keep.  ``**kwargs`` covers the rest of that family (notably
        ``colorize``), for the same reason format() absorbs it: honouring it
        would produce the same bytes."""
        # NOT _unpack_exc_args: that normalises for the MODULE-LEVEL entry
        # points, deriving the type from the value and discarding the one it was
        # given.  CPython's class does no such thing -- it keeps the triple it
        # is handed, which is why TracebackException(ValueError, None, None)
        # renders 'ValueError: None' while format_exception(ValueError, None,
        # None) renders 'NoneType: None'.
        #
        # The one convenience kept is Grail's: a BaseException passed as the
        # type expands to its own (type, value, traceback).
        if isinstance(exc_type, BaseException):
            exc = exc_type
            exc_type = type(exc)
            if exc_value is None:
                exc_value = exc
            if exc_traceback is None:
                exc_traceback = getattr(exc, '__traceback__', None)
        # CPython 3.13 DEPRECATED ``exc_type'' in favour of ``exc_type_str''.
        # The class stores the type privately and exposes it through a
        # property that warns; ``save_exc_type=False'' drops it entirely, which
        # is what the deprecation is for.  Internal readers use _exc_type so
        # rendering a traceback does not warn.
        self._exc_type = exc_type if save_exc_type else None
        self.exc_type_str = _type_display_name(exc_type)
        self.max_group_width = max_group_width
        self.max_group_depth = max_group_depth
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
        # The chain, captured at construction as CPython does: rendering can be
        # deferred or repeated, and by then the live exceptions may be gone.
        #
        # ``_seen`` doubles as the RECURSIVE-CALL flag, exactly as in CPython: a
        # nested construction receives one and builds only ITSELF, leaving its
        # own links to the queue below.  So the depth of Python recursion here is
        # 1 regardless of how long the chain is.
        #
        # A chain is not bounded by the stack that produced it: __context__ is a
        # writable attribute, so a loop can build one of any length.  Recursing
        # per link raised RecursionError above ~13 000 links -- from inside the
        # machinery whose job is to REPORT that error.  (A chain built by an
        # actual runaway recursion is shorter than that, ~6600 links, and the
        # recursive version did handle those; this is robustness, not the fix for
        # any one test.  See §9.14 of docs/Python_Traceback_Design.md.)
        is_recursive_call = _seen is not None
        if _seen is None:
            _seen = _seen_set()
        self.__cause__ = None
        self.__context__ = None
        # ``None'' means "not a group", which is what format() tests to choose
        # between a plain traceback and a tree -- an EMPTY list would mean a
        # group with no children and draw a (correct, but different) tree.
        # Initialised here rather than only in the queue loop below so that a
        # TracebackException built with an explicit _seen -- a recursive call
        # that was never queued -- still has the attribute.  CPython leaves it
        # unset in that case and would raise AttributeError on format().
        self.exceptions = None
        self.__suppress_context__ = bool(
            getattr(exc_value, '__suppress_context__', False))
        if exc_value is not None:
            _seen.add(id(exc_value))
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

        # Expand the chain BREADTH-FIRST from a queue, which only the top-level
        # construction does (see is_recursive_call above).  Each entry pairs an
        # already-built TracebackException with the live exception it came from,
        # since the links to follow are attributes of the latter.
        if not is_recursive_call:
            queue = [(self, exc_value)]
            while queue:
                te, value = queue.pop()
                if value is None:
                    continue
                cause = getattr(value, '__cause__', None)
                context = getattr(value, '__context__', None)
                if cause is not None and id(cause) not in _seen:
                    te.__cause__ = TracebackException(
                        type(cause), cause,
                        getattr(cause, '__traceback__', None),
                        limit=limit, lookup_lines=lookup_lines,
                        capture_locals=capture_locals,
                        max_group_width=max_group_width,
                        max_group_depth=max_group_depth, _seen=_seen)
                    queue.append((te.__cause__, cause))
                # ``compact`` decides whether a SUPPRESSED context is still
                # captured.  CPython builds the context link whenever
                # compact=False (the constructor default) -- __suppress_context__
                # is honoured by the RENDERER, in format(), not by the capture --
                # and skips it only for a compact=True build, which is what
                # print_exception() asks for because it is about to render.
                # Grail used to apply the suppression here unconditionally, so
                # ``raise X from Y'' left __context__ as None on the
                # TracebackException even though the live exception had one.
                if compact:
                    need_context = (te.__cause__ is None
                                    and not te.__suppress_context__)
                else:
                    need_context = True
                if (context is not None and need_context
                        and id(context) not in _seen):
                    te.__context__ = TracebackException(
                        type(context), context,
                        getattr(context, '__traceback__', None),
                        limit=limit, lookup_lines=lookup_lines,
                        capture_locals=capture_locals,
                        max_group_width=max_group_width,
                        max_group_depth=max_group_depth, _seen=_seen)
                    queue.append((te.__context__, context))
                # A group's CHILDREN are links too, and they go on the same
                # queue: nesting is unbounded (a group of groups of ...), so
                # recursing per level would put the same stack-depth ceiling on
                # rendering a tree that the chain walk above avoids.  Unlike
                # cause/context these are not deduplicated against _seen -- the
                # same exception may legitimately appear in two groups, and
                # CPython renders it in both.
                if _is_exception_group(value):
                    children = []
                    for sub in value.exceptions:
                        children.append(TracebackException(
                            type(sub), sub,
                            getattr(sub, '__traceback__', None),
                            limit=limit, lookup_lines=lookup_lines,
                            capture_locals=capture_locals,
                            max_group_width=max_group_width,
                            max_group_depth=max_group_depth, _seen=_seen))
                    te.exceptions = children
                    for pair in zip(children, value.exceptions):
                        queue.append(pair)

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

    @property
    def exc_type(self):
        """DEPRECATED since CPython 3.13 -- use ``exc_type_str''.

        Kept as a warning property rather than removed: the attribute is part
        of a long-standing public API, and test_traceback asserts BOTH that it
        still answers the type and that reading it warns.  ``save_exc_type=
        False'' makes it None, which is the point of the deprecation -- a
        TracebackException is meant to be picklable without holding a class."""
        import warnings
        warnings.warn('Deprecated in 3.13. Use exc_type_str instead.',
                      DeprecationWarning, stacklevel=2)
        return self._exc_type

    def format_exception_only(self, show_group=False, **kwargs):
        """The exception's own line(s), no frames.

        ``**kwargs`` swallows presentation-only options CPython grew (notably
        ``colorize``): Grail renders tracebacks as plain text -- _colorize's
        COLORIZE is False and can_colorize() answers False -- so honouring
        them would produce the same bytes.  Accepting and ignoring keeps
        callers that pass them working instead of raising TypeError."""
        # _keep_type: the class renders the type it was CONSTRUCTED with, unlike
        # the module-level legacy form which derives it from the value.  Without
        # this, TracebackException(ValueError, None, None) would render
        # 'NoneType: None' where CPython gives 'ValueError: None'.
        return _format_exception_only(self._exc_type, self._value,
                                      show_group=show_group, _tb=self._tb,
                                      _keep_type=True,
                                      colorize=kwargs.get('colorize', False))

    def format(self, chain=True, _ctx=None, **kwargs):
        """Yield strings (header / frames / message).  Generators
        aren't iterated by CPython callers that join the result, so
        return a flat list — easier to test, identical from the
        caller's perspective.

        The header is emitted only when the captured stack actually has
        frames, matching CPython's ``if exc.stack:`` guard — see
        format_exception() above.

        ``_ctx`` is the group-tree drawing state, private and threaded through
        the recursion: the whole chain shares one, so a sub-exception's own
        chain is indented under the group that holds it.

        ``**kwargs`` swallows ``colorize`` and friends, as above."""
        if _ctx is None:
            _ctx = _ExceptionPrintContext()
        links = []
        if chain:
            link = self
            while link is not None:
                if link.__cause__ is not None:
                    links.append((_cause_message, link))
                    link = link.__cause__
                elif (link.__context__ is not None
                      and not link.__suppress_context__):
                    links.append((_context_message, link))
                    link = link.__context__
                else:
                    links.append((None, link))
                    link = None
            links.reverse()
        else:
            links.append((None, self))
        lines = []
        for connector, link in links:
            if connector is not None:
                lines.extend(_ctx.emit(connector))
            if link.exceptions is None:
                lines.extend(_ctx.emit(link._format_self(**kwargs)))
            elif _ctx.exception_group_depth > self.max_group_depth:
                lines.extend(_ctx.emit(
                    '... (max_group_depth is %s)\n' % (self.max_group_depth,)))
            else:
                lines.extend(self._format_group(link, chain, _ctx, **kwargs))
        return lines

    def _format_group(self, link, chain, _ctx, **kwargs):
        """One exception GROUP as a tree: its own traceback, then a numbered
        rule per child with the child rendered under it.

        Split out of format() because the nesting is what makes this hard to
        read, not the shape of any one line.  CPython keeps it inline."""
        lines = []
        # Depth 0 means this is the OUTERMOST group, and it is the only one whose
        # first line carries a ``+'' instead of a ``|'' -- the corner of the box
        # everything else is drawn inside.  Bumping the depth before rendering it
        # is what gives even the top-level group its ``  | '' margin.
        is_toplevel = (_ctx.exception_group_depth == 0)
        if is_toplevel:
            _ctx.exception_group_depth += 1
        frames = []
        try:
            frames.extend(link.stack.format(**kwargs))
        except Exception:
            pass
        if frames:
            lines.extend(_ctx.emit(
                'Exception Group Traceback (most recent call last):\n',
                margin_char='+' if is_toplevel else None))
            lines.extend(_ctx.emit(frames))
        lines.extend(_ctx.emit(link.format_exception_only(**kwargs)))

        num_excs = len(link.exceptions)
        # One rule too many when truncating: the extra one is the ``...'' rule
        # that introduces "and N more exceptions".
        if num_excs <= self.max_group_width:
            shown = num_excs
        else:
            shown = self.max_group_width + 1
        _ctx.need_close = False
        for i in range(shown):
            last_exc = (i == shown - 1)
            if last_exc:
                # The closing rule may instead be emitted by a recursive call,
                # which is what need_close hands down.
                _ctx.need_close = True
            truncated = (self.max_group_width is not None
                         and i >= self.max_group_width)
            title = '...' if truncated else '%s' % (i + 1,)
            lines.append(_ctx.indent()
                         + ('+-' if i == 0 else '  ')
                         + '+---------------- ' + title
                         + ' ----------------\n')
            _ctx.exception_group_depth += 1
            if not truncated:
                lines.extend(link.exceptions[i].format(chain=chain, _ctx=_ctx, **kwargs))
            else:
                remaining = num_excs - self.max_group_width
                plural = 's' if remaining > 1 else ''
                lines.extend(_ctx.emit(
                    'and %s more exception%s\n' % (remaining, plural)))
            if last_exc and _ctx.need_close:
                lines.append(_ctx.indent()
                             + '+------------------------------------\n')
                _ctx.need_close = False
            _ctx.exception_group_depth -= 1

        if is_toplevel:
            _ctx.exception_group_depth = 0
        return lines

    def _format_self(self, **kwargs):
        """This exception alone -- header, frames, message -- with no chain."""
        frames = []
        try:
            frames.extend(self.stack.format(**kwargs))
        except Exception:
            pass
        lines = []
        if frames:
            lines.append('Traceback (most recent call last):\n')
            lines.extend(frames)
        lines.extend(self.format_exception_only(**kwargs))
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
        rule CPython's __dict__ comparison expresses.

        A group's CHILDREN shape its output too, so they are part of the key --
        and because they are TracebackExceptions themselves, comparing them
        recurses through this same rule rather than comparing exceptions by
        identity.  ``max_group_width'' / ``max_group_depth'' likewise: they
        decide where the tree is truncated, and CPython's __dict__ comparison
        includes them for that reason."""
        return (self._exc_type, self._str, list(self.stack),
                _format_notes(self._value), self._capture_locals,
                self.__cause__, self.__context__, self.__suppress_context__,
                self.exceptions, self.max_group_width, self.max_group_depth)

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
    'walk_tb', 'walk_stack', 'clear_frames',
    'TracebackException', 'FrameSummary', 'StackSummary',
]
