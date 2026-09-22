# ``del m.x'' on a module has to remove the name WHEREVER the module keeps it,
# and a module keeps its globals in THREE places: dynamic instVars (what a
# Python module body assigns), dictionary entries (built-in module data), and
# lazily-wrapped class METHODS -- because a module written in Smalltalk, sys
# among them, has its functions and streams compiled as methods.
#
# Only the first two can be removed.  Unfiling the third is not an option: the
# method is shared by every session and every other module in the image.  So
# deleting a method-backed name did the worst thing a delete can do -- it
# reported success and left the attribute exactly where it was.
#
# Worse than that, and the shape that took longest to see: a module body that
# ASSIGNS over a built-in name creates a dynamic instVar SHADOWING the method.
# Deleting that removed the shadow and REVEALED the method underneath, so
#
#     sys.stdout = f
#     del sys.stdout
#
# quietly restored the original stdout and answered None.  The caller was told
# the delete worked, twice over.
#
# A TOMBSTONE is the only way to make a method-backed name absent.  It is
# session-local, deliberately: a Grail module is a PERSISTENT object, so
# removing a built-in attribute for good would outlive the program that did it,
# while CPython's del touches one process's module and nothing else.
#
# REVIVING IT IS THE HALF THAT NEEDED THREE TRIES.  ``m.x = v'' does not always
# store where the read looks -- sys.stdout has a compiled accessor PAIR, so
# assigning it performs the setter and writes neither store.  Clearing the mark
# on the STORE, rather than ordering the read around it, is the only version
# that cannot be wrong; and the store a module assignment actually makes is
# __setattr__, not ___pyAttrStore___.
#
# WHAT IT IS FOR: input() raises ``RuntimeError: lost sys.stdout'' once the
# stream is gone, which it could not do while the delete was a no-op.  Grail
# keys that on DELETED rather than on None, because it initialises sys.stdin
# and sys.stdout to None and reads the console through its own provider when
# they are -- so ``None means lost'' would refuse every ordinary interactive
# input().  The rows below say so.
#
# test_builtin's test_input.

import io
import sys

r = {}
_real_stdout = sys.stdout


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- deleting a method-backed attribute -----------------------------------------


def _delete_then_read():
    saved = sys.stdout
    try:
        sys.stdout = io.StringIO()
        del sys.stdout
        return (hasattr(sys, 'stdout'), 'stdout' in dir(sys))
    finally:
        sys.stdout = saved


def _delete_then_read_raises():
    saved = sys.stdout
    try:
        sys.stdout = io.StringIO()
        del sys.stdout
        try:
            sys.stdout
            return 'no raise'
        except AttributeError as e:
            return str(e)
    finally:
        sys.stdout = saved


r['gone_from_hasattr_and_dir'] = outcome(_delete_then_read)
r['reading_it_raises'] = outcome(_delete_then_read_raises)

# --- and assigning it back revives it ---------------------------------------------


def _delete_then_assign():
    saved = sys.stdout
    try:
        sys.stdout = io.StringIO()
        del sys.stdout
        sys.stdout = io.StringIO()
        return (hasattr(sys, 'stdout'), 'stdout' in dir(sys))
    finally:
        sys.stdout = saved


r['assignment_revives_it'] = outcome(_delete_then_assign)

# --- input() refuses once a stream it needs is gone ---------------------------------


def _input_without_stdout():
    so, si = sys.stdout, sys.stdin
    try:
        sys.stdin = io.StringIO('x\n')
        sys.stdout = io.StringIO()
        del sys.stdout
        return outcome(lambda: input('prompt'))
    finally:
        sys.stdout, sys.stdin = so, si


def _input_without_stdin():
    so, si = sys.stdout, sys.stdin
    try:
        sys.stdout = io.StringIO()
        sys.stdin = io.StringIO('x\n')
        del sys.stdin
        return outcome(lambda: input('prompt'))
    finally:
        sys.stdout, sys.stdin = so, si


def _input_after_reviving():
    so, si = sys.stdout, sys.stdin
    try:
        sys.stdout = io.StringIO()
        sys.stdin = io.StringIO('x\n')
        del sys.stdin
        sys.stdin = io.StringIO('revived\n')
        return outcome(lambda: input('prompt'))
    finally:
        sys.stdout, sys.stdin = so, si


r['input_lost_stdout'] = _input_without_stdout()
r['input_lost_stdin'] = _input_without_stdin()
r['input_after_reviving'] = _input_after_reviving()

# --- controls -----------------------------------------------------------------------
#
# A delete must still refuse a name that was never there, an ordinary
# dictionary-backed attribute must still delete, and nothing above may disturb
# an unredirected input() -- which is why the guard keys on DELETED and not on
# the None these start out as.


def _delete_missing():
    return outcome(lambda: delattr(sys, 'nonesuch_xyz'))


def _delete_a_plain_global():
    import types
    m = types.ModuleType('m') if False else sys
    saved = getattr(sys, 'argv')
    try:
        del sys.argv
        gone = hasattr(sys, 'argv')
        sys.argv = saved
        return (gone, hasattr(sys, 'argv'))
    finally:
        sys.argv = saved


def _ordinary_input():
    so, si = sys.stdout, sys.stdin
    try:
        sys.stdout = io.StringIO()
        sys.stdin = io.StringIO('plain\n')
        return outcome(lambda: input())
    finally:
        sys.stdout, sys.stdin = so, si


r['delete_missing_name'] = _delete_missing()
r['delete_a_value_attribute'] = outcome(_delete_a_plain_global)
r['ordinary_input_unaffected'] = _ordinary_input()
r['module_still_usable'] = outcome(lambda: bool(sys.modules))


EXPECTED = {
    'assignment_revives_it': 'ok -> (True, True)',
    'delete_a_value_attribute': 'ok -> (False, True)',
    'delete_missing_name': "AttributeError: 'module' object has no attribute 'nonesuch_xyz'",
    'gone_from_hasattr_and_dir': 'ok -> (False, False)',
    'input_after_reviving': "ok -> 'revived'",
    'input_lost_stdin': 'RuntimeError: lost sys.stdin',
    'input_lost_stdout': 'RuntimeError: lost sys.stdout',
    'module_still_usable': 'ok -> True',
    'ordinary_input_unaffected': "ok -> 'plain'",
    'reading_it_raises': 'ok -> "module \'sys\' has no attribute \'stdout\'"',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual), file=_real_stdout)
