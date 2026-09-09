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


import fnmatch
import os
import posixpath


def _os_listdir_or_empty(path):
    """``os.listdir`` that answers () for anything unreadable.

    glob()/rglob() walk directories they did not choose, and CPython's
    globbing likewise ignores an entry it cannot descend rather than
    raising out of the middle of a generator."""
    try:
        return os.listdir(path)
    except OSError:
        return ()


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

    # CPython orders paths of the same flavour, and callers rely on it --
    # ``sorted(p.rglob('*'))`` is the ordinary way to walk a tree
    # reproducibly.  Comparing against a non-path is NotImplemented rather
    # than an error, so Python falls back to the reflected operand.
    def __lt__(self, other):
        if isinstance(other, PurePath):
            return self._str < other._str
        return NotImplemented

    def __le__(self, other):
        if isinstance(other, PurePath):
            return self._str <= other._str
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, PurePath):
            return self._str > other._str
        return NotImplemented

    def __ge__(self, other):
        if isinstance(other, PurePath):
            return self._str >= other._str
        return NotImplemented

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

    def relative_to(self, other):
        other_str = str(other)
        if self._str == other_str:
            return type(self)('.')
        if not self._str.startswith(other_str.rstrip('/') + '/'):
            raise ValueError(
                '%r is not in the subpath of %r' % (self._str, other_str))
        return type(self)(self._str[len(other_str.rstrip('/')) + 1:])

    def with_name(self, name):
        parent = posixpath.dirname(self._str)
        if not posixpath.basename(self._str):
            raise ValueError('%r has an empty name' % (self._str,))
        return type(self)(posixpath.join(parent, name) if parent else name)

    def with_suffix(self, suffix):
        """Replace the suffix.  An empty ``suffix`` strips it, which is
        how ``zipapp`` derives an output name from an input one."""
        if suffix and not suffix.startswith('.'):
            raise ValueError('Invalid suffix %r' % (suffix,))
        return self.with_name(self.stem + suffix)


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

    def glob(self, pattern):
        """Non-recursive pattern match against this directory's entries.

        Only the shapes the stub's callers use: a plain ``fnmatch``
        pattern, and the ``**/`` prefix that means "at any depth", which
        is what rglob() is defined as.  Matching is on the ENTRY NAME, so
        a pattern with a path separator in it is not supported."""
        if pattern.startswith('**/'):
            yield from self.rglob(pattern[3:])
            return
        for name in sorted(_os_listdir_or_empty(self._str)):
            if fnmatch.fnmatch(name, pattern):
                yield type(self)(self._str, name)

    def rglob(self, pattern):
        """``glob`` at every depth below this directory.

        Walked breadth-first with an explicit stack rather than through
        os.walk, because the stub answers Path objects and needs the
        directory prefix of each hit."""
        stack = [self._str]
        while stack:
            here = stack.pop(0)
            for name in sorted(_os_listdir_or_empty(here)):
                full = posixpath.join(here, name)
                if fnmatch.fnmatch(name, pattern):
                    yield type(self)(full)
                if os.path.isdir(full):
                    stack.append(full)

    def mkdir(self, mode=0o777, parents=False, exist_ok=False):
        if parents:
            os.makedirs(self._str, mode=mode, exist_ok=exist_ok)
        else:
            try:
                os.mkdir(self._str, mode)
            except FileExistsError:
                if not exist_ok:
                    raise

    def touch(self, mode=0o666, exist_ok=True):
        """Create the file if it does not exist.

        CPython also updates the mtime of an existing file; Grail does
        not, so an existing file is simply left alone.  ``exist_ok=False``
        still raises FileExistsError, which is the half callers branch on
        -- and the half test_zipapp uses to build its fixtures."""
        if os.path.exists(self._str):
            if not exist_ok:
                raise FileExistsError(17, 'File exists', self._str)
            return
        with open(self._str, 'wb'):
            pass

    def unlink(self, missing_ok=False):
        try:
            os.remove(self._str)
        except FileNotFoundError:
            if not missing_ok:
                raise

    def rmdir(self):
        os.rmdir(self._str)

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
