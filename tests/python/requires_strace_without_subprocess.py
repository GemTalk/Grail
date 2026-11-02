"""Fixture: test.support.strace_helper.requires_strace() on Linux skips, and
does not raise.

The decorator is called while a test class is being DEFINED, so anything it
raises escapes the module's import: test_fileio's @requires_strace() class
took the whole module down with it on Linux, where the decorator gets past its
platform check and asks _can_strace(), which runs strace in a child Python.
Grail runs no child process (support.has_subprocess_support is False), and
strace_python's requires_subprocess() wrapper raised SkipTest from inside the
call -- so the nightly scored test_fileio SKIP while Darwin ran its 99 tests.

Darwin never takes that path, so the check pretends to be Linux.  Under
CPython the probe runs and finds no working strace; under Grail it is not run
at all.  Either way the answer is a decorator that skips the class.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import unittest
from test.support import strace_helper

r = {}

real_platform = sys.platform
sys.platform = 'linux'
try:
    try:
        decorator = strace_helper.requires_strace()
        r['requires_strace_on_linux'] = 'a decorator'
    except unittest.SkipTest as e:
        decorator = None
        r['requires_strace_on_linux'] = 'raised SkipTest: %s' % e
finally:
    sys.platform = real_platform


class TracedTests(unittest.TestCase):
    def test_traced(self):
        pass


r['it_skips_the_class'] = decorator is not None and getattr(decorator(TracedTests), '__unittest_skip__', False)
r['the_platform_is_restored'] = sys.platform == real_platform

EXPECTED = {
    'requires_strace_on_linux': 'a decorator',
    'it_skips_the_class': True,
    'the_platform_is_restored': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
