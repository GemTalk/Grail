# GRAIL: fixture exercising the unittest features Grail added for the
# CPython conformance push (subTest, addCleanup, assertWarns).  NOT a
# vendored CPython module and NOT in the manifest; the name does not
# start with "test_" so no discovery glob picks it up.  Driven by
# CPythonHarnessTestCase.

import unittest
import warnings


class FeatureCheck(unittest.TestCase):
    def test_subtest_and_cleanup(self):
        self.log = []
        self.addCleanup(self.log.append, "a")
        self.addCleanup(self.log.append, "b")
        for i in [1, 2]:
            with self.subTest(i=i):
                self.assertEqual(i, i)

    def test_warns_triggered(self):
        with self.assertWarns(DeprecationWarning):
            warnings.warn("old", DeprecationWarning, stacklevel=2)


class FeatureCheckFail(unittest.TestCase):
    def test_warns_missing(self):
        # assertWarns must FAIL when nothing warns.
        with self.assertWarns(DeprecationWarning):
            pass


def _run():
    tc = FeatureCheck("test_subtest_and_cleanup")
    suite = unittest.TestSuite([
        tc,
        FeatureCheck("test_warns_triggered"),
        FeatureCheckFail("test_warns_missing"),
    ])
    result = unittest.TestResult()
    suite.run(result)
    # cleanups ran LIFO after the first test
    cleanups_ok = tc.log == ["b", "a"]
    return (result.testsRun,
            len(result.failures),
            len(result.errors),
            cleanups_ok)


RESULT = _run()
