"""Fixture: sys._jit and sys._is_gil_enabled, which CPython 3.14 always has.

sys._jit is a module of its own, named 'sys._jit', whose is_available,
is_enabled and is_active answer bools (Python/sysmodule.c:4098-4226), and
sys._is_gil_enabled() answers True on a build with a GIL.  Grail had neither,
so test_sys's TestSysJIT and test_is_gil_enabled raised AttributeError where
CPython runs them -- or, for TestSysJIT, skips them for want of a subprocess.

Whether a JIT is AVAILABLE is a property of the build -- CPython's release
binaries may carry one -- so only what holds on every build is checked: the
answers are bools, module code this cold is not running JIT code, and an
enabled JIT is an available one.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import types

r = {}

r['the_gil_is_enabled'] = [sys._is_gil_enabled(), type(sys._is_gil_enabled()) is bool]

r['jit_is_a_module'] = [isinstance(sys._jit, types.ModuleType), sys._jit.__name__,
                        sys._jit.__doc__]

r['jit_functions'] = sorted(name for name in dir(sys._jit) if not name.startswith('_'))

r['jit_answers_bools'] = [type(sys._jit.is_available()) is bool,
                          type(sys._jit.is_enabled()) is bool,
                          type(sys._jit.is_active()) is bool]

r['this_code_is_not_jitted'] = sys._jit.is_active()

r['enabled_implies_available'] = (not sys._jit.is_enabled()) or sys._jit.is_available()

EXPECTED = {
    'the_gil_is_enabled': [True, True],
    'jit_is_a_module': [True, 'sys._jit', 'Utilities for observing just-in-time compilation.'],
    'jit_functions': ['is_active', 'is_available', 'is_enabled'],
    'jit_answers_bools': [True, True, True],
    'this_code_is_not_jitted': False,
    'enabled_implies_available': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
