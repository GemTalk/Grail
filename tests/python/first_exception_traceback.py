"""The session's FIRST exception must carry its caller frames, even when the
runtime raised it rather than a ``raise'' statement.

Driven by PythonTests>>FirstExceptionTracebackTestCase, which is where the
"first" in the title comes from: this file cannot arrange a fresh session by
itself, so the peer clears Grail's per-session capture memo and turns the VM
flag back off before calling in, reproducing the state a brand-new session is
in.  Under CPython the checks are simply true, which is the point -- they
describe CPython's behaviour, not Grail's workaround for it.

WHAT WENT WRONG.  Grail reconstructs a traceback from the VM's raise-time stack
capture, which is a per-session GEM configuration
(#GemExceptionSignalCapturesStack) that has to be armed before the signal or
there is nothing to walk.  Arming lived only on the explicit-``raise'' path
(BaseException class>>___pyRaiseNew___:args:kw:cause:), so an exception the
runtime raised on the user's behalf -- ZeroDivisionError from ``1/0'',
TypeError, AttributeError, KeyError, every one of which is far more common in
real code than an explicit raise -- got a ONE-FRAME traceback when it happened
to be the first exception of the session.  Everything after any explicit raise
was correct, so the bug was invisible in any session that had already raised.

WHY IT MATTERED BEYOND THE FIRST TRACEBACK.  It made a session's traceback
depth depend on which KIND of exception came first, which no program controls,
and it made the frame-shape tests order-dependent: they passed inside the full
SUnit suite (something raises explicitly long before they run) and failed 25/25
in a fresh session.  On CI, where shard composition decides the order, that
surfaced as an intermittent TracebackTestCase>>testLiveFramesAndGetframe.
"""

import traceback


def _implicit_frames():
    """A nested function whose body divides by zero.  Two Python frames."""
    def inner():
        1 / 0
    try:
        inner()
    except ZeroDivisionError as e:
        return [f.name for f in traceback.extract_tb(e.__traceback__)]
    return None


def _explicit_frames():
    """The same shape, raised by a ``raise'' statement."""
    def inner():
        raise ValueError('x')
    try:
        inner()
    except ValueError as e:
        return [f.name for f in traceback.extract_tb(e.__traceback__)]
    return None


def an_implicit_first_exception_reports_its_caller():
    """The regression itself: this is the one that answered ['_implicit_frames'].

    Returns the EVIDENCE rather than False, because the state it depends on is
    session-wide and set up by the caller -- a bare False would not say whether
    the frame was missing or the harness failed to clear the memo."""
    got = _implicit_frames()
    want = ['_implicit_frames', 'inner']
    return True if got == want else 'implicit gave %r, want %r' % (got, want)


def an_explicit_first_exception_reports_its_caller():
    """The path that always worked, kept as the control: if BOTH regress the
    cause is the capture walk, not the arming."""
    got = _explicit_frames()
    want = ['_explicit_frames', 'inner']
    return True if got == want else 'explicit gave %r, want %r' % (got, want)


def both_kinds_agree():
    """Neither kind of raise is privileged -- CPython treats them alike, and the
    bug was precisely that Grail did not."""
    imp, exp = _implicit_frames(), _explicit_frames()
    if imp is None or exp is None:
        return 'a probe returned None: implicit=%r explicit=%r' % (imp, exp)
    if len(imp) == len(exp):
        return True
    return 'depths differ: implicit=%r explicit=%r' % (imp, exp)


if __name__ == '__main__':
    checks = [
        an_implicit_first_exception_reports_its_caller,
        an_explicit_first_exception_reports_its_caller,
        both_kinds_agree,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
