"""A destructive os call must never act on a path other than the one it was given.

GemStone's server-file primitives run their argument through shell-style
variable expansion, so ``a$b`` reaches the filesystem as ``a``.  os.remove
therefore passed its existence check by looking at a DIFFERENT file, deleted
that file, and returned normally -- the caller was told the removal succeeded,
the file they named was still there, and an unrelated one was gone (issue #861).

It is silent exactly when it is most dangerous.  When the expansion names
something that does not exist the primitive fails, the OSError sends the caller
down a working fallback, and nothing is lost; when it names a REAL file, that
file is destroyed and nothing is reported.  Every check below therefore plants a
DECOY at the expanded path -- without one the bug cannot be observed at all.

THE INVARIANTS ARE WRITTEN TO HOLD IN BOTH IMPLEMENTATIONS, because the two are
allowed to differ here and only the safety property is common:

    CPython  removes a$b, leaves the decoy alone.
    Grail    refuses with OSError, leaves BOTH alone -- it has no primitive
             that can address the path, so declining is the whole fix.

What neither may do is return normally having removed neither, or touch the
decoy.  Those are the checks.
"""

import os
import shutil
import tempfile


def _write_decoy(root, name, content):
    with open(os.path.join(root, name), 'w') as fh:
        fh.write(content)


def _listdir(root):
    """Presence is read from listdir, never from os.path.exists: exists() goes
    through the same expanding primitive and answers for the decoy."""
    return sorted(os.listdir(root))


def _attempt_remove(root, name):
    """(raised, names_after).  ``raised`` is the exception type name or None."""
    try:
        os.remove(os.path.join(root, name))
        return None, _listdir(root)
    except OSError as exc:
        return type(exc).__name__, _listdir(root)


def _scratch():
    return tempfile.mkdtemp(prefix='grail_dollar_')


def removing_a_dollar_path_never_destroys_the_expansion_target():
    """The decoy -- what ``a$b`` expands to -- must still be there, with its
    contents intact.  This is the data-loss half of the report."""
    root = _scratch()
    try:
        _write_decoy(root, 'a', 'decoy')
        os.system("printf '' > '" + os.path.join(root, 'a$b') + "'")
        if 'a$b' not in _listdir(root):
            return 'setup failed: could not create a$b'
        _attempt_remove(root, 'a$b')
        if 'a' not in _listdir(root):
            return 'the decoy was deleted'
        with open(os.path.join(root, 'a')) as fh:
            return fh.read() == 'decoy'
    finally:
        shutil.rmtree(root, ignore_errors=True)


def removing_a_dollar_path_either_removes_it_or_raises():
    """Never ``returned normally and the file is still there''.  That exact
    combination is the defect; CPython satisfies this by removing the file and
    Grail by raising."""
    root = _scratch()
    try:
        _write_decoy(root, 'a', 'decoy')
        os.system("printf '' > '" + os.path.join(root, 'a$b') + "'")
        if 'a$b' not in _listdir(root):
            return 'setup failed: could not create a$b'
        raised, after = _attempt_remove(root, 'a$b')
        if raised is None and 'a$b' in after:
            return 'returned normally but a$b is still present'
        return True
    finally:
        shutil.rmtree(root, ignore_errors=True)


def an_ordinary_path_is_still_removed():
    """Control.  The guard must not cost ordinary removal -- if this fails the
    fix is simply breaking os.remove."""
    root = _scratch()
    try:
        _write_decoy(root, 'plain', 'x')
        os.remove(os.path.join(root, 'plain'))
        return 'plain' not in _listdir(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)


def a_tilde_path_is_still_removed():
    """Control, and the one that keeps the guard NARROW.  ``~`` is not a
    metacharacter to these primitives (measured), so a file named ``a~b`` must
    still be removable -- a guard that refused every punctuation mark would pass
    the checks above and fail here."""
    root = _scratch()
    try:
        _write_decoy(root, 'a~b', 'x')
        os.remove(os.path.join(root, 'a~b'))
        return 'a~b' not in _listdir(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)


def a_starred_path_is_still_removed():
    """Control.  ``*`` is not expanded either, and a guard keyed on ``looks
    shell-ish'' rather than on ``$'' would break globbed names."""
    root = _scratch()
    try:
        _write_decoy(root, 'a*b', 'x')
        os.remove(os.path.join(root, 'a*b'))
        return 'a*b' not in _listdir(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)


def renaming_onto_a_dollar_path_never_destroys_the_expansion_target():
    """rename can destroy its DESTINATION as surely as remove destroys its
    argument, so the destination is guarded too."""
    root = _scratch()
    try:
        _write_decoy(root, 'a', 'decoy')
        _write_decoy(root, 'src', 'payload')
        try:
            os.rename(os.path.join(root, 'src'), os.path.join(root, 'a$b'))
        except OSError:
            pass
        if 'a' not in _listdir(root):
            return 'the decoy was clobbered by the rename'
        with open(os.path.join(root, 'a')) as fh:
            return fh.read() == 'decoy'
    finally:
        shutil.rmtree(root, ignore_errors=True)


def removing_a_dollar_directory_never_destroys_the_expansion_target():
    """rmdir reaches the same expanding primitive."""
    root = _scratch()
    try:
        os.mkdir(os.path.join(root, 'd'))
        os.system("mkdir -p '" + os.path.join(root, 'd$e') + "'")
        if 'd$e' not in _listdir(root):
            return 'setup failed: could not create d$e'
        try:
            os.rmdir(os.path.join(root, 'd$e'))
        except OSError:
            pass
        return 'd' in _listdir(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)


CHECKS = [
    removing_a_dollar_path_never_destroys_the_expansion_target,
    removing_a_dollar_path_either_removes_it_or_raises,
    renaming_onto_a_dollar_path_never_destroys_the_expansion_target,
    removing_a_dollar_directory_never_destroys_the_expansion_target,
    an_ordinary_path_is_still_removed,
    a_tilde_path_is_still_removed,
    a_starred_path_is_still_removed,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        # The RAW answer: a check that can explain itself returns a string, and
        # coercing to a bool here would discard the explanation.
        RESULTS[_fn.__name__] = _fn()
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
