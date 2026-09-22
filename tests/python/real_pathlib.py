"""Grail's pathlib is CPython's own package, and these are the calls it needed.

Grail used to ship ``pathlib.py``, a hand-written stub whose header said it
exposed "the minimum Path / PurePath surface" Flask needed.  It is gone:
``src/python/stdlib/pathlib/`` is CPython 3.14's package, vendored with two
adaptations, each marked GRAIL: ``Path.touch``, which CPython writes with
``os.open``, and ``pathlib.types``, which names ABCMeta for its ABCs.  So are
the modules it imports -- glob, fnmatch, posixpath, ntpath, genericpath.

A vendored module fails at CALL time, not import time, wherever it reaches
for something Grail's ``os`` did not have.  Each check below is a call the
real pathlib makes that answered wrongly or not at all until this change:

  * ``Path.stat(follow_symlinks=False)`` -- CPython stats with that keyword,
    and Grail's ``os.stat`` took no keywords at all.
  * ``Path.resolve()`` -- ``os.path.realpath(path, strict=...)``, which took
    no keyword either.  resolve() is the one call here the stub HAD, so this
    one was a regression until fixed.
  * ``Path.exists(follow_symlinks=False)`` and glob -- ``os.path.lexists``.
  * ``isinstance(path, os.PathLike)`` for a REGISTERED class, and
    ``isinstance(st, os.stat_result)`` -- pathlib's own type checks.
  * ``Path.mkdir(parents=True)`` -- CPython catches FileNotFoundError from
    ``os.mkdir`` to create the parents, and Grail's raised a plain OSError.
    The stub had called ``os.makedirs`` instead, so this was a regression too.
  * ``Path.touch`` -- the adapted method, both its modes and its refusal.
  * ``pathlib.types`` -- the other adaptation.  It registers the concrete
    classes on its ABCs, and Grail's ``ABC`` has no ``register()``.

``pathlib_stub_surface.py`` keeps the smaller vocabulary the stub grew.

Paths are compared relative to a temporary root, never as absolute strings:
on macOS that root sits under a symlink CPython resolves and Grail does not
yet (docs/Issues.md), and that is not what these checks are about.

Every expectation here was measured against CPython 3.14.
"""

import glob
import os
import pathlib
import shutil
import stat
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


def _outcome(fn):
    try:
        return ('ok', fn())
    except Exception as exc:
        return (type(exc).__name__,)


def _tree():
    """a.txt, other.md, sub/b.txt, sub/deep/c.txt, and two links."""
    root = pathlib.Path(tempfile.mkdtemp())
    (root / 'a.txt').write_text('alpha')
    (root / 'other.md').write_text('')
    (root / 'sub' / 'deep').mkdir(parents=True)
    (root / 'sub' / 'b.txt').write_text('')
    (root / 'sub' / 'deep' / 'c.txt').write_text('')
    os.symlink(root / 'a.txt', root / 'link')
    os.symlink(root / 'missing', root / 'broken')
    return root


ROOT = _tree()


def _relative(paths):
    return sorted(p.relative_to(ROOT).as_posix() for p in paths)


# ----------------------------------------------------------- the package

check('pathlib_is_a_package', hasattr(pathlib, '__path__'), True)
check('pathlib_types_defines_path_info',
      __import__('pathlib.types').types.PathInfo.__name__, 'PathInfo')
check('pathlib_types_registers_the_concrete_paths',
      [isinstance(pathlib.PurePath('x'), pathlib.types._JoinablePath),
       isinstance(pathlib.Path('x'), pathlib.types._WritablePath),
       isinstance('x', pathlib.types._ReadablePath)],
      [True, True, False])

# ----------------------------------------------------------- os types

check('a_path_is_os_pathlike', isinstance(pathlib.Path('x'), os.PathLike), True)


class _Registered:
    pass


class _SubclassOfRegistered(_Registered):
    pass


os.PathLike.register(_Registered)
check('a_registered_class_is_os_pathlike',
      isinstance(_Registered(), os.PathLike), True)
check('a_subclass_of_a_registered_class_is_os_pathlike',
      isinstance(_SubclassOfRegistered(), os.PathLike), True)
check('an_unregistered_class_is_not_os_pathlike',
      isinstance(object(), os.PathLike), False)
check('path_stat_answers_an_os_stat_result',
      isinstance((ROOT / 'a.txt').stat(), os.stat_result), True)

# ----------------------------------------------------------- stat and links

check('stat_follows_a_link_to_the_file',
      stat.S_ISREG((ROOT / 'link').stat().st_mode), True)
check('stat_without_following_sees_the_link',
      stat.S_ISLNK((ROOT / 'link').stat(follow_symlinks=False).st_mode), True)
check('os_stat_takes_follow_symlinks_as_a_keyword',
      stat.S_ISLNK(os.stat(ROOT / 'link', follow_symlinks=False).st_mode), True)
check('a_broken_link_does_not_exist', (ROOT / 'broken').exists(), False)
check('a_broken_link_exists_without_following',
      (ROOT / 'broken').exists(follow_symlinks=False), True)
