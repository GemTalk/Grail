"""Fixture: the CPython-suite harness scores a fixture's SkipTest as a skip.

CPython's suite counts a setUpModule or setUpClass that raises
unittest.SkipTest -- ResourceDenied is one, for a resource the run did not
enable -- as a skip, and runs none of the tests it covers
(Lib/unittest/suite.py).  Grail's per-test harness ran them anyway, as it
runs the tests of a fixture that FAILED, and they errored on what the fixture
would have made: test_largefile and test_robotparser scored ERROR for
resources that were simply not enabled.

Not self-running: it drives Grail's own harness, test/_grail_harness.py,
which CPython does not have.
"""

import types
import unittest
from test import _grail_harness as harness

r = {}


class SkippingClass(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raise unittest.SkipTest('the resource is not enabled')

    def test_needs_the_fixture(self):
        self.assertTrue(self.made)


class FailingClass(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raise RuntimeError('the fixture cannot be built here')

    def test_runs_without_it(self):
        pass


class PlainClass(unittest.TestCase):
    def test_plain(self):
        pass


def module_with(fixture):
    module = types.ModuleType('fixture_module')
    if fixture is not None:
        module.setUpModule = fixture
    return module


def skipping_module_fixture():
    raise unittest.SkipTest('the module needs a resource')


r['a_class_fixture_that_skips'] = harness.run_one(SkippingClass('test_needs_the_fixture'))
r['a_class_fixture_that_fails'] = harness.run_one(FailingClass('test_runs_without_it'))
skipping = module_with(skipping_module_fixture)
r['a_module_fixture_that_skips'] = [harness.setup_module(skipping), harness.run_one(PlainClass('test_plain'))]
harness.teardown_module(skipping)
plain = module_with(None)
r['the_next_module_runs'] = [harness.setup_module(plain), harness.run_one(PlainClass('test_plain'))]
harness.teardown_module(plain)

EXPECTED = {
    'a_class_fixture_that_skips': (0, 0, 1, ''),
    'a_class_fixture_that_fails': (0, 0, 0, ''),
    'a_module_fixture_that_skips': ['', (0, 0, 1, '')],
    'the_next_module_runs': ['', (0, 0, 0, '')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))
