"""The identity a generator / coroutine / async generator carries.

CPython stamps three things on the object a def's call answers, at call time:
the def's name and qualified name (``__name__`` / ``__qualname__``, both
reassignable), and its code object (``gi_code`` / ``cr_code`` / ``ag_code``).
Around those sit the frame (``gi_frame`` -- None once the body finishes, a
frame object until then), the 3.12+ suspension flag (``gi_suspended``), the
repr (``<generator object QUALNAME at 0x...>`` -- the QUALIFIED name:
reassigning __name__ alone leaves the repr unchanged, measured on 3.14), the
type names (``generator`` / ``coroutine`` / ``async_generator``), and
inspect's four-state readers (getgeneratorstate / getcoroutinestate /
getasyncgenstate).

Grail had none of it: the objects answered ``<PythonCoroutine object at
0x...>``, carried no name, no code, no frame, and -- the quiet one --
``coro.cr_running`` answered an always-truthy BoundMethod because the accessor
was not listed as a value attribute.

The runtime MESSAGES move with the identity, because CPython words them per
kind: 'coroutine raised StopIteration', "can't send non-None value to a
just-started async generator" (the prose says 'async generator' with a space;
the TYPE is 'async_generator' with the underscore).

One Grail-honest asymmetry, asserted nowhere below: a plain Grail coroutine
never reports SUSPENDED -- with no event loop an await runs straight through,
so it goes CREATED -> RUNNING -> CLOSED.  The states below only walk paths
both interpreters share.

Every expectation was checked against CPython 3.14 first.
"""

import inspect
import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def raised_message(fn):
    try:
        fn()
        return '<did not raise>'
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


# The three kinds, defined at module level (Grail's method-form emission)...
def top_gen():
    x = yield 1
    return x


async def top_coro():
    return 5


async def top_agen():
    yield 7


# ...and one nested (Grail's closure-form emission), for the qualname chain.
def make_gen():
    def inner():
        yield 2
    return inner()


def _closed(c):
    """Close c and hand it back -- keeps CPython's 'never awaited' warning out
    of a fixture that creates coroutines only to look at them."""
    c.close()
    return c


# ------------------------------------------------- names, stamped and movable

check('gen_name_is_the_defs', lambda: top_gen().__name__, 'top_gen')
check('coro_name_is_the_defs', lambda: _closed(top_coro()).__name__, 'top_coro')
check('agen_name_is_the_defs', lambda: top_agen().__name__, 'top_agen')
check('nested_qualname_has_locals',
      lambda: '.<locals>.inner' in make_gen().__qualname__, True)


def _renamed():
    g = top_gen()
    g.__name__ = 'renamed'
    g.__qualname__ = 'requalified'
    return (g.__name__, g.__qualname__)


check('name_and_qualname_reassign', _renamed, ('renamed', 'requalified'))


# ------------------------------------------------- reprs: the qualified name

check('gen_repr_shape',
      lambda: repr(top_gen()).startswith('<generator object top_gen at 0x'),
      True)
check('coro_repr_shape',
      lambda: repr(_closed(top_coro())).startswith(
          '<coroutine object top_coro at 0x'),
      True)
check('agen_repr_shape',
      lambda: repr(top_agen()).startswith(
          '<async_generator object top_agen at 0x'),
      True)


def _repr_tracks_qualname_not_name():
    g = top_gen()
    g.__name__ = 'x'
    before = 'top_gen' in repr(g)
    g.__qualname__ = 'renamed_qual'
    after = 'renamed_qual' in repr(g)
    return (before, after)


check('repr_tracks_qualname_not_name',
      _repr_tracks_qualname_not_name, (True, True))


# ------------------------------------------------- type names

check('gen_type_name', lambda: type(top_gen()).__name__, 'generator')
check('coro_type_name', lambda: type(_closed(top_coro())).__name__, 'coroutine')
check('agen_type_name', lambda: type(top_agen()).__name__, 'async_generator')


# ------------------------------------------------- code objects

check('gen_code_is_real',
      lambda: isinstance(top_gen().gi_code, types.CodeType), True)
check('gen_code_names_the_def', lambda: top_gen().gi_code.co_name, 'top_gen')
check('gen_code_has_generator_flag',
      lambda: bool(top_gen().gi_code.co_flags & inspect.CO_GENERATOR), True)
