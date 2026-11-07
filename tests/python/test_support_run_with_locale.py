"""Fixture: test.support.run_with_locale is a context manager that also decorates.

CPython 3.14's test.support.run_with_locale is a contextlib.contextmanager,
so ``with support.run_with_locale(...)'' sets the locale for a block -- as
test_strptime's test_TimeRE_recreation_locale uses it -- and decorating a
test still works.  It skips the test when none of the locales can be set and
'' is not among them.  Grail's was a passthrough decorator, whose call
answered a function: the ``with'' failed with "'function' object does not
support the context manager protocol".  skip_if_buggy_ucrt_strfptime read a
module global, _buggy_ucrt, that Grail's trimmed support did not define, so
decorating with it was a NameError at import (test_strptime).

The fixture runs against the test.support of whichever interpreter runs it.
Every check holds under CPython 3.14, which is what makes it evidence.
"""

import locale
import unittest
from test import support

r = {}


def outcome(call):
    try:
        return call()
    except unittest.SkipTest as e:
        return 'SkipTest: %s' % e
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def in_a_block():
    with support.run_with_locale('LC_TIME', 'C'):
        return locale.setlocale(locale.LC_TIME)


@support.run_with_locale('LC_NUMERIC', 'xx_NOPE', '')
def decorated():
    return 'ran'


def only_unavailable():
    with support.run_with_locale('LC_TIME', 'xx_NOPE'):
        return 'ran'


@support.skip_if_buggy_ucrt_strfptime
def ucrt_decorated():
    return 'ran'


r['it_sets_the_locale_for_a_block'] = outcome(in_a_block)
r['it_still_decorates_a_test'] = outcome(decorated)
r['a_test_with_no_settable_locale_is_skipped'] = outcome(only_unavailable)
r['the_buggy_ucrt_decorator_leaves_a_test_alone_off_windows'] = outcome(ucrt_decorated)

EXPECTED = {
    'it_sets_the_locale_for_a_block': 'C',
    'it_still_decorates_a_test': 'ran',
    'a_test_with_no_settable_locale_is_skipped': "SkipTest: no locales ('xx_NOPE',)",
    'the_buggy_ucrt_decorator_leaves_a_test_alone_off_windows': 'ran',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-58s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
