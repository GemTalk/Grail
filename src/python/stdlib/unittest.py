# GRAIL unittest - the commonly used core of CPython's unittest as a
# single module: TestCase with the standard assertion set, TestSuite,
# TestLoader, TestResult, TextTestRunner, and main(module=...).
# Deviations from CPython, kept deliberately small for V1:
#   * unittest.mock is not provided;
#   * @skip/@skipIf method decorators are accepted for API parity but
#     Grail drops method @-decorators, so use self.skipTest() instead;
#   * main() requires an explicit module argument (no __main__
#     introspection) and does not parse argv;
#   * subTest() is not provided;
#   * tracebacks are reported as "ExceptionName: message" strings.

__all__ = ["TestCase", "TestSuite", "TestLoader", "TestResult",
           "TextTestRunner", "SkipTest", "main", "defaultTestLoader",
           "skip", "skipIf", "skipUnless", "expectedFailure"]


class SkipTest(Exception):
    pass


def _describe_exception(e):
    return type(e).__name__ + ": " + str(e)


# ---- skip decorators (limited: Grail drops method @-decorators; they
# ---- work only when applied explicitly to functions) -----------------

def skip(reason):
    def decorator(test_item):
        test_item.__unittest_skip__ = True
        test_item.__unittest_skip_why__ = reason
        return test_item
    return decorator


def skipIf(condition, reason):
    if condition:
        return skip(reason)

    def passthrough(test_item):
        return test_item
    return passthrough


def skipUnless(condition, reason):
    if condition:
        def passthrough(test_item):
            return test_item
        return passthrough
    return skip(reason)


def expectedFailure(test_item):
    test_item.__unittest_expecting_failure__ = True
    return test_item


# ---- result ------------------------------------------------------------

class TestResult:
    def __init__(self):
        self.testsRun = 0
        self.errors = []
        self.failures = []
        self.skipped = []
        self.expectedFailures = []
        self.unexpectedSuccesses = []
        self.shouldStop = False

    def startTest(self, test):
        self.testsRun = self.testsRun + 1

    def stopTest(self, test):
        return None

    def startTestRun(self):
        return None

    def stopTestRun(self):
        return None

    def addSuccess(self, test):
        return None

    def addError(self, test, err):
        self.errors.append((test, err))

    def addFailure(self, test, err):
        self.failures.append((test, err))

    def addSkip(self, test, reason):
        self.skipped.append((test, reason))

    def wasSuccessful(self):
        return len(self.errors) == 0 and len(self.failures) == 0

    def stop(self):
        self.shouldStop = True

    def __repr__(self):
        return ("<TestResult run=" + str(self.testsRun)
                + " errors=" + str(len(self.errors))
                + " failures=" + str(len(self.failures)) + ">")


# ---- assertRaises context manager ---------------------------------------

class _AssertRaisesContext:
    def __init__(self, expected, expected_regex=None):
        self.expected = expected
        self.expected_regex = expected_regex
        self.exception = None

    def _expected_name(self):
        if isinstance(self.expected, tuple):
            names = []
            for e in self.expected:
                names.append(e.__name__)
            return "(" + ", ".join(names) + ")"
        return self.expected.__name__

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        if exc_type is None:
            raise AssertionError(self._expected_name() + " not raised")
        if not issubclass(exc_type, self.expected):
            return False
        self.exception = exc_value
        if self.expected_regex is not None:
            import re
            if re.search(self.expected_regex, str(exc_value)) is None:
                raise AssertionError(
                    "'" + self.expected_regex + "' does not match '"
                    + str(exc_value) + "'")
        return True


# ---- TestCase -------------------------------------------------------------

