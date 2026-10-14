"""Fixture: unittest's result classes look like CPython's.

test_statistics' assertApproxEqual doctest runs a suite and shows the result:

    >>> unittest.TextTestRunner(stream=StringIO()).run(suite)
    <unittest.runner.TextTestResult run=2 errors=0 failures=0>

Grail's runner answered a plain TestResult whose repr was hard-coded as
``<TestResult run=2 ...>''.  CPython's repr names the class's dotted home, the
runner answers a TextTestResult, and both names resolve as modules:
unittest.result and unittest.runner.  Grail's unittest keeps its classes in
unittest/__init__.py, so those two modules re-export them.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import io
import unittest
import unittest.result
import unittest.runner

r = {}


class _T(unittest.TestCase):
    def test_a(self):
        pass

    def test_b(self):
        self.fail('no')


class MyResult(unittest.TextTestResult):
    pass


_res = unittest.TextTestRunner(stream=io.StringIO()).run(
    unittest.TestSuite([_T('test_a'), _T('test_b')]))

r['runner_result_repr'] = repr(_res)
r['runner_result_type'] = (type(_res).__name__, isinstance(_res, unittest.TestResult),
                           _res.wasSuccessful())
r['plain_result_repr'] = repr(unittest.TestResult())
r['subclass_repr'] = repr(MyResult(io.StringIO(), True, 1)).replace(__name__, '<mod>')
r['modules_resolve'] = (unittest.result.TestResult is unittest.TestResult,
                        unittest.runner.TextTestResult is unittest.TextTestResult,
                        unittest.runner.TextTestRunner is unittest.TextTestRunner)
r['dunder_module'] = (unittest.TestResult.__module__, unittest.TextTestResult.__module__,
                      unittest.TextTestRunner.__module__)
r['text_result_init'] = (lambda t: (t.descriptions, t.showAll, t.dots))(
    unittest.TextTestResult(io.StringIO(), False, 2))

EXPECTED = {
    'runner_result_repr': '<unittest.runner.TextTestResult run=2 errors=0 failures=1>',
    'runner_result_type': ('TextTestResult', True, False),
    'plain_result_repr': '<unittest.result.TestResult run=0 errors=0 failures=0>',
    'subclass_repr': '<<mod>.MyResult run=0 errors=0 failures=0>',
    'modules_resolve': (True, True, True),
    'dunder_module': ('unittest.result', 'unittest.runner', 'unittest.runner'),
    'text_result_init': (False, True, False),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-28s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
