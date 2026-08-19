"""test.support's check_warnings() records AND checks.

It is not a silencer with a list attached.  On exit it verifies the recorded
warnings against the filters it was given:

  * a filter that caught nothing raises AssertionError, unless quiet;
  * a warning that no filter claimed raises AssertionError always.

``quiet'' defaults to True when called with NO filters and False when filters
are given -- which is why the bare form reads as "silence warnings here" and
the filtered form reads as an assertion.

The object it yields is a WarningsRecorder, and two of its habits matter:
attribute reads PROXY to the LAST warning (so ``w.message'' is the most recent
one, not a list), and ``reset()'' moves a watermark rather than emptying the
list, so ``w.warnings'' answers only what arrived since.

Grail's version recorded and never checked, and exposed the bare list with no
proxy -- so ``str(w.message)'' raised AttributeError and both of
test_check_warnings' assertRaises(AssertionError) cases passed for the wrong
reason.

Every expectation below was checked against CPython 3.14.
"""

import warnings

from test.support import warnings_helper

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def raises(fn, *types):
    try:
        fn()
    except types:
        return 'raised'
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return '<no raise>'


# --------------------------------------------- the recorder proxies

def _message_is_the_last_one():
    with warnings_helper.check_warnings(quiet=False) as w:
        warnings.simplefilter('always')
        warnings.warn('foo')
        first = str(w.message)
        warnings.warn('bar')
        return (first, str(w.message))


check('message_proxies_to_the_last_warning', _message_is_the_last_one,
      ('foo', 'bar'))


def _warnings_list_accumulates():
    with warnings_helper.check_warnings(quiet=False) as w:
        warnings.simplefilter('always')
        warnings.warn('foo')
        warnings.warn('bar')
        return [str(rec.message) for rec in w.warnings]


check('the_list_holds_them_in_order', _warnings_list_accumulates,
      ['foo', 'bar'])


def _reset_moves_the_watermark():
    with warnings_helper.check_warnings(quiet=False) as w:
        warnings.simplefilter('always')
        warnings.warn('foo')
        w.reset()
        after_reset = list(w.warnings)
        warnings.warn('bar')
        return (after_reset, [str(r.message) for r in w.warnings])


check('reset_moves_a_watermark', _reset_moves_the_watermark, ([], ['bar']))


def _empty_before_anything():
    # quiet=True: with no filters the default ("", Warning) still applies, so
    # quiet=False here would correctly raise for catching nothing -- which is
    # the checking half, not the recording half this asserts.
    with warnings_helper.check_warnings(quiet=True) as w:
        return list(w.warnings)


check('empty_before_anything_is_recorded', _empty_before_anything, [])


# ------------------------------------------------- the checking half

def _bare_form_is_quiet():
    with warnings_helper.check_warnings():
        pass
    return 'ok'


# No filters => quiet => catching nothing is fine.
check('the_bare_form_tolerates_silence', _bare_form_is_quiet, 'ok')


def _matching_filter_passes():
    with warnings_helper.check_warnings(('foo', UserWarning)):
        warnings.warn('foo')
    return 'ok'


check('a_matching_filter_passes', _matching_filter_passes, 'ok')


def _unmatched_filter_raises():
    def body():
        with warnings_helper.check_warnings(('', RuntimeWarning)):
            pass
    return raises(body, AssertionError)


# A filter given explicitly means quiet=False, so catching nothing is an error.
check('a_filter_that_caught_nothing_raises', _unmatched_filter_raises,
      'raised')


def _wrong_category_raises():
    def body():
        with warnings_helper.check_warnings(('foo', RuntimeWarning)):
            warnings.warn('foo')
    return raises(body, AssertionError)


# The message matches but the CATEGORY does not, so the filter caught nothing
# and the warning went unclaimed -- either way, an error.
check('a_wrong_category_raises', _wrong_category_raises, 'raised')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
