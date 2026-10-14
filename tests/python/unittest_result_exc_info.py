"""A TestResult is handed (type, value, traceback), as in CPython.

Grail's unittest handed addError / addFailure / addExpectedFailure a
description string -- ``ValueError: boom'' -- where CPython hands the
exc_info triple.  A result class that formats the error itself reads all
three: pytest's unittest plugin builds its report from the traceback, took the
string for a sequence of traceback entries, and ended the whole run with an
INTERNALERROR ('str' object has no attribute 'frame') at the first failing
unittest-style test.  Django's test runner reads the triple the same way.

The base TestResult still keeps a string per error, as CPython does (CPython's
is the formatted traceback; Grail's is the one-line description it always
kept).  Every expectation was measured against CPython 3.14.
"""

import unittest

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


class Recording(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.seen = []

    def _note(self, kind, err):
        etype, value, tb = err
        self.seen.append((kind, etype.__name__, str(value), type(value) is etype,
                          tb is value.__traceback__, tb is not None))

    def addError(self, test, err):
        self._note('error', err)
        super().addError(test, err)

    def addFailure(self, test, err):
        self._note('failure', err)
        super().addFailure(test, err)

    def addExpectedFailure(self, test, err):
        self._note('expected', err)
        super().addExpectedFailure(test, err)


class Cases(unittest.TestCase):
    def test_failure(self):
        self.assertEqual(1, 2)

    def test_error(self):
        raise ValueError('boom')

    @unittest.expectedFailure
    def test_expected(self):
        raise KeyError('k')


class SetUpRaises(unittest.TestCase):
    def setUp(self):
        raise OSError('in setUp')

    def test_never_runs(self):
        pass


class TearDownRaises(unittest.TestCase):
    def tearDown(self):
        raise RuntimeError('in tearDown')

    def test_passes(self):
        pass


class CleanupRaises(unittest.TestCase):
    def test_passes(self):
        self.addCleanup(self._raise)

    def _raise(self):
        raise LookupError('in cleanup')


def _run(cls, name):
    result = Recording()
    cls(name).run(result)
    return result


def _seen(cls, name):
    return _run(cls, name).seen


check('a_failure_is_handed_the_triple', _seen(Cases, 'test_failure'),
      [('failure', 'AssertionError', '1 != 2', True, True, True)])
check('an_error_is_handed_the_triple', _seen(Cases, 'test_error'),
      [('error', 'ValueError', 'boom', True, True, True)])
check('an_expected_failure_is_handed_the_triple', _seen(Cases, 'test_expected'),
      [('expected', 'KeyError', "'k'", True, True, True)])
check('a_setup_error_is_handed_the_triple', _seen(SetUpRaises, 'test_never_runs'),
      [('error', 'OSError', 'in setUp', True, True, True)])
check('a_teardown_error_is_handed_the_triple', _seen(TearDownRaises, 'test_passes'),
      [('error', 'RuntimeError', 'in tearDown', True, True, True)])
check('a_cleanup_error_is_handed_the_triple', _seen(CleanupRaises, 'test_passes'),
      [('error', 'LookupError', 'in cleanup', True, True, True)])


def _kept():
    result = unittest.TestResult()
    for name in ('test_failure', 'test_error', 'test_expected'):
        Cases(name).run(result)
    kept = result.failures + result.errors + result.expectedFailures
    return ([type(t).__name__ for t, _ in kept],
            [isinstance(s, str) for _, s in kept],
            [s.strip().splitlines()[-1] for _, s in kept])


check('the_base_result_keeps_a_string_per_error', _kept(),
      (['Cases', 'Cases', 'Cases'], [True, True, True],
       ['AssertionError: 1 != 2', 'ValueError: boom', "KeyError: 'k'"]))

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