class TestCase:
    failureException = AssertionError

    def __init__(self, methodName="runTest"):
        self._testMethodName = methodName

    @classmethod
    def setUpClass(cls):
        return None

    @classmethod
    def tearDownClass(cls):
        return None

    def setUp(self):
        return None

    def tearDown(self):
        return None

    def id(self):
        return type(self).__name__ + "." + self._testMethodName

    def shortDescription(self):
        return None

    def __str__(self):
        return self._testMethodName + " (" + type(self).__name__ + ")"

    def __repr__(self):
        return "<" + type(self).__name__ + " testMethod=" + self._testMethodName + ">"

    def countTestCases(self):
        return 1

    def skipTest(self, reason):
        raise SkipTest(reason)

    def fail(self, msg=None):
        if msg is None:
            msg = "fail() called"
        raise AssertionError(msg)

    # -- message helper --

    def _formatMessage(self, msg, standardMsg):
        if msg is None:
            return standardMsg
        return str(msg) + " : " + standardMsg

    def _failWith(self, msg, standardMsg):
        raise AssertionError(self._formatMessage(msg, standardMsg))

    # -- assertions --

    def assertEqual(self, first, second, msg=None):
        if not (first == second):
            self._failWith(msg, repr(first) + " != " + repr(second))

    def assertNotEqual(self, first, second, msg=None):
        if first == second:
            self._failWith(msg, repr(first) + " == " + repr(second))

    def assertTrue(self, expr, msg=None):
        if not expr:
            self._failWith(msg, repr(expr) + " is not true")

    def assertFalse(self, expr, msg=None):
        if expr:
            self._failWith(msg, repr(expr) + " is not false")

    def assertIs(self, first, second, msg=None):
        if first is not second:
            self._failWith(msg, repr(first) + " is not " + repr(second))

    def assertIsNot(self, first, second, msg=None):
        if first is second:
            self._failWith(msg, "unexpectedly identical: " + repr(first))

    def assertIsNone(self, obj, msg=None):
        if obj is not None:
            self._failWith(msg, repr(obj) + " is not None")

    def assertIsNotNone(self, obj, msg=None):
        if obj is None:
            self._failWith(msg, "unexpectedly None")

    def assertIn(self, member, container, msg=None):
        if member not in container:
            self._failWith(msg, repr(member) + " not found in " + repr(container))

    def assertNotIn(self, member, container, msg=None):
        if member in container:
            self._failWith(msg, repr(member) + " unexpectedly found in " + repr(container))

    def assertIsInstance(self, obj, cls, msg=None):
        if not isinstance(obj, cls):
            self._failWith(msg, repr(obj) + " is not an instance of " + repr(cls))

    def assertNotIsInstance(self, obj, cls, msg=None):
        if isinstance(obj, cls):
            self._failWith(msg, repr(obj) + " is an instance of " + repr(cls))

    def assertGreater(self, a, b, msg=None):
        if not (a > b):
            self._failWith(msg, repr(a) + " not greater than " + repr(b))

    def assertGreaterEqual(self, a, b, msg=None):
        if not (a >= b):
            self._failWith(msg, repr(a) + " not greater than or equal to " + repr(b))

    def assertLess(self, a, b, msg=None):
        if not (a < b):
            self._failWith(msg, repr(a) + " not less than " + repr(b))

    def assertLessEqual(self, a, b, msg=None):
        if not (a <= b):
            self._failWith(msg, repr(a) + " not less than or equal to " + repr(b))

    def assertAlmostEqual(self, first, second, places=None, msg=None, delta=None):
        if delta is not None and places is not None:
            raise TypeError("specify delta or places, not both")
        diff = first - second
        if diff < 0:
            diff = 0 - diff
        if delta is not None:
            if diff <= delta:
                return None
            self._failWith(msg, repr(first) + " != " + repr(second)
                           + " within " + repr(delta) + " delta")
        else:
            if places is None:
                places = 7
            if round(diff, places) == 0:
                return None
            self._failWith(msg, repr(first) + " != " + repr(second)
                           + " within " + str(places) + " places")

    def assertCountEqual(self, first, second, msg=None):
        a = sorted(first)
        b = sorted(second)
        if not (a == b):
            self._failWith(msg, "element counts differ: "
                           + repr(first) + " vs " + repr(second))

    def assertRaises(self, expected_exception, *call_args, **call_kw):
        if len(call_args) == 0:
            return _AssertRaisesContext(expected_exception)
        fn = call_args[0]
        rest = call_args[1:]
        ctx = _AssertRaisesContext(expected_exception)
        with ctx:
            fn(*rest, **call_kw)
        return None

    def assertRaisesRegex(self, expected_exception, expected_regex,
                          *call_args, **call_kw):
        if len(call_args) == 0:
            return _AssertRaisesContext(expected_exception, expected_regex)
        fn = call_args[0]
        rest = call_args[1:]
        ctx = _AssertRaisesContext(expected_exception, expected_regex)
        with ctx:
            fn(*rest, **call_kw)
        return None

    # -- running --

    def run(self, result=None):
        if result is None:
            result = TestResult()
        result.startTest(self)
        status = "success"
        message = ""
        try:
            self.setUp()
        except SkipTest as e:
            result.addSkip(self, str(e))
            result.stopTest(self)
            return result
        except AssertionError as e:
            result.addFailure(self, _describe_exception(e))
            result.stopTest(self)
            return result
        except Exception as e:
            result.addError(self, _describe_exception(e))
            result.stopTest(self)
            return result
        try:
            method = getattr(self, self._testMethodName)
            method()
        except SkipTest as e:
            status = "skip"
            message = str(e)
        except AssertionError as e:
            status = "failure"
            message = _describe_exception(e)
        except Exception as e:
            status = "error"
            message = _describe_exception(e)
        try:
            self.tearDown()
        except Exception as e:
            if status == "success":
                status = "error"
                message = _describe_exception(e)
        if status == "success":
            result.addSuccess(self)
        elif status == "skip":
            result.addSkip(self, message)
        elif status == "failure":
            result.addFailure(self, message)
        else:
            result.addError(self, message)
        result.stopTest(self)
        return result

    def debug(self):
        """Run the test without collecting the result (errors propagate)."""
        self.setUp()
        method = getattr(self, self._testMethodName)
        method()
        self.tearDown()
        return None

    def __call__(self, *call_args, **call_kw):
        return self.run(*call_args, **call_kw)


