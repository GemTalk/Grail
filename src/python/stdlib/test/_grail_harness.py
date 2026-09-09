# GRAIL: in-process scoring helper for the CPython regression-test
# harness.  Deliberately dunder-free at module level so it is not itself
# discovered as a test module, and named with a leading underscore so it
# is skipped by any package-level discovery.
#
# score(mod) discovers every unittest.TestCase subclass defined in the
# given module object (via the native unittest loader, which already
# guards Grail's uncatchable issubclass-on-non-class error) and runs
# them, returning a plain 4-tuple of counts:
#
#     (testsRun, failures, errors, skipped)
#
# The driver (scripts/run_one_cpython_module.gs) imports the module
# under its REAL dotted name -- not as __main__ -- so a trailing
# `if __name__ == "__main__": unittest.main()` does not fire, and then
# calls score() to get the numbers.

import unittest


def score(mod):
    suite = unittest.defaultTestLoader.loadTestsFromModule(mod)
    result = unittest.TestResult()
    suite.run(result)
    return (result.testsRun,
            len(result.failures),
            len(result.errors),
            len(result.skipped))


def cases(mod):
    # Flattened list of the module's individual TestCase instances, for
    # per-test bisection from the Smalltalk side (an uncatchable
    # Smalltalk error escaping one test must not hide the tests after
    # it, so the loop-with-rescue lives in topaz, not here).
    suite = unittest.defaultTestLoader.loadTestsFromModule(mod)
    found = []
    def _flat(s):
        for t in s:
            if isinstance(t, unittest.TestCase):
                found.append(t)
            else:
                _flat(t)
    _flat(suite)
    return found


def _first_line(err):
    try:
        text = str(err)
    except Exception:
        return ''
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return lines[-1][:200] if lines else ''


def detail_full(tc):
    # Diagnostic helper (not used by the scoreboard): run one TestCase and
    # return the FULL failure/error/skip text, so a Smalltalk-side probe
    # can see every line self.fail() emitted, not just the last one.
    result = unittest.TestResult()
    tc.run(result)
    parts = []
    for _t, txt in result.errors:
        parts.append('E:\n' + str(txt))
    for _t, txt in result.failures:
        parts.append('F:\n' + str(txt))
    for _t, txt in result.skipped:
        parts.append('S: ' + str(txt))
    return '\n'.join(parts) if parts else 'PASS'


def run_one(tc):
    # Run a single TestCase; returns (failures, errors, skipped, detail)
    # where detail is a one-line summary of the first failure/error --
    # the shell-side scoreboard buckets these to find shared root
    # causes across a module's tail.
    result = unittest.TestResult()
    # Fire class fixtures around the single test.  The per-test bisection
    # loop (topaz-side) hands us individual TestCase instances, and a bare
    # ``tc.run()`` does NOT invoke setUpClass/tearDownClass -- those are the
    # TestSuite's job -- so a test relying on class-level setup (e.g.
    # ``cls.obj = cls.cls()`` in a shared mixin) saw an unset attribute.
    # Resilient by design: if setUpClass raises (a fixture that Grail can't
    # satisfy), fall back to the bare run so one broken class fixture does
    # not tank the tests that pass without it -- preserving the prior
    # per-test behaviour exactly where setUpClass was absent or trivial.
    cls = type(tc)
    did_setup = False
    setup_err = ''
    setup = getattr(cls, 'setUpClass', None)
    if setup is not None:
        try:
            setup()
            did_setup = True
        except Exception as e:
            # Keep the message.  Swallowing it outright is the resilient
            # behaviour we want -- one unsatisfiable class fixture must not
            # tank the tests that pass without it -- but swallowing it
            # SILENTLY made a broken fixture indistinguishable from an absent
            # one.  test.test_gettext writes its .mo catalogs in setUpClass;
            # when that raised, 21 tests reported a bare FileNotFoundError
            # naming a file whose absence had nothing to do with the test.
            did_setup = False
            setup_err = type(e).__name__ + ': ' + str(e)
    try:
        # ``tc(result)'', as CPython's own TestSuite runs a case -- through
        # TestCase.__call__, which exists here to support exactly that.
        #
        # THIS WAS ``tc.run(result)'' UNTIL 2026-09-06, to save one frame.
        # Grail's recursion limit is PHYSICAL stack exhaustion (AlmostOutOfStack,
        # converted by ___recursionGuard___) rather than CPython's counter, so
        # the depth available to Python is whatever the gem has left, and on
        # 2026-08-19 the extra frame was measured to cost test_richcmp's
        # MiscTest.test_recursion (OK -> ERROR) while gaining test_traceback's
        # TestStack.test_extract_stack_limit the fifth frame it asserts on.
        # One real recursion test was not worth one frame-count assertion.
        #
        # THAT TRADE NO LONGER EXISTS, and the reason is dated: PR #800 (merged
        # 2026-09-02) doubled achievable method recursion depth under the suite's
        # settings, 1212 -> 2599, two weeks after the measurement above.
        # Re-measured 2026-09-06 as a full-corpus A/B, control and treatment one
        # after the other on the same machine: across all 102 modules the ONLY
        # row that moves is test.test_traceback, FAIL/2 -> FAIL/1.  test_richcmp
        # stays OK (4 runs), and no module that exhausts the stack -- test_copy
        # is the one that does it twice -- changes at all.
        #
        # Re-run that A/B before shrinking the stack budget again: this frame is
        # free at 2599 and was not at 1212.  Making the recursion limit
        # counter-based would remove the question permanently.
        tc(result)
    finally:
        if did_setup:
            teardown = getattr(cls, 'tearDownClass', None)
            if teardown is not None:
                try:
                    teardown()
                except Exception:
                    pass
            # Drain addClassCleanup registrations too.  tearDownClass alone is
            # only half the fixture: test.test_gettext registers its
            # ``rmtree(LOCALEDIR)'' as a CLASS CLEANUP, so without this the
            # per-test loop left an ``xx/'' locale tree behind in the checkout
            # -- once per class, never removed.
            cleanups = getattr(cls, 'doClassCleanups', None)
            if cleanups is not None:
                try:
                    cleanups()
                except Exception:
                    pass
    detail = ''
    if result.errors:
        detail = 'E: ' + _first_line(result.errors[0][1])
    elif result.failures:
        detail = 'F: ' + _first_line(result.failures[0][1])
    # Only annotate a test that actually went wrong: a class whose fixture
    # failed but whose tests pass anyway needs no noise.
    if setup_err and detail:
        detail = detail + ' [setUpClass failed: ' + setup_err[:120] + ']'
    return (len(result.failures), len(result.errors), len(result.skipped), detail)