check('coro_code_has_coroutine_flag',
      lambda: bool(_closed(top_coro()).cr_code.co_flags
                   & inspect.CO_COROUTINE), True)
check('coro_code_lacks_generator_flag',
      lambda: bool(_closed(top_coro()).cr_code.co_flags
                   & inspect.CO_GENERATOR), False)
check('agen_code_has_asyncgen_flag',
      lambda: bool(top_agen().ag_code.co_flags
                   & inspect.CO_ASYNC_GENERATOR), True)
check('nested_code_has_nested_flag',
      lambda: bool(make_gen().gi_code.co_flags & inspect.CO_NESTED), True)


# ------------------------------------------------- frames: None-flip on close

check('gen_frame_is_real_while_fresh',
      lambda: isinstance(top_gen().gi_frame, types.FrameType), True)
def _fresh_coro_frame_kind():
    c = top_coro()
    real = isinstance(c.cr_frame, types.FrameType)
    c.close()
    return real


check('coro_frame_is_real_while_fresh', _fresh_coro_frame_kind, True)
check('agen_frame_is_real_while_fresh',
      lambda: isinstance(top_agen().ag_frame, types.FrameType), True)
check('gen_frame_is_none_after_close',
      lambda: _closed(top_gen()).gi_frame, None)
check('coro_frame_is_none_after_close',
      lambda: _closed(top_coro()).cr_frame, None)


# ------------------------------------------------- states, walked

def _gen_state_walk():
    g = top_gen()
    walked = [inspect.getgeneratorstate(g)]
    next(g)
    walked.append(inspect.getgeneratorstate(g))
    walked.append(g.gi_suspended)
    walked.append(g.gi_running)
    g.close()
    walked.append(inspect.getgeneratorstate(g))
    return walked


check('gen_states_created_suspended_closed', _gen_state_walk,
      ['GEN_CREATED', 'GEN_SUSPENDED', True, False, 'GEN_CLOSED'])


def _coro_state_walk():
    c = top_coro()
    walked = [inspect.getcoroutinestate(c), c.cr_running, c.cr_await]
    try:
        c.send(None)
    except StopIteration as exc:
        walked.append(exc.value)
    walked.append(inspect.getcoroutinestate(c))
    return walked


check('coro_states_created_then_closed', _coro_state_walk,
      ['CORO_CREATED', False, None, 5, 'CORO_CLOSED'])


def _agen_state_walk():
    a = top_agen()
    walked = [inspect.getasyncgenstate(a), a.ag_await, a.ag_running]
    try:
        a.asend(None).send(None)
    except StopIteration as exc:
        walked.append(exc.value)
    walked.append(inspect.getasyncgenstate(a))
    try:
        a.aclose().send(None)
    except StopIteration:
        pass
    walked.append(inspect.getasyncgenstate(a))
    walked.append(a.ag_frame)
    return walked


check('agen_states_created_suspended_closed', _agen_state_walk,
      ['AGEN_CREATED', None, False, 7, 'AGEN_SUSPENDED', 'AGEN_CLOSED', None])


# ------------------------------------------------- the messages, per kind

def _just_started_send():
    c = top_coro()
    try:
        return raised_message(lambda: c.send('spam'))
    finally:
        c.close()


check('coro_just_started_send_message', _just_started_send,
      "TypeError: can't send non-None value to a just-started coroutine")
check('agen_just_started_send_message',
      lambda: raised_message(lambda: top_agen().asend('spam').send(None)),
      "TypeError: can't send non-None value to a just-started async generator")


async def _raises_stopiteration():
    raise StopIteration


check('coro_pep479_message',
      lambda: raised_message(lambda: _raises_stopiteration().send(None)),
      'RuntimeError: coroutine raised StopIteration')


async def _agen_raises_stopiteration():
    raise StopIteration
    yield


check('agen_pep479_message',
      lambda: raised_message(
          lambda: _agen_raises_stopiteration().asend(None).send(None)),
      'RuntimeError: async generator raised StopIteration')


def _reentrant_gen():
    def g():
        next(me)
        yield
    me = g()
    return raised_message(lambda: next(me))


check('gen_already_executing_message', _reentrant_gen,
      'ValueError: generator already executing')


def _reentrant_coro():
    async def c():
        me.send(None)
    me = c()
    return raised_message(lambda: me.send(None))


check('coro_already_executing_message', _reentrant_coro,
      'ValueError: coroutine already executing')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
