"""shutil.rmtree's error protocol: onexc, onerror, and ignore_errors.

Grail's rmtree took only ``ignore_errors'', so pytest -- whose temporary
directory cleanup calls ``shutil.rmtree(path, onexc=on_rm_rf_error)'' -- ended
every session that had used tmp_path with

    TypeError: rmtree() got an unexpected keyword argument 'onexc'

The checks pin what CPython 3.14 hands the handler: which function failed (by
name), on which path, with which exception type, and that rmtree goes on past a
failure the handler absorbed.  ignore_errors is the same walk with a handler
that drops everything, so it too removes what it can rather than stopping at
the first failure, as Grail's used to.

The read-only checks need a directory whose entries cannot be removed, made
with chmod 0o500; they are skipped where that is no barrier (a root user),
found by trying to write into such a directory.

Every expectation here was measured against CPython 3.14 on Darwin.
"""

import os
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


ROOT = tempfile.mkdtemp()


def _path(*names):
    return os.path.join(ROOT, *names)


def _calls(path, **kwargs):
    seen = []

    def onexc(func, failed, exc):
        seen.append((func.__name__, os.path.relpath(failed, ROOT), type(exc).__name__))
    shutil.rmtree(path, onexc=onexc, **kwargs)
    return seen


def _read_only_tree():
    os.makedirs(_path('t', 'ro'))
    open(_path('t', 'ro', 'f'), 'w').close()
    open(_path('t', 'g'), 'w').close()
    os.chmod(_path('t', 'ro'), 0o500)


def _unlock():
    os.chmod(_path('t', 'ro'), 0o700)


check('onexc_hears_a_missing_path_from_lstat',
      _calls(_path('missing')), [('lstat', 'missing', 'FileNotFoundError')])

open(_path('plain'), 'w').close()
check('onexc_hears_a_file_twice',
      _calls(_path('plain')),
      [('scandir', 'plain', 'NotADirectoryError'), ('rmdir', 'plain', 'NotADirectoryError')])
os.remove(_path('plain'))

os.makedirs(_path('outside'))
os.symlink(_path('outside'), _path('link'))
check('onexc_hears_a_top_level_link_refused',
      (_calls(_path('link')), os.path.islink(_path('link'))),
      ([('islink', 'link', 'OSError')], True))
os.remove(_path('link'))

os.symlink(_path('nowhere'), _path('dangling'))
check('onexc_hears_a_dangling_link_from_open',
      _calls(_path('dangling')), [('open', 'dangling', 'FileNotFoundError')])
os.remove(_path('dangling'))

seen = []
shutil.rmtree(_path('missing'), onerror=lambda *a: seen.append('onerror'),
              onexc=lambda *a: seen.append('onexc'))
check('onexc_wins_over_onerror', seen, ['onexc'])


def _dir_fd():
    try:
        shutil.rmtree(_path('missing'), dir_fd=None)
    except OSError as exc:
        return type(exc).__name__
    return 'no error'


check('dir_fd_none_is_accepted', _dir_fd(), 'FileNotFoundError')

def _read_only_bites():
    os.makedirs(_path('probe'))
    os.chmod(_path('probe'), 0o500)
    try:
        open(_path('probe', 'x'), 'w').close()
    except OSError:
        return True
    finally:
        os.chmod(_path('probe'), 0o700)
    return False


if _read_only_bites():
    _read_only_tree()
    check('onexc_hears_each_failure_and_rmtree_goes_on',
          (_calls(_path('t')), os.path.exists(_path('t', 'g')), os.path.exists(_path('t'))),
          ([('unlink', 't/ro/f', 'PermissionError'), ('rmdir', 't/ro', 'OSError'),
            ('rmdir', 't', 'OSError')], False, True))
    _unlock()

    os.chmod(_path('t', 'ro'), 0o500)
    seen = []
    shutil.rmtree(_path('t'), onerror=lambda f, p, ei: seen.append(
        (f.__name__, os.path.relpath(p, ROOT), ei[0].__name__, type(ei[1]).__name__,
         ei[2] is ei[1].__traceback__)))
    check('onerror_gets_an_exc_info_triple', seen,
          [('unlink', 't/ro/f', 'PermissionError', 'PermissionError', True),
           ('rmdir', 't/ro', 'OSError', 'OSError', True),
           ('rmdir', 't', 'OSError', 'OSError', True)])
    _unlock()

    os.chmod(_path('t', 'ro'), 0o500)
    open(_path('t', 'g2'), 'w').close()
    check('ignore_errors_removes_what_it_can',
          (shutil.rmtree(_path('t'), ignore_errors=True),
           os.path.exists(_path('t', 'g2')), os.path.exists(_path('t', 'ro', 'f'))),
          (None, False, True))
    _unlock()

    # pytest's own handler shape: make the parent writable and retry func.
    os.chmod(_path('t', 'ro'), 0o500)

    def _fix(func, failed, exc):
        os.chmod(os.path.dirname(failed), 0o700)
        func(failed)
    shutil.rmtree(_path('t'), onexc=_fix)
    check('a_handler_that_retries_finishes_the_job', os.path.exists(_path('t')), False)

    def _no_handler():
        _read_only_tree()
        try:
            shutil.rmtree(_path('t'))
        # Type and errno only: CPython's fd-based walk re-labels the escaping
        # exception with the DIRECTORY being emptied (an outer except rewrites
        # err.filename), while its onexc was told the file -- an artefact of
        # that implementation rather than a contract.
        except OSError as exc:
            return type(exc).__name__, exc.errno
        finally:
            _unlock()
        return 'no error'
    check('without_a_handler_the_first_failure_is_raised',
          _no_handler(), ('PermissionError', 13))

    # Underneath: os.remove/os.rmdir in a read-only directory.  Grail's file
    # primitive answers only nil, and reading the filesystem back cannot see a
    # permission on the PARENT, so these raised a bare OSError with no errno.
    def _os_errors():
        shutil.rmtree(_path('t'))    # what the unhandled failure above left
        _read_only_tree()
        os.makedirs(_path('t', 'ro2', 'sub'))
        os.chmod(_path('t', 'ro2'), 0o500)
        got = []
        for fn, p in ((os.remove, _path('t', 'ro', 'f')), (os.rmdir, _path('t', 'ro2', 'sub'))):
            try:
                fn(p)
                got.append('no error')
            except OSError as exc:
                got.append((type(exc).__name__, exc.errno, str(exc).replace(ROOT, '<d>')))
        _unlock()
        os.chmod(_path('t', 'ro2'), 0o700)
        shutil.rmtree(_path('t'))
        return got
    check('os_remove_and_rmdir_report_permission_denied', _os_errors(),
          [('PermissionError', 13, "[Errno 13] Permission denied: '<d>/t/ro/f'"),
           ('PermissionError', 13, "[Errno 13] Permission denied: '<d>/t/ro2/sub'")])

shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
