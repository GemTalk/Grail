"""os.path.realpath resolves symbolic links, and so does Path.resolve.

realpath answered abspath: it normalised the path and resolved NOTHING, so
``realpath(link)`` answered the link's own name.  pathlib's Path.resolve()
calls ``os.path.realpath(self, strict=strict)`` and inherited it, which is the
one call there the hand-written pathlib had implemented.

It is CPython's own posixpath.realpath now -- Grail ships posixpath, pathlib
imports it, and it already worked when called directly.  Resolving is not one
readlink: each component is re-resolved against the directory holding it,
``..'' unwinds AFTER following, and a symlink LOOP has to be noticed.

ELOOP is 62 on Darwin and 40 on Linux, so the loop checks assert the class and
that strerror is the platform's own text, not the number.

Every expectation here was measured against CPython 3.14.
"""

import os
import pathlib
import posixpath
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


# realpath of the temporary root itself: on Darwin /tmp IS a link to
# /private/tmp, so every expectation below has to be built from the resolved
# name or half of them compare a path against its own link.
ROOT = os.path.realpath(tempfile.mkdtemp())


def _path(*names):
    return os.path.join(ROOT, *names)


def _error(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except OSError as exc:
        return (type(exc).__name__, exc.strerror == os.strerror(exc.errno),
                exc.filename and os.path.basename(exc.filename))
    return 'no error'


os.makedirs(_path('real', 'inner'))
open(_path('real', 'inner', 'leaf'), 'w').close()
os.symlink(_path('real'), _path('to_real'))
os.symlink('real/inner', _path('relative_link'))
os.symlink(_path('to_real'), _path('link_to_a_link'))
os.symlink(_path('nowhere'), _path('dangling'))
os.symlink(_path('loop_b'), _path('loop_a'))
os.symlink(_path('loop_a'), _path('loop_b'))

# ----------------------------------------------------------- resolving

check('realpath_resolves_a_link_to_a_directory',
      os.path.realpath(_path('to_real')), _path('real'))
check('realpath_resolves_a_link_in_the_middle_of_a_path',
      os.path.realpath(_path('to_real', 'inner', 'leaf')),
      _path('real', 'inner', 'leaf'))
check('realpath_resolves_a_relative_link_against_its_own_directory',
      os.path.realpath(_path('relative_link')), _path('real', 'inner'))
check('realpath_resolves_a_chain_of_links',
      os.path.realpath(_path('link_to_a_link')), _path('real'))
check('realpath_unwinds_dotdot_after_following',
      os.path.realpath(_path('to_real', 'inner', '..')), _path('real'))
check('realpath_answers_a_missing_path_unchanged',
      os.path.realpath(_path('missing')), _path('missing'))
check('realpath_answers_what_a_dangling_link_names',
      os.path.realpath(_path('dangling')), _path('nowhere'))
check('realpath_leaves_a_path_with_no_links_alone',
      os.path.realpath(_path('real', 'inner')), _path('real', 'inner'))
check('realpath_agrees_with_posixpath_itself',
      os.path.realpath(_path('to_real', 'inner')),
      posixpath.realpath(_path('to_real', 'inner')))

# ----------------------------------------------------------- strict

check('strict_realpath_resolves_what_is_there',
      os.path.realpath(_path('to_real', 'inner'), strict=True),
      _path('real', 'inner'))
check('strict_realpath_of_a_dangling_link_is_file_not_found',
      _error(os.path.realpath, _path('dangling'), strict=True),
      ('FileNotFoundError', True, 'nowhere'))
check('strict_realpath_of_a_missing_component_is_file_not_found',
      _error(os.path.realpath, _path('real', 'gone', 'leaf'), strict=True),
      ('FileNotFoundError', True, 'gone'))

# ----------------------------------------------------------- a loop

check('realpath_of_a_loop_answers_the_path_it_could_not_resolve',
      os.path.realpath(_path('loop_a')), _path('loop_a'))
check('strict_realpath_of_a_loop_raises_too_many_levels',
      _error(os.path.realpath, _path('loop_a'), strict=True),
      ('OSError', True, 'loop_a'))

# ----------------------------------------------------------- pathlib

check('path_resolve_resolves_the_link',
      str(pathlib.Path(_path('to_real', 'inner')).resolve()),
      _path('real', 'inner'))
check('path_resolve_answers_a_path_object',
      isinstance(pathlib.Path(_path('to_real')).resolve(), pathlib.Path), True)
check('path_resolve_strict_of_a_dangling_link_is_file_not_found',
      _error(pathlib.Path(_path('dangling')).resolve, True),
      ('FileNotFoundError', True, 'nowhere'))

# ----------------------------------------------------------- relative input

_ORIGINAL = os.getcwd()
try:
    os.chdir(ROOT)
    check('realpath_resolves_a_relative_argument_against_the_directory',
          os.path.realpath('to_real'), _path('real'))
finally:
    os.chdir(_ORIGINAL)


for _name in ('loop_a', 'loop_b', 'dangling', 'to_real', 'relative_link',
              'link_to_a_link'):
    os.remove(_path(_name))
shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
