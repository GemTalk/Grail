"""unittest.main() must find __main__ by itself, and must exit non-zero.

Two faults in one signature, `main(module=None, verbosity=1, exit=False)`:

`module` was required, and the reason given was that "Grail has no __main__
introspection".  That stopped being true: under ./grail a script IS
sys.modules['__main__'], with __name__ == '__main__', and loadTestsFromModule
finds its tests -- so the usual closing line of a test file,

    if __name__ == "__main__":
        unittest.main()

raised TypeError instead of running anything.

`exit` defaulted to False, so main() PRINTED the failure and returned.  The
summary said FAILED (failures=1) and the process still exited 0, which means any
CI step calling main() reported every failing run as green (#1237).

This file checks the parts that hold wherever it is loaded from.  Two things
cannot be checked here and are covered by
tests/scripts/run_unittest_main_exit_test.sh instead, which runs real scripts
through ./grail and compares each exit status with CPython's:

  * the exit STATUS itself -- asserting it would end the process asserting it;
  * `main()` with NO module argument, which needs sys.modules['__main__'], and
    that exists in a script but not in an embedded or topaz session -- where
    this fixture is also run from.

Every expectation here was measured against CPython 3.14.
"""

import contextlib
import io
import unittest

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class OnePasses(unittest.TestCase):
    def test_passes(self):
        pass


class OneFails(unittest.TestCase):
    def test_fails(self):
        self.assertEqual(1, 2)


def _run(*classes):
    """Run the given TestCases through a quiet runner; answer the result."""
    suite = unittest.TestSuite()
    for cls in classes:
        suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(cls))
    return unittest.TextTestRunner(stream=io.StringIO()).run(suite)


@contextlib.contextmanager
def _silenced():
    """main() writes its summary to stderr, and the two implementations word it
    differently -- so swallow it, or this fixture would disagree with CPython on
    the noise rather than on the answer."""
    buf = io.StringIO()
    with contextlib.redirect_stderr(buf), contextlib.redirect_stdout(buf):
        yield


def _exit_code_of(*classes):
    """What main() would exit with for these tests, without exiting."""
    return int(not _run(*classes).wasSuccessful())


def _error(fn):
    try:
        with _silenced():
            return ('returned', type(fn()).__name__)
    except SystemExit as exc:
        return ('SystemExit', exc.code)
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ----------------------------------------------------------- the defect

# main() now defaults to sys.modules['__main__'] rather than refusing.  This
# module is not __main__, so calling main() with no argument here runs THIS
# module's own tests via the __main__ that imported it -- what is checked is
# that it no longer raises the old TypeError.
check('a_module_argument_no_longer_raises_the_old_type_error',
      _error(lambda: unittest.main(module=__name__, exit=False))[0], 'returned')
check('a_string_module_name_is_accepted',
      _error(lambda: unittest.main(module=__name__, exit=False))[0], 'returned')
check('exit_is_true_by_default',
      _error(lambda: unittest.main(module=__name__)), ('SystemExit', 1))
check('a_failing_suite_would_exit_one', _exit_code_of(OneFails), 1)
check('a_passing_suite_would_exit_zero', _exit_code_of(OnePasses), 0)
check('a_mixed_suite_would_exit_one', _exit_code_of(OnePasses, OneFails), 1)

# ----------------------------------------------------------- unchanged

check('exit_false_still_answers_a_usable_result',
      (lambda r: (hasattr(r, 'wasSuccessful'), r.testsRun,
                  isinstance(r.failures, list)))(_run(OnePasses)),
      (True, 1, True))
check('was_successful_still_reads_the_two_lists',
      (_run(OnePasses).wasSuccessful(), _run(OneFails).wasSuccessful()),
      (True, False))
check('the_counts_are_unchanged',
      (lambda r: (r.testsRun, len(r.failures), len(r.errors)))(_run(OnePasses, OneFails)),
      (2, 1, 0))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
