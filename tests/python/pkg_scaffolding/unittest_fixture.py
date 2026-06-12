# Fixture for UnittestTestCase.  A sample unittest.TestCase subclass
# with one of each outcome (pass / fail / error / skip), plus
# setUp/tearDown bookkeeping, run through TestLoader + TestResult.

import unittest

_log = []


class SampleTests(unittest.TestCase):
    def setUp(self):
        _log.append("setUp")
        self.base = 10

    def tearDown(self):
        _log.append("tearDown")

    def test_passes(self):
        self.assertEqual(self.base + 5, 15)
        self.assertIn("b", ["a", "b"])
        self.assertIsNone(None)
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=7)

    def test_fails(self):
        self.assertEqual(1, 2, "one is not two")

    def test_errors(self):
        raise RuntimeError("kaboom")

    def test_skips(self):
        self.skipTest("not today")

    def test_raises_context(self):
        with self.assertRaises(ValueError) as ctx:
            raise ValueError("ctx works")
        self.assertEqual(str(ctx.exception), "ctx works")

    def test_raises_callable(self):
        def boomer(x):
            raise KeyError(x)
        self.assertRaises(KeyError, boomer, "k")

    def helper_not_a_test(self):
        raise RuntimeError("should never run")


def run_sample():
    """Load + run SampleTests; return the interesting result facts."""
    del _log[:]
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(SampleTests)
    result = unittest.TestResult()
    suite.run(result)
    fail_names = sorted([str(pair[0]) for pair in result.failures])
    error_names = sorted([str(pair[0]) for pair in result.errors])
    skip_names = sorted([str(pair[0]) for pair in result.skipped])
    return {
        "count": suite.countTestCases(),
        "run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "ok": result.wasSuccessful(),
        "fail_msg": result.failures[0][1],
        "error_msg": result.errors[0][1],
        "skip_msg": result.skipped[0][1],
        "fail_names": fail_names,
        "error_names": error_names,
        "skip_names": skip_names,
        "setups": len([x for x in _log if x == "setUp"]),
        "teardowns": len([x for x in _log if x == "tearDown"]),
    }


def run_module_discovery():
    """loadTestsFromModule finds SampleTests in this module."""
    import sys
    mod = sys.modules["pkg_scaffolding.unittest_fixture"]
    suite = unittest.defaultTestLoader.loadTestsFromModule(mod)
    return suite.countTestCases()


def run_assertion_failures():
    """Each assertion raises AssertionError with a useful message."""
    t = SampleTests("test_passes")
    out = []
    try:
        t.assertTrue(False)
    except AssertionError as e:
        out.append("assertTrue")
    try:
        t.assertIn("z", ["a"])
    except AssertionError as e:
        out.append("assertIn")
    try:
        t.assertIsInstance(5, str)
    except AssertionError as e:
        out.append("assertIsInstance")
    try:
        t.assertGreater(1, 2)
    except AssertionError as e:
        out.append("assertGreater")
    try:
        with t.assertRaises(ValueError):
            pass
    except AssertionError as e:
        out.append("notRaised:" + str(e))
    return out


def run_text_runner():
    """TextTestRunner prints a summary into a StringIO stream."""
    import io
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream)
    suite = unittest.TestLoader().loadTestsFromTestCase(SampleTests)
    result = runner.run(suite)
    text = stream.getvalue()
    return (result.testsRun, "Ran 6 tests" in text, "FAILED" in text)
