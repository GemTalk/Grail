"""Fixtures for ``importlib.resources`` -- the modern ``files()`` API and the
pre-3.11 functional one.

Driven by PythonTests>>ImportlibResourcesTestCase.  Each check answers True
when the behaviour matches CPython, so a failure names the specific rule.

WHAT WAS BROKEN: Grail had no ``importlib.resources`` at all, so
``import certifi`` -- and with it every HTTPS client that asks certifi where
the CA bundle is -- died at

    ModuleNotFoundError: No module named 'importlib.resources'

certifi's ``where()`` is exactly the two calls checked here:
``as_file(files("certifi").joinpath("cacert.pem"))``, entered by hand rather
than with a ``with`` statement (it stores the manager in a global and hands
``__exit__`` to atexit), then ``str()`` of the result.

Run this file under CPython
(``python3 tests/python/importlib_resources_api.py``) to see what it produces
-- that is where the expectations come from.

THE ``_api`` SUFFIX IS LOAD-BEARING.  Grail compiles a module to a Smalltalk
class named after its dotted path with the dots replaced by underscores, so
``importlib.resources`` IS the class ``importlib_resources``.  A fixture named
importlib_resources.py therefore built a class of the same name and clobbered
the module under test: every later call died with ``NameError: name '_os' is
not defined'' -- the real module's globals, gone -- and the fixture passed only
when it happened to run first.

NOT asserted here, because CPython 3.14 and Grail genuinely differ and the
difference is a Grail limitation rather than a claim about CPython:

  * ``files()`` with NO anchor.  CPython infers the caller's package from its
    globals; Grail does not represent a module body as a Python frame, so
    ``files()`` raises TypeError instead of guessing.  Checked from Smalltalk.
  * the concrete type ``files()`` answers.  CPython gives a ``pathlib.Path``
    and Grail an ``importlib.resources._FsPath``, because Grail has no
    pathlib.  Everything the two have in common IS checked -- ``str()``,
    ``name``, ``is_file``, ``iterdir``, ``joinpath``, ``/``, ``open``,
    ``read_text``, ``read_bytes`` -- which is the whole contract callers use.
"""

import os
import sys
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = 'pkg_resource_fixture'
PKG_DIR = os.path.join(HERE, PKG)
HELLO = 'hello resource\n'
NESTED = 'nested resource\n'
PAYLOAD = b'binary-payload'


def _ensure_pkg():
    """Import the fixture package with this directory temporarily on sys.path.

    Temporarily, and not left behind: a Grail suite runs many fixtures in one
    long-lived session, and a fixture that permanently extends the module
    search path changes what every LATER test can import.  Once the package is
    in sys.modules the path entry is not needed again -- ``files()`` resolves
    an already-imported anchor straight out of sys.modules.
    """
    if PKG in sys.modules:
        return sys.modules[PKG]
    sys.path.insert(0, HERE)
    try:
        __import__(PKG)
    finally:
        sys.path.remove(HERE)
    return sys.modules[PKG]


def _ensure_subpkg():
    _ensure_pkg()
    name = PKG + '.sub'
    if name in sys.modules:
        return sys.modules[name]
    sys.path.insert(0, HERE)
    try:
        __import__(name)
    finally:
        sys.path.remove(HERE)
    return sys.modules[name]


def files_of_a_package_is_its_directory():
    """``files(pkg)`` anchors on the directory holding ``__init__.py``."""
    _ensure_pkg()
    from importlib.resources import files
    root = files(PKG)
    return str(root) == PKG_DIR and root.name == PKG and root.is_dir() is True


def files_accepts_a_module_object():
    """The anchor may be the module itself, not just its name."""
    mod = _ensure_pkg()
    from importlib.resources import files
    return str(files(mod)) == PKG_DIR


def joinpath_finds_a_data_file():
    _ensure_pkg()
    from importlib.resources import files
    hello = files(PKG).joinpath('hello.txt')
    return (hello.name == 'hello.txt'
            and hello.is_file() is True
            and hello.is_dir() is False)


def truediv_is_joinpath():
    """``files(pkg) / 'name'`` -- the spelling most callers actually use."""
    _ensure_pkg()
    from importlib.resources import files
    root = files(PKG)
    return str(root / 'hello.txt') == str(root.joinpath('hello.txt'))


def read_text_returns_the_contents():
    _ensure_pkg()
    from importlib.resources import files
    return files(PKG).joinpath('hello.txt').read_text() == HELLO


def read_text_honours_an_explicit_encoding():
    """certifi's ``contents()`` passes encoding='ascii' by keyword."""
    _ensure_pkg()
    from importlib.resources import files
    return files(PKG).joinpath('hello.txt').read_text(encoding='ascii') == HELLO


def read_bytes_returns_bytes():
    _ensure_pkg()
    from importlib.resources import files
    return files(PKG).joinpath('payload.bin').read_bytes() == PAYLOAD


def open_reads_text_and_binary():
    _ensure_pkg()
    from importlib.resources import files
    hello = files(PKG).joinpath('hello.txt')
    with hello.open('r') as fp:
        text = fp.read()
    with hello.open('rb') as fp:
        raw = fp.read()
    return text == HELLO and raw == HELLO.encode('ascii')


def joinpath_walks_several_segments():
    """Both spellings CPython accepts: separate segments, and one '/'-joined."""
    _ensure_pkg()
    from importlib.resources import files
    root = files(PKG)
    by_parts = root.joinpath('sub', 'nested.txt')
    by_slash = root.joinpath('sub/nested.txt')
    return (by_parts.read_text() == NESTED
            and str(by_parts) == str(by_slash))


