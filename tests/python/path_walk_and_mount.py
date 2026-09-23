"""Path.walk, Path.is_mount and Path.is_junction, and the os calls under them.

Three pathlib methods had no os support and raised AttributeError:

  * Path.walk asks os.walk with os._walk_symlinks_as_files -- a bare SENTINEL
    object, compared by identity -- for its own follow_symlinks=False.  It is a
    third mode, not a Boolean: a symlink to a directory is reported among the
    FILENAMES and never descended into.  Grail's os.walk had no sentinel to
    compare against, and the object is truthy, so passing it would have read as
    follow_symlinks=True: the exact opposite.
  * Path.is_mount asks os.path.ismount.
  * Path.is_junction asks os.path.isjunction, which is False everywhere off
    Windows -- after coercing its argument, which is why a non-path is still a
    TypeError.

os.path.relpath was missing outright, and is CPython's own here too -- it is
not a shortening of abspath: the paths are split, their common prefix dropped,
and one ".." emitted per component of start left behind.

os.walk's three modes are all checked here, since the sentinel one is new and
the other two must not have moved.  The comparisons are SORTED: which
directories a walk visits is the contract, while the order it visits siblings
in is the filesystem's listing order.  Only the two orderings that are real
contracts -- bottom-up yielding a directory after its children, and pruning by
mutating dirnames -- are asserted as sequences.

Every expectation here was measured against CPython 3.14.
"""

import os
import pathlib
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


# The root is resolved because Darwin's /tmp is itself a link: an unresolved
# root would make every relative_to() below compare a path against its link.
ROOT = os.path.realpath(tempfile.mkdtemp())


def _path(*names):
    return os.path.join(ROOT, *names)


# SORTED, both the rows and the names inside them.  Which directories a walk
# visits is the contract; the ORDER it visits siblings in is the filesystem's
# listing order, and that differs between APFS and ext4 -- this fixture failed
# on Linux CI and passed on Darwin for exactly that reason.  The two orderings
# that ARE contracts get their own checks below, against roots only.
def _walk(*args):
    return sorted((os.path.relpath(root, ROOT), sorted(dirs), sorted(files))
                  for root, dirs, files in os.walk(*args))


def _walk_roots(*args):
    return [os.path.relpath(root, ROOT) for root, dirs, files in os.walk(*args)]


def _path_walk(**kwargs):
    return sorted((str(root.relative_to(ROOT)), sorted(dirs), sorted(files))
                  for root, dirs, files in pathlib.Path(_path('tree')).walk(**kwargs))


def _path_walk_roots(**kwargs):
    return [str(root.relative_to(ROOT))
            for root, dirs, files in pathlib.Path(_path('tree')).walk(**kwargs)]


os.makedirs(_path('tree', 'sub'))
open(_path('tree', 'sub', 'leaf'), 'w').close()
open(_path('tree', 'file'), 'w').close()
os.makedirs(_path('outside', 'deep'))
os.symlink(_path('outside'), _path('tree', 'link'))

_PLAIN = [('tree', ['link', 'sub'], ['file']), ('tree/sub', [], ['leaf'])]
_FOLLOWED = [('tree', ['link', 'sub'], ['file']), ('tree/link', ['deep'], []),
             ('tree/link/deep', [], []), ('tree/sub', [], ['leaf'])]
_AS_FILES = [('tree', ['sub'], ['file', 'link']), ('tree/sub', [], ['leaf'])]

# ----------------------------------------------------------- os.walk's modes

check('walk_reports_a_link_as_a_directory_it_does_not_enter',
      _walk(_path('tree')), _PLAIN)
check('walk_following_links_descends_into_one',
      _walk(_path('tree'), True, None, True), _FOLLOWED)
check('walk_with_the_sentinel_reports_a_link_as_a_file',
      _walk(_path('tree'), True, None, os._walk_symlinks_as_files), _AS_FILES)
check('the_sentinel_is_an_object_of_its_own',
      (os._walk_symlinks_as_files is os._walk_symlinks_as_files,
       os._walk_symlinks_as_files is True,
       os._walk_symlinks_as_files is False),
      (True, False, False))
check('walk_bottom_up_still_yields_the_leaves_first',
      _walk_roots(_path('tree'), False), ['tree/sub', 'tree'])

# ----------------------------------------------------------- Path.walk

check('path_walk_treats_a_link_as_a_file', _path_walk(), _AS_FILES)
check('path_walk_following_links_descends_into_one',
      _path_walk(follow_symlinks=True), _FOLLOWED)
check('path_walk_yields_path_objects',
      [isinstance(row[0], pathlib.Path) for row in pathlib.Path(_path('tree')).walk()],
      [True, True])
check('path_walk_bottom_up_yields_the_leaves_first',
      _path_walk_roots(top_down=False), ['tree/sub', 'tree'])
check('path_walk_can_be_pruned_by_mutating_dirnames',
      (lambda seen: seen)([
          str(root.relative_to(ROOT))
          for root, dirs, files in pathlib.Path(_path('tree')).walk()
          if dirs.clear() is None]),
      ['tree'])

# ----------------------------------------------------------- is_mount

check('ismount_of_the_root_directory', os.path.ismount('/'), True)
check('ismount_of_an_ordinary_directory', os.path.ismount(_path('tree')), False)
check('ismount_of_a_link_or_a_missing_path',
      (os.path.ismount(_path('tree', 'link')), os.path.ismount(_path('gone'))),
      (False, False))
check('path_is_mount_answers_for_the_root_and_for_a_directory',
      (pathlib.Path('/').is_mount(), pathlib.Path(_path('tree')).is_mount()),
      (True, False))

# ----------------------------------------------------------- is_junction

check('isjunction_is_false_off_windows',
      (os.path.isjunction(_path('tree')), os.path.isjunction(_path('gone'))),
      (False, False))
check('path_is_junction_is_false_too',
      pathlib.Path(_path('tree')).is_junction(), False)

# ----------------------------------------------------------- relpath

check('relpath_of_a_path_under_its_start',
      os.path.relpath(_path('tree', 'sub', 'leaf'), ROOT), 'tree/sub/leaf')
check('relpath_emits_one_dotdot_per_component_left_behind',
      os.path.relpath(_path('outside'), _path('tree', 'sub')), '../../outside')
check('relpath_defaults_its_start_to_the_working_directory',
      (lambda original: (os.chdir(ROOT),
                         os.path.relpath(_path('tree', 'file')),
                         os.chdir(original))[1])(os.getcwd()),
      'tree/file')


os.remove(_path('tree', 'link'))
shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
