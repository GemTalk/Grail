"""Fixtures for sys._getframe and walking a LIVE stack.

Driven by PythonTests>>LiveFrameTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Every frame Grail had until now came from an EXCEPTION: the traceback machinery
reconstructs frames from the VM's raise-time capture.  ``sys._getframe'' asks a
different question -- what is on the stack right now, with nothing raised -- and
it did not exist, so ``traceback.walk_stack'' answered an empty iterator and
everything built on it (print_stack, format_stack, StackSummary.extract from a
frame) reported nothing at all.

How it works, because it is not obvious and it is the reason this is possible:
a RUNNING gem cannot read its own stack through GsProcess.  ``GsProcess current''
inside running code answers stackDepth 0 and no frames -- _frameContentsAt: reads
a SUSPENDED process.  But the VM's raise-time capture fills _gsStack with
(method, ip, receiver) triples for the whole live stack, so _getframe signals a
throwaway Error, catches it immediately, and reads the capture.  CPython's
_getframe is free; Grail's costs a raise.

Two limits are pinned below as deliberate behaviour rather than left to be found:

``f_locals'' does not exist, and is not faked.  A Python function's locals are
Smalltalk method TEMPS; the capture records only (method, ip, receiver), so
neither the values nor their names are in it.  An empty f_locals would be worse
than none -- code reading it would silently see a frame with no variables instead
of an AttributeError telling it the truth.

(``f_locals'' is now the only such limit.  A nested function used to be the
second -- it got no frame of its own, because a nested ``def'' compiles to a
BLOCK and the walk skipped every block.  That is fixed; the check below asserts
the CPython behaviour, and the note on it records what it used to say.)

Run this file under CPython (``python3 tests/python/live_frames.py'') to see what
it produces -- that is where the expectations come from.  The one check that
documents a Grail-specific limit is marked, and is the only one that would answer
differently there.
"""

import sys
import traceback

MODULE_MARKER = 1


def _names_from_walk():
    """The co_names of the live stack, innermost first."""
    return [f.f_code.co_name for f, _ in traceback.walk_stack(None)]


def leaf():
    return _names_from_walk()


def mid():
    return leaf()


def top():
    return mid()


def getframe_returns_a_frame():
    f = sys._getframe()
    return f is not None and hasattr(f, 'f_code')


def getframe_names_its_caller():
    """Depth 0 is the CALLER's frame, not _getframe's own."""
    return sys._getframe().f_code.co_name == 'getframe_names_its_caller'


def _d0():
    return sys._getframe(0).f_code.co_name


def _d1():
    return sys._getframe(1).f_code.co_name


def _d2():
    return sys._getframe(2).f_code.co_name


def _call_d1():
    return _d1()


def _call_d2():
    return _call_d2_inner()


def _call_d2_inner():
    return _d2()


def _d2_and_walk():
    """_d2, plus the chain it is counting through.  See depth_counts_outwards."""
    return sys._getframe(2).f_code.co_name, _names_from_walk()


def _mirror_d2():
    return _mirror_d2_inner()


def _mirror_d2_inner():
    return _d2_and_walk()


def depth_counts_outwards():
    """Each increment steps one frame further out.

    Returns the EVIDENCE rather than False on a mismatch, for the same reason
    the_traceback_module_keeps_its_own_frames_out does: this counts POSITIONS in
    a reconstructed chain, and the one thing known to perturb that chain -- a
    frame whose ip does not resolve going missing under native code -- happens
    only on CI, where nobody is sitting at the machine and macOS/arm64 cannot
    reproduce it.  A bare False says the count was wrong; it does not say whether
    a frame went missing, an extra one appeared, or the depths are simply offset,
    and those have different causes.

    The evidence walks the chain from _d2's own position, through
    _mirror_d2/_mirror_d2_inner -- an EXACT mirror of the _call_d2 ladder, same
    nesting depth -- so the reported chain is the one the failing _getframe(2) was
    counting through and not a shallower one measured from here.
    """
    got = (_d0(), _call_d1(), _call_d2())
    want = ('_d0', '_call_d1', '_call_d2')
    if got == want:
        return True
    name, chain = _d2_and_walk_via_mirror()
    return ('depths (0,1,2) gave %r, want %r; depth 2 via mirror gave %r; '
            'chain from _d2 outwards %r' % (got, want, name, chain))


