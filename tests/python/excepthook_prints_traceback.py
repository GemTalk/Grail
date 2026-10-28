"""Fixture: sys.excepthook prints the exception and its traceback to sys.stderr.

CPython's sys.excepthook -- and sys.__excepthook__, the same function -- is
PyErr_Display: it prints what an unhandled exception prints, through the
traceback module, to sys.stderr.  A traceback handed in goes onto an exception
that has none (bpo-18776), and a None sys.stderr prints nothing.

Grail's logged ``'Exception: ' , value printString`` to the GCI server log
instead, and that printString is env 1, which no exception understands: every
call was an uncatchable Smalltalk error (test_exceptions test_unhandled,
test_issue45826, test_issue45826_focused).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io
import sys


def report(*info):
    saved, sys.stderr = sys.stderr, io.StringIO()
    try:
        sys.excepthook(*info)
        return sys.stderr.getvalue()
    finally:
        sys.stderr = saved


def raised():
    try:
        raise ValueError('test message')
    except ValueError:
        return sys.exc_info()


def chained():
    def inner():
        try:
            nonsense
        except BaseException as exc:
            exc.with_traceback(None)
            raise ZeroDivisionError()
    try:
        inner()
    except ZeroDivisionError:
        return sys.exc_info()


r = {}
text = report(*raised())
r['raised'] = [text.startswith('Traceback (most recent call last):\n'),
               "raise ValueError('test message')" in text,
               text.endswith('ValueError: test message\n')]
text = report(*chained())
r['chained'] = ['nonsense' in text, 'During handling of the above exception' in text,
                text.endswith('ZeroDivisionError\n')]
fresh = KeyError('k')
r['no_traceback'] = report(KeyError, fresh, None)
r['same_function'] = [sys.excepthook is sys.__excepthook__]
saved, sys.stderr = sys.stderr, None
try:
    r['stderr_none'] = sys.excepthook(*raised())
finally:
    sys.stderr = saved

EXPECTED = {
    'raised': [True, True, True],
    'chained': [True, True, True],
    'no_traceback': "KeyError: 'k'\n",
    'same_function': [True],
    'stderr_none': None,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-14s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
