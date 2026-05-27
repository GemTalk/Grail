# Minimal ``pathlib'' stub for Grail.
#
# CPython's pathlib is a substantial OO wrapper over filesystem
# paths.  Flask only touches it in ``flask.sansio.scaffold'' for
# template / static path resolution at app-init time.  Grail
# exposes the minimum Path / PurePath surface so the import and
# the obvious method calls resolve.
#
# Real filesystem operations stay best-effort: ``exists'',
# ``is_dir'', ``is_file'' delegate to ``os.path''.  Path math
# (``.parent'', ``.name'', ``/'' joining) uses ``posixpath''.


import os
import posixpath


class PurePath:
    """Pure-path operations — no filesystem access.  Stores the
    string form and answers questions about path structure."""

    def __init__(self, *args):
        if len(args) == 0:
            self._str = '.'
        elif len(args) == 1:
            self._str = str(args[0])
        else:
            self._str = posixpath.join(*[str(a) for a in args])

    def __str__(self):
        return self._str

    def __repr__(self):
        return type(self).__name__ + '(' + repr(self._str) + ')'

    def __fspath__(self):
        return self._str

    def __truediv__(self, other):
        return type(self)(posixpath.join(self._str, str(other)))

    def __eq__(self, other):
        if isinstance(other, PurePath):
            return self._str == other._str
        return NotImplemented

    def __hash__(self):
        return hash(self._str)

    @property
    def parent(self):
        return type(self)(posixpath.dirname(self._str) or '.')

    @property
    def name(self):
        return posixpath.basename(self._str)

    @property
    def suffix(self):
        base = posixpath.basename(self._str)
        dot = base.rfind('.')
        if dot <= 0:
            return ''
        return base[dot:]

    @property
    def stem(self):
        base = posixpath.basename(self._str)
        dot = base.rfind('.')
        if dot <= 0:
            return base
        return base[:dot]

    @property
    def parts(self):
        if self._str == '/':
            return ('/',)
        return tuple(self._str.split('/'))

    def as_posix(self):
        return self._str

    def joinpath(self, *others):
        return type(self)(self._str, *others)

    def is_absolute(self):
        return self._str.startswith('/')

    def is_relative_to(self, other):
        other_str = str(other)
        return self._str == other_str or self._str.startswith(other_str + '/')


class PurePosixPath(PurePath):
    pass


class PureWindowsPath(PurePath):
    pass


class Path(PurePath):
    """Path with filesystem-touching methods.  Grail delegates to
    ``os.path'' for the small set Flask needs."""

    def exists(self):
        return os.path.exists(self._str)

    def is_dir(self):
        return os.path.isdir(self._str)

    def is_file(self):
        return os.path.isfile(self._str)

    def resolve(self):
        """Best-effort absolute path — Grail doesn't follow symlinks
        through ``realpath'' yet, so this just returns abspath."""
        return type(self)(os.path.abspath(self._str))

    def absolute(self):
        return type(self)(os.path.abspath(self._str))

    def iterdir(self):
        for name in os.listdir(self._str):
            yield type(self)(self._str, name)

    def mkdir(self, mode=0o777, parents=False, exist_ok=False):
        if parents:
            os.makedirs(self._str, mode=mode, exist_ok=exist_ok)
        else:
            try:
                os.mkdir(self._str, mode)
            except FileExistsError:
                if not exist_ok:
                    raise

    def read_text(self, encoding='utf-8', errors='strict'):
        with open(self._str, 'r') as f:
            return f.read()

    def write_text(self, data, encoding='utf-8', errors='strict'):
        with open(self._str, 'w') as f:
            return f.write(data)

    def read_bytes(self):
        with open(self._str, 'rb') as f:
            return f.read()

    def write_bytes(self, data):
        with open(self._str, 'wb') as f:
            return f.write(data)


class PosixPath(Path):
    pass


class WindowsPath(Path):
    pass
