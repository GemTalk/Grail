# Regression fixture for #1452: os.path answers every posixpath name.
#
# In CPython os.path IS posixpath.  Grail's os.path is a Smalltalk module that
# defines its own fast paths and forwards some names to posixpath, and it
# answered only the names it had a method for.  Eight of posixpath.__all__ were
# AttributeErrors -- expandvars stopped ``import pytest'' -- and relpath took
# no start= keyword, which zoneinfo.available_timezones() passes.
#
# Also: realpath(strict=ALLOW_MISSING) reached posixpath as strict=True, so a
# missing component raised instead of being allowed.
# Expected values are what CPython 3.14 answers.

import os
import posixpath
import tempfile

RESULTS = {}


def check(name, fn):
    """RESULTS[name] = fn(), or False when fn raises."""
    try:
        RESULTS[name] = fn()
    except Exception:
        RESULTS[name] = False


check('no_name_missing', lambda: [
    n for n in posixpath.__all__ if not hasattr(os.path, n)] == [])

os.environ['GRAIL_OSPATH_VAR'] = 'value'
check('expandvars', lambda: (
    os.path.expandvars('$GRAIL_OSPATH_VAR/x') == 'value/x'
    and os.path.expandvars('${GRAIL_OSPATH_VAR}y') == 'valuey'
    and os.path.expandvars('$GRAIL_OSPATH_UNSET') == '$GRAIL_OSPATH_UNSET'))


def from_import():
    from os.path import expandvars
    return expandvars('$GRAIL_OSPATH_VAR') == 'value'


check('from_import', from_import)

root = tempfile.mkdtemp(prefix='grail_ospath_')
fn = os.path.join(root, 'five.txt')
with open(fn, 'w') as fh:
    fh.write('12345')
st = os.stat(fn)
check('getsize', lambda: os.path.getsize(fn) == 5)
check('getatime_getctime', lambda: (
    os.path.getatime(fn) == st.st_atime and os.path.getctime(fn) == st.st_ctime))
check('samestat', lambda: (
    os.path.samestat(st, os.stat(fn)) is True
    and os.path.samestat(st, os.stat(root)) is False))


def sameopenfile():
    with open(fn) as a, open(fn) as b:
        return os.path.sameopenfile(a.fileno(), b.fileno()) is True


check('sameopenfile', sameopenfile)
check('isdevdrive', lambda: os.path.isdevdrive(root) is False)

check('allow_missing_is_posixpaths', lambda: (
    os.path.ALLOW_MISSING is posixpath.ALLOW_MISSING))
missing = os.path.join(root, 'absent', 'deeper')
check('realpath_allow_missing', lambda: (
    os.path.realpath(missing, strict=os.path.ALLOW_MISSING)
    == posixpath.realpath(missing, strict=posixpath.ALLOW_MISSING)))


def realpath_strict():
    try:
        os.path.realpath(missing, strict=True)
    except FileNotFoundError:
        return True
    return False


check('realpath_strict_still_raises', realpath_strict)
check('relpath_start_keyword', lambda: (
    os.path.relpath('/a/b/c', start='/a') == 'b/c'
    and os.path.relpath('/a/b/c', '/a') == 'b/c'))


def unknown_name():
    try:
        os.path.no_such_name_xyz
    except AttributeError as e:
        return str(e) == "module 'posixpath' has no attribute 'no_such_name_xyz'"
    return False


check('unknown_name', unknown_name)

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
