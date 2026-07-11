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


def run_one(tc):
    # Run a single TestCase; returns (failures, errors, skipped) counts.
    result = unittest.TestResult()
    tc.run(result)
    return (len(result.failures), len(result.errors), len(result.skipped))
