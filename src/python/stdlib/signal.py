# GRAIL minimal signal stub.
#
# Gems don't expose POSIX signal handling to Python code.  Django's
# autoreload / dev-server shutdown paths import this and register
# handlers; registration is accepted and remembered (so getsignal
# round-trips) but nothing is ever delivered.

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


def strsignal(signalnum):
    return "signal %d" % signalnum


def valid_signals():
    return set(range(1, NSIG))
