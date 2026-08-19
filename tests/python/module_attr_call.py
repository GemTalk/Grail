"""Calling a module attribute works whichever module the name resolves to.

``mod.name(...)'' is compiled once but resolved at run time, and the two need
not agree.  test.test_warnings swaps sys.modules['warnings'] to drive both
warnings implementations through the same unittest code, so a call written
against Grail's Smalltalk warnings can land on the vendored _py_warnings, where
the same name is a CLASS attribute rather than a module method.

Grail emitted a compile-time fast path for that call -- a ``_name:kw:'' send to
the module -- which only exists on a module that IMPLEMENTS it.  On the swapped
module the send raised MessageNotUnderstood, and since unittest's assertWarns
is written that way, every DeprecatedTests case died in setUp.

The fallback is what Python does anyway: read the attribute, call it.

In CPython all of this is unremarkable, which is the point -- these checks pass
there by construction and exist to hold Grail to the same behaviour.
"""

import sys

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------- calling through a swapped name

import _py_warnings                                        # noqa: E402
import warnings as _real_warnings                          # noqa: E402


def _under_swap(fn):
    """Run fn with sys.modules['warnings'] replaced, then put it back."""
    saved = sys.modules['warnings']
    sys.modules['warnings'] = _py_warnings
    try:
        return fn()
    finally:
        sys.modules['warnings'] = saved


def _swapped_catch():
    import warnings
    # A context manager, checked by PROTOCOL rather than by type name: in
    # CPython the shim re-exports _py_warnings' class, so the names coincide
    # and a name check would prove nothing there.
    cm = warnings.catch_warnings(record=True)
    return (hasattr(cm, '__enter__'), hasattr(cm, '__exit__'))


def _swapped_is_the_other_module():
    import warnings
    return warnings is _py_warnings


check('the_swap_takes_effect', lambda: _under_swap(_swapped_is_the_other_module),
      True)
# A keyword call on the swapped module's CLASS attribute.
check('keyword_call_on_a_swapped_module',
      lambda: _under_swap(_swapped_catch), (True, True))


def _restored_is_the_original():
    import warnings
    return warnings is _real_warnings


# ...and the name resolves to the original module again afterwards.
check('the_original_still_resolves', _restored_is_the_original, True)


# ----------------------------------------- ordinary module calls unaffected

def _positional_and_keyword():
    return (_py_warnings._getaction('err'),
            _py_warnings._getcategory('UserWarning') is UserWarning)


check('positional_module_call', _positional_and_keyword, ('error', True))


def _no_argument_call():
    import warnings
    with warnings.catch_warnings():
        warnings.resetwarnings()
        return len(warnings.filters)


check('zero_argument_module_call', _no_argument_call, 0)


# A name that genuinely does not exist must still raise, rather than being
# swallowed by the fallback.
def _missing_attribute():
    try:
        _py_warnings.no_such_function_at_all(1)
    except AttributeError:
        return 'AttributeError'
    except TypeError:
        return 'TypeError'
    return '<no raise>'


check('a_missing_name_still_raises', _missing_attribute, 'AttributeError')


# ----------------------------------------------- assertWarns spans both

import unittest                                            # noqa: E402


class _Probe(unittest.TestCase):
    def runTest(self):
        pass


def _assert_warns_with(mod):
    """assertWarns must work whichever warnings module is installed."""
    t = _Probe()
    with t.assertWarns(UserWarning):
        mod.warn('from ' + mod.__name__)
    return 'ok'


check('assert_warns_with_the_native_module',
      lambda: _assert_warns_with(_real_warnings), 'ok')

# NOT asserted: assertWarns catching a warning raised through the VENDORED
# module while it is swapped in.  CPython fails that too -- _py_warnings routes
# through whatever _wm names, which the swap does not change -- so it is a
# property of the vendored module's own wiring, not of Grail's dispatch, and
# this file is about dispatch.


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