def _d2_and_walk_via_mirror():
    """Guarded, because this runs only on the failure path.  Evidence that
    raises would replace the diagnosis with a traceback about the diagnosis."""
    try:
        return _mirror_d2()
    except Exception as e:
        return ('<%s: %s>' % (type(e).__name__, e), [])


def too_great_a_depth_raises_valueerror():
    try:
        sys._getframe(9999)
    except ValueError as e:
        return str(e) == 'call stack is not deep enough'
    return False


def a_frame_reports_its_line():
    """f_lineno is the line the frame is executing, so it has to be inside this
    function -- checked as a RANGE, since asserting an absolute line number
    would break every time this file is edited above it."""
    lo = a_frame_reports_its_line.__code__.co_firstlineno
    f = sys._getframe()
    return isinstance(f.f_lineno, int) and lo < f.f_lineno < lo + 12


def a_frame_reports_its_file():
    return sys._getframe().f_code.co_filename.endswith('live_frames.py')


def _frame_and_its_back():
    f = sys._getframe()
    return f.f_code.co_name, getattr(f.f_back, 'f_code', None)


def a_frame_chains_to_its_caller():
    """f_back is what makes a walk possible, and it was never populated.

    Asked one call DEEP on purpose.  The outermost Python frame legitimately has
    no caller, and how this file is invoked decides whether there is one: run
    standalone there is a ``<module>'' frame above, but driven from Smalltalk (or
    from SUnit) the check function IS the outermost Python frame, so asking about
    its own f_back would test the harness rather than the chaining."""
    name, back_code = _frame_and_its_back()
    return (name == '_frame_and_its_back'
            and back_code is not None
            and back_code.co_name == 'a_frame_chains_to_its_caller')


def the_chain_ends_rather_than_looping():
    """A reconstructed f_back could easily cycle; walking has to terminate."""
    f = sys._getframe()
    seen = 0
    while f is not None and seen < 500:
        f = f.f_back
        seen += 1
    return f is None and seen < 500


def walk_stack_reports_the_call_chain():
    """The whole point: innermost first, one entry per Python call."""
    names = top()
    return names[:4] == ['_names_from_walk', 'leaf', 'mid', 'top']


def walk_stack_yields_frame_lineno_pairs():
    pairs = list(traceback.walk_stack(None))
    if not pairs:
        return False
    frame, lineno = pairs[0]
    return hasattr(frame, 'f_code') and isinstance(lineno, int)


def walk_stack_from_an_explicit_frame_starts_there():
    """``walk_stack(f)'' walks from f, not from the caller."""
    def _unused():
        pass
    f = sys._getframe()
    names = [fr.f_code.co_name for fr, _ in traceback.walk_stack(f)]
    return names[0] == 'walk_stack_from_an_explicit_frame_starts_there'


def format_stack_renders_the_live_stack():
    """What print_stack / format_stack are for.  Checked for SHAPE rather than
    exact text: the line numbers move whenever this file is edited."""
    text = ''.join(traceback.format_stack())
    return ('live_frames.py' in text
            and 'format_stack_renders_the_live_stack' in text)


def the_traceback_module_keeps_its_own_frames_out():
    """format_stack() stops at its CALLER: walk_stack / extract_stack /
    format_stack never appear in their own output.

    This is the check for the bug that only CI could see.  The frames were
    originally skipped by COUNT -- drop the innermost one, which is mine -- and
    under native code a frame whose ip does not resolve can go missing from the
    reconstructed chain, so "drop one" dropped the CALLER instead and the
    caller's name vanished from the render.  They are identified by FILE now,
    which cannot miscount however many survive."""
    text = ''.join(traceback.format_stack())
    own = [name for name in ('walk_stack', 'extract_stack', 'format_stack',
                             '_live_frames_of_caller', '_safe_lineno')
           if (', in %s\n' % name) in text]
    if own:
        # Returns the EVIDENCE rather than False.  The driver reports whatever a
        # check answers, so a failure names the frames that leaked and the render
        # they leaked into -- which matters here because this only ever failed on
        # CI, where native code is on and cannot be reproduced on macOS/arm64.
        return 'leaked %r in %r' % (own, text[:400])
    return True


