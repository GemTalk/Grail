# Minimal `errno` stub for Grail — exposes the system error code
# constants that downstream packages reach for at import time
# (Jinja2's bccache compares to EEXIST, etc.).
#
# THE VALUES ARE BSD/macOS ONES, not Linux: EAGAIN is 35 here and 11 on Linux,
# ECONNREFUSED 61 against Linux's 111.  That is a real limitation of this stub
# — the numbers are baked in rather than read from the platform — but it is
# self-consistent, which is what matters most, because the comparisons Python
# code actually makes are against these same names.  Grail's own socket layer
# raises `BlockingIOError(EAGAIN, ...)` using the value below for exactly that
# reason (PyRawSocket >> ___notReadyNow___), and a test asserts the two agree
# rather than asserting the number.
EEXIST = 17
ENOENT = 2
EACCES = 13
EISDIR = 21
EBUSY = 16
EAGAIN = 35
# An alias of EAGAIN on every platform CPython supports, and the reason the
# stdlib tests membership in `(EAGAIN, EWOULDBLOCK)` rather than equality.
EWOULDBLOCK = EAGAIN
# A non-blocking connect() reports "started, not finished" through this one,
# and EALREADY when asked again about a connect already under way.
EINPROGRESS = 36
EALREADY = 37
# A connect() on a socket that has already finished connecting.  Grail's
# non-blocking connect answers this rather than succeeding again, as CPython
# does -- and because it is NOT a BlockingIOError, a retry loop terminates.
EISCONN = 56
# Named by http.client, which swallows exactly this errno from the
# TCP_NODELAY setsockopt so a stack without the option is not fatal.
ENOPROTOOPT = 42
ECONNREFUSED = 61
ENETUNREACH = 51
EHOSTUNREACH = 65
EINTR = 4
EPERM = 1
EIO = 5
EBADF = 9
ENOMEM = 12
EFAULT = 14
ENOTDIR = 20
EINVAL = 22
EPIPE = 32
ECONNRESET = 54
ETIMEDOUT = 60
