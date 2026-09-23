"""shutil.rmtree does not follow a symbolic link, as CPython's does not.

Grail's `_rmtree_inner` asked os.path.isdir, which RESOLVES a link.  So a link
to a directory inside the tree was recursed into: rmtree deleted what the link
POINTED AT -- files outside the tree it was asked to remove -- and then failed
on entries it had already taken away.  CPython unlinks the link itself and
never looks at the target.

rmtree OF a link is refused rather than followed (CPython GH-46010, where
rmtree(link) emptied the directory the link named).  The exception CPython
raises there is an odd one, and is asserted as measured: errno and strerror
both None, the path as filename, printing as

    [Errno None] None: '/some/path'

A DANGLING link at the top is ENOENT instead, because CPython opens the target
and reports what that open said.

This fixture was written after the defect showed up on CI: the tree that found
it listed the link AFTER its target on Darwin, which hid the deletion, and
BEFORE it on Linux, where rmtree then failed outright.  Every check below
therefore names what it expects to still exist, not only what it expects to
raise.

Every expectation here was measured against CPython 3.14.
"""

import os
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = tempfile.mkdtemp()


def _path(*names):
    return os.path.join(ROOT, *names)


def _error(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except OSError as exc:
        return (type(exc).__name__, exc.errno,
                exc.filename and os.path.basename(exc.filename),
                str(exc).replace(ROOT, '<d>'))
    return 'no error'


# The tree to delete holds a link to a directory OUTSIDE it, a link to a file
# outside it, and a dangling one.
os.makedirs(_path('outside', 'kept'))
open(_path('outside', 'treasure'), 'w').close()
os.makedirs(_path('tree', 'sub'))
open(_path('tree', 'sub', 'leaf'), 'w').close()
os.symlink(_path('outside'), _path('tree', 'to_a_directory'))
os.symlink(_path('outside', 'treasure'), _path('tree', 'to_a_file'))
os.symlink(_path('nowhere'), _path('tree', 'dangling'))

shutil.rmtree(_path('tree'))

check('rmtree_removes_the_tree_it_was_given',
      os.path.exists(_path('tree')), False)
check('rmtree_leaves_what_a_link_pointed_at',
      sorted(os.listdir(_path('outside'))), ['kept', 'treasure'])
check('rmtree_leaves_the_file_a_link_pointed_at',
      os.path.exists(_path('outside', 'treasure')), True)

# ----------------------------------------------------------- rmtree OF a link

os.symlink(_path('outside'), _path('top_link'))
check('rmtree_of_a_link_to_a_directory_is_refused',
      _error(shutil.rmtree, _path('top_link')),
      ('OSError', None, 'top_link', "[Errno None] None: '<d>/top_link'"))
check('rmtree_of_a_refused_link_removes_nothing',
      (os.path.islink(_path('top_link')), sorted(os.listdir(_path('outside')))),
      (True, ['kept', 'treasure']))

os.symlink(_path('outside', 'treasure'), _path('top_file_link'))
check('rmtree_of_a_link_to_a_file_is_refused_the_same_way',
      _error(shutil.rmtree, _path('top_file_link')),
      ('OSError', None, 'top_file_link', "[Errno None] None: '<d>/top_file_link'"))

os.symlink(_path('nowhere'), _path('top_dangling'))
check('rmtree_of_a_dangling_link_is_file_not_found',
      _error(shutil.rmtree, _path('top_dangling')),
      ('FileNotFoundError', 2, 'top_dangling',
       "[Errno 2] No such file or directory: '<d>/top_dangling'"))

check('rmtree_with_ignore_errors_swallows_the_refusal',
      (shutil.rmtree(_path('top_link'), ignore_errors=True),
       os.path.islink(_path('top_link'))),
      (None, True))

# ----------------------------------------------------------- the other errors

check('rmtree_of_a_missing_path_is_file_not_found',
      _error(shutil.rmtree, _path('missing')),
      ('FileNotFoundError', 2, 'missing',
       "[Errno 2] No such file or directory: '<d>/missing'"))
open(_path('plain'), 'w').close()
check('rmtree_of_a_file_is_not_a_directory',
      _error(shutil.rmtree, _path('plain')),
      ('NotADirectoryError', 20, 'plain',
       "[Errno 20] Not a directory: '<d>/plain'"))
check('rmtree_with_ignore_errors_swallows_a_missing_path',
      shutil.rmtree(_path('missing'), ignore_errors=True), None)

# ----------------------------------------------------------- a nested link

os.makedirs(_path('deep', 'a', 'b'))
open(_path('deep', 'a', 'b', 'leaf'), 'w').close()
os.symlink(_path('outside'), _path('deep', 'a', 'b', 'nested_link'))
shutil.rmtree(_path('deep'))
check('rmtree_unlinks_a_link_nested_deep_in_the_tree',
      (os.path.exists(_path('deep')), sorted(os.listdir(_path('outside')))),
      (False, ['kept', 'treasure']))


for _name in ('top_link', 'top_file_link', 'top_dangling'):
    os.remove(_path(_name))
shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