def format_stack_ends_at_its_caller():
    """The innermost entry is the function that ASKED, and nothing inside the
    traceback module."""
    lines = traceback.format_stack()
    return bool(lines) and 'in format_stack_ends_at_its_caller' in lines[-1]


def extract_stack_produces_frame_summaries():
    summary = traceback.extract_stack()
    if not summary:
        return False
    innermost = summary[-1]
    return (innermost.name == 'extract_stack_produces_frame_summaries'
            and innermost.filename.endswith('live_frames.py'))


def the_machinery_keeps_itself_out_of_the_walk():
    """Grail compiles its own runtime helpers into env 1 too, and
    ``Object >> perform:'' / ``ExecBlock >> value'' decode to the plausible
    Python names ``perform'' and ``value'' -- which duly showed up at the
    innermost end of every walk until the filter required a derivable Python
    line.  Nothing named for the machinery belongs in a user's stack."""
    names = _names_from_walk()
    return not ({'perform', 'value', 'on', 'onException'} & set(names))


def a_live_frame_has_f_locals():
    """A LIVE frame answers its bound locals.

    Grail gets them from GsProcess class>>_frameContentsAt:, which reads the
    RUNNING process -- the instance-side selectors of the same name read a
    suspended one and answer nothing for a live gem, which is why this was once
    recorded as impossible.

    Note what this function does NOT assert: that ``self'' is present.  A Python
    method's receiver is the Smalltalk receiver here rather than a frame
    temporary, so a method's live locals are a subset of CPython's.  See
    tests/python/frame_f_locals.py for the shape-by-shape checks."""
    a_local = 17
    got = sys._getframe().f_locals
    return got.get('a_local') == 17


# ---------------------------------------------- deliberate Grail-only limits
def a_frame_with_no_bound_locals_has_no_f_locals():
    """GRAIL-SPECIFIC (CPython answers an empty dict).  Absent rather than empty,
    so ``this frame has no variables'' and ``this frame cannot say'' stay
    distinguishable -- the second is the honest answer for a traceback frame, for a
    suspended consumer process, and for a gem where the temporaries could not be
    read.  traceback.py reads it as ``getattr(frame, 'f_locals', None)'', so
    absent is a shape every consumer already handles."""
    return not hasattr(sys._getframe(), 'f_locals')


def a_traceback_frame_has_f_locals():
    """A TRACEBACK frame answers the raising frame's locals.

    This was a documented Grail limitation and is not one any more.  A traceback
    is built after the stack has unwound, from the VM's capture of
    (method, ip, receiver) triples which holds no temporaries -- so the locals are
    snapshotted at RAISE time instead, for the innermost frame only.  Innermost-only
    is what makes it affordable: O(1) per raise, where capturing every frame would
    be O(depth) per raise and O(depth-squared) retained.

    The frame the locals are attached to is checked by NAME against the frame they
    were taken from, because a traceback does not always contain the raising frame
    -- see a_traceback_frame_declines_another_frames_locals."""
    def raiser():
        marker = 'mine'
        raise ValueError('probe')
    try:
        raiser()
    except ValueError as exc:
        tb = exc.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        got = getattr(tb.tb_frame, 'f_locals', None)
        if got is None:
            return 'the raising frame reported no locals'
        if got.get('marker') != 'mine':
            return 'locals were %r' % (dict(got),)
    return True


