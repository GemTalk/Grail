# Trimmed test.support.os_helper for Grail.
#
# The curated CPython test modules import a scratch filename (TESTFN),
# unlink(), and EnvironmentVarGuard from here.  CPython's full os_helper adds
# unicode/undecodable TESTFN variants, Windows retry loops, temp-dir helpers,
# etc. — none of which the vendored set needs, and several of which lean on os
# facilities Grail stubs.  Keep this minimal; grow it as new modules import
# more names (the harness ERROR detail names the missing symbol).

import os

from collections.abc import MutableMapping

# A scratch filename in the current directory.  os.getpid() keeps concurrent
# sessions from colliding; fall back to a fixed suffix if it is unavailable.
TESTFN_ASCII = "@test"
try:
    TESTFN_ASCII = "{}_{}_tmp".format(TESTFN_ASCII, os.getpid())
except (AttributeError, OSError):
    pass
TESTFN = TESTFN_ASCII


def _unlink(filename):
    os.unlink(filename)


def unlink(filename):
    """Remove ``filename``, ignoring a missing file (matches CPython)."""
    try:
        _unlink(filename)
    except (FileNotFoundError, NotADirectoryError):
        pass


def create_empty_file(filename):
    """Create (or truncate) an empty file -- CPython os_helper.create_empty_file.

    CPython opens with the raw os.open(O_WRONLY|O_CREAT|O_TRUNC) flag triple;
    Grail's os module has no open()/close() fd layer, so go through the builtin
    open(), which has the same create-or-truncate effect."""
    open(filename, "w").close()


class temp_dir:
    """Context manager yielding a temporary directory path (CPython
    os_helper.temp_dir), written as a plain class -- Grail forbids
    @contextlib.contextmanager.  Creates the dir when ``path'' is None and
    removes it on exit."""

    def __init__(self, path=None, quiet=False):
        self.path = path
        self.quiet = quiet
        self._created = False

    def __enter__(self):
        import tempfile
        if self.path is None:
            self.path = tempfile.mkdtemp()
            self._created = True
        else:
            # CPython mkdirs a NAMED path too, and only its caller knows
            # whether that mattered.  Omitting it made temp_dir('x') a no-op
            # that yielded a path which did not exist -- fine for the sole
            # previous caller, which always passed None, and wrong for
            # temp_cwd below, whose whole job is to chdir into it.
            try:
                os.mkdir(self.path)
                self._created = True
            except OSError:
                if not self.quiet:
                    raise
        return self.path

    def __exit__(self, *exc):
        if self._created:
            import shutil
            shutil.rmtree(self.path, ignore_errors=True)
        return False


class change_cwd:
    """Context manager temporarily changing the CWD (CPython
    os_helper.change_cwd), written as a plain class -- Grail forbids
    @contextlib.contextmanager."""

    def __init__(self, path, quiet=False):
        self.path = path
        self.quiet = quiet
        self.saved_dir = None

    def __enter__(self):
        self.saved_dir = os.getcwd()
        try:
            os.chdir(self.path)
        except OSError:
            if not self.quiet:
                raise
        return os.getcwd()

    def __exit__(self, *exc):
        if self.saved_dir is not None:
            os.chdir(self.saved_dir)
        return False


class temp_cwd:
    """Context manager creating a temporary directory and chdir'ing into it
    (CPython os_helper.temp_cwd), written as a plain class.

    CPython nests temp_dir inside change_cwd via @contextmanager; the same
    nesting is done explicitly here, and unwound in reverse on exit so the
    CWD is restored BEFORE the directory it names is removed."""

    def __init__(self, name="tempcwd", quiet=False):
        self.name = name
        self.quiet = quiet
        self._temp_dir = None
        self._change_cwd = None

    def __enter__(self):
        self._temp_dir = temp_dir(path=self.name, quiet=self.quiet)
        temp_path = self._temp_dir.__enter__()
        self._change_cwd = change_cwd(temp_path, quiet=self.quiet)
        return self._change_cwd.__enter__()

    def __exit__(self, *exc):
        if self._change_cwd is not None:
            self._change_cwd.__exit__(*exc)
        if self._temp_dir is not None:
            self._temp_dir.__exit__(*exc)
        return False


def rmtree(path):
    """Remove a directory tree, ignoring a missing one (CPython
    os_helper.rmtree)."""
    import shutil
    shutil.rmtree(path, ignore_errors=True)


class EnvironmentVarGuard(MutableMapping):
    """Save os.environ, let a test mutate it, and restore it on exit.

    A faithful port of CPython's, not a stub for the one caller that needed
    it: it is the full MutableMapping over os.environ, so a test can read,
    set, delete, iterate and copy through the guard, and every change is
    rolled back — including deletions, and including keys that did not exist
    before (restored by being removed again).

    ``time.tzset()`` reads os.environ['TZ'], so this is what lets a test
    change the session's zone and put it back:

        with EnvironmentVarGuard() as env:
            env['TZ'] = 'EST+05EDT,M3.2.0,M11.1.0'
            time.tzset()
            ...
        time.tzset()          # back to the original zone

    Note that Grail's os.environ is a plain dict rather than a live view of
    the process environment, so this guards Python-visible state only.  That
    is exactly what tzset() consults, which is what the vendored suite uses
    it for.
    """

    def __init__(self):
        self._environ = os.environ
        self._changed = {}

    def __getitem__(self, envvar):
        return self._environ[envvar]

    def __setitem__(self, envvar, value):
        # Remember the ORIGINAL value the first time a name is touched, so a
        # name written twice still restores to what it was before the guard.
        if envvar not in self._changed:
            self._changed[envvar] = self._environ.get(envvar)
        self._environ[envvar] = value

    def __delitem__(self, envvar):
        if envvar not in self._changed:
            self._changed[envvar] = self._environ.get(envvar)
        if envvar in self._environ:
            del self._environ[envvar]

    def keys(self):
        return self._environ.keys()

    def __iter__(self):
        return iter(self._environ)

    def __len__(self):
        return len(self._environ)

    def set(self, envvar, value):
        self[envvar] = value

    def unset(self, envvar, *envvars):
        """Unset one or more environment variables."""
        for ev in (envvar,) + envvars:
            del self[ev]

    def copy(self):
        # Matches os.environ.copy(): a plain dict snapshot.
        return dict(self)

    def __enter__(self):
        return self

    def __exit__(self, *ignore_exc):
        for (k, v) in self._changed.items():
            if v is None:
                # It did not exist before the guard: remove it again.
                if k in self._environ:
                    del self._environ[k]
            else:
                self._environ[k] = v
        self._changed = {}
