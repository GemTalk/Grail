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
