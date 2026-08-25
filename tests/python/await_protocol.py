"""``await`` enforces CPython's GET_AWAITABLE protocol.

Three clauses, in CPython's order (measured on 3.14):

* a coroutine (or generator-shaped operand -- Grail's documented leniency for
  @types.coroutine, whose decorator is an identity here) is delegated to;
* anything with ``__await__`` has it called, and the RESULT is validated: a
  coroutine is 'TypeError: __await__() returned a coroutine', a non-iterator
  is "TypeError: __await__() returned non-iterator of type 'X'", an iterator
  is driven;
* everything else is "TypeError: 'X' object can't be awaited".

Grail used to pass clause three through UNCHANGED -- ``await 3`` evaluated to
3 -- for a recorded reason: shipped library code (jinja2, asgiref, flask)
awaited values Grail resolved synchronously, back when the inspect predicates
were stubs and library guards took the wrong branches.  The predicates are
honest now, the guards work, and the canaries (Flask / asgi SUnit suites, the
full curated corpus) run clean with the strict protocol -- measured before
this fixture was written, in the same spirit as unstubbing the predicates.

``async with`` has its own wording for the same rejection, naming the method
whose RESULT was not awaitable: "'async with' received an object from
__aenter__ that does not implement __await__: int" -- and __aexit__
correspondingly, in which case the body has ALREADY run.

The one deliberate Grail divergence, asserted nowhere below: a PLAIN
undecorated generator is still accepted where CPython raises "'generator'
object can't be awaited" -- types.coroutine is an identity decorator here, so
the decorated and undecorated cases are indistinguishable, and rejecting both
would break every legitimate @types.coroutine user.

Every other expectation below was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def driven_error(coro):
    """Drive coro; report 'Type: message' of what escapes, or the return."""
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return ('returned', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def _await(x):
    return await x


# ------------------------------------------------- clause 3: not awaitable

check('await_int_is_typeerror',
      lambda: driven_error(_await(1)),
      "TypeError: 'int' object can't be awaited")
check('await_list_is_typeerror',
      lambda: driven_error(_await([])),
      "TypeError: 'list' object can't be awaited")
check('await_none_is_typeerror',
      lambda: driven_error(_await(None)),
      "TypeError: 'NoneType' object can't be awaited")


class _Inert:
    pass


check('await_plain_instance_is_typeerror',
      lambda: driven_error(_await(_Inert())),
      "TypeError: '_Inert' object can't be awaited")


# ------------------------------------------------- clause 2: __await__ results

class _AwaitNone:
    def __await__(self):
        return None


class _AwaitList:
    def __await__(self):
        return [1, 2]


class _AwaitCoro:
    def __await__(self):
        self._c = _returns_five()   # kept so the check can close it
        return self._c


class _AwaitIter:
    def __await__(self):
        return iter([])


async def _returns_five():
    return 5


check('await_dunder_returning_none_is_typeerror',
      lambda: driven_error(_await(_AwaitNone())),
      "TypeError: __await__() returned non-iterator of type 'NoneType'")
check('await_dunder_returning_list_is_typeerror',
      lambda: driven_error(_await(_AwaitList())),
      "TypeError: __await__() returned non-iterator of type 'list'")
def _rejected_coroutine_result():
    cm = _AwaitCoro()
    try:
        return driven_error(_await(cm))
    finally:
        cm._c.close()


check('await_dunder_returning_coroutine_is_typeerror',
      _rejected_coroutine_result,
      'TypeError: __await__() returned a coroutine')
check('await_dunder_returning_iterator_is_driven',
      lambda: driven_error(_await(_AwaitIter())),
      ('returned', None))


class _Sleeper:
    """The event-loop handshake: __await__ yields, the driver sees the yield."""

    def __await__(self):
        got = yield 'parked'
        return got


def _suspends_and_resumes():
    c = _await(_Sleeper())
    first = c.send(None)
    try:
        c.send('woken')
        return '<no stop>'
    except StopIteration as exc:
        return (first, exc.value)


check('awaitable_suspension_still_propagates',
      _suspends_and_resumes, ('parked', 'woken'))


# ------------------------------------------------- what must keep working

check('await_coroutine_still_works',
      lambda: driven_error(_await(_returns_five())),
      ('returned', 5))


@types.coroutine
def _decorated():
    return 7
    yield


check('await_types_coroutine_generator_still_works',
      lambda: driven_error(_await(_decorated())),
      ('returned', 7))


# ------------------------------------------------- async with names its method

class _SyncEnter:
    def __aenter__(self):
        return 123

    def __aexit__(self, *e):
        return 456


async def _enters(cm):
    async with cm:
        return 'entered'


check('async_with_sync_aenter_is_typeerror',
      lambda: driven_error(_enters(_SyncEnter())),
      "TypeError: 'async with' received an object from __aenter__ "
      'that does not implement __await__: int')


class _SyncExit:
    ran = None

    async def __aenter__(self):
        return self

    def __aexit__(self, *e):
        return 456


async def _enters_and_marks(cm):
    async with cm:
        _SyncExit.ran = 'body ran'


def _sync_aexit():
    err = driven_error(_enters_and_marks(_SyncExit()))
    return (err, _SyncExit.ran)


check('async_with_sync_aexit_is_typeerror_after_body',
      _sync_aexit,
      ("TypeError: 'async with' received an object from __aexit__ "
       'that does not implement __await__: int', 'body ran'))


class _AsyncCM:
    async def __aenter__(self):
        return 'inside'

    async def __aexit__(self, *e):
        return False


async def _uses(cm):
    async with cm as v:
        return v


check('async_with_real_manager_still_works',
      lambda: driven_error(_uses(_AsyncCM())),
      ('returned', 'inside'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