# ---- suite ---------------------------------------------------------------

class TestSuite:
    def __init__(self, tests=None):
        self._tests = []
        if tests is not None:
            self.addTests(tests)

    def addTest(self, test):
        self._tests.append(test)

    def addTests(self, tests):
        for test in tests:
            self.addTest(test)

    def countTestCases(self):
        total = 0
        for test in self._tests:
            total = total + test.countTestCases()
        return total

    def __iter__(self):
        return iter(self._tests)

    def run(self, result):
        for test in self._tests:
            if result.shouldStop:
                break
            test.run(result)
        return result


# ---- loader ----------------------------------------------------------------

class TestLoader:
    testMethodPrefix = "test"

    def getTestCaseNames(self, testCaseClass):
        probe = testCaseClass("setUp")
        names = []
        for name in dir(probe):
            if name.startswith(self.testMethodPrefix):
                attr = getattr(probe, name)
                if callable(attr):
                    names.append(name)
        names.sort()
        return names

    def loadTestsFromTestCase(self, testCaseClass):
        names = self.getTestCaseNames(testCaseClass)
        tests = []
        for name in names:
            tests.append(testCaseClass(name))
        return TestSuite(tests)

    def loadTestsFromModule(self, module):
        suite = TestSuite()
        for name in dir(module):
            # Skip dunders: a TestCase subclass never has a dunder
            # name, and attr-loading inherited protocol stubs like
            # __getstate__ executes them on Grail module objects.
            if name.startswith("__"):
                continue
            # dir() on a Grail module also reports Smalltalk-side
            # selectors that are not real attributes.
            try:
                obj = getattr(module, name)
            except AttributeError:
                continue
            # Only classes carry __mro__.  Both isinstance(obj, type)
            # and issubclass on a non-class raise Smalltalk-level
            # errors in Grail that a Python except cannot catch, so
            # filter BEFORE calling issubclass.
            if getattr(obj, "__mro__", None) is None:
                continue
            if obj is TestCase:
                continue
            if issubclass(obj, TestCase):
                suite.addTests(self.loadTestsFromTestCase(obj))
        return suite


defaultTestLoader = TestLoader()


# ---- runner -----------------------------------------------------------------

class TextTestRunner:
    def __init__(self, stream=None, verbosity=1):
        self.stream = stream
        self.verbosity = verbosity

    def _write(self, line):
        if self.stream is None:
            print(line)
        else:
            self.stream.write(line + "\n")

    def run(self, test):
        result = TestResult()
        result.startTestRun()
        test.run(result)
        result.stopTestRun()
        self._write("Ran " + str(result.testsRun) + " test"
                    + ("" if result.testsRun == 1 else "s"))
        for pair in result.failures:
            self._write("FAIL: " + str(pair[0]) + " - " + pair[1])
        for pair in result.errors:
            self._write("ERROR: " + str(pair[0]) + " - " + pair[1])
        for pair in result.skipped:
            self._write("SKIP: " + str(pair[0]) + " - " + pair[1])
        if result.wasSuccessful():
            self._write("OK")
        else:
            self._write("FAILED (failures=" + str(len(result.failures))
                        + ", errors=" + str(len(result.errors)) + ")")
        return result


def main(module=None, verbosity=1, exit=False):
    """Run all TestCase subclasses found in `module`.  Unlike CPython,
    the module argument is required (Grail has no __main__
    introspection) and argv is not parsed."""
    if module is None:
        raise TypeError("unittest.main() requires a module argument in Grail")
    suite = defaultTestLoader.loadTestsFromModule(module)
    runner = TextTestRunner(verbosity=verbosity)
    return runner.run(suite)
