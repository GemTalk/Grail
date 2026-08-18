# GRAIL unittest - the commonly used core of CPython's unittest as a
# single module: TestCase with the standard assertion set, TestSuite,
# TestLoader, TestResult, TextTestRunner, and main(module=...).
# Deviations from CPython, kept deliberately small for V1:
#   * unittest.mock is not provided;
#   * @skip/@skipIf method decorators are accepted for API parity but
#     Grail drops method @-decorators, so use self.skipTest() instead;
#   * main() requires an explicit module argument (no __main__
#     introspection) and does not parse argv;
#   * subTest() runs its body inline; the first failing subTest fails
#     the whole test immediately (CPython records it and continues);
#   * assertWarns works by installing an 'error' warnings filter for
#     the expected category and resets ALL filters on exit;
#   * tracebacks are reported as "ExceptionName: message" strings.

__all__ = ["TestCase", "TestSuite", "TestLoader", "TestResult",
           "TextTestRunner", "SkipTest", "main", "defaultTestLoader",
           "skip", "skipIf", "skipUnless", "expectedFailure"]


class SkipTest(Exception):
    pass


# Text CPython substitutes for a diff longer than maxDiff.  Module-level, as it
# is in CPython's unittest.case, so the wording is in one place.
DIFF_OMITTED = ('\nDiff is %s characters long. '
                'Set self.maxDiff to None to see it.')


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


# ---- subTest context manager ---------------------------------------------

class _SubTest:
    # Minimal subTest: the body runs inline and nothing is swallowed, so
    # the first failing subTest fails the enclosing test right away
    # (CPython would record it, continue, and report each params set).
    def __init__(self, msg, params):
        self._msg = msg
        self.params = params

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        return False


# ---- assertWarns context manager ------------------------------------------

class _AssertWarnsContext:
    # Grail's warnings module RECORDS warnings while a context is active
    # (warnings._grail_start_recording): warn() appends (message, category)
    # to a buffer and returns instead of raising, so code after the warn()
    # call in the with-block still runs -- matching CPython, which records
    # warnings rather than raising them.  __exit__ then inspects the buffer.
    # (The earlier implementation installed an 'error' filter and caught the
    # raise, which aborted any statement in the block that triggered a
    # warning -- e.g. ``p = re.compile(...)'' left p unbound.)
    def __init__(self, expected, expected_regex=None):
        self.expected = expected
        self.expected_regex = expected_regex
        self.warning = None
        # filename is stamped by TestCase.assertWarns from the test's module
        # (Grail has no frame introspection for the warn() call site); lineno
        # is unavailable.
        self.filename = "<unknown>"
        self.lineno = 0

    def __enter__(self):
        # The receiver must be an import-bound NAME (see __exit__): reaching a
        # module method through a stored attribute trips Grail's unary-getter
        # protocol.
        import warnings
        warnings._grail_start_recording()
        return self

    def __exit__(self, exc_type, exc_value, tb):
        import warnings
        recorded = warnings._grail_stop_recording()
        if exc_type is not None:
            # A real exception escaped the block -- let it propagate.
            return False
        category_matched = False
        for rec in recorded:
            message = rec[0]
            category = rec[1]
            if issubclass(category, self.expected):
                category_matched = True
                if self.expected_regex is not None:
                    import re
                    if re.search(self.expected_regex, str(message)) is None:
                        continue
                self.warning = message
                return None
        if category_matched and self.expected_regex is not None:
            raise AssertionError(
                "'" + self.expected_regex
                + "' does not match any triggered warning")
        raise AssertionError(self.expected.__name__ + " not triggered")


class _AssertNotWarnsContext(_AssertWarnsContext):
    # The opposite of _AssertWarnsContext: fails if the expected category
    # WAS recorded.  Reuses __enter__ (same recording setup) and just
    # inverts __exit__'s pass/fail condition.
    def __exit__(self, exc_type, exc_value, tb):
        import warnings
        recorded = warnings._grail_stop_recording()
        if exc_type is not None:
            return False
        for rec in recorded:
            category = rec[1]
            if issubclass(category, self.expected):
                raise AssertionError(self.expected.__name__ + " triggered")
        return None


