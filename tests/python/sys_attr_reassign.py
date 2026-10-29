# Reassigning a sys attribute, with or without deleting it first, has to land
# where EVERY reader looks -- Python's ``sys.argv'' and Smalltalk's
# ``sys argv'' alike (issue #1933).
#
# sys is written in Smalltalk, and keeps its data attributes (argv, executable,
# flags, ...) as DICTIONARY ENTRIES behind one-line accessors.  A Python
# assignment to a module attribute stores a DYNAMIC INSTVAR, which Python's own
# read probes first, so Python always read back what it wrote.  The accessors
# read only the entry, so Smalltalk kept seeing the old value -- or, after
# ``del sys.argv'' (which removes the entry), no value at all: the next
# SysTestCase>>testArgv in the same session found no argv.
#
# The other direction too: importlib's runPath:arguments: installs a program's
# argv from Smalltalk (sys class >> ___setArgv___:), and it wrote the entry
# while a Python assignment left before it still shadowed that entry -- so the
# program saw the PREVIOUS program's argv.
#
# The rows below are the Python-visible half and are checked against CPython by
# scripts/check_python_fixtures.sh; the Smalltalk half is
# SysAttrReassignTestCase, which drives the functions at the bottom.

import sys

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _views(new):
    return (sys.argv is new, getattr(sys, 'argv') is new,
            vars(sys)['argv'] is new, sys.__dict__.get('argv') is new)


def _reassign_plain():
    saved = sys.argv
    try:
        new = ['plain']
        sys.argv = new
        return _views(new)
    finally:
        sys.argv = saved


def _reassign_after_delete():
    saved = sys.argv
    try:
        new = ['after-delete']
        del sys.argv
        sys.argv = new
        return _views(new)
    finally:
        sys.argv = saved


def _reassign_twice_after_delete():
    saved = sys.argv
    try:
        del sys.argv
        sys.argv = ['first']
        new = ['second']
        sys.argv = new
        return _views(new)
    finally:
        sys.argv = saved


def _restored_after_delete():
    saved = sys.argv
    try:
        del sys.argv
    finally:
        sys.argv = saved
    return sys.argv is saved


def _excepthook_reassigned():
    saved = sys.excepthook

    def hook(*args):
        pass

    try:
        sys.excepthook = hook
        return (sys.excepthook is hook, vars(sys)['excepthook'] is hook)
    finally:
        sys.excepthook = saved


r['reassign_plain'] = outcome(_reassign_plain)
r['reassign_after_delete'] = outcome(_reassign_after_delete)
r['reassign_twice_after_delete'] = outcome(_reassign_twice_after_delete)
r['restored_after_delete'] = outcome(_restored_after_delete)
r['excepthook_reassigned'] = outcome(_excepthook_reassigned)


EXPECTED = {
    'excepthook_reassigned': 'ok -> (True, True)',
    'reassign_after_delete': 'ok -> (True, True, True, True)',
    'reassign_plain': 'ok -> (True, True, True, True)',
    'reassign_twice_after_delete': 'ok -> (True, True, True, True)',
    'restored_after_delete': 'ok -> True',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


# --- driven from Smalltalk (SysAttrReassignTestCase) --------------------------
# Each leaves sys changed on purpose, so the Smalltalk side can look; the test
# puts both of sys's stores back itself, in tearDown.


def reassign_argv(tag, delete_first):
    new = [tag]
    if delete_first:
        del sys.argv
    sys.argv = new
    return new


def read_argv():
    return sys.argv


def reassign_executable(path):
    new = str(path) + '/python3'
    sys.executable = new
    return new


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
