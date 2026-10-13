# Minimal `tempfile` for Grail.  Jinja2's FileSystemBytecodeCache was the
# original consumer, reachable on the Flask render path.  mkdtemp,
# TemporaryDirectory, mkstemp, NamedTemporaryFile, TemporaryFile and
# SpooledTemporaryFile are real.  Expand the rest as downstream packages
# actually need it.
#
# THE FILE-BACKED HALF, AND WHY IT REOPENS BY NAME.  CPython creates the file
# with os.open(O_CREAT | O_EXCL) -- the exclusivity is the security property:
# nobody else can have created or linked that name first -- and then wraps the
# DESCRIPTOR in a file object.  Grail has the first half (os.open is real
# open(2)) but not the second: open() refuses an integer descriptor.  So the
# name is reserved the same way, the descriptor closed, and the file reopened
# by path.  What that gives up is the guarantee that the reopened file is the
# one reserved, should someone replace it in the gap; the directory is the
# caller's (default /tmp, sticky) and the file is created 0600, as CPython's
# is.  mkstemp hands the descriptor itself back, exactly as CPython does.

import os


def gettempdir():
    return "/tmp"


def gettempprefix():
    return "tmp"


_name_counter = [0]


def _next_candidate(prefix, suffix):
    """A per-gem-unique directory name.

    No `random` here: uniqueness comes from the OS pid (distinct per gem, so
    concurrent sessions cannot collide) plus a monotonic in-process counter.
    mkdtemp's O_EXCL-equivalent -- os.mkdir failing when the name exists --
    is what actually guarantees exclusivity; this only has to make collisions
    rare enough that the retry loop terminates."""
    _name_counter[0] += 1
    return "%s%d_%d%s" % (prefix, os.getpid(), _name_counter[0], suffix)


def mkdtemp(suffix=None, prefix=None, dir=None):
    """Create a uniquely-named directory and return its absolute path.

    A real implementation, not the previous NotImplementedError stub: `os`
    provides mkdir/rmdir, so there is no reason for the caller to be refused.
    The caller owns the directory and is responsible for removing it, exactly
    as in CPython."""
    if suffix is None:
        suffix = ""
    if prefix is None:
        prefix = gettempprefix()
    if dir is None:
        dir = gettempdir()

    last = None
    for _attempt in range(100):
        path = dir + "/" + _next_candidate(prefix, suffix)
        try:
            # 0o700: CPython creates the directory private to its owner.
            os.mkdir(path, 0o700)
            return path
        except OSError as exc:
            # Name taken (or a transient failure) -- try the next candidate.
            last = exc
    raise FileExistsError(
        "tempfile.mkdtemp: no unique name found in %r after 100 attempts (%s)"
        % (dir, last))


def _sanitize_params(prefix, suffix, dir):
    if suffix is None:
        suffix = ""
    if prefix is None:
        prefix = gettempprefix()
    if dir is None:
        dir = gettempdir()
    return prefix, suffix, dir


def _mkstemp_inner(dir, pre, suf):
    """(fd, absolute path) of a newly created file only this caller can have
    made: O_EXCL fails if the name exists, and a taken name moves on to the
    next candidate, as mkdtemp does."""
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL
    for extra in ("O_NOFOLLOW", "O_CLOEXEC"):
        flags |= getattr(os, extra, 0)
    last = None
    for _attempt in range(100):
        path = os.path.join(dir, _next_candidate(pre, suf))
        try:
            fd = os.open(path, flags, 0o600)
        except FileExistsError as exc:
            last = exc
            continue
        return fd, os.path.abspath(path)
    raise FileExistsError(
        "tempfile: no unique name found in %r after 100 attempts (%s)"
        % (dir, last))


def mktemp(suffix="", prefix=None, dir=None):
    """A pathname that did not exist when this was called -- CPython's
    deprecated, race-prone mktemp, which creates nothing.  test_pickle's
    command-line tests write their pickle file under such a name."""
    prefix, suffix, dir = _sanitize_params(prefix, suffix, dir)
    for _attempt in range(100):
        path = os.path.join(dir, _next_candidate(prefix, suffix))
        if not os.path.exists(path):
            return path
    raise FileExistsError(
        "tempfile.mktemp: no unique name found in %r after 100 attempts" % (dir,))


def mkstemp(suffix=None, prefix=None, dir=None, text=False):
    """Create a uniquely-named file and answer (fd, absolute path).  The
    caller owns both, as in CPython: close the descriptor and remove the file
    when done."""
    prefix, suffix, dir = _sanitize_params(prefix, suffix, dir)
    return _mkstemp_inner(dir, prefix, suffix)


