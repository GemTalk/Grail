"""Fixture: os.defpath, os.access and shutil.which, as in CPython (#1511).

uuid's _ifconfig/_arp/_netstat getters find their commands with
``shutil.which(command, path=os.defpath ...)'', and shutil.which tests each
candidate with ``os.access(name, os.F_OK | os.X_OK)''.  Grail had none of the
three -- os.defpath, os.access with its F_OK/R_OK/W_OK/X_OK, and
shutil.which -- so every one of those getters raised AttributeError; and
os.path.join could not join bytes, which which() does for a bytes command.  On
macOS all three are in uuid._GETTERS, so test_uuid read one more error there
than in CI, where two of them are not.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import os
import shutil
import tempfile

r = {}

r['defpath'] = (os.defpath, os.defpath == os.path.defpath)
r['mode_constants'] = (os.F_OK, os.X_OK, os.W_OK, os.R_OK)

r['access'] = {
    'executable_x': os.access('/bin/sh', os.X_OK),
    'executable_f_x': os.access('/bin/sh', os.F_OK | os.X_OK),
    'missing_f': os.access('/no/such/grail/file', os.F_OK),
    'missing_r': os.access('/no/such/grail/file', os.R_OK),
    'directory_x': os.access('/', os.X_OK),
    'bytes_path': os.access(b'/bin/sh', os.F_OK),
}

try:
    os.access('/bin/s\0h', os.F_OK)
    r['embedded_nul'] = 'no error'
except ValueError:
    r['embedded_nul'] = 'ValueError'

with tempfile.TemporaryDirectory() as d:
    plain = os.path.join(d, 'tool')
    with open(plain, 'w') as f:
        f.write('#!/bin/sh\n')
    os.chmod(plain, 0o644)
    os.mkdir(os.path.join(d, 'subdir'))
    r['access_plain_file'] = (os.access(plain, os.R_OK),
                              os.access(plain, os.X_OK))
    r['which_not_executable'] = shutil.which('tool', path=d)
    os.chmod(plain, 0o755)
    r['which_executable'] = shutil.which('tool', path=d) == plain
    r['which_skips_a_directory'] = shutil.which('subdir', path=d)
    r['which_second_path_entry'] = shutil.which(
        'tool', path='/no/such/dir' + os.pathsep + d) == plain

# which joins bytes components for a bytes command; os.path.join answered an
# uncatchable MessageNotUnderstood for them.
r['join_bytes'] = (os.path.join(b'/bin', b'sh'), os.path.join(b'', b'a'),
                   os.path.join(b'x', b'/y'), os.path.join(b'a', b''))
try:
    os.path.join('a', b'b')
    r['join_mixed'] = 'no error'
except TypeError as e:
    r['join_mixed'] = str(e)

r['which'] = {
    'on_defpath': shutil.which('sh', path=os.defpath),
    'absolute': shutil.which('/bin/sh'),
    'absolute_missing': shutil.which('/bin/no-such-grail-tool'),
    'missing_dir': shutil.which('sh', path='/no/such/dir'),
    'empty_path': shutil.which('sh', path=''),
    'bytes': shutil.which(b'sh', path=b'/bin'),
}


EXPECTED = {
    'defpath': ('/bin:/usr/bin', True),
    'mode_constants': (0, 1, 2, 4),
    'access': {
        'executable_x': True,
        'executable_f_x': True,
        'missing_f': False,
        'missing_r': False,
        'directory_x': True,
        'bytes_path': True,
    },
    'embedded_nul': 'ValueError',
    'access_plain_file': (True, False),
    'which_not_executable': None,
    'which_executable': True,
    'which_skips_a_directory': None,
    'which_second_path_entry': True,
    'join_bytes': (b'/bin/sh', b'a', b'/y', b'a/'),
    'join_mixed': "Can't mix strings and bytes in path components",
    'which': {
        'on_defpath': '/bin/sh',
        'absolute': '/bin/sh',
        'absolute_missing': None,
        'missing_dir': None,
        'empty_path': None,
        'bytes': b'/bin/sh',
    },
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-26s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
