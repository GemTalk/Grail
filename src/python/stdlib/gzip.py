# GRAIL gzip - gzip-format files over GsFile's transparent zlib
# compression (io._gzip_open), plus in-memory compress()/decompress()
# routed through a server temp file.  Deviations from CPython, kept
# deliberately small for V1:
#   * GzipFile is a factory function, not a class (no isinstance);
#   * file objects are stream-only: no seek()/tell();
#   * compresslevel is accepted but ignored (GsFile picks the level);
#   * mtime/filename header fields are whatever GsFile writes.

import io
import os
import time

__all__ = ["open", "GzipFile", "BadGzipFile", "compress", "decompress"]

_GRAIL_TMP_DIR = "/tmp"
_tmp_counter = [0]


class BadGzipFile(OSError):
    pass


def open(filename, mode="rb", compresslevel=9, encoding=None,
         errors=None, newline=None):
    """Open a gzip-compressed file in binary (rb/wb/ab) or text
    (rt/wt/at) mode."""
    for ch in mode:
        if ch not in "rwxabt+":
            raise ValueError("invalid mode: " + repr(mode))
    if "+" in mode:
        raise ValueError("mode " + repr(mode) + " not supported for gzip in Grail")
    return io._gzip_open(filename, mode)


def GzipFile(filename=None, mode=None, compresslevel=9, fileobj=None,
             mtime=None):
    """Factory matching the common GzipFile(filename, mode) shape.
    fileobj-based construction is not supported in Grail."""
    if fileobj is not None:
        raise ValueError("GzipFile(fileobj=...) is not supported in Grail")
    if filename is None:
        raise ValueError("GzipFile requires a filename in Grail")
    if mode is None:
        mode = "rb"
    return open(filename, mode)


def _temp_path():
    _tmp_counter[0] = _tmp_counter[0] + 1
    return (_GRAIL_TMP_DIR + "/grail_gzip_" + str(time.time_ns())
            + "_" + str(_tmp_counter[0]) + ".tmp")


def compress(data, compresslevel=9, mtime=None):
    """Compress data into a gzip-format byte string."""
    if isinstance(data, str):
        raise TypeError("a bytes-like object is required, not 'str'")
    path = _temp_path()
    f = io._gzip_open(path, "wb")
    if len(data) > 0:
        f.write(data)
    f.close()
    g = _plain_open(path, "rb")
    out = g.read()
    g.close()
    os.remove(path)
    return out


def decompress(data):
    """Decompress a gzip-format byte string."""
    if isinstance(data, str):
        raise TypeError("a bytes-like object is required, not 'str'")
    if len(data) < 2 or data[0] != 31 or data[1] != 139:
        raise BadGzipFile("Not a gzipped file")
    path = _temp_path()
    f = _plain_open(path, "wb")
    f.write(data)
    f.close()
    g = io._gzip_open(path, "rb")
    out = g.read()
    g.close()
    os.remove(path)
    return out


def _plain_open(path, mode):
    # The builtin open() is shadowed by gzip.open above (top-level defs
    # compile before the module body runs), and `import builtins` is a
    # known Grail gap — io.open is the same implementation.
    return io.open(path, mode)