check('lexists_sees_a_broken_link', os.path.lexists(ROOT / 'broken'), True)
check('lexists_of_nothing_is_false', os.path.lexists(ROOT / 'nothing'), False)
check('is_symlink', [(ROOT / n).is_symlink() for n in ('link', 'a.txt')], [True, False])
check('readlink_names_the_target', (ROOT / 'link').readlink().name, 'a.txt')

# ----------------------------------------------------------- resolve

check('resolve_makes_a_relative_path_absolute',
      pathlib.Path('x').resolve().is_absolute(), True)
check('resolve_collapses_dot_dot',
      (ROOT / 'sub' / '..' / 'a.txt').resolve() == (ROOT / 'a.txt').resolve(), True)
check('resolve_non_strict_keeps_a_missing_name',
      (ROOT / 'nope').resolve().name, 'nope')
check('resolve_strict_of_a_missing_path_raises',
      _outcome(lambda: (ROOT / 'nope').resolve(strict=True)), ('FileNotFoundError',))
check('resolve_strict_of_an_existing_path',
      (ROOT / 'a.txt').resolve(strict=True).name, 'a.txt')
check('realpath_takes_strict_as_a_keyword',
      os.path.realpath(ROOT / 'a.txt', strict=False) == os.path.realpath(ROOT / 'a.txt'),
      True)

# ----------------------------------------------------------- mkdir

def _mkdir_error(path):
    try:
        os.mkdir(path)
    except OSError as exc:
        return (type(exc).__name__, exc.errno, os.path.basename(exc.filename))


check('mkdir_parents_creates_the_missing_ones',
      (lambda p: (p.mkdir(parents=True), p.is_dir())[1])(ROOT / 'made' / 'deeper'), True)
check('mkdir_exist_ok_accepts_an_existing_directory',
      _outcome(lambda: (ROOT / 'sub').mkdir(exist_ok=True)), ('ok', None))
check('mkdir_refuses_an_existing_directory',
      _outcome(lambda: (ROOT / 'sub').mkdir()), ('FileExistsError',))
check('os_mkdir_under_a_missing_parent_is_file_not_found',
      _mkdir_error(ROOT / 'none' / 'x'), ('FileNotFoundError', 2, 'x'))
check('os_mkdir_of_an_existing_directory_is_file_exists',
      _mkdir_error(ROOT / 'sub'), ('FileExistsError', 17, 'sub'))
check('os_mkdir_under_a_file_is_not_a_directory',
      _mkdir_error(ROOT / 'a.txt' / 'x'), ('NotADirectoryError', 20, 'x'))

# ----------------------------------------------------------- touch

check('touch_creates_an_empty_file',
      (lambda p: (p.touch(), p.read_text())[1])(ROOT / 'new.txt'), '')
check('touch_leaves_an_existing_file_content',
      (lambda p: (p.touch(), p.read_text())[1])(ROOT / 'a.txt'), 'alpha')
check('touch_refuses_an_existing_file_when_not_exist_ok',
      _outcome(lambda: (ROOT / 'a.txt').touch(exist_ok=False)), ('FileExistsError',))
check('touch_with_a_mode_sets_it',
      (lambda p: (p.touch(mode=0o600), stat.S_IMODE(p.stat().st_mode))[1])(ROOT / 'private'),
      0o600)

# ----------------------------------------------------------- glob

check('glob_star_star_recurses',
      _relative(ROOT.glob('**/*.txt')), ['a.txt', 'new.txt', 'sub/b.txt', 'sub/deep/c.txt'])
check('rglob_recurses', _relative(ROOT.rglob('c.txt')), ['sub/deep/c.txt'])
check('glob_module_is_recursive_only_when_asked',
      [sorted(glob.glob('**/*.txt', root_dir=ROOT, recursive=flag)) for flag in (False, True)],
      [['sub/b.txt'], ['a.txt', 'new.txt', 'sub/b.txt', 'sub/deep/c.txt']])
check('iterdir_lists_one_level',
      _relative(ROOT.iterdir()),
      ['a.txt', 'broken', 'link', 'made', 'new.txt', 'other.md', 'private', 'sub'])
check('full_match_takes_a_recursive_pattern',
      [pathlib.PurePosixPath(p).full_match('**/*.txt') for p in ('a/b/c.txt', 'c.md')],
      [True, False])

# ----------------------------------------------------------- pure paths

check('pure_windows_path_splits_the_drive',
      pathlib.PureWindowsPath('C:/a/b.txt').parts, ('C:\\', 'a', 'b.txt'))
check('pure_windows_path_is_case_insensitive',
      pathlib.PureWindowsPath('C:/A') == pathlib.PureWindowsPath('c:/a'), True)
check('pure_posix_path_parents',
      [str(p) for p in pathlib.PurePosixPath('/a/b/c').parents], ['/a/b', '/a', '/'])
check('with_stem_keeps_the_suffix',
      pathlib.PurePosixPath('d/f.tar.gz').with_stem('g').name, 'g.gz')

# ----------------------------------------------------------- moving files

check('rename_answers_the_target_and_moves_the_file',
      (lambda target: (ROOT / 'other.md').rename(target) == target
       and target.exists() and not (ROOT / 'other.md').exists())(ROOT / 'renamed.md'),
      True)
check('samefile_through_a_link',
      (ROOT / 'link').samefile(ROOT / 'a.txt'), True)


shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
