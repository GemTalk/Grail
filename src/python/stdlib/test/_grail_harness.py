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
    tc.run(result)
    detail = ''
    if result.errors:
        detail = 'E: ' + _first_line(result.errors[0][1])
    elif result.failures:
        detail = 'F: ' + _first_line(result.failures[0][1])
    return (len(result.failures), len(result.errors), len(result.skipped), detail)
