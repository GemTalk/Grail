"""A `with` whose __exit__ RAISES must call __exit__ exactly once.

Grail emitted the clean-path ``mgr.__exit__(None, None, None)`` as the last
expression INSIDE the try whose ``except BaseException`` handler calls __exit__
again with the exception details.  So a manager whose __exit__ raised had
__exit__ invoked a SECOND time, handed its own exception as the excinfo triple.

CPython puts that call in the ``else`` of the try, which no ``except`` covers,
so the raise propagates and that is the end of it.  WithAst's own docstring had
described the else-shape all along.

Found by vendoring asyncio.TaskGroup: its __aexit__ raises BaseExceptionGroup on
the NORMAL path, so it re-entered itself, and by then its ``finally`` had
cleared _parent_task -- surfacing as ``'NoneType' object has no attribute
'uncancel'``, which points nowhere near the with-statement.

Plain ``with`` had it identically -- nothing async about the bug -- so both are
checked, along with the paths the fix could plausibly have broken: suppression
(a truthy __exit__ swallowing the body's exception must NOT then get a clean
call) and return/break/continue out of the body (which DO get the clean call).
"""

import asyncio


class Recorder:
    """Records the excinfo type of every __exit__ call it receives."""

    def __init__(self, raise_on_exit=False, suppress=False):
        self.calls = []
        self.raise_on_exit = raise_on_exit
        self.suppress = suppress

    def _exit(self, et):
        self.calls.append(et.__name__ if et is not None else None)
        if self.raise_on_exit:
            raise RuntimeError('from-exit')
        return self.suppress

    def __enter__(self):
        return self

    def __exit__(self, et, exc, tb):
        return self._exit(et)

    async def __aenter__(self):
        return self

    async def __aexit__(self, et, exc, tb):
        return self._exit(et)


# --- the bug, in both flavours ---------------------------------------------

def a_raising_exit_is_called_once():
    m = Recorder(raise_on_exit=True)
    try:
        with m:
            pass
    except RuntimeError:
        pass
    return m.calls == [None]


def a_raising_aexit_is_called_once():
    async def go():
        m = Recorder(raise_on_exit=True)
        try:
            async with m:
                pass
        except RuntimeError:
            pass
        return m.calls
    return asyncio.run(go()) == [None]


def the_raise_from_exit_propagates():
    """Not swallowed by the statement's own handler on the way out."""
    m = Recorder(raise_on_exit=True)
    try:
        with m:
            pass
    except RuntimeError as e:
        return str(e) == 'from-exit'
    return False


# --- the paths the fix must not have broken --------------------------------

def a_body_exception_still_reaches_exit():
    m = Recorder()
    try:
        with m:
            raise ValueError('boom')
    except ValueError:
        pass
    return m.calls == ['ValueError']


def a_suppressing_exit_is_not_called_again():
    """A truthy __exit__ swallows the body's exception -- and must not then be
    handed a clean call as though the body had completed."""
    m = Recorder(suppress=True)
    with m:
        raise ValueError('boom')
    return m.calls == ['ValueError']


def a_clean_body_gets_the_none_triple():
    m = Recorder()
    with m:
        pass
    return m.calls == [None]


def a_return_out_of_the_body_gets_the_none_triple():
    m = Recorder()

    def f():
        with m:
            return 'returned'

    return (f(), m.calls) == ('returned', [None])


def a_break_out_of_the_body_gets_the_none_triple():
    m = Recorder()
    for _ in range(3):
        with m:
            break
    return m.calls == [None]


def a_continue_out_of_the_body_gets_the_none_triple():
    m = Recorder()
    for _ in range(3):
        with m:
            continue
    return m.calls == [None, None, None]


def nested_managers_each_get_one_call():
    """``with A, B:`` -- the inner statement is the outer one's body, so the
    guard the fix introduced has to nest correctly."""
    outer = Recorder()
    inner = Recorder()
    with outer, inner:
        pass
    return (outer.calls, inner.calls) == ([None], [None])


def an_inner_raising_exit_reaches_the_outer_manager():
    """The inner __exit__ raises on its CLEAN path; that raise is now outside
    the inner statement's protection, so the OUTER manager sees it as a body
    exception."""
    outer = Recorder()
    inner = Recorder(raise_on_exit=True)
    try:
        with outer, inner:
            pass
    except RuntimeError:
        pass
    return (outer.calls, inner.calls) == (['RuntimeError'], [None])


CHECKS = (
    a_raising_exit_is_called_once,
    a_raising_aexit_is_called_once,
    the_raise_from_exit_propagates,
    a_body_exception_still_reaches_exit,
    a_suppressing_exit_is_not_called_again,
    a_clean_body_gets_the_none_triple,
    a_return_out_of_the_body_gets_the_none_triple,
    a_break_out_of_the_body_gets_the_none_triple,
    a_continue_out_of_the_body_gets_the_none_triple,
    nested_managers_each_get_one_call,
    an_inner_raising_exit_reaches_the_outer_manager,
)

r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
