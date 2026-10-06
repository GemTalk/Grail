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

NSIG = 32

_handlers = {}


def signal(signalnum, handler):
    old = _handlers.get(signalnum, SIG_DFL)
    _handlers[signalnum] = handler
    return old


def getsignal(signalnum):
    return _handlers.get(signalnum, SIG_DFL)


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


def strsignal(signalnum):
    return "signal %d" % signalnum


def valid_signals():
    return set(range(1, NSIG))
