"""Fixture: ``from M import *'' binds M's public names, and nothing else.

Without an __all__, CPython's import-all binds every name in M's namespace
that does not start with an underscore.  Grail compiles a Python module's
body into its class as the method ``initialize'', and the star-import merge
published that too, so every module that star-imported one without an
__all__ gained an ``initialize'' -- ``from _signal import *'' gave signal one,
answering _signal itself (test_signal test_functions_module_attr).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import signal

r = {}

namespace = {}
exec('from _signal import *', namespace)

r['a_star_import_binds_no_initialize'] = 'initialize' in namespace
r['nor_does_a_module_that_star_imported'] = 'initialize' in dir(signal)
r['the_public_names_still_arrive'] = [name in namespace for name in ('getsignal', 'SIGINT', 'SIG_DFL')]

EXPECTED = {
    'a_star_import_binds_no_initialize': False,
    'nor_does_a_module_that_star_imported': False,
    'the_public_names_still_arrive': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
