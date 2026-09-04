"""The methods Grail's ``pathlib`` stub grew, checked against the real one.

``src/python/stdlib/pathlib.py`` is an explicit MINIMAL stub -- its own
header says it exposes "the minimum Path / PurePath surface" Flask needs.
That is a reasonable place to start and a bad place to stay: the missing
methods do not announce themselves as missing, they announce themselves
as ``AttributeError: 'Path' object has no attribute 'touch'`` from inside
whatever library reached for one.

Everything here is asserted against CPython's OWN pathlib, because this
fixture imports ``pathlib`` rather than a copy -- so under the fixture
gate it is checking the real implementation, and under Grail it is
checking that the stub agrees with what the gate measured.

The methods are not a wish list.  Each one is here because a real caller
hit it:

  * ``touch``, ``rglob``, ``with_suffix`` and path ORDERING are what
    test_zipapp's fixtures use -- 32 of its 33 errors were the first
    three, and 9 more were ``'<' not supported between instances of
    'Path' and 'Path'`` from a bare ``sorted()``.
  * ``unlink`` / ``rmdir`` / ``relative_to`` / ``with_name`` come with
    them: they are the other half of the same small vocabulary, and
    leaving them out just moves the next AttributeError.

Every expectation was checked against CPython 3.14 first.
"""

import os
import pathlib
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except Exception as exc:
        return (type(exc).__name__, str(exc))


def _tree():
    """A small tree: a.txt, sub/b.txt, sub/deep/c.txt."""
    root = tempfile.mkdtemp()
    p = pathlib.Path(root)
    (p / 'a.txt').touch()
    (p / 'other.md').touch()
    os.makedirs(os.path.join(root, 'sub', 'deep'))
    (p / 'sub' / 'b.txt').touch()
    (p / 'sub' / 'deep' / 'c.txt').touch()
    return p


# ------------------------------------------------------------- touch

def _touch_creates():
    p = pathlib.Path(tempfile.mkdtemp()) / 'fresh.txt'
    before = p.exists()
    p.touch()
    return (before, p.exists())


def _touch_is_idempotent():
    p = pathlib.Path(tempfile.mkdtemp()) / 'twice.txt'
    p.touch()
    p.touch()
    return p.exists()


def _touch_refuses_when_told_to():
    p = pathlib.Path(tempfile.mkdtemp()) / 'once.txt'
    p.touch()
    return _outcome(lambda: p.touch(exist_ok=False))[0]


check('touch_creates', _touch_creates(), (False, True))
check('touch_is_idempotent', _touch_is_idempotent(), True)
check('touch_refuses_when_told_to', _touch_refuses_when_told_to(),
      'FileExistsError')


# ------------------------------------------------- glob and rglob

def _glob_is_this_directory_only():
    return sorted(x.name for x in _tree().glob('*.txt'))


def _rglob_is_every_depth():
    return sorted(x.name for x in _tree().rglob('*.txt'))


def _glob_star_star_prefix_means_rglob():
    return sorted(x.name for x in _tree().glob('**/*.txt'))


def _glob_matches_the_name_not_the_path():
    return sorted(x.name for x in _tree().glob('*.md'))


def _rglob_answers_paths_not_names():
    hits = sorted(_tree().rglob('c.txt'))
    return (len(hits), hits[0].name, hits[0].parent.name)


check('glob_is_this_directory_only', _glob_is_this_directory_only(),
      ['a.txt'])
check('rglob_is_every_depth', _rglob_is_every_depth(),
      ['a.txt', 'b.txt', 'c.txt'])
check('glob_star_star_prefix_means_rglob',
      _glob_star_star_prefix_means_rglob(), ['a.txt', 'b.txt', 'c.txt'])
check('glob_matches_the_name_not_the_path',
      _glob_matches_the_name_not_the_path(), ['other.md'])
check('rglob_answers_paths_not_names', _rglob_answers_paths_not_names(),
      (1, 'c.txt', 'deep'))


# ------------------------------------------------------- name surgery

