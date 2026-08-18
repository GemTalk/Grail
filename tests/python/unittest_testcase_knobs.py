"""``TestCase'' carries CPython's three message/diff knobs, and formats a
message the way CPython does.

Driven by PythonTests>>UnittestKnobsTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHY THESE THREE.  ``maxDiff'', ``longMessage'' and ``_diffThreshold'' were
missing from Grail's vendored TestCase.  Measured demand in the vendored corpus
before adding them: maxDiff appears in 9 places across 8 modules, longMessage in
none, _diffThreshold in none.  And all 9 are ASSIGNMENTS -- ``self.maxDiff =
None'' in setUp, or ``maxDiff = None'' in a class body -- which already worked,
because binding an instance attribute does not need a class default.

So the gap was narrower than it looked: what raised AttributeError was a READ
through the class, ``SomeTestCase.maxDiff''.  Recorded here rather than left
implicit, because the honest expectation for this change is that it moves ZERO
corpus tests; it closes a surface gap, and the reason to believe that is the
count above, not optimism.

WHAT THE PROBE TURNED UP NEXT DOOR.  Checking the three attributes against
CPython meant calling ``_formatMessage'', which turned out to have its two
halves the wrong way round -- CPython answers ``1 != 3 : expected three'' and
Grail answered ``expected three : 1 != 3''.  Nothing failed because of it; every
assertion message carrying an explicit ``msg='' just read inside out.  That is
the one behavioural fix here, and it is why the message-order checks below
outnumber the attribute ones.

Run this file under CPython (``python3 tests/python/unittest_testcase_knobs.py'')
to see what it produces -- that is where the expectations come from.
"""

import unittest


class _Case(unittest.TestCase):
    def runTest(self):
        return None


def _case():
    return _Case()


# ---- the three attributes, read through the CLASS ------------------------

def maxdiff_is_readable_on_the_class():
    """The read that used to raise AttributeError."""
    return _Case.maxDiff == 640


def longmessage_is_readable_on_the_class():
    return _Case.longMessage is True


def diffthreshold_is_readable_on_the_class():
    return _Case._diffThreshold == 65536


def maxdiff_is_eighty_by_eight():
    """Pinned as 80*8 rather than a bare 640 so the intent survives: eighty
    columns by eight lines."""
    return _Case.maxDiff == 80 * 8


def assigning_maxdiff_still_works():
    """The corpus pattern, and the one that worked all along -- an instance
    attribute shadows the class default."""
    c = _case()
    c.maxDiff = None
    return c.maxDiff is None and _Case.maxDiff == 640


def a_subclass_can_override_in_its_body():
    """The other corpus pattern: ``maxDiff = None'' as a class attribute."""
    class Sub(_Case):
        maxDiff = None
    return Sub().maxDiff is None and _Case.maxDiff == 640


# ---- message formatting -------------------------------------------------

def the_standard_message_comes_first():
    """THE behavioural fix.  Grail had these two the other way round."""
    return _case()._formatMessage('MINE', 'STANDARD') == 'STANDARD : MINE'


def a_missing_message_leaves_the_standard_one():
    return _case()._formatMessage(None, 'STANDARD') == 'STANDARD'


def longmessage_off_prefers_the_explicit_message():
    c = _case()
    c.longMessage = False
    return c._formatMessage('MINE', 'STANDARD') == 'MINE'


def longmessage_off_falls_back_when_there_is_no_message():
    c = _case()
    c.longMessage = False
    return c._formatMessage(None, 'STANDARD') == 'STANDARD'


def longmessage_off_treats_an_empty_message_as_absent():
    """``msg or standardMsg'', not a None test: CPython falls back for any FALSY
    explicit message, so '' takes the standard one too."""
    c = _case()
    c.longMessage = False
    return c._formatMessage('', 'STANDARD') == 'STANDARD'


def longmessage_on_keeps_an_empty_message():
    """With longMessage on there is no falsy special case, so '' is appended
    and the result ends in the separator."""
    return _case()._formatMessage('', 'STANDARD') == 'STANDARD : '


def a_non_string_message_is_stringified():
    return _case()._formatMessage(7, 'STANDARD') == 'STANDARD : 7'


def a_real_assertion_failure_reads_in_cpython_order():
    """End to end, through assertEqual rather than the helper."""
    c = _case()
    try:
        c.assertEqual(1, 3, 'expected three')
    except AssertionError as e:
        return str(e) == '1 != 3 : expected three'
    return 'no error'


# ---- maxDiff's consumer -------------------------------------------------

def a_short_diff_is_appended_whole():
    return _case()._truncateMessage('head', 'x' * 20) == 'headxxxxxxxxxxxxxxxxxxxx'


def a_long_diff_is_replaced_by_its_length():
    c = _case()
    c.maxDiff = 5
    return c._truncateMessage('head', 'x' * 20) == (
        'head\nDiff is 20 characters long. Set self.maxDiff to None to see it.')


def maxdiff_none_never_truncates():
    c = _case()
    c.maxDiff = None
    return c._truncateMessage('head', 'x' * 5000) == 'head' + 'x' * 5000


def a_diff_exactly_at_maxdiff_is_kept():
    """``<='', not ``<'' -- the boundary CPython uses."""
    c = _case()
    c.maxDiff = 20
    return c._truncateMessage('head', 'x' * 20) == 'head' + 'x' * 20


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        maxdiff_is_readable_on_the_class,
        longmessage_is_readable_on_the_class,
        diffthreshold_is_readable_on_the_class,
        maxdiff_is_eighty_by_eight,
        assigning_maxdiff_still_works,
        a_subclass_can_override_in_its_body,
        the_standard_message_comes_first,
        a_missing_message_leaves_the_standard_one,
        longmessage_off_prefers_the_explicit_message,
        longmessage_off_falls_back_when_there_is_no_message,
        longmessage_off_treats_an_empty_message_as_absent,
        longmessage_on_keeps_an_empty_message,
        a_non_string_message_is_stringified,
        a_real_assertion_failure_reads_in_cpython_order,
        a_short_diff_is_appended_whole,
        a_long_diff_is_replaced_by_its_length,
        maxdiff_none_never_truncates,
        a_diff_exactly_at_maxdiff_is_kept,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
