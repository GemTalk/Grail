# Minimal `stat` stub for Grail.  Constants + helper masks pulled
# from CPython's stat.py; only the names Jinja2's bccache touches
# are exposed, plus the common file-type / permission masks that
# show up in cookbook code.

# File-type bits in st_mode
S_IFMT = 0o170000
S_IFSOCK = 0o140000
S_IFLNK = 0o120000
S_IFREG = 0o100000
S_IFBLK = 0o060000
S_IFDIR = 0o040000
S_IFCHR = 0o020000
S_IFIFO = 0o010000

# Permission bits
S_ISUID = 0o4000
S_ISGID = 0o2000
S_ISVTX = 0o1000

S_IRWXU = 0o0700
S_IRUSR = 0o0400
S_IWUSR = 0o0200
S_IXUSR = 0o0100

S_IRWXG = 0o0070
S_IRGRP = 0o0040
S_IWGRP = 0o0020
S_IXGRP = 0o0010

S_IRWXO = 0o0007
S_IROTH = 0o0004
S_IWOTH = 0o0002
S_IXOTH = 0o0001


def S_IMODE(mode):
    """Return the portion of the mode bits that describes permissions."""
    return mode & 0o7777


def S_IFMT_of(mode):
    return mode & S_IFMT


def S_ISDIR(mode):
    return (mode & S_IFMT) == S_IFDIR


def S_ISREG(mode):
    return (mode & S_IFMT) == S_IFREG


def S_ISLNK(mode):
    return (mode & S_IFMT) == S_IFLNK


def S_ISSOCK(mode):
    return (mode & S_IFMT) == S_IFSOCK


def S_ISFIFO(mode):
    return (mode & S_IFMT) == S_IFIFO


def S_ISBLK(mode):
    return (mode & S_IFMT) == S_IFBLK


def S_ISCHR(mode):
    return (mode & S_IFMT) == S_IFCHR
