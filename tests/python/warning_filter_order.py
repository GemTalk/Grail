"""The filter decides BEFORE the recorder sees a warning.

``catch_warnings(record=True)'' does not capture everything that is warned --
it captures what the filters decided to SHOW.  In CPython the recorder replaces
showwarning, which sits at the end of the pipeline, so a warning the filters
suppressed never reaches it.

Grail recorded first and filtered afterwards, so recording was filter-blind:
``simplefilter("ignore")'' still captured one, and ``once'' captured every
repeat.  The order is the semantics, not an implementation detail.

Two consequences that look unrelated but are the same bug:

  * an ``ignore'' filter must record NOTHING, and
  * ``once'' / ``default'' must record a repeat only once.

``assertWarns'' is the reason this could not simply be reordered.  CPython's
installs its own filter -- resetwarnings() then simplefilter("always") -- so
the assertion is about whether the code warns at all, not about whatever
filters happen to be installed.  Grail's did not, which did not matter while
the recorder ran ahead of the filters; with the order corrected, an assertWarns
under an ``ignore'' filter would record nothing and fail for the wrong reason.

Every expectation below was checked against CPython 3.14.
"""

import unittest
import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def _count(action, n=3):
    """Warn twice with the same text and once with another, under `action`."""
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter(action)
        warnings.warn('m1')
        warnings.warn('m1')
        warnings.warn('m2')
        return len(w)


# --------------------------------------------------- the filter decides

check('ignore_records_nothing', lambda: _count('ignore'), 0)
check('always_records_every_one', lambda: _count('always'), 3)
# 'all' is 3.14's alias for 'always' -- unrecognised, it fell through to the
# deduping branch and every repeat after the first vanished.
check('all_is_an_alias_for_always', lambda: _count('all'), 3)
# 'once' dedupes on the MESSAGE, so the repeat is dropped wherever it was
# written.
check('once_dedupes_on_the_message', lambda: _count('once'), 2)

# GRAIL LIMITATION.  CPython's 'default' dedupes on (message, category, LINE),
# so the two 'm1' calls above are distinct to it and it records 3.  Grail's key
# is (message, category) with no line, and records 2.
#
# The line is available -- warning records carry it -- but only on the RECORDING
# path, where the raise that gets the live frame is affordable.  Dedupe happens
# on the ordinary warn path, which must not pay a raise per call, so matching
# CPython here means paying it everywhere.  That trade is the reason this is a
# documented difference rather than a bug.
GRAIL_ONLY = ['default_dedupes_without_the_line']

check('default_dedupes_without_the_line', lambda: _count('default'), 2)


def _error_raises():
    with warnings.catch_warnings(record=True):
        warnings.resetwarnings()
        warnings.simplefilter('error')
        try:
            warnings.warn('boom')
        except UserWarning:
            return 'raised'
    return '<no raise>'


# 'error' raises even while recording -- the filter runs first, so there is
# nothing to record.
check('error_raises_even_while_recording', _error_raises, 'raised')


# A category-scoped filter suppresses only its own category.
def _category_scoped():
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter('always')
        warnings.filterwarnings('ignore', category=DeprecationWarning)
        warnings.warn('shown', UserWarning)
        warnings.warn('hidden', DeprecationWarning)
        return [str(rec.message) for rec in w]


check('a_scoped_filter_suppresses_only_its_category', _category_scoped,
      ['shown'])


# ------------------------------------------------- assertWarns is immune

class _Probe(unittest.TestCase):
    def runTest(self):
        pass


def _assert_warns_under_ignore():
    """assertWarns must work even when an 'ignore' filter is installed."""
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        t = _Probe()
        with t.assertWarns(UserWarning):
            warnings.warn('still seen')
    return 'ok'


check('assert_warns_ignores_the_ambient_filter',
      _assert_warns_under_ignore, 'ok')


def _assert_warns_restores_filters():
    """It must put the ambient filters back when it leaves."""
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        before = len(warnings.filters)
        t = _Probe()
        with t.assertWarns(UserWarning):
            warnings.warn('x')
        after = len(warnings.filters)
        # ...and the ambient 'ignore' is in force again.
        with warnings.catch_warnings(record=True) as w:
            warnings.warn('suppressed')
            return (before == after, len(w))


check('assert_warns_restores_the_ambient_filters',
      _assert_warns_restores_filters, (True, 0))


# ------------------------------------------------------ unchanged

def _record_one():
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter('always')
        warnings.warn('hello')
        return list(w)


check('a_warning_still_carries_its_message',
      lambda: str(_record_one()[0].message), 'hello')
check('a_warning_still_carries_its_category',
      lambda: _record_one()[0].category.__name__, 'UserWarning')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        if _name in GRAIL_ONLY:
            continue
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
    # Asserts a Grail LIMITATION, so CPython is expected to disagree.  XFAIL is
    # that expected disagreement; XPASS would mean the difference is gone.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for _name in GRAIL_ONLY:
        _v = RESULTS[_name]
        print('%-5s %s' % ('XPASS' if _v is True else 'XFAIL', _name))