def iterdir_lists_the_package_contents():
    """A superset check: CPython leaves __pycache__ in the directory once the
    package has been imported, so the listing is not a fixed set."""
    _ensure_pkg()
    from importlib.resources import files
    names = set()
    for entry in files(PKG).iterdir():
        names.add(entry.name)
    return set(['__init__.py', 'hello.txt', 'payload.bin', 'sub']) <= names


def a_subpackage_anchors_its_own_directory():
    _ensure_subpkg()
    from importlib.resources import files
    root = files(PKG + '.sub')
    return (str(root) == os.path.join(PKG_DIR, 'sub')
            and root.joinpath('nested.txt').read_text() == NESTED)


def as_file_yields_a_real_path():
    _ensure_pkg()
    from importlib.resources import as_file, files
    with as_file(files(PKG).joinpath('hello.txt')) as located:
        text = str(located)
        if not os.path.isfile(text):
            return False
        with open(text) as fp:
            return fp.read() == HELLO


def as_file_can_be_entered_by_hand():
    """certifi's exact idiom: no ``with``, the manager lives in a global and
    ``__exit__`` is handed to atexit.  A generator-based context manager
    survives that too, but only if nothing assumes the ``with`` statement."""
    _ensure_pkg()
    from importlib.resources import as_file, files
    ctx = as_file(files(PKG).joinpath('hello.txt'))
    located = str(ctx.__enter__())
    ok = os.path.isfile(located)
    ctx.__exit__(None, None, None)
    return ok


def a_missing_resource_is_not_a_file():
    _ensure_pkg()
    from importlib.resources import files
    missing = files(PKG).joinpath('no_such_resource.txt')
    return missing.is_file() is False and missing.is_dir() is False


def reading_a_missing_resource_raises_filenotfound():
    _ensure_pkg()
    from importlib.resources import files
    try:
        files(PKG).joinpath('no_such_resource.txt').read_text()
    except FileNotFoundError:
        return True
    return False


def a_directory_is_not_a_resource():
    """``is_resource`` exists precisely to tell a data file from a subdir."""
    _ensure_pkg()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        from importlib.resources import is_resource
        return is_resource(PKG, 'hello.txt') is True and is_resource(PKG, 'sub') is False


def legacy_read_helpers_match_the_file():
    _ensure_pkg()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        from importlib.resources import read_binary, read_text
        return (read_text(PKG, 'hello.txt') == HELLO
                and read_binary(PKG, 'payload.bin') == PAYLOAD)


def legacy_open_helpers_match_the_file():
    _ensure_pkg()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        from importlib.resources import open_binary, open_text
        with open_text(PKG, 'hello.txt') as fp:
            text = fp.read()
        with open_binary(PKG, 'payload.bin') as fp:
            raw = fp.read()
    return text == HELLO and raw == PAYLOAD


def legacy_path_yields_a_real_path():
    _ensure_pkg()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        from importlib.resources import path as resource_path
        with resource_path(PKG, 'hello.txt') as located:
            return os.path.isfile(str(located))


def legacy_contents_lists_the_package():
    _ensure_pkg()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        from importlib.resources import contents
        names = set(contents(PKG))
    return set(['__init__.py', 'hello.txt', 'payload.bin', 'sub']) <= names


def what_files_answers_is_a_traversable():
    """CPython 3.14 spells Traversable as a runtime-checkable Protocol, so its
    pathlib.Path satisfies this structurally; Grail's _FsPath satisfies it by
    inheritance.  Either way the isinstance a caller writes is True."""
    _ensure_pkg()
    from importlib.resources import files
    from importlib.resources.abc import Traversable
    return isinstance(files(PKG), Traversable)


def the_resources_abc_submodule_is_importable():
    """``importlib.resources.abc`` -- a package nested two deep."""
    import importlib.resources.abc as resources_abc
    names = ('iterdir', 'read_bytes', 'read_text', 'is_dir', 'is_file',
             'joinpath', 'open', 'name')
    traversable = resources_abc.Traversable
    for name in names:
        if not hasattr(traversable, name):
            return False
    return hasattr(resources_abc, 'TraversableResources')


def traversable_is_not_re_exported_from_importlib_abc():
    """CPython removed Traversable from importlib.abc in 3.14, which is the
    level Grail reports.  Grail has no importlib.abc at all, so the check
    passes both ways: absent module, or present module without the name."""
    try:
        import importlib.abc as importlib_abc
    except ImportError:
        return True
    return getattr(importlib_abc, 'Traversable', None) is None


if __name__ == '__main__':
    checks = [
        files_of_a_package_is_its_directory,
        files_accepts_a_module_object,
        joinpath_finds_a_data_file,
        truediv_is_joinpath,
        read_text_returns_the_contents,
        read_text_honours_an_explicit_encoding,
        read_bytes_returns_bytes,
        open_reads_text_and_binary,
        joinpath_walks_several_segments,
        iterdir_lists_the_package_contents,
        a_subpackage_anchors_its_own_directory,
        as_file_yields_a_real_path,
        as_file_can_be_entered_by_hand,
        a_missing_resource_is_not_a_file,
        reading_a_missing_resource_raises_filenotfound,
        a_directory_is_not_a_resource,
        legacy_read_helpers_match_the_file,
        legacy_open_helpers_match_the_file,
        legacy_path_yields_a_real_path,
        legacy_contents_lists_the_package,
        what_files_answers_is_a_traversable,
        the_resources_abc_submodule_is_importable,
        traversable_is_not_re_exported_from_importlib_abc,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
