# GRAIL shutil - high-level file operations over os + open().
#
# METADATA IS COPIED.  copystat/copymode really set the destination's
# permission bits and times, so copy2() is no longer copy().  What that rests
# on is os.chmod and os.utime, both of which shell out (GemStone exposes
# neither chmod(2) nor utimes(2)) and both of which READ THE RESULT BACK and
# raise if it did not take -- so a caller that sees copystat return has been
# told something, not merely not-raised-at.
#
# WHAT IS STILL NOT COPIED, and why each is a MATCH for CPython rather than a
# gap.  CPython's copystat guards both of these on a feature test:
#   * st_flags / chflags -- guarded on ``hasattr(st, 'st_flags')''.  Grail's
#     os.stat_result has no st_flags (GsFileStat exposes no BSD file flags), so
#     CPython running with this stat_result would skip chflags too.
#   * extended attributes -- CPython's _copyxattr is defined only when
#     ``hasattr(os, 'listxattr')''.  Grail's os has no listxattr, so under
#     CPython _copyxattr would be the no-op stub.
# The OWNER (uid/gid) is not copied by CPython's copystat either.
#
# Remaining deviations from CPython:
#   * copyfile()'s follow_symlinks is accepted and ignored (it always copies
#     the CONTENT); copystat/copymode do honour it, see copystat below;
#   * copytree() takes no symlinks/ignore/copy_function arguments -- it always
#     behaves as CPython's default, copy2 per file plus copystat per directory;
#   * disk_usage / chown / which are not provided;
#   * get_terminal_size answers a collections.namedtuple rather than an
#     os.terminal_size -- see get_terminal_size below.

import collections as _collections
import os
import stat as _stat

__all__ = ["Error", "SameFileError", "copyfile", "copy", "copy2",
           "copymode", "copystat", "copytree", "move", "rmtree",
           "get_terminal_size"]


class Error(OSError):
    pass


class SameFileError(Error):
    pass


def copyfile(src, dst, follow_symlinks=True):
    """Copy data from src to dst (paths must differ)."""
    if os.path.abspath(src) == os.path.abspath(dst):
        raise SameFileError("'" + src + "' and '" + dst + "' are the same file")
    f = open(src, "rb")
    data = f.read()
    f.close()
    g = open(dst, "wb")
    g.write(data)
    g.close()
    return dst


def _both_are_links(src, dst):
    """CPython's test for "follow_symlinks=False actually means anything"."""
    return os.path.islink(src) and os.path.islink(dst)


def copymode(src, dst, follow_symlinks=True):
    """Copy src's permission bits to dst.

    follow_symlinks=False with both paths symlinks needs lchmod, which Grail
    does not have (nor does CPython on Linux); CPython returns without doing
    anything in that case, and so does this.
    """
    if not follow_symlinks and _both_are_links(src, dst):
        return None
    os.chmod(dst, _stat.S_IMODE(os.stat(src).st_mode))
    return None


def copystat(src, dst, follow_symlinks=True):
    """Copy src's permission bits and times to dst.

    The order is CPython's -- times first, then mode -- and the reason is not
    cosmetic: chmod may leave the file read-only, and on the platforms where
    the times are set through the file rather than the path, doing it the
    other way round fails with EACCES.

    follow_symlinks=False means "act on the link itself", and only bites when
    BOTH paths are symlinks (CPython computes exactly this).  In that case the
    times ARE set on the link (os.utime honours follow_symlinks, via touch -h)
    and the mode is NOT, because that would need lchmod: os.chmod raises
    NotImplementedError, which is caught here for the same reason CPython
    catches it -- on Linux there is no way to chmod a symlink, so giving up is
    the answer, not an error.

    st_flags and xattrs are not copied; see the module header for why that is
    what CPython would do with this os module too.
    """
    follow = follow_symlinks or not _both_are_links(src, dst)
    st = os.stat(src) if follow else os.lstat(src)
    mode = _stat.S_IMODE(st.st_mode)
    os.utime(dst, ns=(st.st_atime_ns, st.st_mtime_ns), follow_symlinks=follow)
    try:
        os.chmod(dst, mode)
    except NotImplementedError:
        pass
    return None


