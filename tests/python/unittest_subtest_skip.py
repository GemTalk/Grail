# unittest: a skipTest() inside a subTest skips THAT subtest only.
#
# Grail's _SubTest let a SkipTest escape like a failure, so one skipped
# subtest ended the whole method: every later subtest silently never ran,
# and the test still scored as a pass.  CPython's testPartExecutor records
# the skip against the subtest and carries on.  Found through
# test_urlparse, whose bytes variants skip non-ASCII inputs part-way through
# a parameter list.
#
# Deliberately NOT covered: a FAILING subtest.  Grail still stops at the
# first one (see the comment on _SubTest), where CPython records each and
# continues; that is a documented trade, not something this fixture pins.
#
# Expected values measured under CPython 3.14.6.

import unittest


def _run(case_class):
    result = unittest.TestResult()
    unittest.defaultTestLoader.loadTestsFromTestCase(case_class).run(result)
    return result


def later_subtests_still_run_after_a_skip():
    ran = []

    class T(unittest.TestCase):
        def test_it(self):
            for i in range(4):
                with self.subTest(i=i):
                    if i == 1:
                        self.skipTest('skip one')
                    ran.append(i)

    r = _run(T)
    return (ran == [0, 2, 3] and r.testsRun == 1 and len(r.skipped) == 1
            and not r.failures and not r.errors)


def each_skipped_subtest_is_recorded():
    class T(unittest.TestCase):
        def test_it(self):
            for i in range(5):
                with self.subTest(i=i):
                    if i % 2:
                        self.skipTest('odd')

    r = _run(T)
    return [why for _, why in r.skipped] == ['odd', 'odd']


def skip_names_the_subtest():
    class T(unittest.TestCase):
        def test_it(self):
            with self.subTest(n=7):
                self.skipTest('why')

    r = _run(T)
    test, why = r.skipped[0]
    return test.id().endswith('.test_it (n=7)') and why == 'why'


def partly_skipped_test_is_not_a_success():
    successes = []

    class Result(unittest.TestResult):
        def addSuccess(self, test):
            successes.append(test)

    class T(unittest.TestCase):
        def test_it(self):
            with self.subTest(i=0):
                self.skipTest('s')

    result = Result()
    unittest.defaultTestLoader.loadTestsFromTestCase(T).run(result)
    return successes == [] and len(result.skipped) == 1


def failure_after_a_skipped_subtest_is_reported():
    class T(unittest.TestCase):
        def test_it(self):
            with self.subTest(i=0):
                self.skipTest('s')
            self.fail('after')

    r = _run(T)
    return len(r.skipped) == 1 and len(r.failures) == 1


def skip_outside_a_subtest_skips_the_test():
    ran = []

    class T(unittest.TestCase):
        def test_it(self):
            self.skipTest('whole')
            ran.append(1)

    r = _run(T)
    return ran == [] and [why for _, why in r.skipped] == ['whole']


CHECKS = [
    later_subtests_still_run_after_a_skip,
    each_skipped_subtest_is_recorded,
    skip_names_the_subtest,
    partly_skipped_test_is_not_a_success,
    failure_after_a_skipped_subtest_is_reported,
    skip_outside_a_subtest_skips_the_test,
]


if __name__ == '__main__':
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
