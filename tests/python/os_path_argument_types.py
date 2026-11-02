"""Fixture: os functions convert a path argument as CPython's path converter does.

CPython converts every path argument of an os function in one place,
path_converter (Modules/posixmodule.c:1342): a str, bytes or os.PathLike is
a path, an integer is a file descriptor where the function takes one (a bool
too, with a RuntimeWarning), and anything else is a TypeError naming the
function, the argument and what it accepts.  genericpath's exists, isdir,
isfile, islink and lexists call os.stat and os.lstat, so they convert
theirs the same way.

Grail handed the argument to GemStone's file primitives as it was, and they
send it ``encodeAsUTF8``: ``os.stat(2.5)``, ``os.path.exists(True)`` and
``os.listdir(None)`` were an uncatchable MessageNotUnderstood, which even
``except BaseException`` does not see.  A bytearray passed as bytes, which
CPython refuses.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import genericpath
import os
import posixpath
import tempfile
import warnings

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def refusal_type(thunk):
    try:
        thunk()
        return 'no error'
    except Exception as e:
        return type(e).__name__


def errno_and_filename(thunk):
    try:
        thunk()
        return 'no error'
    except OSError as e:
        return (e.errno, e.filename)


def warned(thunk):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        result = thunk()
    return [type(result).__name__, [(w.category.__name__, str(w.message)) for w in caught]]


class Both:
    """An __index__ is a descriptor's, even beside an __fspath__."""

    def __index__(self):
        return 1

    def __fspath__(self):
        return '/no/such/path'


directory = tempfile.mkdtemp()
NOT_OPEN = 2 ** 30

# --- what is no path is a TypeError, in CPython's words --------------------
r['stat_float'] = outcome(lambda: os.stat(2.5))
r['stat_list'] = outcome(lambda: os.stat([]))
r['stat_bytearray'] = outcome(lambda: os.stat(bytearray(b'/')))
r['stat_none'] = outcome(lambda: os.stat(None))
r['lstat_float'] = outcome(lambda: os.lstat(2.5))
r['lstat_int'] = outcome(lambda: os.lstat(1))
r['path_only_refusals'] = [outcome(lambda: f(2.5)) for f in (os.mkdir, os.rmdir, os.remove, os.unlink, os.readlink)]
r['access_float'] = outcome(lambda: os.access(2.5, os.F_OK))
r['rename_dst'] = outcome(lambda: os.rename(directory, 2.5))
# These take a descriptor in CPython and name it in their refusal; what
# matters here is that they refuse.
r['refused_by_chmod_chdir_utime'] = [
    refusal_type(lambda: os.chmod(2.5, 0o777)),
    refusal_type(lambda: os.chdir(2.5)),
    refusal_type(lambda: os.utime(2.5))]
r['refused_by_listdir_scandir'] = [refusal_type(lambda: os.listdir(2.5)), refusal_type(lambda: os.scandir([]))]

# --- None is the current directory to listdir and scandir -------------------
r['listdir_none'] = outcome(lambda: sorted(os.listdir(None)) == sorted(os.listdir('.')))
r['scandir_none'] = outcome(lambda: sorted(e.name for e in os.scandir(None)) == sorted(os.listdir('.')))

# --- an integer is os.stat's file descriptor --------------------------------
with open(os.path.join(directory, 'f'), 'w') as handle:
    r['stat_fd'] = outcome(lambda: os.stat(handle.fileno()).st_ino == os.fstat(handle.fileno()).st_ino)
r['stat_index_before_fspath'] = outcome(lambda: type(os.stat(Both())).__name__)
r['stat_bool_warns'] = warned(lambda: os.stat(True))
r['stat_fd_not_open'] = errno_and_filename(lambda: os.stat(NOT_OPEN))
r['stat_fd_too_large'] = outcome(lambda: os.stat(2 ** 40))
r['stat_fd_too_small'] = outcome(lambda: os.stat(-2 ** 40))
r['stat_in_supports_fd'] = os.stat in os.supports_fd

