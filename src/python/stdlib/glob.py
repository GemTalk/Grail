# GRAIL glob - filename pattern expansion over os.listdir + fnmatch.
#
# Supports the common shapes: literal paths, *, ?, [...] in any path
# component, and patterns spanning multiple components
# ("src/*/conf*.txt").  Deviations from CPython, kept deliberately
# small for V1:
#   * recursive "**" is not supported (raises ValueError);
#   * iglob() is not lazy (it iterates a precomputed list);
#   * root_dir / dir_fd are not supported.
# As in CPython, names starting with a dot only match patterns that
# themselves start with a dot.

import os
import fnmatch as _fnmatch_mod

__all__ = ["glob", "iglob", "escape", "has_magic"]

_MAGIC_CHARS = "*?["


def has_magic(s):
    for ch in _MAGIC_CHARS:
        if ch in s:
            return True
    return False


def escape(pathname):
    """Escape all special characters."""
    out = ""
    for ch in pathname:
        if ch in _MAGIC_CHARS:
            out = out + "[" + ch + "]"
        else:
            out = out + ch
    return out


def glob(pathname, recursive=False):
    """Return a list of paths matching a pathname pattern."""
    if "**" in pathname:
        raise ValueError("recursive glob ('**') is not supported in Grail")
    return _expand(pathname)


def iglob(pathname, recursive=False):
    """Return an iterator over paths matching a pathname pattern."""
    return iter(glob(pathname, recursive))


def _listdir(dirname):
    if dirname == "":
        dirname = "."
    try:
        return os.listdir(dirname)
    except OSError:
        return []


def _match_part(name, pattern):
    if name.startswith(".") and not pattern.startswith("."):
        return False
    return _fnmatch_mod.fnmatch(name, pattern)


def _join(head, tail):
    if head == "":
        return tail
    if head.endswith("/"):
        return head + tail
    return head + "/" + tail


def _expand(pattern):
    if not has_magic(pattern):
        if pattern and os.path.exists(pattern):
            return [pattern]
        return []
    if "/" in pattern:
        idx = pattern.rfind("/")
        head = pattern[:idx]
        tail = pattern[idx + 1:]
    else:
        head = ""
        tail = pattern
    if head == "":
        dirs = [""]
    elif has_magic(head):
        dirs = _expand(head)
    else:
        if os.path.exists(head):
            dirs = [head]
        else:
            dirs = []
    out = []
    for d in dirs:
        if tail == "":
            # Pattern ended with "/" - keep directories only.
            if os.path.isdir(d):
                out.append(d + "/")
        elif has_magic(tail):
            names = sorted(_listdir(d))
            for name in names:
                if _match_part(name, tail):
                    out.append(_join(d, name))
        else:
            candidate = _join(d, tail)
            if os.path.exists(candidate):
                out.append(candidate)
    return out