def a_traceback_frame_declines_another_frames_locals():
    """The OUTER frames of a traceback must not report the innermost frame's
    variables as their own.

    Grail snapshots one frame's locals, so every other frame in the traceback has
    none to offer.  Handing the snapshot to whichever frame came first reported
    ``{'i': 1}`` under a frame named ``driver`` -- the raising frame's variables
    beneath the catching frame's name, which no consumer could detect.  CPython has
    real locals for every frame, so what both agree on is the narrower claim tested
    here: no frame reports a variable that belongs to a different one."""
    def inner():
        deep_only = object()
        raise ValueError('probe')
    def middle():
        inner()
    try:
        middle()
    except ValueError as exc:
        tb = exc.__traceback__
        outer_frames = []
        while tb.tb_next is not None:
            outer_frames.append(tb.tb_frame)
            tb = tb.tb_next
        for fr in outer_frames:
            loc = getattr(fr, 'f_locals', None)
            if loc is not None and 'deep_only' in loc:
                return '%s reported the raising frame\'s locals' % (
                    fr.f_code.co_name,)
    return True


def clear_frames_empties_a_traceback_frame():
    """traceback.clear_frames() releases what the snapshot pinned.  CPython's
    purpose is breaking reference cycles; Grail has no cycle to break but the
    references are real, and f_locals stays readable and empty afterwards."""
    import traceback as _tb
    def raiser():
        held = 'x'
        raise ValueError('probe')
    try:
        raiser()
    except ValueError as exc:
        t = exc.__traceback__
        inner = t
        while inner.tb_next is not None:
            inner = inner.tb_next
        before = len(getattr(inner.tb_frame, 'f_locals', {}))
        if before == 0:
            return 'nothing was captured to clear'
        _tb.clear_frames(exc.__traceback__)
        after = len(getattr(inner.tb_frame, 'f_locals', {}))
        if after != 0:
            return 'after clear_frames len was %d' % (after,)
    return True


class _Holder:
    def meth(self):
        return [fs.filename for fs in traceback.extract_stack()]


def a_method_s_live_frame_names_its_real_file():
    """A live frame for a CLASS-BODY def reports the module's file, not the
    ``<grail>'' placeholder.

    The two def shapes resolve their filename differently and only one used to
    work.  A module-level def's defining class IS its module, so a sys.modules
    lookup finds ``__file__''.  A class-body def's defining class is the PYTHON
    CLASS -- ``_Holder'', not ``live_frames'' -- so that lookup missed and every
    live frame for a method answered ``<grail>''.  Exception tracebacks were
    never affected (they take the filename from the catching function's PyCode),
    which is why code_filename.py passed throughout while test_format_stack and
    friends did not: the two mechanisms are separate.

    Both frames are checked, so a fix that repaired the method shape by breaking
    the module shape would fail here rather than look like progress."""
    names = _Holder().meth()
    if len(names) < 2:
        return False
    return (names[-1] == __file__          # _Holder.meth -- the class-body def
            and names[-2] == __file__      # this function -- module-level
            and '<grail>' not in names)


def a_nested_function_gets_its_own_frame():
    """A nested ``def'' deepens the live stack by exactly one, as in CPython.

    This recorded the opposite for as long as nested defs were invisible to the
    walk: a nested def compiles to a BLOCK, and the walk skipped every block
    because that is right for the other things blocks are used for (a
    comprehension body, a ``try'' body, an ``except'' handler).  The note here
    named the consequence exactly -- "it is why test_walk_stack still fails:
    that test asserts a nested call adds exactly one frame" -- so the fix is
    checked by inverting the assertion rather than deleting it.

    Two-argument blocks are how a Python function block is told from those
    others; see 9.45 and tests/python/nested_function_frames.py, which covers
    the same discriminator on the TRACEBACK path."""
    def deeper():
        return len(list(traceback.walk_stack(None)))

    here = len(list(traceback.walk_stack(None)))
    return deeper() == here + 1


class _CallSite:
    def meth(self):
        def fmt():
            return traceback.extract_stack()
        result = fmt()
        trailing = 1
        return (result, trailing)[0]