# --- the predicates convert as os.stat and os.lstat do ----------------------
for name, module in (('os_path', os.path), ('genericpath', genericpath)):
    r[name + '_exists_bool_warns'] = [warned(lambda: module.exists(True)), warned(lambda: module.exists(False))]
    r[name + '_fd_not_open'] = [module.exists(NOT_OPEN), module.isdir(NOT_OPEN), module.isfile(NOT_OPEN)]
    r[name + '_float_refused'] = [outcome(lambda: f(2.5)) for f in
                                  (module.exists, module.isdir, module.isfile, module.islink, module.lexists)]

# --- os.fspath and normcase refuse what is no path --------------------------
r['fspath_bytearray'] = outcome(lambda: os.fspath(bytearray(b'x')))
r['normcase_refusals'] = [outcome(lambda: f(p)) for f in (os.path.normcase, posixpath.normcase)
                          for p in (None, True, bytearray(b''))]
r['normcase_paths'] = [os.path.normcase('FoO/./BaR'), os.path.normcase(b'FoO/./BaR')]

os.remove(os.path.join(directory, 'f'))
os.rmdir(directory)

STAT_KINDS = 'string, bytes, os.PathLike or integer'
LSTAT_FLOAT = 'TypeError: lstat: path should be string, bytes or os.PathLike, not float'
STAT_FLOAT = 'TypeError: stat: path should be ' + STAT_KINDS + ', not float'
EXPECTED = {
    'stat_float': STAT_FLOAT,
    'stat_list': 'TypeError: stat: path should be ' + STAT_KINDS + ', not list',
    'stat_bytearray': 'TypeError: stat: path should be ' + STAT_KINDS + ', not bytearray',
    'stat_none': 'TypeError: stat: path should be ' + STAT_KINDS + ', not NoneType',
    'lstat_float': LSTAT_FLOAT,
    'lstat_int': 'TypeError: lstat: path should be string, bytes or os.PathLike, not int',
    'path_only_refusals': [
        'TypeError: %s: path should be string, bytes or os.PathLike, not float' % name
        for name in ('mkdir', 'rmdir', 'remove', 'unlink', 'readlink')],
    'access_float': 'TypeError: access: path should be string, bytes or os.PathLike, not float',
    'rename_dst': 'TypeError: rename: dst should be string, bytes or os.PathLike, not float',
    'refused_by_chmod_chdir_utime': ['TypeError', 'TypeError', 'TypeError'],
    'refused_by_listdir_scandir': ['TypeError', 'TypeError'],
    'listdir_none': True,
    'scandir_none': True,
    'stat_fd': True,
    'stat_index_before_fspath': 'stat_result',
    'stat_bool_warns': ['stat_result', [('RuntimeWarning', 'bool is used as a file descriptor')]],
    'stat_fd_not_open': (9, NOT_OPEN),
    'stat_fd_too_large': 'OverflowError: fd is greater than maximum',
    'stat_fd_too_small': 'OverflowError: fd is less than minimum',
    'stat_in_supports_fd': True,
    'fspath_bytearray': 'TypeError: expected str, bytes or os.PathLike object, not bytearray',
    'normcase_refusals': 2 * [
        'TypeError: expected str, bytes or os.PathLike object, not NoneType',
        'TypeError: expected str, bytes or os.PathLike object, not bool',
        'TypeError: expected str, bytes or os.PathLike object, not bytearray'],
    'normcase_paths': ['FoO/./BaR', b'FoO/./BaR'],
}
for name in ('os_path', 'genericpath'):
    EXPECTED[name + '_exists_bool_warns'] = 2 * [['bool', [('RuntimeWarning', 'bool is used as a file descriptor')]]]
    EXPECTED[name + '_fd_not_open'] = [False, False, False]
    EXPECTED[name + '_float_refused'] = [STAT_FLOAT, STAT_FLOAT, STAT_FLOAT, LSTAT_FLOAT, LSTAT_FLOAT]

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
