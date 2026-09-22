# PEP 553's breakpoint(), and the module-attribute store underneath it.
#
# Three bugs, each hiding the next.
#
# 1. sys.breakpoint was a CLASSMETHOD.  ``sys'' in Python is the module
#    OBJECT, so an attribute read resolves against it and never saw the
#    class-side method.  pdb.set_trace() -- the default hook's target --
#    calls sys.breakpoint(), so a bare breakpoint() with $PYTHONBREAKPOINT
#    unset raised ``'sys' object has no attribute 'breakpoint'.  Did you
#    mean: 'breakpointhook'?'' -- naming the hook it had just come through.
#
# 2. ``del sys.breakpointhook'' did NOTHING.  A module is a SymbolDictionary
#    subclass and keeps globals in two stores: dictionary entries (built-in
#    module data, which is where sys puts breakpointhook) and dynamic instVars
#    (what a module body assigns).  object's delete knew only the second, so
#    the delete answered None and the attribute was still there.  PEP 553
#    makes that load-bearing: breakpoint() is specified to raise RuntimeError
#    once the hook is gone, and it could not, because the hook never went.
#
#    Even with the delete fixed, the attribute READ lazy-wraps a class method
#    when no binding is found -- and sys still HAS a _breakpointhook method,
#    the default hook's own implementation -- so breakpoint() wrapped it again
#    and ran the default.  The guard now asks whether the BINDING exists.
#
# 3. ``sys.exit = f'' CALLED sys.exit(f).  object's store reads (name, name:)
#    as a getter/setter pair wherever both exist; on a module that shape is an
#    ARITY FAMILY far more often than an accessor -- sys.exit() and
#    sys.exit(code) are both legal.  So patching sys.exit terminated the
#    program with the Mock as its exit status, which is how test_builtin's
#    TestBreakpoint tests reported ``aMock'' as a Smalltalk error.
#
#    That one is not about breakpoint() at all: unittest.mock.patch on ANY
#    module function with a one-argument twin did this.
#
# test_builtin's TestBreakpoint: test_envar_good_path_other,
# test_envar_ignored_when_hook_is_set and test_runtime_error_when_hook_is_lost.

import os
import sys
from unittest.mock import Mock, patch

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


_ORIGINAL_HOOK = sys.breakpointhook


# --- patching a module function stores, and does not CALL ---------------------
#
# sys.exit is the case that bit: it has both a zero- and a one-argument form.
# os.getcwd is the control -- no one-argument twin, so it was never affected --
# and the pair says the fix is about the shape rather than about sys.

_ORIGINAL_EXIT = sys.exit
_sentinel = Mock()
sys.exit = _sentinel
r['patched_exit_is_the_mock'] = sys.exit is _sentinel
r['patched_exit_type'] = type(sys.exit).__name__
del sys.exit
# DIVERGENCE, recorded rather than asserted: CPython's delete leaves the name
# gone, while Grail's attribute read lazy-wraps sys's own ``exit'' method and
# resurfaces a callable.  That is about the lazy wrap, not about the store this
# change fixes, so the row below asks only what this change establishes -- that
# the MOCK is gone.
r['exit_mock_gone_after_del'] = getattr(sys, 'exit', None) is not _sentinel
sys.exit = _ORIGINAL_EXIT
r['exit_restored_by_assignment'] = sys.exit is _ORIGINAL_EXIT

# Asked as IDENTITY rather than by type name: the mock class CPython installs
# (MagicMock) and the one Grail's vendored mock installs (Mock) differ, and the
# restored original is a builtin_function_or_method there and a BoundMethod
# here -- neither is what this row is about, which is that the patch replaced
# the attribute and put it back.
_before_getcwd = os.getcwd
with patch('os.getcwd') as _m:
    r['patched_getcwd_is_the_mock'] = os.getcwd is _m
r['getcwd_restored'] = os.getcwd is _before_getcwd

# Dunders keep the accessor path -- they are genuine value attributes, and
# narrowing the rule to non-dunder names is what leaves them alone.
import types as _types
_mod = _types.ModuleType('probe_module')
_mod.__doc__ = 'a docstring'
r['module_doc_assignable'] = _mod.__doc__
_mod.custom = 7
r['module_plain_attr'] = _mod.custom


# --- deleting a module attribute actually deletes -----------------------------

