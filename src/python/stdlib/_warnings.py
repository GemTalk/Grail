"""GRAIL: the C accelerator module ``_warnings``, backed by Grail's own.

CPython 3.14 has three layers: ``_py_warnings`` (pure Python), ``_warnings``
(a C extension replacing the hot parts of it), and a ``warnings`` shim that
prefers the C one when it imports.  Grail's arrangement is different -- its
``warnings`` is a native Smalltalk module that IS the fast implementation --
so this module plays the accelerator's role by re-exporting from it.

That is the same inversion [_contextvars] and [_thread] make, and for the same
reason: the underscore spelling names whichever implementation is the native
one, and on Grail that is never a C extension.

Why it has to exist at all: test.support.import_helper.import_fresh_module
takes a ``fresh=`` list naming the modules the caller genuinely needs present,
and answers None when one of them will not import.  test_warnings asks for
``import_fresh_module("warnings", fresh=["_warnings", "_py_warnings"])`` to get
the accelerated implementation, so without this module that call answered None
and the whole test module failed at import.

Only the names Grail's warnings actually implements are re-exported.  The
locking pair is a no-op: a Grail session is single-threaded, so there is no
lock to take -- see [_thread].
"""

from warnings import (
    catch_warnings,
    filterwarnings,
    formatwarning,
    resetwarnings,
    simplefilter,
    warn,
    warn_explicit,
)

__all__ = [
    'catch_warnings', 'filterwarnings', 'formatwarning', 'resetwarnings',
    'simplefilter', 'warn', 'warn_explicit', '_acquire_lock', '_release_lock',
]


def _acquire_lock():
    """No-op: a Grail session is single-threaded, so the filter list has no
    concurrent writer to exclude."""


def _release_lock():
    """No-op counterpart to _acquire_lock()."""
