"""Three defects test.test_linecache found, none of them in linecache.

  * An embedded NUL in a path was passed to the kernel, which reads a C string
    and stops at the NUL -- so ``os.stat('/tmp\\x00junk')'' reported on /tmp,
    and ``os.listdir('\\x00')'' listed the current directory.  CPython refuses
    the NUL in every os function that takes a path (``ValueError: stat: embedded
    null character in path''), and its os.path predicates answer False.  linecache.updatecache
    of '\\x00' reached sys.path's first directory and died opening it.
  * ``dict.pop(key, default)'' with a str key longer than 1024 characters
    killed the program: GemStone refuses a Symbol that long, uncatchably, and
    pop asked for the key's Symbol form.  updatecache opens with
    ``cache.pop(filename, None)''.
  * tempfile.mkstemp / NamedTemporaryFile / TemporaryFile raised
    NotImplementedError; ten of the module's tests write their source through
    NamedTemporaryFile.

Every expectation was measured against CPython 3.14.
"""

import os
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args):
    try:
        fn(*args)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'ok'


# ------------------------------------------------ embedded NUL

_here = os.path.dirname(os.path.abspath(__file__))

check('stat_refuses_an_embedded_nul',
      [outcome(os.stat, p) for p in ('\x00', _here + '\x00junk', b'/tmp\x00')],
      ['ValueError: stat: embedded null character in path'] * 3)
check('lstat_and_listdir_refuse_it_too',
      [outcome(os.lstat, _here + '\x00'), outcome(os.listdir, '\x00')],
      ['ValueError: lstat: embedded null character in path',
       'ValueError: listdir: embedded null character in path'])


def _nul_path_calls():
    p = os.path.join(_here, 'no_such_dir\x00x')
    out = []
    for fn, args in [(os.mkdir, (p,)), (os.rmdir, (p,)), (os.remove, (p,)),
                     (os.rename, (p, p[:-2])), (os.chmod, (p, 0o600)),
                     (os.path.getmtime, (p,)), (os.readlink, (p,))]:
        out.append(outcome(fn, *args))
    return out


check('mutating_calls_refuse_it_before_touching_anything', _nul_path_calls(),
      ['ValueError: mkdir: embedded null character in path',
       'ValueError: rmdir: embedded null character in path',
       'ValueError: remove: embedded null character in path',
       'ValueError: rename: embedded null character in src',
       'ValueError: chmod: embedded null character in path',
       'ValueError: stat: embedded null character in path',
       'ValueError: readlink: embedded null character in path'])
check('the_predicates_answer_false',
      [os.path.exists(_here + '\x00'), os.path.isdir(_here + '\x00'),
       os.path.isfile(__file__ + '\x00'), os.path.islink(_here + '\x00')],
      [False, False, False, False])
check('string_functions_let_a_nul_through',
      (os.path.join('a', 'b\x00c'), os.path.basename('/x/y\x00z')),
      ('a/b\x00c', 'y\x00z'))


def _linecache_nul():
    import linecache
    linecache.clearcache()
    return (linecache.updatecache('\x00'),
            linecache.updatecache(__file__ + '\x00'),
            '\x00' in linecache.cache)


check('linecache_ignores_a_nul_filename', _linecache_nul(), ([], [], False))


# ------------------------------------------------ long keys

_long = 'k' * 2000
check('dict_pop_accepts_a_long_str_key',
      ({}.pop(_long, 'default'), {_long: 1}.pop(_long)), ('default', 1))


def _pop_missing_long():
    try:
        {}.pop(_long)
    except KeyError:
        return 'KeyError'
    return 'no error'


check('a_missing_long_key_is_a_key_error', _pop_missing_long(), 'KeyError')


def _linecache_long():
    import linecache
    linecache.clearcache()
    return linecache.updatecache('a' * 1_000_000)


check('linecache_ignores_a_very_long_filename', _linecache_long(), [])


# ------------------------------------------------ tempfile

def _mkstemp():
    fd, path = tempfile.mkstemp(suffix='.dat')
    try:
        os.write(fd, b'abc')
    finally:
        os.close(fd)
    try:
        with open(path, 'rb') as f:
            data = f.read()
        return (type(fd).__name__, os.path.isabs(path), path.endswith('.dat'),
                oct(os.stat(path).st_mode & 0o777), data)
    finally:
        os.unlink(path)


check('mkstemp_creates_a_private_file', _mkstemp(),
      ('int', True, True, '0o600', b'abc'))


def _named_kept():
    with tempfile.NamedTemporaryFile(delete=False) as fp:
        name = fp.name
        fp.write(b'\x00kept')
    try:
        with open(name, 'rb') as f:
            return (os.path.exists(name), f.read())
    finally:
        os.unlink(name)


check('named_temporary_file_delete_false_keeps_the_file', _named_kept(),
      (True, b'\x00kept'))


def _named_text():
    with tempfile.NamedTemporaryFile('w+', encoding='utf-8',
                                     suffix='.py') as fp:
        fp.write('x = 1\n')
        fp.flush()
        fp.seek(0)
        text = fp.read()
        name = fp.name
        existed = os.path.exists(name)
    return (text, name.endswith('.py'), existed, os.path.exists(name))


check('named_temporary_file_text_mode_is_removed_on_exit', _named_text(),
      ('x = 1\n', True, True, False))


def _named_close():
    f = tempfile.NamedTemporaryFile()
    name = f.name
    f.close()
    return os.path.exists(name)


check('named_temporary_file_close_removes_it', _named_close(), False)


def _temporary_file():
    with tempfile.TemporaryFile() as t:
        t.write(b'tmp')
        t.seek(0)
        return t.read()


check('temporary_file_reads_back_what_was_written', _temporary_file(), b'tmp')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
