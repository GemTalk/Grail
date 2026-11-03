"""Fixture: signal refuses, describes and takes a wakeup fd as CPython's does.

Modules/signalmodule.c refuses a signal number outside 1..NSIG-1 ("signal
number out of range") in signal(), getsignal() and strsignal(); refuses a
handler that is neither callable nor SIG_IGN/SIG_DFL; reports sigaction's
EINVAL for SIGKILL; answers strsignal(3)'s description; and has
set_wakeup_fd(fd, /, *, warn_on_full_buffer=True), which refuses a
descriptor that is not open and answers the one it replaces.

Grail's _signal took any number and handler, answered "signal 2" for
strsignal, and had no set_wakeup_fd (test_signal).  Only names are used
here, never numbers: CI runs this under a Linux CPython, whose numbers
differ from Darwin's.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import os
import signal
import socket

r = {}


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError, OSError) as e:
        return '%s: %s' % (type(e).__name__, e)


def handler(signalnum, frame):
    pass


def round_trip():
    old = signal.signal(signal.SIGUSR2, handler)
    try:
        return signal.getsignal(signal.SIGUSR2) is handler
    finally:
        signal.signal(signal.SIGUSR2, old)


def wakeup_results():
    first, second = socket.socket(), socket.socket()
    try:
        first.setblocking(False)
        second.setblocking(False)
        return [signal.set_wakeup_fd(first.fileno()) == -1,
                signal.set_wakeup_fd(second.fileno()) == first.fileno(),
                signal.set_wakeup_fd(-1) == second.fileno(),
                signal.set_wakeup_fd(-1)]
    finally:
        first.close()
        second.close()


def a_closed_descriptor():
    sock = socket.socket()
    fd = sock.fileno()
    sock.close()
    return fd


OUT_OF_RANGE = 'ValueError: signal number out of range'
r['a_number_out_of_range_is_refused'] = [
    outcome(lambda: signal.getsignal(4242)), outcome(lambda: signal.signal(4242, handler)),
    outcome(lambda: signal.strsignal(4242))]
r['a_handler_must_be_callable_or_a_constant'] = outcome(lambda: signal.signal(signal.SIGUSR1, None))
r['sigkill_cannot_be_caught'] = outcome(lambda: signal.signal(signal.SIGKILL, handler))
r['a_handler_round_trips'] = round_trip()
r['strsignal_describes'] = [
    'Interrupt' in signal.strsignal(signal.SIGINT), 'Terminated' in signal.strsignal(signal.SIGTERM),
    'Hangup' in signal.strsignal(signal.SIGHUP)]
r['set_wakeup_fd_answers_the_one_it_replaces'] = wakeup_results()
r['set_wakeup_fd_refuses_as_cpythons'] = [
    str(outcome(lambda: signal.set_wakeup_fd(signum=2))).startswith('TypeError'),
    outcome(lambda: signal.set_wakeup_fd(-1, False)).startswith('TypeError'),
    outcome(lambda: signal.set_wakeup_fd(a_closed_descriptor())).startswith('OSError')]

EXPECTED = {
    'a_number_out_of_range_is_refused': [OUT_OF_RANGE] * 3,
    'a_handler_must_be_callable_or_a_constant':
        'TypeError: signal handler must be signal.SIG_IGN, signal.SIG_DFL, or a callable object',
    'sigkill_cannot_be_caught': 'OSError: [Errno 22] Invalid argument',
    'a_handler_round_trips': True,
    'strsignal_describes': [True, True, True],
    'set_wakeup_fd_answers_the_one_it_replaces': [True, True, True, -1],
    'set_wakeup_fd_refuses_as_cpythons': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