def method_frame_call_site():
    """``(reported, call_site, last_statement)'' for a method that called a
    nested def -- the three line numbers the check below compares.

    Split out from the check because the answer is GEM-DEPENDENT in Grail and the
    Smalltalk driver is the only place that can ask which gem it is.  Under
    CPython, and on an interpreted gem, ``reported == call_site''.  With native
    code enabled it is ``last_statement``, for the reason 9.10 documents:
    ip -> line derivation puts a protected block's caret PAST the whole block, so
    the nearest preceding ``___curPos___'' literal is the method's final
    statement.  See TracebackTestCase>>testAMethodFrameReportsItsCallSite."""
    result = _CallSite().meth()
    first = _CallSite.meth.__code__.co_firstlineno
    reported = None
    for entry in result:
        if entry.name == 'meth':
            reported = entry.lineno
            break
    return (reported, first + 3, first + 5)


def a_method_s_frame_reports_the_call_site():
    """The frame for a method that called a nested def reports the line of the
    CALL, not the method's last statement.

    ``_CallSite.meth'' calls ``fmt()'' and then has two more statements.  Grail
    reported the last of them for every frame of this shape, and the reason is
    worth stating because it looks like an off-by-one and is not: a class-body
    def whose body contains a nested def compiles with the body inside a BLOCK,
    so the METHOD's instruction pointer sits at the end of that block and the
    ip -> line derivation answers the method's final statement.  The enclosing
    block frame, one hop inside the method, carries the call site exactly -- the
    walk computed it and then discarded it.

    A module-level def is unaffected (its body is not wrapped), which is why
    this needs a method to reproduce and why the checks above did not catch it.

    This is the CPython statement of the rule, so it stays in ``checks'' and is
    what the fixture gate verifies.  Grail asserts it through the Smalltalk
    driver instead, which knows whether native code is on -- with native code the
    call site is not recoverable at all, and the driver pins THAT answer rather
    than skipping."""
    reported, call_site, _last = method_frame_call_site()
    if reported == call_site:
        return True
    return 'meth reported line %r, wanted %r' % (reported, call_site)


class _MixinBase:
    def rendered(self):
        return traceback.format_stack()


class _ByMixin(_Holder, _MixinBase):
    pass


def a_mixin_method_s_frame_names_its_real_file():
    """A method reached through a SECOND base reports its real file.

    Grail merges multiple inheritance by RECOMPILING the secondary bases'
    methods onto the subclass, but the per-class table that holds each method's
    PyCode is built from one class body, so the copied method's code object
    stays behind in the base's table -- where no superclass walk from the
    subclass can reach it.  Every mixin method's live frame therefore reported
    ``<grail>'', while the same method's ``__code__'' beside it reported the real
    path, because THAT lookup already consulted the MRO.

    ``class TestTracebackFormat(unittest.TestCase, TracebackFormatMixin)'' is
    the shape in CPython's own test suite, so this is not a corner."""
    text = ''.join(_ByMixin().rendered())
    if '<grail>' in text:
        return 'reported <grail>: %r' % (text[:400],)
    return 'live_frames.py' in text and ', in rendered' in text


def format_stack_indents_each_frame_by_two():
    """Two spaces before ``File'', four before the source line -- CPython's
    layout, and the one every test that greps a traceback assumes.

    format_stack is nothing but format_list over the extracted frames, and
    format_list used to render each entry as ``'  ' + str(entry)'' while a
    FrameSummary's own text already carried the two-space indent.  So every
    frame came out indented FOUR spaces: correct-looking in isolation, wrong
    against any expected text."""
    lines = traceback.format_stack()
    if not lines:
        return False
    location, _, source = lines[-1].partition('\n')
    return (location.startswith('  File "')
            and not location.startswith('   ')
            and source.startswith('    ')
            and not source.startswith('     '))


def format_list_renders_a_frame_summary():
    """format_list accepts what extract_stack answers, and renders it once."""
    summary = traceback.extract_stack()
    rendered = traceback.format_list(summary[-1:])
    return (len(rendered) == 1
            and rendered[0].startswith('  File "')
            and 'in format_list_renders_a_frame_summary' in rendered[0]
            and rendered[0].endswith('\n'))