def _create_and_open(mode, buffering, encoding, newline, suffix, prefix, dir,
                     errors):
    prefix, suffix, dir = _sanitize_params(prefix, suffix, dir)
    fd, name = _mkstemp_inner(dir, prefix, suffix)
    os.close(fd)
    try:
        if "b" in mode:
            file = open(name, mode, buffering)
        else:
            file = open(name, mode, buffering, encoding=encoding,
                        newline=newline, errors=errors)
    except BaseException:
        os.unlink(name)
        raise
    return file, name


class _TemporaryFileWrapper:
    """CPython's wrapper: the file object's own attributes are delegated,
    ``name'' is the path, and the file is removed on close or on leaving the
    ``with'' block according to delete / delete_on_close (3.12)."""

    def __init__(self, file, name, delete=True, delete_on_close=True):
        self.file = file
        self.name = name
        self._delete = delete
        self._delete_on_close = delete_on_close
        self._removed = False

    def __getattr__(self, name):
        # Only reached for attributes the wrapper does not have itself.
        return getattr(self.__dict__["file"], name)

    def _remove(self):
        if not self._removed:
            self._removed = True
            try:
                os.unlink(self.name)
            except FileNotFoundError:
                pass

    def close(self):
        try:
            self.file.close()
        finally:
            if self._delete and self._delete_on_close:
                self._remove()

    def __enter__(self):
        self.file.__enter__()
        return self

    def __exit__(self, exc, value, tb):
        try:
            self.file.close()
        finally:
            if self._delete:
                self._remove()
        return False

    def __iter__(self):
        return iter(self.file)

    def __repr__(self):
        return "<tempfile._TemporaryFileWrapper %r>" % (self.name,)


def NamedTemporaryFile(mode="w+b", buffering=-1, encoding=None, newline=None,
                       suffix=None, prefix=None, dir=None, delete=True, *,
                       errors=None, delete_on_close=True):
    """A file with a visible name, removed on close unless delete=False (or,
    with delete_on_close=False, only when its ``with'' block ends)."""
    file, name = _create_and_open(mode, buffering, encoding, newline, suffix,
                                  prefix, dir, errors)
    return _TemporaryFileWrapper(file, name, delete, delete_on_close)


def TemporaryFile(mode="w+b", buffering=-1, encoding=None, newline=None,
                  suffix=None, prefix=None, dir=None, *, errors=None):
    """A temporary file, removed when it is closed.

    On POSIX CPython unlinks it the moment it is open, so it never has a name
    at all.  Grail cannot: its file object does not survive the unlink of its
    path -- measured, a write followed by seek(0) and read() answers b'' once
    the name is gone, flushed or not.  So this is CPython's OWN answer for a
    platform where an open file cannot be unlinked, which is Windows: there
    ``TemporaryFile is NamedTemporaryFile'', and the name is visible while the
    file is open."""
    return NamedTemporaryFile(mode, buffering, encoding, newline, suffix,
                              prefix, dir, errors=errors)


# SpooledTemporaryFile is CPython 3.14's, verbatim: in memory until max_size,
# then rolled over to a real TemporaryFile.  It was a stub that raised on
# construction, and starlette spools EVERY uploaded file through one -- so
# FastAPI's File()/UploadFile parameters answered "There was an error parsing
# the body" (docs/Support_FastAPI.md, Phase 5).
import io as _io
import types as _types


