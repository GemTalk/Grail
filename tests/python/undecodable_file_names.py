"""File names that are not valid UTF-8, and bytes paths.

A POSIX file name is bytes.  CPython decodes one that is not valid UTF-8 with
surrogateescape (PEP 383), so os.listdir answers 'a\\udcffb' for b'a\\xffb', and
every os function encodes that str back to the same bytes.  Grail could list
such a file but not reach it again:

* ___fsPath___ turned a surrogate-escaped str into the escaped bytes as
  Latin-1 CHARACTERS, so os.fspath, os.path.join, split, dirname and relpath
  all answered '\\xff' for '\\udcff', and the GsFile primitive UTF-8-encoded
  that, naming a different file.
* A bytes path holding a non-ASCII byte reached the primitives as a
  ByteArray, which they cannot take: os.path.exists(b'/tmp/\\xc3\\xbc') was an
  uncatchable MessageNotUnderstood.
* chmod, utime, symlink and readlink ran shell commands, which cannot carry
  such a name; readlink answered str for a bytes path.
* os.getcwd answered a non-ASCII directory as mojibake; os.getcwdb was
  missing, and posixpath.abspath(bytes) needs it.
* os.path.isabs, abspath, expanduser and splitroot answered wrongly for
  bytes.

macOS refuses to create such a name at all (EILSEQ).  The filesystem rows
therefore answer 'ok' either when every operation works or when creating the
name is refused with EILSEQ, so they read the same on both platforms; the
error rows check that the refusal is EILSEQ, as CPython reports it.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test
case asserts is empty.
"""

import errno
import os
import os.path as P
import shutil
import tempfile

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


# --- pure path functions: no filesystem ---------------------------------

SUR_DIR = '/d\udcff'
SUR_NAME = 'x\udcfey.t'
B_DIR = b'/d\xff'
B_NAME = b'x\xfey.t'

t('fspath_keeps_surrogates', lambda: ascii(os.fspath('a\udcffb')))
t('fsencode_fsdecode_round_trip', lambda: os.fsencode(os.fsdecode(b'\x80a\xff')))
for kind, d, n in (('sur', SUR_DIR, SUR_NAME), ('bytes', B_DIR, B_NAME)):
    j = d + (b'/' if isinstance(d, bytes) else '/') + n
    t(kind + '_join', lambda: ascii(P.join(d, n)))
    t(kind + '_join_one', lambda: ascii(P.join(n)))
    t(kind + '_split', lambda: ascii(P.split(j)))
    t(kind + '_basename', lambda: ascii(P.basename(j)))
    t(kind + '_dirname', lambda: ascii(P.dirname(j)))
    t(kind + '_splitext', lambda: ascii(P.splitext(j)))
    t(kind + '_normpath', lambda: ascii(P.normpath(j + j[:1] + j[:1])))
    t(kind + '_isabs', lambda: (P.isabs(j), P.isabs(n)))
    t(kind + '_splitroot', lambda: ascii(P.splitroot(j)))
    t(kind + '_splitdrive', lambda: ascii(P.splitdrive(j)))
    t(kind + '_normcase', lambda: ascii(P.normcase(j)))
    t(kind + '_commonpath', lambda: ascii(P.commonpath([j, d])))
    t(kind + '_commonprefix', lambda: ascii(P.commonprefix([j, d])))
    t(kind + '_relpath', lambda: ascii(P.relpath(j, d)))
    t(kind + '_relpath_start_kw', lambda: ascii(P.relpath(j, start=d)))
    t(kind + '_abspath_relative', lambda: P.abspath(n) == P.join(
        os.getcwdb() if isinstance(n, bytes) else os.getcwd(), n))
    home = os.fsencode(P.expanduser('~')) if isinstance(n, bytes) else P.expanduser('~')
    tilde = b'~/' if isinstance(n, bytes) else '~/'
    t(kind + '_expanduser', lambda: P.expanduser(tilde + n) == P.join(home, n))

t('getcwdb_is_getcwd', lambda: os.getcwdb() == os.fsencode(os.getcwd()))


# --- the filesystem -----------------------------------------------------

