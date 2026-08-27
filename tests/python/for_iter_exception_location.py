"""An exception from a for loop's iterator protocol reports the FOR line.

CPython attributes an exception raised from a for statement's __init__,
__iter__ or __next__ to the ITERATOR EXPRESSION, not to the loop body.
test.test_iter's test_exception_locations checks exactly this, and it failed in
the nightly conformance run with ``AssertionError: 1161 != 1160'' -- Grail
reported the ``pass'' inside the loop instead of the ``for'' line, one line low.

That failure has never reproduced on a developer box: not in isolation, not
under a 4-way-concurrent suite run, and not at the exact commit CI failed on.
It is the same shape as the intermittent live-frame family -- right frame, wrong
line -- so this exists to make the next occurrence SAY what it saw rather than
only that two numbers differed.

Expected values are derived from co_firstlineno rather than written down, so
editing this file cannot make the test wrong.  Run under CPython
(``python3 tests/python/for_iter_exception_location.py'') to see it agree.
"""

import traceback


class BrokenIter:
    """test.support.BrokenIter, verbatim in behaviour."""

    def __init__(self, init_raises=False, next_raises=False, iter_raises=False):
        if init_raises:
            1 / 0
        self.next_raises = next_raises
        self.iter_raises = iter_raises

    def __next__(self):
        if self.next_raises:
            1 / 0

    def __iter__(self):
        if self.iter_raises:
            1 / 0
        return self


def init_raises():
    try:
        for x in BrokenIter(init_raises=True):
            pass
    except Exception as e:
        return e


def next_raises():
    try:
        for x in BrokenIter(next_raises=True):
            pass
    except Exception as e:
        return e


def iter_raises():
    try:
        for x in BrokenIter(iter_raises=True):
            pass
    except Exception as e:
        return e


def _check(func, label):
    """True, or a string naming what was reported instead.

    The ``for'' statement is the second line of each function body, so the
    expected line is co_firstlineno + 2 -- computed, never hardcoded.
    """
    exc = func()
    if exc is None:
        return '%s: no exception was raised at all' % label
    tb = traceback.extract_tb(exc.__traceback__)
    if not tb:
        return '%s: traceback carried no frames' % label
    f = tb[0]
    want = func.__code__.co_firstlineno + 2
    if f.lineno == want:
        return True
    # A bare False here is what made the CI failure cost a day: it said
    # "1161 != 1160" and nothing about which case, or what the frame held.
    return ('%s: lineno=%r want=%r end_lineno=%r name=%r line=%r' %
            (label, f.lineno, want, f.end_lineno, f.name, f.line))


def init_raises_reports_the_for_line():
    return _check(init_raises, 'init_raises')


def next_raises_reports_the_for_line():
    return _check(next_raises, 'next_raises')


def iter_raises_reports_the_for_line():
    return _check(iter_raises, 'iter_raises')


CHECKS = ('init_raises_reports_the_for_line',
          'next_raises_reports_the_for_line',
          'iter_raises_reports_the_for_line')

if __name__ == '__main__':
    bad = 0
    for name in CHECKS:
        r = globals()[name]()
        print('%-4s %s' % ('OK' if r is True else 'FAIL', name))
        if r is not True:
            print('     %s' % r)
            bad += 1
    print('%d difference(s)' % bad)
