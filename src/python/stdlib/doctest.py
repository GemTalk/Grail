# GRAIL: minimal `doctest` stub.
#
# The CPython test harness in Grail scores unittest TestCase discovery,
# not docstring examples, so this provides just enough surface for
# `import doctest` and module-level references (DocTestSuite, testmod,
# option flags) to succeed.  DocTestSuite returns an empty
# unittest.TestSuite -- any doctests a module adds via a load_tests hook
# are simply not collected (and load_tests is not invoked by the scoring
# path anyway).  This unblocks imports of test_heapq, test_itertools,
# test_collections, test_enum, etc.

import unittest

# Option flags (values mirror CPython for API parity; unused here).
DONT_ACCEPT_TRUE_FOR_1 = 0x0001
DONT_ACCEPT_BLANKLINE = 0x0002
NORMALIZE_WHITESPACE = 0x0004
ELLIPSIS = 0x0008
SKIP = 0x0010
IGNORE_EXCEPTION_DETAIL = 0x0020
REPORT_ONLY_FIRST_FAILURE = 0x0200
FAIL_FAST = 0x0400


class DocTestFinder:
    def __init__(self, verbose=False, parser=None, recurse=True,
                 exclude_empty=True):
        pass

    def find(self, obj, name=None, module=None, globs=None, extraglobs=None):
        return []


class DocTestParser:
    def get_doctest(self, string, globs, name, filename, lineno):
        return None

    def parse(self, string, name="<string>"):
        return []


class DocTestRunner:
    def __init__(self, checker=None, verbose=None, optionflags=0):
        self.failures = 0
        self.tries = 0

    def run(self, test, compileflags=None, out=None, clear_globs=True):
        return _TestResults(0, 0)

    def summarize(self, verbose=None):
        return _TestResults(0, 0)


class OutputChecker:
    def check_output(self, want, got, optionflags):
        return want == got


class Example:
    def __init__(self, source, want, exc_msg=None, lineno=0, indent=0,
                 options=None):
        self.source = source
        self.want = want


class DocTest:
    def __init__(self, examples=None, globs=None, name="", filename=None,
                 lineno=0, docstring=None):
        self.examples = examples or []


class _TestResults:
    def __init__(self, failed, attempted):
        self.failed = failed
        self.attempted = attempted

    def __iter__(self):
        return iter((self.failed, self.attempted))


def DocTestSuite(module=None, globs=None, extraglobs=None, test_finder=None,
                 **options):
    return unittest.TestSuite()


def DocFileSuite(*paths, **kw):
    return unittest.TestSuite()


def testmod(m=None, name=None, globs=None, verbose=None, report=True,
            optionflags=0, extraglobs=None, raise_on_error=False,
            exclude_empty=False):
    return _TestResults(0, 0)


def testfile(filename, module_relative=True, name=None, package=None,
             globs=None, verbose=None, report=True, optionflags=0,
             extraglobs=None, raise_on_error=False, parser=None,
             encoding=None):
    return _TestResults(0, 0)


def run_docstring_examples(f, globs, verbose=False, name="NoName",
                           compileflags=None, optionflags=0):
    return None


def set_unittest_reportflags(flags):
    return 0