def copy(src, dst, follow_symlinks=True):
    """Copy src to dst; if dst is a directory, copy into it.

    Copies the PERMISSION BITS as well, which is what CPython's copy() does
    (copyfile + copymode) and what this did not: the difference is visible the
    moment a 0o600 source is copied and the copy comes out 0o644.  The TIMES
    are still not copied -- that is copy2's job in CPython too.
    """
    if os.path.isdir(dst):
        dst = os.path.join(dst, os.path.basename(src))
    copyfile(src, dst)
    copymode(src, dst)
    return dst


def copy2(src, dst, follow_symlinks=True):
    """Like copy(), and then copystat() -- so the times come across too.

    This used to BE copy(), which is what made a "copy2 preserves metadata"
    expectation silently false; it no longer is.
    """
    if os.path.isdir(dst):
        dst = os.path.join(dst, os.path.basename(src))
    copyfile(src, dst)
    copystat(src, dst)
    return dst


def copytree(src, dst, dirs_exist_ok=False):
    """Recursively copy the directory tree rooted at src to dst.

    Files come across with copy2 and directories with copystat, which is what
    CPython's default copy_function=copy2 does -- so a tree copy preserves
    metadata rather than the files-only half of it.  A directory's own stat is
    applied AFTER its contents are written, since writing into a directory
    resets its mtime.
    """
    if os.path.exists(dst):
        if not dirs_exist_ok:
            raise FileExistsError("[Errno 17] File exists: '" + dst + "'")
    else:
        os.makedirs(dst)
    for name in sorted(os.listdir(src)):
        srcname = os.path.join(src, name)
        dstname = os.path.join(dst, name)
        if os.path.isdir(srcname):
            copytree(srcname, dstname, dirs_exist_ok)
        else:
            copy2(srcname, dstname)
    copystat(src, dst)
    return dst


def move(src, dst):
    """Move src to dst; if dst is a directory, move into it."""
    if os.path.isdir(dst):
        dst = os.path.join(dst, os.path.basename(src))
    os.rename(src, dst)
    return dst


def _rmtree_inner(path):
    for name in os.listdir(path):
        full = os.path.join(path, name)
        if os.path.isdir(full):
            _rmtree_inner(full)
        else:
            os.remove(full)
    os.rmdir(path)


def rmtree(path, ignore_errors=False):
    """Recursively delete a directory tree."""
    if ignore_errors:
        try:
            _rmtree_inner(path)
        except OSError:
            pass
        return None
    _rmtree_inner(path)
    return None


# CPython's os.terminal_size is a struct sequence built by the posix module.
# Grail's os has no file-descriptor layer and no ioctl, so it exposes neither
# os.get_terminal_size nor os.terminal_size, and a Smalltalk peer class for a
# two-field tuple would be out of proportion to what it is.  A namedtuple of
# the same name carries the same two fields and the same indexing, which is
# every use in the corpus; the only thing it cannot answer is
# ``isinstance(size, os.terminal_size)''.
terminal_size = _collections.namedtuple('terminal_size', ['columns', 'lines'])


def get_terminal_size(fallback=(80, 24)):
    """The terminal size, as CPython computes it on a platform with no query.

    CPython reads $COLUMNS / $LINES first and only then asks the OS via
    ``os.get_terminal_size(sys.__stdout__.fileno())``, catching AttributeError
    for exactly the case Grail is in -- an os with no such function -- and
    falling back to the ``fallback`` pair.  So this IS CPython's code with the
    unreachable branch removed, not a stub standing in for it: a CPython built
    without the query answers the same thing.

    A gem has no controlling terminal anyway, so the honest answer for the
    unset case is the fallback; setting COLUMNS in the environment is what a
    caller who wants a different width has.
    """
    try:
        columns = int(os.environ['COLUMNS'])
    except (KeyError, ValueError):
        columns = 0
    try:
        lines = int(os.environ['LINES'])
    except (KeyError, ValueError):
        lines = 0
    if columns <= 0:
        columns = fallback[0]
    if lines <= 0:
        lines = fallback[1]
    return terminal_size(columns, lines)