def ops(base, name):
    """Every operation on base/name; 'ok' or the first thing that went wrong."""
    p = P.join(base, name)
    q = p + (b'2' if isinstance(p, bytes) else '2')
    link = p + (b'L' if isinstance(p, bytes) else 'L')
    try:
        with open(p, 'wb') as f:
            f.write(b'hi')
    except OSError as e:
        return 'ok' if e.errno == errno.EILSEQ else 'create: %s' % e
    checks = []
    with open(p, 'rb') as f:
        checks.append(('read', f.read() == b'hi'))
    checks.append(('exists', P.exists(p) and P.isfile(p)))
    checks.append(('stat', os.stat(p).st_size == 2 and os.lstat(p).st_size == 2))
    checks.append(('access', os.access(p, os.R_OK)))
    os.chmod(p, 0o600)
    checks.append(('chmod', os.stat(p).st_mode & 0o777 == 0o600))
    os.utime(p, (1000000000, 1000000000))
    checks.append(('utime', int(os.stat(p).st_mtime) == 1000000000))
    os.close(os.open(p, os.O_RDONLY))
    os.symlink(p, link)
    checks.append(('readlink', os.readlink(link) == p))
    checks.append(('islink', P.islink(link)))
    checks.append(('realpath', P.realpath(link) == P.realpath(p)))
    os.unlink(link)
    os.rename(p, q)
    checks.append(('rename', P.exists(q) and not P.exists(p)))
    os.replace(q, p)
    listed = os.listdir(base)
    checks.append(('listdir', (os.fsencode(name) if isinstance(name, str) else name)
                   in [os.fsencode(x) for x in listed]))
    checks.append(('listdir_names_reach', all(P.exists(P.join(base, x)) for x in listed)))
    os.remove(p)
    checks.append(('remove', not P.exists(p)))
    os.mkdir(p)
    checks.append(('mkdir', P.isdir(p) and os.listdir(p) == []))
    here = os.getcwd()
    os.chdir(p)
    try:
        checks.append(('chdir', os.path.basename(os.getcwdb()) == os.fsencode(name)))
    finally:
        os.chdir(here)
    os.rmdir(p)
    os.makedirs(P.join(p, name))
    checks.append(('makedirs', P.isdir(P.join(p, name))))
    shutil.rmtree(p)
    checks.append(('rmtree', not P.exists(p)))
    bad = [label for label, ok in checks if not ok]
    return 'ok' if not bad else 'failed: ' + ', '.join(bad)


def filesystem():
    base = tempfile.mkdtemp()
    try:
        for label, name in (('fs_bytes_utf8', b'u\xc3\xbc'),
                            ('fs_bytes_undecodable', b'a\xffb'),
                            ('fs_str_surrogate', 'c\udcffd'),
                            ('fs_str_utf8', 'e\xfc')):
            b = os.fsencode(base) if isinstance(name, bytes) else base
            t(label, lambda: ops(b, name))
        # a bytes listing answers bytes, a str listing str
        open(P.join(os.fsencode(base), b'k\xc3\xbc'), 'wb').close()
        t('listdir_kinds', lambda: (
            [type(x).__name__ for x in os.listdir(os.fsencode(base))],
            [ascii(x) for x in os.listdir(base)]))
    finally:
        shutil.rmtree(base)


t('filesystem', filesystem)


def errors():
    base = tempfile.mkdtemp()
    try:
        missing = P.join(os.fsencode(base), b'missing\xc3\xbc')
        try:
            open(missing, 'rb')
        except OSError as e:
            r['open_missing_bytes'] = repr((type(e).__name__, e.errno == errno.ENOENT,
                                            e.filename == missing))
        try:
            os.readlink(P.join(base, 'e\xfc'))
        except OSError as e:
            r['readlink_missing'] = repr((type(e).__name__, e.errno == errno.ENOENT))
        open(P.join(base, 'plain'), 'w').close()
        try:
            os.readlink(P.join(base, 'plain'))
        except OSError as e:
            r['readlink_not_a_link'] = repr((type(e).__name__, e.errno == errno.EINVAL))
        try:
            os.symlink('x', P.join(base, 'plain'))
        except OSError as e:
            r['symlink_exists'] = repr((type(e).__name__, e.errno == errno.EEXIST,
                                        e.filename, e.filename2 == P.join(base, 'plain')))
        # creating a name the platform refuses is EILSEQ, as CPython reports;
        # where it is accepted the row reads the same
        for label, make in (('open_w', lambda p: open(p, 'wb').close()),
                            ('mkdir', os.mkdir)):
            p = P.join(os.fsencode(base), b'r\xff' + label.encode())
            try:
                make(p)
                r['refused_' + label] = repr('accepted or EILSEQ')
            except OSError as e:
                r['refused_' + label] = repr('accepted or EILSEQ' if e.errno == errno.EILSEQ
                                             else '%s %s %r' % (type(e).__name__, e.errno, e.filename))
    finally:
        shutil.rmtree(base)