_mod2 = _types.ModuleType('probe_module_2')
_mod2.thing = 1
r['before_delete'] = _mod2.thing
del _mod2.thing
# TYPE ONLY for these two: both runtimes raise AttributeError, and the message
# wording differs (Grail names the class where CPython names the module, and
# its delete-missing message is the bare attribute name).  Fixing that wording
# is its own change; what this row is about is that the delete took effect and
# that a missing name still raises.
r['after_delete'] = outcome(lambda: _mod2.thing).split(':')[0]
r['delete_missing_raises'] = outcome(
    lambda: _mod2.__delattr__('never_set')).split(':')[0]


# --- breakpoint() forwards to whatever sys.breakpointhook is ------------------

_calls = []


def _hook(*args, **kwargs):
    _calls.append((args, kwargs))
    return 'hooked'


sys.breakpointhook = _hook
r['hook_return'] = breakpoint()
r['hook_saw_no_args'] = _calls[-1]
r['hook_return_args'] = breakpoint(1, 2, k=3)
r['hook_saw_args'] = _calls[-1]

# A hook that is not a function at all is still just called.
sys.breakpointhook = int
r['hook_int'] = breakpoint()


# --- $PYTHONBREAKPOINT redirects, unless a hook was installed -----------------

sys.breakpointhook = _ORIGINAL_HOOK
os.environ['PYTHONBREAKPOINT'] = 'sys.exit'
with patch('sys.exit') as _exit_mock:
    breakpoint()
    r['envar_called_target_once'] = _exit_mock.call_count == 1

# An installed hook WINS over the environment variable -- the hook is consulted
# first and the default (which is what reads the variable) never runs.
with patch('sys.exit') as _exit_mock2:
    sys.breakpointhook = int
    breakpoint()
    r['envar_ignored_when_hook_set'] = _exit_mock2.call_count == 0

# ``0'' disables it entirely.
sys.breakpointhook = _ORIGINAL_HOOK
os.environ['PYTHONBREAKPOINT'] = '0'
r['envar_zero_returns_none'] = breakpoint()
del os.environ['PYTHONBREAKPOINT']


# --- the hook can be lost, and then breakpoint() raises -----------------------

sys.breakpointhook = _ORIGINAL_HOOK
r['hook_present_before_del'] = 'breakpointhook' in vars(sys)
del sys.breakpointhook
# DIVERGENCE, recorded rather than asserted: Grail's module enumeration lists
# every name the module's own METHODS could be lazily wrapped under, and sys
# keeps a ``_breakpointhook'' method -- the default hook's implementation -- so
# the name is still enumerated after the binding is gone.  CPython's delete
# removes it outright.  That is about the lazy wrap, not about the store or the
# guard this change fixes, and asserting it would pin a difference this PR does
# not address.  What IS asserted is the behaviour PEP 553 specifies: once the
# hook is lost, breakpoint() raises.
r['breakpoint_after_del'] = outcome(lambda: breakpoint())
# Restoring it by assignment works, which is what says the delete removed a
# binding rather than breaking the attribute.
# Restoring it by ASSIGNMENT works, which is what says the delete removed a
# binding rather than breaking the attribute.  Asserted by reading the binding
# back rather than by CALLING breakpoint(): with the default hook in place that
# call enters pdb, which is the whole point of the default hook and which no
# fixture may do.
sys.breakpointhook = _ORIGINAL_HOOK
r['hook_restored_by_assignment'] = sys.breakpointhook is _ORIGINAL_HOOK
r['hook_present_again'] = 'breakpointhook' in vars(sys)





EXPECTED = {
    'after_delete': 'AttributeError',
    'before_delete': 1,
    'breakpoint_after_del': 'RuntimeError: lost sys.breakpointhook',
    'delete_missing_raises': 'AttributeError',
    'envar_called_target_once': True,
    'envar_ignored_when_hook_set': True,
    'envar_zero_returns_none': None,
    'exit_mock_gone_after_del': True,
    'exit_restored_by_assignment': True,
    'getcwd_restored': True,
    'hook_int': 0,
    'hook_present_again': True,
    'hook_present_before_del': True,
    'hook_restored_by_assignment': True,
    'hook_return': 'hooked',
    'hook_return_args': 'hooked',
    'hook_saw_args': ((1, 2), {'k': 3}),
    'hook_saw_no_args': ((), {}),
    'module_doc_assignable': 'a docstring',
    'module_plain_attr': 7,
    'patched_exit_is_the_mock': True,
    'patched_exit_type': 'Mock',
    'patched_getcwd_is_the_mock': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