class SpooledTemporaryFile(_io.IOBase):
    """Temporary file wrapper, specialized to switch from BytesIO
    or StringIO to a real file when it exceeds a certain size or
    when a fileno is needed.
    """
    _rolled = False

    def __init__(self, max_size=0, mode='w+b', buffering=-1,
                 encoding=None, newline=None,
                 suffix=None, prefix=None, dir=None, *, errors=None):
        if 'b' in mode:
            self._file = _io.BytesIO()
        else:
            encoding = _io.text_encoding(encoding)
            self._file = _io.TextIOWrapper(_io.BytesIO(),
                            encoding=encoding, errors=errors,
                            newline=newline)
        self._max_size = max_size
        self._rolled = False
        self._TemporaryFileArgs = {'mode': mode, 'buffering': buffering,
                                   'suffix': suffix, 'prefix': prefix,
                                   'encoding': encoding, 'newline': newline,
                                   'dir': dir, 'errors': errors}

    __class_getitem__ = classmethod(_types.GenericAlias)

    def _check(self, file):
        if self._rolled: return
        max_size = self._max_size
        if max_size and file.tell() > max_size:
            self.rollover()

    def rollover(self):
        if self._rolled: return
        file = self._file
        newfile = self._file = TemporaryFile(**self._TemporaryFileArgs)
        del self._TemporaryFileArgs

        pos = file.tell()
        if hasattr(newfile, 'buffer'):
            newfile.buffer.write(file.detach().getvalue())
        else:
            newfile.write(file.getvalue())
        newfile.seek(pos, 0)

        self._rolled = True

    # The method caching trick from NamedTemporaryFile
    # won't work here, because _file may change from a
    # BytesIO/StringIO instance to a real file. So we list
    # all the methods directly.

    # Context management protocol
    def __enter__(self):
        if self._file.closed:
            raise ValueError("Cannot enter context with closed file")
        return self

    def __exit__(self, exc, value, tb):
        self._file.close()

    # file protocol
    def __iter__(self):
        return self._file.__iter__()

    def __del__(self):
        if not self.closed:
            _warnings.warn(
                "Unclosed file {!r}".format(self),
                ResourceWarning,
                stacklevel=2,
                source=self
            )
            self.close()

    def close(self):
        self._file.close()

    @property
    def closed(self):
        return self._file.closed

    @property
    def encoding(self):
        return self._file.encoding

    @property
    def errors(self):
        return self._file.errors

    def fileno(self):
        self.rollover()
        return self._file.fileno()

    def flush(self):
        self._file.flush()

    def isatty(self):
        return self._file.isatty()

    @property
    def mode(self):
        try:
            return self._file.mode
        except AttributeError:
            return self._TemporaryFileArgs['mode']

    @property
    def name(self):
        try:
            return self._file.name
        except AttributeError:
            return None

    @property
    def newlines(self):
        return self._file.newlines

    def readable(self):
        return self._file.readable()

    def read(self, *args):
        return self._file.read(*args)

    def read1(self, *args):
        return self._file.read1(*args)

    def readinto(self, b):
        return self._file.readinto(b)

    def readinto1(self, b):
        return self._file.readinto1(b)

    def readline(self, *args):
        return self._file.readline(*args)

    def readlines(self, *args):
        return self._file.readlines(*args)

    def seekable(self):
        return self._file.seekable()

    def seek(self, *args):
        return self._file.seek(*args)

    def tell(self):
        return self._file.tell()

    def truncate(self, size=None):
        if size is None:
            return self._file.truncate()
        else:
            if size > self._max_size:
                self.rollover()
            return self._file.truncate(size)

    def writable(self):
        return self._file.writable()

    def write(self, s):
        file = self._file
        rv = file.write(s)
        self._check(file)
        return rv

    def writelines(self, iterable):
        if self._max_size == 0 or self._rolled:
            return self._file.writelines(iterable)

        it = iter(iterable)
        for line in it:
            self.write(line)
            if self._rolled:
                return self._file.writelines(it)

    def detach(self):
        return self._file.detach()



class TemporaryDirectory:
    """CPython's ``tempfile.TemporaryDirectory``, on top of mkdtemp.

    Deliberately a real implementation rather than the NotImplementedError stub
    the rest of this module's file-backed types get: nothing here needs a
    temporary FILE, only a temporary DIRECTORY, and mkdtemp already provides
    that.  ``test.test_traceback``'s TestKeywordTypoSuggestions is one caller --
    it wants a scratch directory to write a script into -- and
    ``test.support.os_helper.temp_dir`` reaches for the same shape.

    ``shutil`` is imported lazily, inside cleanup(), and not at module scope: a
    module-level import would make every ``import tempfile'' pull in shutil (and
    through it stat + collections) for a class most callers never construct.
    shutil imports os, not tempfile, so there is no cycle either way -- this is
    about import cost, not correctness.

    ``delete=False`` (3.12+) keeps the directory after the with-block, for a
    caller that wants to inspect it; ``ignore_cleanup_errors`` swallows an OSError
    from the removal, which is CPython's escape hatch for a directory whose
    contents another process is holding open."""
    __class_getitem__ = classmethod(type(list[int]))  # types.GenericAlias, as CPython's

    def __init__(self, suffix=None, prefix=None, dir=None,
                 ignore_cleanup_errors=False, *, delete=True):
        self.name = mkdtemp(suffix, prefix, dir)
        self._ignore_cleanup_errors = ignore_cleanup_errors
        self._delete = delete
        self._finalized = False

    def __repr__(self):
        return "<%s %r>" % (type(self).__name__, self.name)

    def __enter__(self):
        return self.name

    def __exit__(self, exc, value, tb):
        if self._delete:
            self.cleanup()

    def cleanup(self):
        """Remove the directory tree.  Idempotent, as CPython's is: the
        with-block calls it on exit and a caller may call it again."""
        if self._finalized:
            return
        self._finalized = True
        import shutil
        try:
            shutil.rmtree(self.name)
        except OSError:
            if not self._ignore_cleanup_errors:
                raise
