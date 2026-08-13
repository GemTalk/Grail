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

A NESTED function gets no frame of its own.  Grail compiles a nested ``def'' into
its enclosing method rather than a separate one, so a nested call does not deepen
the Python stack.  This is a pre-existing gap that shows up here for the first
time, and the check below asserts what Grail DOES do, with the CPython answer
stated in the comment.

Run this file under CPython (``python3 tests/python/live_frames.py'') to see what
it produces -- that is where the expectations come from.  The two checks that
document Grail-specific limits are marked, and are the only ones that would
answer differently there.
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


def depth_counts_outwards():
    """Each increment steps one frame further out."""
    return (_d0() == '_d0'
            and _call_d1() == '_call_d1'
            and _call_d2() == '_call_d2')


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


# ---------------------------------------------- deliberate Grail-only limits
def a_frame_has_no_f_locals():
    """GRAIL-SPECIFIC (CPython has f_locals).  Asserted so the absence is a
    decision on record: a Python function's locals are Smalltalk temps, and the
    raise-time capture holds neither their values nor their names.  An empty dict
    here would let callers believe a frame had no variables."""
    return not hasattr(sys._getframe(), 'f_locals')


def a_nested_function_gets_no_frame_of_its_own():
    """GRAIL-SPECIFIC (CPython gives every call a frame).  A nested ``def'' is
    compiled into its enclosing method, so calling it does not deepen the Python
    stack.  Pre-existing, and it is why test_walk_stack still fails: that test
    asserts a nested call adds exactly one frame."""
    def deeper():
        return len(list(traceback.walk_stack(None)))

    here = len(list(traceback.walk_stack(None)))
    return deeper() == here


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
        the_machinery_keeps_itself_out_of_the_walk,
    ]
    grail_only = [
        a_frame_has_no_f_locals,
        a_nested_function_gets_no_frame_of_its_own,
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