# ---- TestCase -------------------------------------------------------------

class TestCase:
    failureException = AssertionError

    # CPython's three tuning knobs, as CLASS attributes with CPython's values.
    #
    # Every use in the vendored corpus is an ASSIGNMENT -- ``self.maxDiff =
    # None'' in setUp (six modules) or ``maxDiff = None'' in a class body (three)
    # -- and those already worked without a class default, because an instance
    # attribute needs none.  What raised AttributeError was a READ through the
    # class: ``SomeTestCase.maxDiff'' where CPython answers 640.  So these fix a
    # gap the corpus does not currently exercise; they are here because the
    # attributes are part of TestCase's surface, not because a test moved.
    longMessage = True
    maxDiff = 80 * 8
    _diffThreshold = 2 ** 16

    def __init__(self, methodName="runTest"):
        self._testMethodName = methodName
        self._cleanups = []

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

    def subTest(self, msg=None, **params):
        return _SubTest(msg, params)

    def addCleanup(self, function, *args, **kwargs):
        self._cleanups.append((function, args, kwargs))

    def doCleanups(self):
        while len(self._cleanups) > 0:
            entry = self._cleanups.pop()
            entry[0](*entry[1], **entry[2])

    # Class-level cleanups, the companion of setUpClass.  Stored on the CLASS,
    # not the instance, and drained once the last test of that class has run.
    #
    # The list is created HERE, lazily, rather than by whoever ran setUpClass.
    # Depending on the caller to seed it is what broke first: the CPython
    # harness (test/_grail_harness.py) invokes setUpClass itself, around each
    # individual test, so a list seeded only by TestSuite left addClassCleanup
    # raising AttributeError -- inside a setUpClass whose exception the harness
    # deliberately swallows.  Lazy init makes the two entry points independent.
    #
    # Set on ``cls'', never mutated through a base: a subclass that inherits
    # the attribute would otherwise append into its parent's list.
    @classmethod
    def addClassCleanup(cls, function, *args, **kwargs):
        if cls.__dict__.get("_class_cleanups") is None:
            cls._class_cleanups = []
        cls._class_cleanups.append((function, args, kwargs))

    @classmethod
    def doClassCleanups(cls):
        # __dict__, not getattr: an inherited list belongs to the base class
        # and is that class's to drain.
        entries = cls.__dict__.get("_class_cleanups")
        if entries is None:
            return
        while len(entries) > 0:
            entry = entries.pop()
            entry[0](*entry[1], **entry[2])

    def fail(self, msg=None):
        if msg is None:
            msg = "fail() called"
        raise AssertionError(msg)

    # -- message helper --

    def _formatMessage(self, msg, standardMsg):
        # STANDARD MESSAGE FIRST.  This read ``str(msg) + " : " + standardMsg'',
        # which is the two halves the wrong way round: CPython answers
        # ``1 != 3 : expected three'', Grail answered ``expected three : 1 != 3''.
        # Every assertion failure carrying an explicit message has been printing
        # backwards, which is invisible until you compare against CPython --
        # nothing fails, the diagnosis just reads inside out.
        #
        # ``msg or standardMsg'', not ``msg if msg is not None'': with
        # longMessage off CPython falls back to the standard message for an
        # explicit message that is merely FALSY (''), not just for None.
        if not self.longMessage:
            return msg or standardMsg
        if msg is None:
            return standardMsg
        return "%s : %s" % (standardMsg, msg)

    def _truncateMessage(self, message, diff):
        # The one consumer of maxDiff.  Nothing in Grail's unittest produces a
        # diff yet (no assertMultiLineEqual / assertDictEqual, and assertEqual
        # does not dispatch by type), so this has no in-tree caller -- it is here
        # so that maxDiff means what it says the moment one is added, rather than
        # being a number nothing reads.
        max_diff = self.maxDiff
        if max_diff is None or len(diff) <= max_diff:
            return message + diff
        return message + (DIFF_OMITTED % len(diff))

    def _failWith(self, msg, standardMsg):
        raise AssertionError(self._formatMessage(msg, standardMsg))

    # -- assertions --

    def assertEqual(self, first, second, msg=None):
        if not (first == second):
            self._failWith(msg, repr(first) + " != " + repr(second))

    def assertNotEqual(self, first, second, msg=None):
        if first == second:
            self._failWith(msg, repr(first) + " == " + repr(second))

    def assertSequenceEqual(self, seq1, seq2, msg=None, seq_type=None):
        # Length- and element-wise sequence equality with an optional type
        # check (test_fractions' testLargeArithmetic uses assertTupleEqual).
        if seq_type is not None:
            if not isinstance(seq1, seq_type):
                self._failWith(msg, "First sequence is not a %s: %r"
                               % (getattr(seq_type, '__name__', seq_type), seq1))
            if not isinstance(seq2, seq_type):
                self._failWith(msg, "Second sequence is not a %s: %r"
                               % (getattr(seq_type, '__name__', seq_type), seq2))
        if len(seq1) != len(seq2):
            self._failWith(msg, repr(seq1) + " != " + repr(seq2))
        for i in range(len(seq1)):
            if not (seq1[i] == seq2[i]):
                self._failWith(msg, repr(seq1) + " != " + repr(seq2))

    def assertTupleEqual(self, tuple1, tuple2, msg=None):
        self.assertSequenceEqual(tuple1, tuple2, msg, seq_type=tuple)

    def assertListEqual(self, list1, list2, msg=None):
        self.assertSequenceEqual(list1, list2, msg, seq_type=list)

    def assertSetEqual(self, set1, set2, msg=None):
        # Set-specific equality with a symmetric-difference failure message
        # (test_operator's test___all__).
        try:
            diff1 = set1 - set2
            diff2 = set2 - set1
        except TypeError as e:
            self._failWith(msg, "invalid set arguments: " + str(e))
            return
        if diff1 or diff2:
            lines = []
            if diff1:
                lines.append("Items in the first set but not the second:")
                for item in diff1:
                    lines.append(repr(item))
            if diff2:
                lines.append("Items in the second set but not the first:")
                for item in diff2:
                    lines.append(repr(item))
            self._failWith(msg, "\n".join(lines))

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

    def assertStartsWith(self, s, prefix, msg=None):
        # Python 3.12 addition (test_set et al. use it).
        if not s.startswith(prefix):
            self._failWith(msg, repr(s) + " doesn't start with " + repr(prefix))

    def assertNotStartsWith(self, s, prefix, msg=None):
        if s.startswith(prefix):
            self._failWith(msg, repr(s) + " starts with " + repr(prefix))

    def assertEndsWith(self, s, suffix, msg=None):
        if not s.endswith(suffix):
            self._failWith(msg, repr(s) + " doesn't end with " + repr(suffix))

    def assertNotEndsWith(self, s, suffix, msg=None):
        if s.endswith(suffix):
            self._failWith(msg, repr(s) + " ends with " + repr(suffix))

    def assertHasAttr(self, obj, name, msg=None):
        # Python 3.14 addition (test_enum et al. use it).
        if not hasattr(obj, name):
            self._failWith(msg, repr(obj) + " has no attribute " + repr(name))

    def assertNotHasAttr(self, obj, name, msg=None):
        if hasattr(obj, name):
            self._failWith(msg, repr(obj) + " unexpectedly has attribute " + repr(name))

    def assertIsInstance(self, obj, cls, msg=None):
        if not isinstance(obj, cls):
            self._failWith(msg, repr(obj) + " is not an instance of " + repr(cls))

    def assertNotIsInstance(self, obj, cls, msg=None):
        if isinstance(obj, cls):
            self._failWith(msg, repr(obj) + " is an instance of " + repr(cls))

    def assertIsSubclass(self, cls, superclass, msg=None):
        if not issubclass(cls, superclass):
            self._failWith(msg, repr(cls) + " is not a subclass of " + repr(superclass))

    def assertNotIsSubclass(self, cls, superclass, msg=None):
        if issubclass(cls, superclass):
            self._failWith(msg, repr(cls) + " is a subclass of " + repr(superclass))

    def enterContext(self, cm):
        # Enter a context manager for the duration of the test; its
        # __exit__ runs during doCleanups (CPython 3.11+).  Look the
        # dunders up on the TYPE (CPython semantics) -- under Grail an
        # instance attribute read of a zero-arg dunder auto-invokes it,
        # so cm.__enter__() would call the RESULT of __enter__.
        cls = type(cm)
        enter = getattr(cls, '__enter__')
        exit_ = getattr(cls, '__exit__')
        result = enter(cm)
        self.addCleanup(exit_, cm, None, None, None)
        return result

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
        # abs() (not `if diff < 0`) so complex operands work: |a-b| is the
        # magnitude, and complex has no ordering (test_fractions asserts
        # almost-equality of complex powers, e.g. against 3.375j).
        diff = abs(first - second)
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

    def _warnSourceFile(self):
        # Best-effort filename for a warning caught by assertWarns.  Grail
        # has no frame/traceback introspection (BaseException.__traceback__
        # is nil), so the warn() call site CPython records for w.filename is
        # unavailable.  In the assertWarns idiom the warning is triggered by
        # code in the test method itself, whose file is the test class's
        # defining module -- so report that (test_re test_qualified_re_sub /
        # _re_subn / _re_split / test_possible_set_operations / test_misuse_flags
        # check w.filename == __file__).
        import sys
        try:
            return sys.modules.get(type(self).__module__).__file__
        except BaseException:
            return "<unknown>"

    def assertWarns(self, expected_warning, *call_args, **call_kw):
        ctx = _AssertWarnsContext(expected_warning)
        ctx.filename = self._warnSourceFile()
        if len(call_args) == 0:
            return ctx
        fn = call_args[0]
        rest = call_args[1:]
        with ctx:
            fn(*rest, **call_kw)
        return None

    def _assertNotWarns(self, expected_warning, *call_args, **call_kw):
        # Private due to low demand (matches CPython's unittest.case).
        ctx = _AssertNotWarnsContext(expected_warning)
        ctx.filename = self._warnSourceFile()
        if len(call_args) == 0:
            return ctx
        fn = call_args[0]
        rest = call_args[1:]
        with ctx:
            fn(*rest, **call_kw)
        return None

    def assertWarnsRegex(self, expected_warning, expected_regex,
                         *call_args, **call_kw):
        ctx = _AssertWarnsContext(expected_warning, expected_regex)
        ctx.filename = self._warnSourceFile()
        if len(call_args) == 0:
            return ctx
        fn = call_args[0]
        rest = call_args[1:]
        with ctx:
            fn(*rest, **call_kw)
        return None

    def assertRegex(self, text, expected_regex, msg=None):
        # Fail unless expected_regex (a str/bytes pattern or a compiled
        # pattern) matches somewhere in text (test_re test_match_repr).
        import re
        if isinstance(expected_regex, (str, bytes)):
            expected_regex = re.compile(expected_regex)
        if expected_regex.search(text) is None:
            self._failWith(msg, "Regex didn't match: %r not found in %r"
                           % (expected_regex.pattern, text))

    def assertNotRegex(self, text, unexpected_regex, msg=None):
        # Fail if unexpected_regex matches anywhere in text.
        import re
        if isinstance(unexpected_regex, (str, bytes)):
            unexpected_regex = re.compile(unexpected_regex)
        match = unexpected_regex.search(text)
        if match is not None:
            self._failWith(msg, "Regex matched: %r matches %r in %r"
                           % (text[match.start():match.end()],
                              unexpected_regex.pattern, text))

    # -- running --

    def run(self, result=None):
        if result is None:
            result = TestResult()
        result.startTest(self)

        # A @skip / @skipIf / @skipUnless marker on the CLASS or on the test
        # METHOD short-circuits before setUp, exactly as CPython's run() does.
        # The decorators recorded __unittest_skip__ all along; run() simply
        # never consulted it, so a gated test RAN and was reported as a failure
        # or an error instead of a skip.  That mis-scored every
        # unittest.skipIf-gated CPython test -- e.g. test.test_traceback's
        # @requires_debug_ranges / @cpython_only classes, which then executed
        # and died on the absent _testcapi.
        #
        # Class marker first, then the method's, matching CPython's precedence
        # for the reason string.
        skip_why = None
        if getattr(type(self), "__unittest_skip__", False):
            skip_why = getattr(type(self), "__unittest_skip_why__", "")
        else:
            try:
                test_method = getattr(self, self._testMethodName)
            except Exception:
                test_method = None
            if test_method is not None and getattr(
                    test_method, "__unittest_skip__", False):
                skip_why = getattr(test_method, "__unittest_skip_why__", "")
        if skip_why is not None:
            result.addSkip(self, skip_why)
            result.stopTest(self)
            return result

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
        try:
            self.doCleanups()
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
        self.doCleanups()
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

    # ---- class fixtures ----------------------------------------------------
    #
    # setUpClass / tearDownClass / addClassCleanup were DECLARED on TestCase
    # (as no-op hooks) but nothing ever called them, so a class-level fixture
    # silently did not run.  That is not a missing feature so much as a quiet
    # wrong answer: test.test_gettext writes its eight .mo catalogs in
    # setUpClass, so 21 of its tests failed with FileNotFoundError on files
    # their own fixture was supposed to have created.
    #
    # Placed here rather than in TestCase.run because the fixture spans a RUN
    # OF TESTS, not one test: it fires when the class CHANGES.  The state lives
    # on ``result'' (as in CPython) so that nested suites, which each call
    # run() separately, share one notion of "the class we are in" instead of
    # re-running setUpClass per suite.

    def _setUpClass(self, test, result):
        """Run setUpClass if ``test'' begins a new class."""

        currentClass = type(test)
        if currentClass is getattr(result, "_previousTestClass", None):
            return
        # A skipped class never sets up -- CPython checks this before the
        # fixture, so @unittest.skip on a class costs nothing to honour.
        if getattr(currentClass, "__unittest_skip__", False):
            return
        currentClass._classSetupFailed = False
        currentClass._classSetupError = ""
        currentClass._class_cleanups = []
        setUpClass = getattr(currentClass, "setUpClass", None)
        if setUpClass is None:
            return
        try:
            setUpClass()
        except Exception as e:
            currentClass._classSetupFailed = True
            currentClass._classSetupError = ("setUpClass: " +
                                             _describe_exception(e))

    def _tearDownPreviousClass(self, test, result):
        """Run tearDownClass + class cleanups when leaving a class.

        ``test'' is None at the end of the top-level suite, which is what
        tears down the final class."""

        previousClass = getattr(result, "_previousTestClass", None)
        if previousClass is None:
            return
        if test is not None and type(test) is previousClass:
            return
        if getattr(previousClass, "_classSetupFailed", False):
            return
        tearDownClass = getattr(previousClass, "tearDownClass", None)
        if tearDownClass is not None:
            try:
                tearDownClass()
            except Exception:
                # A failing teardown must not lose the results already
                # recorded for the class, nor stop the next class running.
                pass
        try:
            previousClass.doClassCleanups()
        except Exception:
            pass

    def run(self, result):
        # Only the OUTERMOST suite tears down the last class, so a nested
        # suite does not close a class its parent is still filling.
        topLevel = False
        if getattr(result, "_testRunEntered", False) is False:
            result._testRunEntered = True
            topLevel = True
        for test in self._tests:
            if result.shouldStop:
                break
            if isinstance(test, TestSuite):
                test.run(result)
                continue
            self._tearDownPreviousClass(test, result)
            self._setUpClass(test, result)
            result._previousTestClass = type(test)
            if getattr(type(test), "_classSetupFailed", False):
                # Report the fixture failure against EVERY test in the class,
                # rather than as one synthetic error, so the count of tests
                # stays honest and the scoreboard attributes it correctly.
                result.startTest(test)
                result.addError(test, getattr(type(test), "_classSetupError", ""))
                result.stopTest(test)
                continue
            test.run(result)
        if topLevel:
            self._tearDownPreviousClass(None, result)
            result._testRunEntered = False
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
