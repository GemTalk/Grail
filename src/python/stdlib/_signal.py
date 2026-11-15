# GRAIL _signal -- the stand-in for CPython's C module of that name.
#
# Gems don't expose POSIX signal handling to Python code.  Django's
# autoreload / dev-server shutdown paths and anyio import this and register
# handlers; registration is accepted and remembered (so getsignal
# round-trips).  The OS delivers nothing: the gem owns the process's
# signals (hostsignal_unix.c: SIGUSR1 prints its stack, SIGTERM shuts it
# down, SIGALRM is ignored, and one more -- SIGUSR2 on Darwin -- interrupts
# its threads' system calls).  The one signal that IS delivered
# is the one Python raises itself -- raise_signal() runs the handler before it
# returns, as CPython's raise(3) followed by PyErr_CheckSignals does.
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


# The signals whose default action (SIG_DFL) discards them, as Darwin's
# sigaction(2) lists them; every other signal's ends or stops the process.
_DISCARDED_BY_DEFAULT = frozenset(
    (SIGCHLD, SIGCONT, SIGURG, SIGIO, SIGWINCH, SIGINFO))


def raise_signal(signalnum, /):
    """Send signalnum to this process, and run its handler before returning.

    What CPython's raise(3) followed by PyErr_CheckSignals does: raise(3)
    refuses a number it does not know (EINVAL) and takes 0, the null signal,
    as nothing; the C handler writes the number to the wakeup fd; the Python
    handler then runs with the number and the caller's frame, and whatever
    it raises comes out of raise_signal.  SIG_IGN runs nothing, nor does
    SIG_DFL for a signal whose default action discards it.

    Refused, with NotImplementedError, where CPython would leave Python:
    SIG_DFL for a signal whose default action ends or stops the process (the
    process is the gem), and a handler raised for from a thread other than
    the main one, which CPython runs later on the main thread -- Grail has no
    point at which to interrupt it."""
    signalnum = _index(signalnum)
    if not -2**31 <= signalnum < 2**31:
        raise OverflowError("Python int too large to convert to C int")
    if signalnum == 0:
        return None
    if signalnum < 0 or signalnum >= NSIG:
        raise OSError(22, 'Invalid argument')
    handler = _handlers.get(signalnum, SIG_DFL)
    if not callable(handler):
        if handler == SIG_IGN or signalnum in _DISCARDED_BY_DEFAULT:
            return None
        raise NotImplementedError(
            "signal %d's default action would end or stop the process, "
            "which in Grail is the gem; raise_signal does not deliver it"
            % signalnum)
    if not _on_main_thread():
        raise NotImplementedError(
            "a signal handler runs on the main thread, and Grail cannot "
            "deliver signal %d to it from another thread" % signalnum)
    _write_wakeup_fd(signalnum)
    import sys
    try:
        frame = sys._getframe(1)
    except ValueError:
        frame = None
    handler(signalnum, frame)


def _on_main_thread():
    import threading
    from _thread import get_ident
    return get_ident() == threading.main_thread().ident


def _write_wakeup_fd(signalnum):
    """trip_signal's write of the number to the wakeup fd.  A failed write is
    reported to sys.unraisablehook, as CPython reports it, unless it is a
    full buffer and set_wakeup_fd said not to warn of one."""
    if _wakeup_fd == -1:
        return
    import os
    try:
        os.write(_wakeup_fd, bytes((signalnum,)))
    except OSError as exc:
        if _warn_on_full_buffer or not isinstance(exc, BlockingIOError):
            _write_unraisable(
                exc,
                'Exception ignored while trying to write to the signal wakeup fd')


class _UnraisableHookArgs:
    """The one argument sys.unraisablehook takes (sys.UnraisableHookArgs)."""

    def __init__(self, exc_type, exc_value, exc_traceback, err_msg, object):
        self.exc_type = exc_type
        self.exc_value = exc_value
        self.exc_traceback = exc_traceback
        self.err_msg = err_msg
        self.object = object


def _write_unraisable(exc, err_msg):
    """PyErr_FormatUnraisable: hand exc to whatever sys.unraisablehook is now.
    Read as an attribute, not called as sys.unraisablehook(...), which compiles
    to sys's own method and skips a hook assigned over it.  A failing hook is
    swallowed; there is no one left to report to."""
    import sys
    try:
        hook = getattr(sys, 'unraisablehook')
        hook(_UnraisableHookArgs(
            type(exc), exc, getattr(exc, '__traceback__', None), err_msg, None))
    except BaseException:
        pass


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
_warn_on_full_buffer = True


def set_wakeup_fd(fd, /, *, warn_on_full_buffer=True):
    """The descriptor raise_signal writes a signal's number to, answering the
    one it replaces; -1 for none.  As CPython does, a descriptor that is not
    open is an OSError.  NOT MODELLED: CPython also refuses a blocking one
    (``the fd 5 must be in non-blocking mode''); Grail's os cannot ask."""
    global _wakeup_fd, _warn_on_full_buffer
    fd = _index(fd)
    if fd != -1:
        import os
        os.fstat(fd)
    old, _wakeup_fd = _wakeup_fd, fd
    _warn_on_full_buffer = bool(warn_on_full_buffer)
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
