"""Fixture: signal.raise_signal delivers the signal as CPython's does.

CPython's raise_signal is raise(3) followed by PyErr_CheckSignals: the C
handler writes the number to the wakeup fd, then the Python handler runs --
with the number and the caller's frame -- before raise_signal returns, and
whatever it raises comes out of raise_signal.  SIG_IGN runs nothing, nor does
SIG_DFL for a signal whose default action discards it; raise(3) refuses a
number it does not know (EINVAL) and takes 0 as the null signal.  A failed
wakeup-fd write goes to sys.unraisablehook, ahead of the handler.

Grail's raise_signal raised NotImplementedError for every signal, so
test_signal's test_sigint and test_handler errored.  Only names are used
here, never numbers: CI runs this under a Linux CPython, whose numbers
differ from Darwin's.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import os
import signal
import socket
import sys
import tempfile

r = {}


def outcome(call):
    try:
        return call()
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, e)


def with_handler(signalnum, handler, body):
    old = signal.signal(signalnum, handler)
    try:
        return body()
    finally:
        signal.signal(signalnum, old)


def with_wakeup_fd(fd, body):
    old = signal.set_wakeup_fd(fd)
    try:
        return body()
    finally:
        signal.set_wakeup_fd(old)


def sigint_under_the_default_handler():
    return with_handler(signal.SIGINT, signal.default_int_handler,
                        lambda: outcome(lambda: signal.raise_signal(signal.SIGINT)))


def the_handler_runs_before_raise_signal_returns():
    seen = []

    def handler(signalnum, frame):
        seen.append('handler')

    def body():
        signal.raise_signal(signal.SIGUSR1)
        seen.append('returned')
        return seen
    return with_handler(signal.SIGUSR1, handler, body)


def the_handler_gets_the_number_and_the_callers_frame():
    seen = []

    def handler(signalnum, frame):
        seen.extend([type(signalnum) is int, signalnum == signal.SIGUSR1,
                     frame.f_code.co_name])

    def the_caller():
        signal.raise_signal(signal.SIGUSR1)
    with_handler(signal.SIGUSR1, handler, the_caller)
    return seen


def what_the_handler_raises_comes_out():
    def handler(signalnum, frame):
        raise ValueError('from the handler')
    return with_handler(signal.SIGUSR1, handler,
                        lambda: outcome(lambda: signal.raise_signal(signal.SIGUSR1)))


def a_handler_can_raise_another():
    seen = []

    def handler(signalnum, frame):
        name = 'USR1' if signalnum == signal.SIGUSR1 else 'USR2'
        seen.append(name)
        if signalnum == signal.SIGUSR1:
            signal.raise_signal(signal.SIGUSR2)
        seen.append('/' + name)

    def body():
        with_handler(signal.SIGUSR2, handler,
                     lambda: signal.raise_signal(signal.SIGUSR1))
        return seen
    return with_handler(signal.SIGUSR1, handler, body)


def ignored_and_discarded_signals_run_nothing():
    return [
        with_handler(signal.SIGUSR1, signal.SIG_IGN,
                     lambda: signal.raise_signal(signal.SIGUSR1)),
        with_handler(signal.SIGCHLD, signal.SIG_DFL,
                     lambda: signal.raise_signal(signal.SIGCHLD)),
        with_handler(signal.SIGURG, signal.SIG_DFL,
                     lambda: signal.raise_signal(signal.SIGURG)),
        with_handler(signal.SIGWINCH, signal.SIG_DFL,
                     lambda: signal.raise_signal(signal.SIGWINCH)),
    ]


def the_number_is_checked_as_raise_does():
    return [outcome(lambda: signal.raise_signal(0)),
            outcome(lambda: signal.raise_signal(4242)),
            outcome(lambda: signal.raise_signal(-1)),
            outcome(lambda: signal.raise_signal(2 ** 40)),
            outcome(lambda: signal.raise_signal('2')),
            outcome(lambda: signal.raise_signal(2.5))]


def the_wakeup_fd_gets_the_number_before_the_handler_runs():
    fd, path = tempfile.mkstemp()
    os.close(fd)
    # CPython refuses a blocking wakeup fd.  Grail's os has no O_NONBLOCK, and
    # its set_wakeup_fd does not ask (see its docstring).
    fd = os.open(path, os.O_WRONLY | getattr(os, 'O_NONBLOCK', 0))
    sizes = []
    try:
        def deliver():
            with_handler(signal.SIGUSR1,
                         lambda signalnum, frame: sizes.append(os.path.getsize(path)),
                         lambda: signal.raise_signal(signal.SIGUSR1))
            with_handler(signal.SIGUSR1, signal.SIG_IGN,
                         lambda: signal.raise_signal(signal.SIGUSR1))
        with_wakeup_fd(fd, deliver)
    finally:
        os.close(fd)
    with open(path, 'rb') as f:
        written = f.read()
    os.unlink(path)
    return [sizes, written == bytes([signal.SIGUSR1])]


def a_failed_wakeup_write_is_unraisable_and_comes_first():
    events = []
    sock = socket.socket()          # never connected, so a write fails
    sock.setblocking(False)
    old_hook = sys.unraisablehook

    def hook(args):
        events.append([issubclass(args.exc_type, OSError), args.err_msg,
                       args.object])

    sys.unraisablehook = hook
    try:
        with_wakeup_fd(sock.fileno(), lambda: with_handler(
            signal.SIGUSR1, lambda signalnum, frame: events.append('handler'),
            lambda: signal.raise_signal(signal.SIGUSR1)))
    finally:
        sys.unraisablehook = old_hook
        sock.close()
    return events


r['sigint_under_the_default_handler_is_keyboard_interrupt'] = sigint_under_the_default_handler()
r['the_handler_runs_before_raise_signal_returns'] = the_handler_runs_before_raise_signal_returns()
r['the_handler_gets_the_number_and_the_callers_frame'] = (
    the_handler_gets_the_number_and_the_callers_frame())
r['what_the_handler_raises_comes_out'] = what_the_handler_raises_comes_out()
r['a_handler_can_raise_another'] = a_handler_can_raise_another()
r['ignored_and_discarded_signals_run_nothing'] = ignored_and_discarded_signals_run_nothing()
r['the_number_is_checked_as_raise_does'] = the_number_is_checked_as_raise_does()
r['the_wakeup_fd_gets_the_number_before_the_handler_runs'] = (
    the_wakeup_fd_gets_the_number_before_the_handler_runs())
r['a_failed_wakeup_write_is_unraisable_and_comes_first'] = (
    a_failed_wakeup_write_is_unraisable_and_comes_first())

INVALID = 'OSError: [Errno 22] Invalid argument'
EXPECTED = {
    'sigint_under_the_default_handler_is_keyboard_interrupt': 'KeyboardInterrupt: ',
    'the_handler_runs_before_raise_signal_returns': ['handler', 'returned'],
    'the_handler_gets_the_number_and_the_callers_frame': [True, True, 'the_caller'],
    'what_the_handler_raises_comes_out': 'ValueError: from the handler',
    'a_handler_can_raise_another': ['USR1', 'USR2', '/USR2', '/USR1'],
    'ignored_and_discarded_signals_run_nothing': [None, None, None, None],
    'the_number_is_checked_as_raise_does': [
        None, INVALID, INVALID,
        'OverflowError: Python int too large to convert to C int',
        "TypeError: 'str' object cannot be interpreted as an integer",
        "TypeError: 'float' object cannot be interpreted as an integer"],
    'the_wakeup_fd_gets_the_number_before_the_handler_runs': [[1], True],
    'a_failed_wakeup_write_is_unraisable_and_comes_first': [
        [True, 'Exception ignored while trying to write to the signal wakeup fd', None],
        'handler'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key in r:
            print('    %r: %r,' % (key, r[key]))
        sys.exit()
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-54s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
