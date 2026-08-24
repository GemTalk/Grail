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
    catching function), so tb_next was always None.

    Answers the EVIDENCE rather than False when it does not match, the
    convention first_exception_traceback.py already uses: this pins names AND
    line numbers, so a bare False cannot say whether a frame went missing,
    arrived out of order, or merely resolved to the wrong line.  That
    distinction is the whole diagnosis of the intermittent failure this test
    has, and it cannot be recovered after the run.

    Note for editors: nothing may be added ABOVE catcher/outer/middle/leaf --
    their line numbers are asserted here.  This docstring is safe because it
    sits below all four."""
    exc = catcher()
    frames = traceback.extract_tb(exc.__traceback__)
    got = [(f.name, f.lineno) for f in frames]
    want = [('catcher', 31), ('outer', 26), ('middle', 22), ('leaf', 18)]
    if got == want:
        return True
    # On mismatch, say whether only the NUMBER is wrong or the frame's whole
    # identity is: the filename shows which module the walk thought it was in,
    # and f.line is the text it resolved FROM the line number, so a wrong
    # number with matching text would be impossible.
    detail = [(f.name, f.lineno, f.filename.rsplit('/', 1)[-1], f.line)
              for f in frames]
    return 'got %r, want %r, detail %r' % (got, want, detail)


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
    want = ['catcher', 'outer', 'middle', 'leaf']
    return True if seen == want else 'got %r, want %r' % (seen, want)


def every_frame_names_its_source_file():
    """co_filename is a real path on every frame, not just the catching one --
    without it linecache cannot read the source line for the deeper frames."""
    frames = traceback.extract_tb(catcher().__traceback__)
    if (len(frames) == 4
            and all(f.filename.endswith('/tests/python/frame_depth.py')
                    for f in frames)):
        return True
    return 'got %r' % ([(f.name, f.filename) for f in frames],)


def every_frame_resolves_its_source_line():
    """The payoff of the real filenames: each frame renders the source text of
    its own line."""
    frames = traceback.extract_tb(catcher().__traceback__)
    got = [f.line for f in frames]
    want = ['outer(1)', 'return middle(x + 1)', 'return leaf(x + 1)',
            "raise ValueError('deep')"]
    return True if got == want else 'got %r, want %r' % (got, want)


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


def a_generator_raise_spans_the_consumer_and_the_generator():
    """This used to pin the LIMITATION -- a generator body runs in a forked
    GsProcess, so its captured stack held none of the consumer's frames and such a
    raise fell back to a single frame.  §9.12 splices the two captures, so the
    chain now spans both sides: the consumer's ``for'' and the generator's
    ``raise''.

    Note what the old version asserted: ``len(frames) >= 1''.  §9.9 called it the
    check that would catch the behaviour change when the boundary was spliced, and
    it would not have.  This one asserts the exact positions.

    It asserts the SOURCE LINES rather than names or numbers.  Names, because the
    generator here is a NESTED def and Grail names a nested function's frame after
    its enclosing function (measured: ``[('outer', 10), ('outer', 7)]'' where
    CPython says ``[('outer', 10), ('gen', 7)]'') -- a separate, pre-existing gap,
    §9.12, with the naming covered by module-level generators in
    tests/python/generator_frames.py.  Numbers, because line constants for the
    check's own body have to be edited every time anything above it moves; the
    source text pins the same two positions and reads as what it means."""
    def gen():
        yield 1
        raise ValueError('from generator')

    try:
        for _ in gen():
            pass
    except ValueError as e:
        frames = traceback.extract_tb(e.__traceback__)
        text = ''.join(traceback.format_exception(e))
        return ([f.line for f in frames]
                == ['for _ in gen():', "raise ValueError('from generator')"]
                and 'ValueError: from generator' in text)
    return False
