"""``setUpModule`` / ``tearDownModule`` -- the fixture that spans a MODULE.

unittest has three fixture scopes: per test (``setUp``), per class
(``setUpClass``) and per module (``setUpModule``).  Grail had the first two and
silently ignored the third: a test module whose module-level fixture builds the
thing under test ran every one of its tests against an unbuilt world, and the
failures named the missing object rather than the fixture that never ran.

The scope is what makes it worth its own mechanism.  ``setUpModule`` fires when
the MODULE changes, once, however many classes the module holds -- so this
fixture uses two classes and checks the count, which is the part a per-class
approximation would get wrong.

Every expectation here was measured against CPython 3.14.
"""

import sys
import unittest

TRACE = []

# Consulted by setUpModule so the failure path can be exercised from the same
# module: a second module would otherwise be needed just to have one whose
# fixture raises.
FAIL_SETUP = [False]

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + str(got)[:120])


class Recorder:
    """A context manager, for enterModuleContext."""

    def __enter__(self):
        TRACE.append('enter')
        return self

    def __exit__(self, exc_type, exc_value, tb):
        TRACE.append('exit')
        return False


def setUpModule():
    TRACE.append('setUpModule')
    unittest.addModuleCleanup(TRACE.append, 'moduleCleanup')
    if FAIL_SETUP[0]:
        raise RuntimeError('setUpModule says no')


def tearDownModule():
    TRACE.append('tearDownModule')


# Named, and taking the flag, so a Smalltalk-side test can arm the failure with
# one keyword send instead of reaching into the list.
def set_failure(flag):
    FAIL_SETUP[0] = flag


class FirstCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        TRACE.append('setUpClass(First)')

    @classmethod
    def tearDownClass(cls):
        TRACE.append('tearDownClass(First)')

    def test_a(self):
        TRACE.append('test_a')


class SecondCase(unittest.TestCase):

    def test_b(self):
        TRACE.append('test_b')


def _run_both_classes():
    del TRACE[:]
    suite = unittest.TestSuite([FirstCase('test_a'), SecondCase('test_b')])
    result = unittest.TestResult()
    suite.run(result)
    return result


# ------------------------------------------- the fixture runs, in CPython's order

_result = _run_both_classes()

check('the_module_fixture_brackets_the_whole_run', list(TRACE),
      ['setUpModule', 'setUpClass(First)', 'test_a', 'tearDownClass(First)',
       'test_b', 'tearDownModule', 'moduleCleanup'])

check('two_classes_set_the_module_up_once', TRACE.count('setUpModule'), 1)

check('a_run_with_a_working_fixture_succeeds', _result.wasSuccessful(), True)


# ------------------------------------- a fixture that raises stops the tests

set_failure(True)
_failed = _run_both_classes()
set_failure(False)

check('a_failing_fixture_runs_no_test', 'test_a' in TRACE or 'test_b' in TRACE,
      False)

check('a_failing_fixture_is_not_torn_down', 'tearDownModule' in TRACE, False)

check('a_failing_fixture_still_runs_its_cleanups', 'moduleCleanup' in TRACE,
      True)

check('a_failing_fixture_fails_the_run', _failed.wasSuccessful(), False)


# ------------------------------------------------- enterModuleContext

def _enter_module_context():
    del TRACE[:]
    recorder = unittest.enterModuleContext(Recorder())
    entered = list(TRACE)
    unittest.doModuleCleanups()
    return (entered, list(TRACE), isinstance(recorder, Recorder))


check('enter_module_context_exits_during_cleanup', _enter_module_context(),
      (['enter'], ['enter', 'exit'], True))


# ------------------------------------ the module the fixture belongs to

check('the_fixture_is_found_through_sys_modules',
      getattr(sys.modules[FirstCase.__module__], 'setUpModule', None)
      is not None, True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
