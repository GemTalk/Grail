# Minimal `errno` stub for Grail — exposes the system error code
# constants that downstream packages reach for at import time
# (Jinja2's bccache compares to EEXIST, etc.).  Values are the Linux
# numeric codes used by CPython's `errno` module on Linux/macOS; the
# constants are scalar ints either way.
EEXIST = 17
ENOENT = 2
EACCES = 13
EISDIR = 21
EBUSY = 16
EAGAIN = 35
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
ECONNREFUSED = 61
ETIMEDOUT = 60
