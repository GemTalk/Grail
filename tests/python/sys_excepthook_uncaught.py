# sys.excepthook is what an UNCAUGHT exception is reported through (issue
# #1954): a program that assigns one has it called with (type, value,
# traceback), and sys.__excepthook__ keeps the original.
#
# Two defects.  Assigning a FUNCTION put a monkey-patch dispatcher over sys's
# ``excepthook'' accessor, so Smalltalk's ``sys excepthook'' CALLED the hook
# and answered its result -- None.  And the launcher printed an uncaught
# exception itself, never asking sys.excepthook at all.
#
# The rows below are the Python-visible half and are checked against CPython by
# scripts/check_python_fixtures.sh.  What happens to an uncaught exception
# cannot be observed from inside the process; SysExcepthookTestCase drives
# sys >> ___reportUncaught___: with the functions at the bottom, and
# tests/scripts/test_grail_launcher.sh runs whole programs.

import io
import sys

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _assigned_hook_reads_back():
    original = sys.excepthook
    dunder = sys.__excepthook__

    def hook(*args):
        return 'CALLED'

    try:
        sys.excepthook = hook
        return (sys.excepthook is hook, sys.__excepthook__ is dunder,
                original is dunder)
    finally:
        sys.excepthook = original


def _dunder_is_callable_after_reassign():
    original = sys.excepthook
    buf = io.StringIO()
    saved_stderr = sys.stderr
    try:
        sys.excepthook = lambda *args: None
        sys.stderr = buf
        try:
            raise ValueError('reported')
        except ValueError:
            sys.__excepthook__(*sys.exc_info())
    finally:
        sys.stderr = saved_stderr
        sys.excepthook = original
    return buf.getvalue().splitlines()[-1]


r['assigned_hook_reads_back'] = outcome(_assigned_hook_reads_back)
r['dunder_is_callable_after_reassign'] = outcome(_dunder_is_callable_after_reassign)


EXPECTED = {
    'assigned_hook_reads_back': 'ok -> (True, True, True)',
    'dunder_is_callable_after_reassign': "ok -> 'ValueError: reported'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


# --- driven from Smalltalk (SysExcepthookTestCase) ----------------------------
# Each leaves sys changed on purpose; the test puts excepthook back.

calls = []


def recording_hook(exc_type, exc_value, exc_tb):
    calls.append((exc_type, exc_value, exc_tb))


def failing_hook(exc_type, exc_value, exc_tb):
    raise RuntimeError('hook broke')


def exiting_hook(exc_type, exc_value, exc_tb):
    sys.exit(9)


HOOKS = {'recording': recording_hook, 'failing': failing_hook,
         'exiting': exiting_hook}


def install(name):
    del calls[:]
    sys.excepthook = HOOKS[name]
    return HOOKS[name]


def remove_hook():
    del sys.excepthook


def restore_hook():
    sys.excepthook = sys.__excepthook__


def boom():
    raise ValueError('boom')


def recorded_call(exc):
    """What the recording hook was called with, against the exception it was
    meant to report: (type is right, value is it, a traceback, the same one)."""
    if len(calls) != 1:
        return 'called %d times' % len(calls)
    exc_type, exc_value, exc_tb = calls[0]
    return (exc_type is type(exc), exc_value is exc, exc_tb is not None,
            exc_tb is exc.__traceback__)


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
