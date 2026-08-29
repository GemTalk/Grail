"""Grail's ``atexit``.

CPython runs the registered callables when the interpreter shuts down.  A Grail
gem has no comparable event: a session ends when topaz logs out or the process
dies, and neither is observable from Python code that could be called back into.
So Grail keeps the REGISTRY faithfully -- register / unregister / _clear /
_ncallbacks all behave exactly as CPython's do -- and exposes
``atexit._run_exitfuncs()`` for a caller who wants to fire it deliberately.

That is enough for the reason most packages import atexit at all.  certifi, tqdm
and colorama each register a cleanup at import time and never look at it again;
a registry that accepts the registration is the whole of what they need.  Before
this module existed, ``import certifi`` failed on the import line.

The one thing NOT faithful is automatic firing at shutdown, and that is a
deliberate silence rather than a stub: pretending to run the callbacks at a
moment Grail cannot detect would be worse than not running them.
"""

import sys

__all__ = ["register", "unregister"]

#: (func, args, kwargs) triples, in registration order.  Module-level state, so
#: it is per-session like every other Python module instance in Grail.
_exithandlers = []


def register(func, *args, **kwargs):
    """Register ``func(*args, **kwargs)`` to be called by _run_exitfuncs().

    Answers ``func`` unchanged, as CPython does, so ``@atexit.register`` works
    as a decorator.
    """
    if not callable(func):
        raise TypeError("the first argument must be callable")
    _exithandlers.append((func, args, kwargs))
    return func


def unregister(func):
    """Remove every registration of ``func``.  Not an error if there is none."""
    kept = [entry for entry in _exithandlers if entry[0] is not func]
    del _exithandlers[:]
    _exithandlers.extend(kept)


def _clear():
    """Drop every registered callback."""
    del _exithandlers[:]


def _ncallbacks():
    """How many callbacks are currently registered."""
    return len(_exithandlers)


def _run_exitfuncs():
    """Run the registered callbacks, most recently registered first.

    CPython's shutdown does this; in Grail the caller decides when.  As in
    CPython, an exception from one callback does not stop the others: it is
    reported on stderr and the run continues.
    """
    exc = None
    while _exithandlers:
        func, args, kwargs = _exithandlers.pop()
        try:
            func(*args, **kwargs)
        except SystemExit:
            pass
        except BaseException as e:
            exc = e
            try:
                sys.stderr.write("Error in atexit._run_exitfuncs:\n")
                sys.stderr.write(repr(e) + "\n")
            except BaseException:
                pass
    if exc is not None:
        raise exc
