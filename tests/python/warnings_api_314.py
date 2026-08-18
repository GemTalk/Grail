"""The warnings surface CPython 3.14 expects, and the modules behind it.

test.test_warnings failed to IMPORT on four separate things, each hidden behind
the last.  This pins the pieces that were added.

CPython 3.14 splits warnings into three layers: ``_py_warnings`` (pure Python),
``_warnings`` (a C extension replacing its hot parts), and a ``warnings`` shim
preferring the C one.  Grail's arrangement differs -- its ``warnings`` is a
native Smalltalk module that already IS the fast implementation -- so
``_warnings`` here re-exports from it, the same inversion ``_contextvars``
makes for ``contextvars``.  ``_py_warnings`` is vendored unchanged, which is
where PEP 702's ``@deprecated`` comes from: it patches __new__ and
__init_subclass__ through functools.wraps, and there is no reason to rewrite
that in Smalltalk when CPython's own version runs here.

NOT covered, deliberately: ``@deprecated`` applied to a CLASS.  It marks the
class correctly but instantiating one fails -- Grail does not unwrap the
staticmethod that @deprecated assigns to __new__.  That is a descriptor-path
gap rather than a warnings one, and a check for it would fail here rather than
document anything.

Every expectation below was checked against CPython 3.14.
"""

import sys
import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------ PEP 702 @deprecated

from warnings import deprecated                            # noqa: E402


@deprecated("use g instead")
def deprecated_fn():
    return 7


@deprecated("no warning wanted", category=None)
def silent_fn():
    return 8


check('deprecated_importable_from_warnings',
      lambda: deprecated.__name__, 'deprecated')
# The message is recorded on the object, which is the part type checkers read.
check('marks_the_function', lambda: deprecated_fn.__deprecated__,
      'use g instead')
check('marks_even_when_silent', lambda: silent_fn.__deprecated__,
      'no warning wanted')


def _call_and_catch(fn):
    """Call fn with warnings promoted to errors; answer the message or ''."""
    with warnings.catch_warnings():
        warnings.simplefilter('error')
        try:
            fn()
        except Warning as exc:
            return str(exc)
    return ''


check('calling_a_deprecated_function_warns',
      lambda: _call_and_catch(deprecated_fn), 'use g instead')
# category=None means "mark it, but say nothing at runtime".
check('category_none_stays_quiet', lambda: _call_and_catch(silent_fn), '')


def _call_ignoring(fn):
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        return fn()


# The wrapper must still be the function: same return value, same name.
check('deprecated_function_still_returns', lambda: _call_ignoring(deprecated_fn),
      7)
check('deprecated_function_keeps_its_name',
      lambda: deprecated_fn.__name__, 'deprecated_fn')


# ------------------------------------------------ the 3.14 module surface

# Read by test_warnings in the helper every filter test runs through, to choose
# between context-local filters and saving the global list.
check('use_context_is_false', lambda: bool(warnings._use_context), False)

check('showwarning_exists', lambda: callable(warnings.showwarning), True)

# warn_explicit's full signature: only the first four carry information Grail
# acts on, but a call passing ``module=`` must still bind.
check('warn_explicit_accepts_module_keyword',
      lambda: _call_and_catch(lambda: warnings.warn_explicit(
          'boom', UserWarning, 'filename', 42, module='package.module')),
      'boom')
check('warn_explicit_four_positional',
      lambda: _call_and_catch(lambda: warnings.warn_explicit(
          'plain', UserWarning, 'filename', 42)),
      'plain')


# ------------------------------------------------ the modules behind it

import _contextvars                                        # noqa: E402
import contextvars                                         # noqa: E402

# Same object, not merely a same-named class: isinstance across the two
# spellings has to hold.
check('contextvars_underscore_is_the_same_class',
      lambda: _contextvars.ContextVar is contextvars.ContextVar, True)
check('contextvar_round_trips',
      lambda: _contextvars.ContextVar('probe', default=3).get(), 3)

import _warnings                                           # noqa: E402

check('underscore_warnings_exposes_warn',
      lambda: callable(_warnings.warn), True)
check('underscore_warnings_exposes_warn_explicit',
      lambda: callable(_warnings.warn_explicit), True)

import _py_warnings                                        # noqa: E402

check('py_warnings_importable', lambda: _py_warnings.__name__, '_py_warnings')
check('py_warnings_has_deprecated',
      lambda: _py_warnings.deprecated.__name__, 'deprecated')


# ------------------------------------------------ sys.flags

# 3.14 added these two.  Both are 0 in a default CPython build as well, so the
# VALUE is not a Grail compromise -- but the names have to exist, because
# _py_warnings reads context_aware_warnings at import time.
check('flag_context_aware_warnings',
      lambda: sys.flags.context_aware_warnings, 0)
check('flag_thread_inherit_context',
      lambda: sys.flags.thread_inherit_context, 0)
check('flag_gil', lambda: sys.flags.gil, 1)


# ------------------------------------------------ the unittest.case seam

import unittest.case                                       # noqa: E402

# test_warnings reassigns unittest.case.warnings to point unittest's assertWarns
# at the implementation under test.  CPython defines TestCase in that module, so
# it gets the binding for free; Grail defines it in unittest/__init__.py, so the
# submodule had to be added and bound.
check('unittest_case_is_reachable',
      lambda: unittest.case.warnings.__name__, 'warnings')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
