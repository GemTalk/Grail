"""The last message-only OSErrors: subprocess and shutil.copytree.

Both built their error from the TEXT of an errno rather than from the errno:

    FileNotFoundError("[Errno 2] No such file or directory: 'prog'")

so `e.errno`, `e.strerror` and `e.filename` were all None.  A caller catching
`subprocess.run` to say WHICH program is missing reads `e.filename`, and got
nothing; the same for the tree `copytree` refused to overwrite.

subprocess's broken-pipe error is the other shape CPython carries -- errno and
strerror with NO filename, since a pipe names no file.

Every expectation here was measured against CPython 3.14.
"""

import os
import shutil
import subprocess
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = os.path.realpath(tempfile.mkdtemp())
MISSING = 'definitely-not-a-program-' + str(os.getpid())


def _path(*names):
    return os.path.join(ROOT, *names)


def _message(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except OSError as exc:
        return str(exc)
    return 'no error'


def _error(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except OSError as exc:
        return (type(exc).__name__, exc.errno,
                # guarded: on an error carrying no errno -- which is what this
                # fixture exists to catch -- os.strerror(None) is a TypeError,
                # and a fixture that ABORTS reports nothing about the rest.
                exc.errno is not None and exc.strerror == os.strerror(exc.errno),
                exc.filename and os.path.basename(exc.filename))
    return 'no error'


# ----------------------------------------------------------- subprocess

check('running_a_missing_program_names_it',
      _error(subprocess.run, [MISSING]),
      ('FileNotFoundError', 2, True, MISSING))
check('popen_of_a_missing_program_names_it_too',
      _error(subprocess.Popen, [MISSING]),
      ('FileNotFoundError', 2, True, MISSING))
check('the_message_is_the_one_cpython_prints',
      (lambda: _message(subprocess.run, [MISSING]))(),
      "[Errno 2] No such file or directory: '" + MISSING + "'")
check('a_program_that_exists_still_runs',
      subprocess.run(['echo', 'ran'], capture_output=True).stdout, b'ran\n')

# ----------------------------------------------------------- copytree

os.makedirs(_path('src'))
open(_path('src', 'leaf'), 'w').close()
os.makedirs(_path('dst'))

check('copytree_onto_an_existing_tree_names_it',
      _error(shutil.copytree, _path('src'), _path('dst')),
      ('FileExistsError', 17, True, 'dst'))
check('the_refused_tree_is_left_alone',
      sorted(os.listdir(_path('dst'))), [])
check('copytree_still_copies_into_a_new_tree',
      (shutil.copytree(_path('src'), _path('copy')) and
       sorted(os.listdir(_path('copy')))), ['leaf'])
check('dirs_exist_ok_still_copies_over_an_existing_tree',
      (shutil.copytree(_path('src'), _path('dst'), dirs_exist_ok=True) and
       sorted(os.listdir(_path('dst')))), ['leaf'])


shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
