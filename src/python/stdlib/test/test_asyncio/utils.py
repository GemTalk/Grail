"""A DELIBERATELY PARTIAL vendoring of CPython's test_asyncio/utils.py.

Upstream's is 609 lines and is the dividing line in this corpus: 11 of the 38
test files never touch it, and the other 27 cannot run without it.  It is not
vendored whole yet because four of its imports are unmet, and two of those are
real projects rather than oversights:

    import selectors, socketserver, threading, unittest.mock, http.server   OK
    from wsgiref.simple_server import WSGIRequestHandler, WSGIServer        MISSING
    from asyncio import base_events         # for class TestLoop(BaseEventLoop) MISSING
    from asyncio import format_helpers      # one function, _get_function_source
    from asyncio.log import logger          # seven lines

`wsgiref` is ~1,090 lines across four modules and has nothing to do with
asyncio; `base_events.BaseEventLoop` is a ~2,000-line module whose loop class
upstream's `TestLoop` SUBCLASSES, which has to be reconciled with Grail's own
event loop rather than dropped alongside it.  Both are worth doing and neither
belongs inside a TaskGroup change.

WHAT IS HERE is only what the files that do not need the rest of upstream's
utils.py import from it.  Today that is one function, for one test.

WHY THIS IS SAFE TO SHIP PARTIAL, and the thing to check before adding to it:
a name that is missing here fails LOUDLY -- ImportError at the import line,
naming the symbol.  That is the opposite of the failure that made this a rule
worth writing down (types.GenericAlias was a stub that ACCEPTED being called and
answered an attribute-less object, so `asyncio.Queue[int]` was a silent wrong
answer).  So: never satisfy a name here with an invention or a stub.  Copy the
definition from upstream verbatim, or leave it missing and let the import fail.

When `wsgiref` and `BaseEventLoop` land, this file should be REPLACED by
upstream's whole utils.py, not grown into a parallel version of it.
"""

import asyncio


# Verbatim from upstream utils.py.  Used by test_taskgroups'
# test_taskgroup_double_enter to await a coroutine WITHOUT wrapping it in a
# Task -- driving `coro.__await__()` by hand from a `call_soon` callback -- so
# that TaskGroup.__aenter__ runs with no current task and has to report
# "cannot determine the parent task" rather than silently picking one up.
async def await_without_task(coro):
    exc = None
    def func():
        try:
            for _ in coro.__await__():
                pass
        except BaseException as err:
            nonlocal exc
            exc = err
    asyncio.get_running_loop().call_soon(func)
    await asyncio.sleep(0)
    if exc is not None:
        raise exc
