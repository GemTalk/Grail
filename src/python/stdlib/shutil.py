# GRAIL shutil - high-level file operations over os + open().
# Deviations from CPython, kept deliberately small for V1:
#   * no metadata copying (copymode/copystat are no-ops; copy2 == copy);
#   * no symlink handling (follow_symlinks accepted and ignored);
#   * disk_usage / chown / which are not provided.

import os

__all__ = ["Error", "SameFileError", "copyfile", "copy", "copy2",
           "copymode", "copystat", "copytree", "move", "rmtree"]


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


def copymode(src, dst, follow_symlinks=True):
    """No-op in Grail (no chmod in the os layer)."""
    return None


def copystat(src, dst, follow_symlinks=True):
    """No-op in Grail (no chmod/utime in the os layer)."""
    return None


def copy(src, dst, follow_symlinks=True):
    """Copy src to dst; if dst is a directory, copy into it."""
    if os.path.isdir(dst):
        dst = os.path.join(dst, os.path.basename(src))
    return copyfile(src, dst)


def copy2(src, dst, follow_symlinks=True):
    """Like copy(); Grail copies no metadata, so this IS copy()."""
    return copy(src, dst)


def copytree(src, dst, dirs_exist_ok=False):
    """Recursively copy the directory tree rooted at src to dst."""
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
            copyfile(srcname, dstname)
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
