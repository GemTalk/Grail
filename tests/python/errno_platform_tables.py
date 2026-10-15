"""Fixture: errno is the running platform's, as CPython's is.

Grail's errno module was the macOS table on every platform.  That was
consistent for the names Python compares against, but not with the numbers
the kernel reports: os raises the raw errno, and on Linux 36 is ENAMETOOLONG
where the macOS table said EINPROGRESS.  OSError's errnomap could only cover
the errnos the two platforms number alike, so ``OSError(EAGAIN, ...)`` was a
plain OSError rather than a BlockingIOError (test_exception_hierarchy), and
the socket layer translated Linux numbers onto macOS ones to keep its own
side straight.

TABLES is CPython 3.14.8's errno on each platform, in number order, with the
name errno.errorcode answers FIRST where a number has several.  EXPECTED reads
the running platform's row, so the check holds under CPython on macOS and,
in CI's fixture gate, on Linux -- that is what verifies the Linux row, which
a Mac cannot.  Under Grail, GRAIL_ROWS also compares BOTH of Grail's own
tables (OSError.___errnoPairsFor___) against these, so the row this machine
does not run is checked too.
"""

import errno
import sys

TABLES = {
    'darwin': (
        ('EPERM', 1), ('ENOENT', 2), ('ESRCH', 3), ('EINTR', 4), ('EIO', 5),
        ('ENXIO', 6), ('E2BIG', 7), ('ENOEXEC', 8), ('EBADF', 9), ('ECHILD',
        10), ('EDEADLK', 11), ('ENOMEM', 12), ('EACCES', 13), ('EFAULT',
        14), ('ENOTBLK', 15), ('EBUSY', 16), ('EEXIST', 17), ('EXDEV', 18),
        ('ENODEV', 19), ('ENOTDIR', 20), ('EISDIR', 21), ('EINVAL', 22),
        ('ENFILE', 23), ('EMFILE', 24), ('ENOTTY', 25), ('ETXTBSY', 26),
        ('EFBIG', 27), ('ENOSPC', 28), ('ESPIPE', 29), ('EROFS', 30),
        ('EMLINK', 31), ('EPIPE', 32), ('EDOM', 33), ('ERANGE', 34),
        ('EAGAIN', 35), ('EWOULDBLOCK', 35), ('EINPROGRESS', 36),
        ('EALREADY', 37), ('ENOTSOCK', 38), ('EDESTADDRREQ', 39),
        ('EMSGSIZE', 40), ('EPROTOTYPE', 41), ('ENOPROTOOPT', 42),
        ('EPROTONOSUPPORT', 43), ('ESOCKTNOSUPPORT', 44), ('ENOTSUP', 45),
        ('EPFNOSUPPORT', 46), ('EAFNOSUPPORT', 47), ('EADDRINUSE', 48),
        ('EADDRNOTAVAIL', 49), ('ENETDOWN', 50), ('ENETUNREACH', 51),
        ('ENETRESET', 52), ('ECONNABORTED', 53), ('ECONNRESET', 54),
        ('ENOBUFS', 55), ('EISCONN', 56), ('ENOTCONN', 57), ('ESHUTDOWN',
        58), ('ETOOMANYREFS', 59), ('ETIMEDOUT', 60), ('ECONNREFUSED', 61),
        ('ELOOP', 62), ('ENAMETOOLONG', 63), ('EHOSTDOWN', 64),
        ('EHOSTUNREACH', 65), ('ENOTEMPTY', 66), ('EPROCLIM', 67),
        ('EUSERS', 68), ('EDQUOT', 69), ('ESTALE', 70), ('EREMOTE', 71),
        ('EBADRPC', 72), ('ERPCMISMATCH', 73), ('EPROGUNAVAIL', 74),
        ('EPROGMISMATCH', 75), ('EPROCUNAVAIL', 76), ('ENOLCK', 77),
        ('ENOSYS', 78), ('EFTYPE', 79), ('EAUTH', 80), ('ENEEDAUTH', 81),
        ('EPWROFF', 82), ('EDEVERR', 83), ('EOVERFLOW', 84), ('EBADEXEC',
        85), ('EBADARCH', 86), ('ESHLIBVERS', 87), ('EBADMACHO', 88),
        ('ECANCELED', 89), ('EIDRM', 90), ('ENOMSG', 91), ('EILSEQ', 92),
        ('ENOATTR', 93), ('EBADMSG', 94), ('EMULTIHOP', 95), ('ENODATA',
        96), ('ENOLINK', 97), ('ENOSR', 98), ('ENOSTR', 99), ('EPROTO',
        100), ('ETIME', 101), ('EOPNOTSUPP', 102), ('ENOPOLICY', 103),
        ('ENOTRECOVERABLE', 104), ('EOWNERDEAD', 105), ('EQFULL', 106),
        ('ENOTCAPABLE', 107),
    ),
    'linux': (
        ('EPERM', 1), ('ENOENT', 2), ('ESRCH', 3), ('EINTR', 4), ('EIO', 5),
        ('ENXIO', 6), ('E2BIG', 7), ('ENOEXEC', 8), ('EBADF', 9), ('ECHILD',
        10), ('EAGAIN', 11), ('EWOULDBLOCK', 11), ('ENOMEM', 12), ('EACCES',
        13), ('EFAULT', 14), ('ENOTBLK', 15), ('EBUSY', 16), ('EEXIST', 17),
        ('EXDEV', 18), ('ENODEV', 19), ('ENOTDIR', 20), ('EISDIR', 21),
        ('EINVAL', 22), ('ENFILE', 23), ('EMFILE', 24), ('ENOTTY', 25),
        ('ETXTBSY', 26), ('EFBIG', 27), ('ENOSPC', 28), ('ESPIPE', 29),
        ('EROFS', 30), ('EMLINK', 31), ('EPIPE', 32), ('EDOM', 33),
        ('ERANGE', 34), ('EDEADLOCK', 35), ('EDEADLK', 35), ('ENAMETOOLONG',
        36), ('ENOLCK', 37), ('ENOSYS', 38), ('ENOTEMPTY', 39), ('ELOOP',
        40), ('ENOMSG', 42), ('EIDRM', 43), ('ECHRNG', 44), ('EL2NSYNC',
        45), ('EL3HLT', 46), ('EL3RST', 47), ('ELNRNG', 48), ('EUNATCH',
        49), ('ENOCSI', 50), ('EL2HLT', 51), ('EBADE', 52), ('EBADR', 53),
        ('EXFULL', 54), ('ENOANO', 55), ('EBADRQC', 56), ('EBADSLT', 57),
        ('EBFONT', 59), ('ENOSTR', 60), ('ENODATA', 61), ('ETIME', 62),
        ('ENOSR', 63), ('ENONET', 64), ('ENOPKG', 65), ('EREMOTE', 66),
        ('ENOLINK', 67), ('EADV', 68), ('ESRMNT', 69), ('ECOMM', 70),
        ('EPROTO', 71), ('EMULTIHOP', 72), ('EDOTDOT', 73), ('EBADMSG', 74),
        ('EOVERFLOW', 75), ('ENOTUNIQ', 76), ('EBADFD', 77), ('EREMCHG',
        78), ('ELIBACC', 79), ('ELIBBAD', 80), ('ELIBSCN', 81), ('ELIBMAX',
        82), ('ELIBEXEC', 83), ('EILSEQ', 84), ('ERESTART', 85),
        ('ESTRPIPE', 86), ('EUSERS', 87), ('ENOTSOCK', 88), ('EDESTADDRREQ',
        89), ('EMSGSIZE', 90), ('EPROTOTYPE', 91), ('ENOPROTOOPT', 92),
        ('EPROTONOSUPPORT', 93), ('ESOCKTNOSUPPORT', 94), ('ENOTSUP', 95),
        ('EOPNOTSUPP', 95), ('EPFNOSUPPORT', 96), ('EAFNOSUPPORT', 97),
        ('EADDRINUSE', 98), ('EADDRNOTAVAIL', 99), ('ENETDOWN', 100),
        ('ENETUNREACH', 101), ('ENETRESET', 102), ('ECONNABORTED', 103),
        ('ECONNRESET', 104), ('ENOBUFS', 105), ('EISCONN', 106),
        ('ENOTCONN', 107), ('ESHUTDOWN', 108), ('ETOOMANYREFS', 109),
        ('ETIMEDOUT', 110), ('ECONNREFUSED', 111), ('EHOSTDOWN', 112),
        ('EHOSTUNREACH', 113), ('EALREADY', 114), ('EINPROGRESS', 115),
        ('ESTALE', 116), ('EUCLEAN', 117), ('ENOTNAM', 118), ('ENAVAIL',
        119), ('EISNAM', 120), ('EREMOTEIO', 121), ('EDQUOT', 122),
        ('ENOMEDIUM', 123), ('EMEDIUMTYPE', 124), ('ECANCELED', 125),
        ('ENOKEY', 126), ('EKEYEXPIRED', 127), ('EKEYREVOKED', 128),
        ('EKEYREJECTED', 129), ('EOWNERDEAD', 130), ('ENOTRECOVERABLE',
        131), ('ERFKILL', 132), ('EHWPOISON', 133),
    ),
}