t('errors', errors)


EXPECTED = {
    'bytes_abspath_relative': 'True',
    'bytes_basename': '"b\'x\\\\xfey.t\'"',
    'bytes_commonpath': '"b\'/d\\\\xff\'"',
    'bytes_commonprefix': '"b\'/d\\\\xff\'"',
    'bytes_dirname': '"b\'/d\\\\xff\'"',
    'bytes_expanduser': 'True',
    'bytes_isabs': '(True, False)',
    'bytes_join': '"b\'/d\\\\xff/x\\\\xfey.t\'"',
    'bytes_join_one': '"b\'x\\\\xfey.t\'"',
    'bytes_normcase': '"b\'/d\\\\xff/x\\\\xfey.t\'"',
    'bytes_normpath': '"b\'/d\\\\xff/x\\\\xfey.t\'"',
    'bytes_relpath': '"b\'x\\\\xfey.t\'"',
    'bytes_relpath_start_kw': '"b\'x\\\\xfey.t\'"',
    'bytes_split': '"(b\'/d\\\\xff\', b\'x\\\\xfey.t\')"',
    'bytes_splitdrive': '"(b\'\', b\'/d\\\\xff/x\\\\xfey.t\')"',
    'bytes_splitext': '"(b\'/d\\\\xff/x\\\\xfey\', b\'.t\')"',
    'bytes_splitroot': '"(b\'\', b\'/\', b\'d\\\\xff/x\\\\xfey.t\')"',
    'errors': 'None',
    'filesystem': 'None',
    'fs_bytes_undecodable': "'ok'",
    'fs_bytes_utf8': "'ok'",
    'fs_str_surrogate': "'ok'",
    'fs_str_utf8': "'ok'",
    'fsencode_fsdecode_round_trip': "b'\\x80a\\xff'",
    'fspath_keeps_surrogates': '"\'a\\\\udcffb\'"',
    'getcwdb_is_getcwd': 'True',
    'listdir_kinds': '([\'bytes\'], ["\'k\\\\xfc\'"])',
    'open_missing_bytes': "('FileNotFoundError', True, True)",
    'readlink_missing': "('FileNotFoundError', True)",
    'readlink_not_a_link': "('OSError', True)",
    'refused_mkdir': "'accepted or EILSEQ'",
    'refused_open_w': "'accepted or EILSEQ'",
    'sur_abspath_relative': 'True',
    'sur_basename': '"\'x\\\\udcfey.t\'"',
    'sur_commonpath': '"\'/d\\\\udcff\'"',
    'sur_commonprefix': '"\'/d\\\\udcff\'"',
    'sur_dirname': '"\'/d\\\\udcff\'"',
    'sur_expanduser': 'True',
    'sur_isabs': '(True, False)',
    'sur_join': '"\'/d\\\\udcff/x\\\\udcfey.t\'"',
    'sur_join_one': '"\'x\\\\udcfey.t\'"',
    'sur_normcase': '"\'/d\\\\udcff/x\\\\udcfey.t\'"',
    'sur_normpath': '"\'/d\\\\udcff/x\\\\udcfey.t\'"',
    'sur_relpath': '"\'x\\\\udcfey.t\'"',
    'sur_relpath_start_kw': '"\'x\\\\udcfey.t\'"',
    'sur_split': '"(\'/d\\\\udcff\', \'x\\\\udcfey.t\')"',
    'sur_splitdrive': '"(\'\', \'/d\\\\udcff/x\\\\udcfey.t\')"',
    'sur_splitext': '"(\'/d\\\\udcff/x\\\\udcfey\', \'.t\')"',
    'sur_splitroot': '"(\'\', \'/\', \'d\\\\udcff/x\\\\udcfey.t\')"',
    'symlink_exists': "('FileExistsError', True, 'x', True)",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
