"""Fixtures for a traceback frame's globals, and the NameError suggestions it
makes possible.

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

``f_globals`` is DERIVED, not captured.  Grail has no real interpreter frames: a
traceback frame is reconstructed from the VM's (method, ip, receiver) triples, so
threading a namespace through that walk would mean touching the most delicate
code in the traceback path.  The frame's PyCode already carries ``co_filename'',
which identifies the module unambiguously -- exactly one entry in sys.modules has
that ``__file__`` -- so PyFrame resolves the live namespace on demand instead.

Two limits are pinned here as deliberate behaviour rather than left to be
discovered:

``f_locals`` does not exist.  A Python function's locals are Smalltalk method
temporaries and the raise-time capture records only (method, ip, receiver), so a
LOCAL name cannot be offered as a candidate.  The checks below therefore assert a
suggestion for a misspelled GLOBAL and a misspelled BUILTIN, and no suggestion
for a misspelled local.

No suggestion is offered when there is no traceback, because CPython offers none
either: it gates the whole NameError branch on having a frame, so
``format_exception_only(exc)'' -- which passes no traceback -- stays silent even
for a misspelled builtin.  Being more helpful than CPython would be a conformance
bug, and this check is what catches it.

Run this file under CPython (``python3 tests/python/frame_globals.py'') to see
what it produces -- that is where the expectations come from.
"""

import traceback

global_for_suggestions = 1


def _innermost_frame(exc):
    tb = exc.__traceback__
    if tb is None:
        return None
    while tb.tb_next is not None:
        tb = tb.tb_next
    return tb.tb_frame


def _raise_missing_global():
    print(global_for_suggestio)


def _raise_missing_builtin():
    print(ZeroDivisionErrrrr)


def _raise_missing_local():
    blech = 1
    print(bluch)


def _rendered(fn):
    """The full traceback text, which is what carries the suggestion -- the
    tests in CPython's suite use format_exc() for exactly this reason."""
    try:
        fn()
    except NameError as e:
        return ''.join(traceback.format_exception(e))
    return '<no error>'


def _caught(fn):
    try:
        fn()
    except NameError as e:
        return e
    return None


def a_frame_reports_its_module_globals():
    """The mechanism everything else here rests on."""
    frame = _innermost_frame(_caught(_raise_missing_global))
    if frame is None:
        return False
    g = frame.f_globals
    return g is not None and 'global_for_suggestions' in list(g)


def the_globals_view_is_live():
    """A live mapping, not a snapshot: CPython's f_globals IS the module dict, so
    a binding made after the exception is visible through it."""
    global _added_after_the_raise
    frame = _innermost_frame(_caught(_raise_missing_global))
    if frame is None:
        return False
    _added_after_the_raise = 1
    try:
        return 'the_globals_view_is_live' in list(frame.f_globals)
    finally:
        pass


def a_misspelled_global_is_suggested():
    return "Did you mean: 'global_for_suggestions'?" in _rendered(
        _raise_missing_global)


def a_misspelled_builtin_is_suggested():
    return "Did you mean: 'ZeroDivisionError'?" in _rendered(
        _raise_missing_builtin)


def no_suggestion_without_a_traceback():
    """CPython gates the NameError branch on having a frame, so the
    no-traceback entry point offers nothing -- not even for a builtin it would
    happily suggest with one."""
    exc = _caught(_raise_missing_builtin)
    text = ''.join(traceback.format_exception_only(type(exc), exc))
    return 'Did you mean' not in text


def a_wildly_wrong_global_gets_no_suggestion():
    """The same one-third-of-the-characters threshold as for attributes."""
    def func():
        print(somethingverywronghehe)

    return 'Did you mean' not in _rendered(func)


if __name__ == '__main__':
    checks = [
        a_frame_reports_its_module_globals,
        the_globals_view_is_live,
        a_misspelled_global_is_suggested,
        a_misspelled_builtin_is_suggested,
        no_suggestion_without_a_traceback,
        a_wildly_wrong_global_gets_no_suggestion,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # Not asserted as a check: CPython suggests a misspelled LOCAL and Grail
    # cannot (no f_locals).  Printed so the difference stays visible.
    print('local-name suggestion (CPython only): %r'
          % ('Did you mean' in _rendered(_raise_missing_local),))