SUBCLASSES = {
    'BlockingIOError': ['EAGAIN', 'EINPROGRESS', 'EALREADY'],
    'BrokenPipeError': ['EPIPE', 'ESHUTDOWN'],
    'ChildProcessError': ['ECHILD'],
    'ConnectionAbortedError': ['ECONNABORTED'],
    'ConnectionRefusedError': ['ECONNREFUSED'],
    'ConnectionResetError': ['ECONNRESET'],
    'FileExistsError': ['EEXIST'],
    'FileNotFoundError': ['ENOENT'],
    'InterruptedError': ['EINTR'],
    'IsADirectoryError': ['EISDIR'],
    'NotADirectoryError': ['ENOTDIR'],
    'PermissionError': ['EPERM', 'EACCES', 'ENOTCAPABLE'],
    'ProcessLookupError': ['ESRCH'],
    'TimeoutError': ['ETIMEDOUT'],
}


def _row(module):
    names = [n for n in dir(module) if n.startswith('E')]
    code = module.errorcode
    names.sort(key=lambda n: (getattr(module, n), code[getattr(module, n)] != n, n))
    return tuple((n, getattr(module, n)) for n in names)


def _first_wins(row):
    out = {}
    for name, number in row:
        out.setdefault(number, name)
    return sorted(out.items())


