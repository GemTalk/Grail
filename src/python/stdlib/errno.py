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

# ---------------------------------------------------------------------------
# The rest of the table.  The 25 names above were the ones Grail happened to
# need, each with a comment saying which caller needed it; these are the
# remainder of what CPython 3.14 publishes on this platform, and they are a
# TABLE, not a design -- a package that reaches for one is not asking Grail
# for a behaviour, only for a number.
#
# Measured by reading the host's own errno module rather than recalled, so
# they are the same BSD/macOS values as above and the file stays
# self-consistent.  Names that exist only on Linux (ENOMEDIUM, EREMOTEIO,
# ...) are therefore still absent: adding them would mean mixing two
# platforms' numbering in one table, which is worse than a missing name --
# a missing name is an AttributeError at the point of use, a wrong number is
# a comparison that silently comes out false.
#
# Measured cost of NOT having them: pip's filelock stops on ESPIPE and then
# on ENOSYS, fsspec and s3fs on ESPIPE, pytest on EXDEV -- see
# docs/Package_Census.md, gap G3b.
E2BIG = 7
EADDRINUSE = 48
EADDRNOTAVAIL = 49
EAFNOSUPPORT = 47
EAUTH = 80
EBADARCH = 86
EBADEXEC = 85
EBADMACHO = 88
EBADMSG = 94
EBADRPC = 72
ECANCELED = 89
ECHILD = 10
ECONNABORTED = 53
EDEADLK = 11
EDESTADDRREQ = 39
EDEVERR = 83
EDOM = 33
EDQUOT = 69
EFBIG = 27
EFTYPE = 79
EHOSTDOWN = 64
EIDRM = 90
EILSEQ = 92
ELOOP = 62
EMFILE = 24
EMLINK = 31
EMSGSIZE = 40
EMULTIHOP = 95
ENAMETOOLONG = 63
ENEEDAUTH = 81
ENETDOWN = 50
ENETRESET = 52
ENFILE = 23
ENOATTR = 93
ENOBUFS = 55
ENODATA = 96
ENODEV = 19
ENOEXEC = 8
ENOLCK = 77
ENOLINK = 97
ENOMSG = 91
ENOPOLICY = 103
ENOSPC = 28
ENOSR = 98
ENOSTR = 99
ENOSYS = 78
ENOTBLK = 15
ENOTCAPABLE = 107
ENOTCONN = 57
ENOTEMPTY = 66
ENOTRECOVERABLE = 104
ENOTSOCK = 38
ENOTSUP = 45
ENOTTY = 25
ENXIO = 6
EOPNOTSUPP = 102
EOVERFLOW = 84
EOWNERDEAD = 105
EPFNOSUPPORT = 46
EPROCLIM = 67
EPROCUNAVAIL = 76
EPROGMISMATCH = 75
EPROGUNAVAIL = 74
EPROTO = 100
EPROTONOSUPPORT = 43
EPROTOTYPE = 41
EPWROFF = 82
EQFULL = 106
ERANGE = 34
EREMOTE = 71
EROFS = 30
ERPCMISMATCH = 73
ESHLIBVERS = 87
ESHUTDOWN = 58
ESOCKTNOSUPPORT = 44
ESPIPE = 29
ESRCH = 3
ESTALE = 70
ETIME = 101
ETOOMANYREFS = 59
ETXTBSY = 26
EUSERS = 68
EXDEV = 18


# CPython publishes the reverse map too, and code that formats an OSError
# reaches for it (``errno.errorcode[e.errno]``).  Built from the module's own
# globals rather than written out a second time, so it cannot drift from the
# names above.
errorcode = {}
for _name, _value in list(globals().items()):
    if _name.startswith('E') and isinstance(_value, int):
        errorcode.setdefault(_value, _name)
del _name, _value