def _with_suffix_replaces():
    return str(pathlib.PurePath('/a/b/c.py').with_suffix('.pyz'))


def _with_suffix_strips():
    return str(pathlib.PurePath('/a/b/c.py').with_suffix(''))


def _with_suffix_adds_when_there_is_none():
    return str(pathlib.PurePath('/a/b/c').with_suffix('.py'))


def _with_suffix_refuses_a_bare_word():
    return _outcome(lambda: pathlib.PurePath('/a/b.py').with_suffix('pyz'))[0]


def _with_name_replaces():
    return str(pathlib.PurePath('/a/b/c.py').with_name('d.txt'))


def _relative_to_strips_the_prefix():
    return str(pathlib.PurePath('/a/b/c.py').relative_to('/a'))


def _relative_to_refuses_a_non_prefix():
    return _outcome(
        lambda: pathlib.PurePath('/a/b/c.py').relative_to('/x'))[0]


check('with_suffix_replaces', _with_suffix_replaces(), '/a/b/c.pyz')
check('with_suffix_strips', _with_suffix_strips(), '/a/b/c')
check('with_suffix_adds_when_there_is_none',
      _with_suffix_adds_when_there_is_none(), '/a/b/c.py')
check('with_suffix_refuses_a_bare_word',
      _with_suffix_refuses_a_bare_word(), 'ValueError')
check('with_name_replaces', _with_name_replaces(), '/a/b/d.txt')
check('relative_to_strips_the_prefix', _relative_to_strips_the_prefix(),
      'b/c.py')
check('relative_to_refuses_a_non_prefix',
      _relative_to_refuses_a_non_prefix(), 'ValueError')


# ----------------------------------------------------------- ordering

def _paths_sort():
    ps = [pathlib.PurePath('/b'), pathlib.PurePath('/a'),
          pathlib.PurePath('/c')]
    return [str(p) for p in sorted(ps)]


def _comparisons_answer():
    a = pathlib.PurePath('/a')
    b = pathlib.PurePath('/b')
    return (a < b, b > a, a <= a, a >= a)


check('paths_sort', _paths_sort(), ['/a', '/b', '/c'])
check('comparisons_answer', _comparisons_answer(), (True, True, True, True))


# ------------------------------------------------------ unlink, rmdir

def _unlink_removes():
    p = pathlib.Path(tempfile.mkdtemp()) / 'gone.txt'
    p.touch()
    p.unlink()
    return p.exists()


def _unlink_refuses_a_missing_file():
    p = pathlib.Path(tempfile.mkdtemp()) / 'never.txt'
    return _outcome(lambda: p.unlink())[0]


def _unlink_forgives_when_told_to():
    p = pathlib.Path(tempfile.mkdtemp()) / 'never.txt'
    p.unlink(missing_ok=True)
    return p.exists()


def _rmdir_removes_an_empty_directory():
    root = pathlib.Path(tempfile.mkdtemp())
    d = root / 'empty'
    d.mkdir()
    d.rmdir()
    return d.exists()


check('unlink_removes', _unlink_removes(), False)
check('unlink_refuses_a_missing_file', _unlink_refuses_a_missing_file(),
      'FileNotFoundError')
check('unlink_forgives_when_told_to', _unlink_forgives_when_told_to(), False)
check('rmdir_removes_an_empty_directory',
      _rmdir_removes_an_empty_directory(), False)


# ------------------------------------------- the surface that was there

def _the_original_surface_still_works():
    p = _tree()
    return (
        (p / 'a.txt').exists(),
        (p / 'sub').is_dir(),
        (p / 'a.txt').is_file(),
        pathlib.PurePath('/a/b/c.py').name,
        pathlib.PurePath('/a/b/c.py').stem,
        pathlib.PurePath('/a/b/c.py').suffix,
        str(pathlib.PurePath('/a/b/c.py').parent),
    )


check('the_original_surface_still_works', _the_original_surface_still_works(),
      (True, True, True, 'c.py', 'c', '.py', '/a/b'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
