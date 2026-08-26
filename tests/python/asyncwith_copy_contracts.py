"""Two boundary contracts: async-with validates its pair up front, and the
lazy-call family refuses copy and pickle.

PREFLIGHT.  CPython's BEFORE_ASYNC_WITH loads BOTH halves of the
asynchronous context-manager protocol before calling either, naming a
missing __aexit__ first:

    TypeError: 'CM' object does not support the asynchronous context
    manager protocol (missed __aexit__ method)

so ``async with`` on a manager with an __aenter__ but no __aexit__ refuses
before __aenter__ runs, let alone the body (test_with_2 pins exactly that).
Grail discovered the gap lazily, at whichever call fell through to the
raising object default -- for that shape, AFTER the body had run.  The
probe (___definesProtocolMethod___:selectors:) also had to learn the
TRIPLE-underscore kwargs-forwarder selector a vararg ``def __aexit__(self,
*e)`` compiles to; without it the preflight refused half the REAL managers
in test_coroutines.

COPY.  copy.copy, copy.deepcopy and pickle funnel through
``__reduce_ex__``, and CPython refuses the whole family by type name:
``cannot pickle 'coroutine' object`` -- a generator IS its suspended state,
and no reduction can be honest about a forked GsProcess (test_copy).

Every expectation was checked against CPython 3.14 first.
"""

import copy
import pickle

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def drive_error(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return ('returned', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- the preflight

class _NoExit:
    def __aenter__(self):
        _RAN.append('aenter')


class _NoEnter:
    async def __aexit__(self, *e):
        return False


class _AsyncNoExit:
    async def __aenter__(self):
        _RAN.append('async aenter')


_RAN = []


async def _enters(cm):
    async with cm:
        _RAN.append('body')


check('missing_aexit_refuses_before_anything_runs',
      lambda: (drive_error(_enters(_NoExit())), list(_RAN)),
      (("TypeError: '_NoExit' object does not support the asynchronous "
        'context manager protocol (missed __aexit__ method)'), []))
check('missing_aexit_with_async_aenter_same_refusal',
      lambda: (drive_error(_enters(_AsyncNoExit())), list(_RAN)),
      (("TypeError: '_AsyncNoExit' object does not support the asynchronous "
        'context manager protocol (missed __aexit__ method)'), []))
check('missing_aenter_names_its_own_half',
      lambda: drive_error(_enters(_NoEnter())),
      ("TypeError: '_NoEnter' object does not support the asynchronous "
       'context manager protocol (missed __aenter__ method)'))


class _FixedArity:
    async def __aenter__(self):
        return 'in-fixed'

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _VarArity:
    async def __aenter__(self):
        return 'in-vararg'

    async def __aexit__(self, *e):
        return False


async def _uses(cm):
    async with cm as v:
        return v


check('fixed_arity_manager_still_works',
      lambda: drive_error(_uses(_FixedArity())), ('returned', 'in-fixed'))
check('vararg_manager_still_works',
      lambda: drive_error(_uses(_VarArity())), ('returned', 'in-vararg'))


# ------------------------------------------------- the copy refusals

async def _coro():
    return 1


def _gen():
    yield


async def _agen():
    yield


def _refusal(fn):
    try:
        fn()
        return '<no error>'
    except TypeError as exc:
        return str(exc)


def _with_closed(maker, op):
    obj = maker()
    try:
        return _refusal(lambda: op(obj))
    finally:
        obj.close()


check('copy_of_a_coroutine_refuses',
      lambda: _with_closed(_coro, copy.copy),
      "cannot pickle 'coroutine' object")
check('deepcopy_of_a_coroutine_refuses',
      lambda: _with_closed(_coro, copy.deepcopy),
      "cannot pickle 'coroutine' object")
check('pickle_of_a_coroutine_refuses',
      lambda: _with_closed(_coro, pickle.dumps),
      "cannot pickle 'coroutine' object")
check('copy_of_a_generator_refuses',
      lambda: _with_closed(_gen, copy.copy),
      "cannot pickle 'generator' object")
check('copy_of_an_async_generator_refuses',
      lambda: _refusal(lambda: copy.copy(_agen())),
      "cannot pickle 'async_generator' object")


def _copy_wrapper():
    c = _coro()
    aw = c.__await__()
    try:
        return _refusal(lambda: copy.copy(aw))
    finally:
        aw.close()


check('copy_of_the_coroutine_wrapper_refuses',
      _copy_wrapper, "cannot pickle 'coroutine_wrapper' object")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
