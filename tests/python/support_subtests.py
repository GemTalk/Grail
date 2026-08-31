"""``test.support.subTests`` -- CPython 3.14's parameterising decorator.

Grail's ``test.support`` is a hand-written subset rather than a vendored
copy, and this helper was simply absent.  A decorator that does not exist
is not an import error here: the name resolved, the decoration did not
happen, and the undecorated method stayed in place with its extra
parameters -- so unittest called it with only ``self`` and every one
failed with "missing 1 required positional argument".  Thirteen tests in
test_htmlparser, all reading like a signature bug in the tests
themselves.

The decorator rewrites a method into a loop that calls the original once
per parameter set, inside ``self.subTest()``, passing the values as
KEYWORDS.  A single name may be given as one string (optionally
comma-separated for several), and a one-name spelling takes bare values
rather than tuples -- which is the shape test_htmlparser uses throughout.

Every expectation was checked against CPython 3.14 first.
"""

import unittest

from test import support

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _run(cls):
    """Run a TestCase class, answering (tests_run, failures, errors)."""
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(cls)
    result = unittest.TestResult()
    suite.run(result)
    return (result.testsRun, len(result.failures), len(result.errors))


_seen_single = []


class SingleParam(unittest.TestCase):
    @support.subTests('value', ['a', 'b', 'c'])
    def test_it(self, value):
        _seen_single.append(value)


check('single_param_runs_once_per_value',
      (_run(SingleParam), _seen_single),
      ((1, 0, 0), ['a', 'b', 'c']))


_seen_multi = []


class MultiParam(unittest.TestCase):
    @support.subTests('x, y', [(1, 2), (3, 4)])
    def test_it(self, x, y):
        _seen_multi.append((x, y))


check('multiple_names_take_tuples',
      (_run(MultiParam), _seen_multi),
      ((1, 0, 0), [(1, 2), (3, 4)]))


class OneFails(unittest.TestCase):
    @support.subTests('value', [1, 2, 3])
    def test_it(self, value):
        self.assertNotEqual(value, 2)


# A failing subtest is reported without stopping the others: the method
# counts once, and the failure is attributed to the subtest.
_ran, _fails, _errs = _run(OneFails)
check('a_failing_subtest_is_reported', (_ran, _fails, _errs), (1, 1, 0))


_seen_empty = []


class NoValues(unittest.TestCase):
    @support.subTests('value', [])
    def test_it(self, value):
        _seen_empty.append(value)


check('an_empty_value_list_runs_the_body_never',
      (_run(NoValues), _seen_empty), ((1, 0, 0), []))


# The wrapper keeps the original's identity, which is what unittest's
# discovery and reporting read.

class Named(unittest.TestCase):
    @support.subTests('value', [1])
    def test_named(self, value):
        pass


check('wrapper_keeps_the_name', Named.test_named.__name__, 'test_named')


def _decorating_a_class():
    try:
        @support.subTests('value', [1])
        class NotAMethod:
            pass
        return 'no raise'
    except TypeError as exc:
        return str(exc)


check('decorating_a_class_is_refused',
      _decorating_a_class(),
      'subTests() can only decorate methods, not classes')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
