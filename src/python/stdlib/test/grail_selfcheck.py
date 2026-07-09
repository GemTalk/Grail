# GRAIL: tiny self-check fixture for the CPython test harness.
#
# NOT a vendored CPython module and NOT in the manifest -- it exercises
# the harness plumbing (runModule: as __main__, and the score() discovery
# path) from CPythonHarnessTestCase.  Its name deliberately does not start
# with "test_" so no discovery glob picks it up.
#
# Two TestCase subclasses give a known outcome under discovery:
#   SelfCheckPass.test_ok    -> pass
#   SelfCheckPass.test_skip  -> skip
#   SelfCheckFail.test_bad   -> fail
# => (testsRun=3, failures=1, errors=0, skipped=1)

import unittest


class SelfCheckPass(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(2, 1 + 1)

    def test_skip(self):
        self.skipTest("intentional")


class SelfCheckFail(unittest.TestCase):
    def test_bad(self):
        self.assertEqual(1, 2)


def _run():
    # Explicit suite (no reliance on dir(__main__)) so the __main__ path
    # produces the same numbers as discovery.
    suite = unittest.TestSuite([
        SelfCheckPass("test_ok"),
        SelfCheckPass("test_skip"),
        SelfCheckFail("test_bad"),
    ])
    result = unittest.TestResult()
    suite.run(result)
    return (result.testsRun,
            len(result.failures),
            len(result.errors),
            len(result.skipped))


RESULT = _run()