def _subclasses():
    out = {}
    for number, name in sorted(errno.errorcode.items()):
        cls = type(OSError(number, 'x')).__name__
        if cls != 'OSError':
            out.setdefault(cls, []).append(name)
    return out


def _expected_subclasses(row):
    names = {n for n, _ in row}
    out = {}
    for cls, wanted in SUBCLASSES.items():
        have = [n for n in wanted if n in names]
        if have:
            out[cls] = sorted(have, key=lambda n: dict(row)[n])
    return out


r = {}
r['the_table'] = _row(errno)
r['errorcode'] = sorted(errno.errorcode.items())
r['oserror_picks_the_subclass_by_name'] = _subclasses()
r['the_module_has_no_stray_names'] = sorted(
    n for n in dir(errno) if not n.startswith('E') and not n.startswith('__'))

_mine = TABLES.get(sys.platform, ())
EXPECTED = {
    'the_table': _mine,
    'errorcode': _first_wins(_mine),
    'oserror_picks_the_subclass_by_name': _expected_subclasses(_mine),
    'the_module_has_no_stray_names': ['errorcode'],
}

KNOWN_DIVERGENCES = {}

# Grail only: both of its tables, not just the running one.
try:
    _pairs_for = OSError.___errnoPairsFor___
except AttributeError:
    GRAIL_ROWS = None
else:
    def _grail_row(platform):
        flat = _pairs_for(platform)
        return tuple((flat[i], flat[i + 1]) for i in range(0, len(flat), 2))
    GRAIL_ROWS = {p: _grail_row(p) == TABLES[p] for p in sorted(TABLES)}
GRAIL_ROWS_SUMMARY = repr(GRAIL_ROWS)

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print('GRAIL_ROWS', GRAIL_ROWS)
    print(SUMMARY)
