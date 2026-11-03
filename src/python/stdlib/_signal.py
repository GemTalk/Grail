# GRAIL _signal -- the stand-in for CPython's C module of that name.
#
# Gems don't expose POSIX signal handling to Python code.  Django's
# autoreload / dev-server shutdown paths and anyio import this and register
# handlers; registration is accepted and remembered (so getsignal
# round-trips) but nothing is ever delivered.
#
# signal.py is CPython's own, vendored verbatim: it star-imports this module
# and converts the integers to the Signals / Handlers IntEnums anyio imports.
# pthread_sigmask / sigpending / sigwait are deliberately absent, so signal.py
# defines no Sigmasks enum -- the shape CPython has on a platform without them.

SIGABRT = 6
SIGALRM = 14
SIGBUS = 10
SIGCHLD = 20
SIGCONT = 19
SIGFPE = 8
SIGHUP = 1
SIGILL = 4
SIGINT = 2
SIGKILL = 9
SIGPIPE = 13
SIGQUIT = 3
SIGSEGV = 11
SIGSTOP = 17
SIGTERM = 15
SIGTSTP = 18
SIGTTIN = 21
SIGTTOU = 22
SIGUSR1 = 30
SIGUSR2 = 31
SIGWINCH = 28
# The rest of Darwin's 1..31, so every number valid_signals() answers is a
# Signals member, as it is under CPython.  SIGIOT is SIGABRT's alias.
SIGTRAP = 5
SIGIOT = 6
SIGEMT = 7
SIGSYS = 12
SIGURG = 16
SIGIO = 23
SIGXCPU = 24
SIGXFSZ = 25
SIGVTALRM = 26
SIGPROF = 27
SIGINFO = 29

SIG_DFL = 0
SIG_IGN = 1

from operator import index as _index

NSIG = 32

_handlers = {}


def _signal_number(signalnum):
    """signalnum as an int in 1..NSIG-1, refused as Modules/signalmodule.c
    refuses one outside it."""
    signalnum = _index(signalnum)
    if signalnum < 1 or signalnum >= NSIG:
        raise ValueError("signal number out of range")
    return signalnum


def signal(signalnum, handler):
    signalnum = _signal_number(signalnum)
    if not callable(handler) and handler not in (SIG_IGN, SIG_DFL):
        raise TypeError("signal handler must be signal.SIG_IGN, "
                        "signal.SIG_DFL, or a callable object")
    # sigaction(2) refuses these two, and CPython reports its errno.
    if signalnum in (SIGKILL, SIGSTOP):
        raise OSError(22, 'Invalid argument')
    old = _handlers.get(signalnum, SIG_DFL)
    _handlers[signalnum] = handler
    return old


def getsignal(signalnum):
    return _handlers.get(_signal_number(signalnum), SIG_DFL)


def raise_signal(signalnum):
    raise NotImplementedError("signal delivery is not supported in Grail")


def alarm(seconds):
    return 0


def pause():
    raise NotImplementedError("signal.pause is not supported in Grail")


def default_int_handler(signum, frame):
    raise KeyboardInterrupt


# CPython installs default_int_handler for SIGINT at startup.
_handlers[SIGINT] = default_int_handler


# What strsignal(3) answers, as glibc words it; Darwin's adds the number
# (``Interrupt: 2'').  The text is the platform's in CPython too.
_DESCRIPTIONS = {
    SIGHUP: 'Hangup', SIGINT: 'Interrupt', SIGQUIT: 'Quit',
    SIGILL: 'Illegal instruction', SIGTRAP: 'Trace/breakpoint trap',
    SIGABRT: 'Aborted', SIGEMT: 'EMT trap', SIGFPE: 'Floating point exception',
    SIGKILL: 'Killed', SIGBUS: 'Bus error', SIGSEGV: 'Segmentation fault',
    SIGSYS: 'Bad system call', SIGPIPE: 'Broken pipe', SIGALRM: 'Alarm clock',
    SIGTERM: 'Terminated', SIGURG: 'Urgent I/O condition',
    SIGSTOP: 'Stopped (signal)', SIGTSTP: 'Stopped', SIGCONT: 'Continued',
    SIGCHLD: 'Child exited', SIGTTIN: 'Stopped (tty input)',
    SIGTTOU: 'Stopped (tty output)', SIGIO: 'I/O possible',
    SIGXCPU: 'CPU time limit exceeded', SIGXFSZ: 'File size limit exceeded',
    SIGVTALRM: 'Virtual timer expired', SIGPROF: 'Profiling timer expired',
    SIGWINCH: 'Window changed', SIGINFO: 'Information request',
    SIGUSR1: 'User defined signal 1', SIGUSR2: 'User defined signal 2',
}


def strsignal(signalnum):
    return _DESCRIPTIONS.get(_signal_number(signalnum))


_wakeup_fd = -1


def set_wakeup_fd(fd, /, *, warn_on_full_buffer=True):
    """The descriptor a signal's number would be written to, answering the
    one it replaces; -1 for none.  As CPython does, a descriptor that is not
    open is an OSError.  NOT MODELLED: CPython also refuses a blocking one
    (``the fd 5 must be in non-blocking mode''); Grail's os cannot ask, and
    Grail delivers no signal to write."""
    global _wakeup_fd
    fd = _index(fd)
    if fd != -1:
        import os
        os.fstat(fd)
    old, _wakeup_fd = _wakeup_fd, fd
    return old


def valid_signals():
    return set(range(1, NSIG))


# CPython's _signal functions are built-in, so test_signal's
# test_functions_module_attr passes them by; Grail's are Python functions, and
# a routine that is not built-in must name signal -- where pydoc shows it -- as
# its module.
for _function in (signal, getsignal, raise_signal, alarm, pause,
                  default_int_handler, strsignal, valid_signals, set_wakeup_fd):
    _function.__module__ = 'signal'
del _function