def format_list_renders_a_legacy_four_tuple():
    """The other shape CPython accepts: the ``(filename, lineno, name, line)''
    tuple extract_tb answered before FrameSummary existed."""
    return traceback.format_list([('f.py', 3, 'g', 'x = 1')]) == [
        '  File "f.py", line 3, in g\n    x = 1\n']


def format_list_rejects_a_bare_string():
    """An entry that is neither a FrameSummary nor a 4-tuple is an ERROR.

    Grail used to answer ``['  some string\\n']'' here, because format_list
    rendered entries with str().  That tolerance is what hid the double-indent
    bug above, and a Grail fixture asserted it -- so the tolerance had a test
    defending it.  CPython raises ValueError (too many values to unpack)."""
    try:
        traceback.format_list(['frame-one', 'frame-two'])
    except ValueError:
        return True
    except Exception as e:
        return 'raised %s, wanted ValueError' % type(e).__name__
    return 'no error'


def a_frame_summary_renders_as_its_repr():
    """FrameSummary defines no ``__str__'', so str() gives the repr.

    Grail had one that produced the ``  File ..., line N, in f'' row, which
    existed only to serve format_list's str()-based rendering.  Nothing in
    CPython renders a frame that way, and keeping it would invite the next
    reader to do so again."""
    text = str(traceback.extract_stack()[-1])
    return text.startswith('<FrameSummary file ') and 'File "' not in text


def format_frame_summary_carries_its_own_newline():
    """The hook owns the trailing newline; ``format'' appends what it answers
    verbatim.  A subclass that renders a frame some other way therefore gets
    exactly its own text back -- CPython's test_custom_format_frame asserts
    precisely that, and Grail appended a newline the override never asked
    for."""
    class Custom(traceback.StackSummary):
        # ``**kwargs'' because CPython's format() passes colorize= through.
        def format_frame_summary(self, frame_summary, **kwargs):
            return '%s:%s' % (frame_summary.filename, frame_summary.lineno)

    summary = traceback.extract_stack()
    # Constructed directly, not via from_list: CPython's from_list hardcodes
    # ``StackSummary()'' rather than the receiving class, so Custom.from_list
    # would answer a plain StackSummary there.
    plain = traceback.StackSummary(summary[-1:])
    custom = Custom(summary[-1:])
    return (plain.format()[0].endswith('\n')
            and custom.format() == ['%s:%s' % (summary[-1].filename,
                                               summary[-1].lineno)])


if __name__ == '__main__':
    checks = [
        getframe_returns_a_frame,
        getframe_names_its_caller,
        depth_counts_outwards,
        too_great_a_depth_raises_valueerror,
        a_frame_reports_its_line,
        a_frame_reports_its_file,
        a_frame_chains_to_its_caller,
        the_chain_ends_rather_than_looping,
        walk_stack_reports_the_call_chain,
        walk_stack_yields_frame_lineno_pairs,
        walk_stack_from_an_explicit_frame_starts_there,
        format_stack_renders_the_live_stack,
        the_traceback_module_keeps_its_own_frames_out,
        format_stack_ends_at_its_caller,
        extract_stack_produces_frame_summaries,
        a_method_s_live_frame_names_its_real_file,
        the_machinery_keeps_itself_out_of_the_walk,
        a_nested_function_gets_its_own_frame,
        a_method_s_frame_reports_the_call_site,
        a_mixin_method_s_frame_names_its_real_file,
        format_stack_indents_each_frame_by_two,
        format_list_renders_a_frame_summary,
        format_list_renders_a_legacy_four_tuple,
        format_list_rejects_a_bare_string,
        a_frame_summary_renders_as_its_repr,
        format_frame_summary_carries_its_own_newline,
        a_live_frame_has_f_locals,
        a_traceback_frame_has_f_locals,
        a_traceback_frame_declines_another_frames_locals,
        clear_frames_empties_a_traceback_frame,
    ]
    grail_only = [
        a_frame_with_no_bound_locals_has_no_f_locals,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # These assert a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure;  XPASS means
    # CPython now agrees, i.e. the check no longer documents a difference and
    # should be retired or moved up into `checks'.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
