"""Fixtures for multi-frame tracebacks built from the VM's captured stack.

Driven by PythonTests>>TracebackTestCase.  Each function answers True when the
behaviour matches CPython, so a failure names the specific rule.

Line numbers here are load-bearing: the assertions name them explicitly, so
adding or removing a line above any of these functions will (correctly) fail
these tests rather than silently weaken them.  The raise is on line 18, and the
calls that reach it on lines 22, 26 and 31.  Deliberately NO trailing comments
on those lines -- FrameSummary.line is the whole stripped source line, so a
comment would become part of the expected text.
"""

import traceback


def leaf(x):
    raise ValueError('deep')


def middle(x):
    return leaf(x + 1)


def outer(x):
    return middle(x + 1)


def catcher():
    try:
        outer(1)
    except ValueError as e:
        return e
    return None


def traceback_spans_every_frame():
    """The whole propagation path, outermost first -- CPython's "most recent
    call last".  Before the captured-stack walk this was ONE frame (the
    catching function), so tb_next was always None."""
    exc = catcher()
    frames = traceback.extract_tb(exc.__traceback__)
    return [(f.name, f.lineno) for f in frames] == [
        ('catcher', 31), ('outer', 26), ('middle', 22), ('leaf', 18)]


def the_traceback_stops_at_the_catching_function():
    """A traceback records the propagation path from raise to CATCH, not the
    whole stack: the caller of the catching function must NOT appear, or under a
    test runner the chain would run on into unittest's own frames."""
    exc = catcher()
    names = [f.name for f in traceback.extract_tb(exc.__traceback__)]
    return ('traceback_stops' not in ' '.join(names)
            and names[0] == 'catcher'
            and 'the_traceback_stops_at_the_catching_function' not in names)


def tb_next_chains_inward():
    """tb_next walks from the catching frame INWARD to the raise point, and the
    last node is where the exception was raised."""
    tb = catcher().__traceback__
    seen = []
    while tb is not None:
        seen.append(tb.tb_frame.f_code.co_name)
        tb = tb.tb_next
    return seen == ['catcher', 'outer', 'middle', 'leaf']


def every_frame_names_its_source_file():
    """co_filename is a real path on every frame, not just the catching one --
    without it linecache cannot read the source line for the deeper frames."""
    frames = traceback.extract_tb(catcher().__traceback__)
    return (len(frames) == 4
            and all(f.filename.endswith('/tests/python/frame_depth.py')
                    for f in frames))


def every_frame_resolves_its_source_line():
    """The payoff of the real filenames: each frame renders the source text of
    its own line."""
    frames = traceback.extract_tb(catcher().__traceback__)
    return ([f.line for f in frames]
            == ['outer(1)', 'return middle(x + 1)', 'return leaf(x + 1)',
                "raise ValueError('deep')"])


def a_positive_limit_keeps_the_first_frames():
    """CPython: a positive limit keeps the first N entries of the traceback."""
    tb = catcher().__traceback__
    nolim = traceback.extract_tb(tb)
    return (traceback.extract_tb(tb, limit=2) == nolim[:2]
            and traceback.extract_tb(tb, limit=10) == nolim
            and traceback.extract_tb(tb, limit=0) == [])


def a_negative_limit_keeps_the_last_frames():
    """...and a negative limit keeps the LAST abs(N) -- the walk therefore
    cannot stop early."""
    tb = catcher().__traceback__
    nolim = traceback.extract_tb(tb)
    return (traceback.extract_tb(tb, limit=-2) == nolim[-2:]
            and traceback.extract_tb(tb, limit=-10) == nolim)


def sys_tracebacklimit_supplies_the_default():
    """With no explicit limit, sys.tracebacklimit does -- but a NEGATIVE
    tracebacklimit means "show nothing", not "show the last N".  The two rules
    genuinely differ, and CPython's LimitTests asserts both."""
    import sys
    tb = catcher().__traceback__
    nolim = traceback.extract_tb(tb)
    # Save and RESTORE the original: deleting only when it was absent leaks
    # ``tracebacklimit = -1'' into every later check in this module, which
    # silently emptied their tracebacks.  (CPython's own test avoids this with
    # support.swap_attr.)
    had = hasattr(sys, 'tracebacklimit')
    previous = getattr(sys, 'tracebacklimit', None)
    try:
        sys.tracebacklimit = 2
        if traceback.extract_tb(tb) != nolim[:2]:
            return False
        sys.tracebacklimit = 0
        if traceback.extract_tb(tb) != []:
            return False
        sys.tracebacklimit = -1
        if traceback.extract_tb(tb) != []:
            return False
        # An explicit limit still wins over tracebacklimit.
        if traceback.extract_tb(tb, limit=3) != nolim[:3]:
            return False
    finally:
        if had:
            sys.tracebacklimit = previous
        else:
            del sys.tracebacklimit
    return True


def format_exception_honours_limit():
    """limit reaches the rendered text, not just the extracted frames."""
    exc = catcher()
    full = traceback.format_exception(exc)
    two = traceback.format_exception(exc, limit=2)
    # header + 2 frames*2 lines + the exception line
    return (len(two) < len(full)
            and two[0] == 'Traceback (most recent call last):\n'
            and two[-1] == 'ValueError: deep\n')


def a_generator_raise_still_produces_a_traceback():
    """Known limitation, pinned deliberately: a generator body runs in a forked
    GsProcess, so the captured stack does not contain the CONSUMER's frames
    (§9.9).  Such a raise must still yield a usable traceback rather than none
    -- the single-frame fallback covers it."""
    def gen():
        yield 1
        raise ValueError('from generator')

    try:
        for _ in gen():
            pass
    except ValueError as e:
        frames = traceback.extract_tb(e.__traceback__)
        text = ''.join(traceback.format_exception(e))
        return len(frames) >= 1 and 'ValueError: from generator' in text
    return False
