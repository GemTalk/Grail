"""compile(flags=PyCF_ALLOW_TOP_LEVEL_AWAIT): the coroutine flag, and running it.

A module body that awaits is not compilable at all under the ordinary rules --
``await`` outside a function is a SyntaxError -- so CPython gates it behind
PyCF_ALLOW_TOP_LEVEL_AWAIT and marks the result CO_COROUTINE.  The flag is an
instruction to the caller: such a code object must be AWAITED, through
``eval(co, g)`` or a FunctionType built from it, and exec()ing it would be
wrong.  This pins both halves -- which shapes set the bit, and that the two
documented ways of running the result both bind the body's assignments into
the globals that were supplied.

The coroutines are driven by hand rather than by asyncio: send(None) until
StopIteration is the whole of what an event loop does to a coroutine that only
ever yields None, and it keeps the fixture free of the event-loop machinery.
"""

import ast

r = {}

CO_COROUTINE = 0x80
F = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT


class _Yielder:
    """An awaitable that yields once -- the smallest thing that suspends."""

    def __await__(self):
        yield None


async def sleep(delay, result=None):
    await _Yielder()
    return result


async def arange(n):
    for i in range(n):
        yield i


class Lock:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        pass


def drive(make_coro):
    """Run a coroutine to completion, discarding what it yields."""
    coro = make_coro()
    kind = type(coro).__name__
    try:
        while True:
            try:
                coro.send(None)
            except StopIteration:
                return kind
    finally:
        coro.close()


def flag_of(source, mode='exec', optimize=-1):
    co = compile(source, '?', mode, flags=F, optimize=optimize)
    return bool(co.co_flags & CO_COROUTINE)


def refused_without_flag(source, mode='exec'):
    try:
        compile(source, '?', mode)
    except SyntaxError:
        return True
    return False


def refused_with_flag(source, mode='exec'):
    try:
        compile(source, '?', mode, flags=F)
    except SyntaxError:
        return True
    return False


def run_via_eval(source, mode='exec', optimize=-1):
    co = compile(source, '?', mode, flags=F, optimize=optimize)
    g = {'Lock': Lock, 'a': 0, 'arange': arange, 'sleep': sleep}
    drive(lambda: eval(co, g))
    return g['a']


def run_via_function_type(source, mode='exec', optimize=-1):
    from types import FunctionType
    co = compile(source, '?', mode, flags=F, optimize=optimize)
    g = {'Lock': Lock, 'a': 0, 'arange': arange, 'sleep': sleep}
    drive(FunctionType(co, g))
    return g['a']


# --- the bit itself ----------------------------------------------------------

r['await_sets_bit'] = flag_of('a = await sleep(0, result=1)')
r['async_for_sets_bit'] = flag_of('async for i in arange(1):\n    a = 1')
r['async_with_sets_bit'] = flag_of('async with Lock() as l:\n    a = 1')
r['async_listcomp_sets_bit'] = flag_of('a = [x async for x in arange(2)][1]')
r['async_setcomp_sets_bit'] = flag_of('a = 1 in {x async for x in arange(2)}')
r['async_dictcomp_sets_bit'] = flag_of('a = {x:1 async for x in arange(1)}[0]')
r['nested_async_comp_sets_bit'] = flag_of(
    'a = [x async for x in (x async for x in arange(5))][1]')

# ...and what must NOT set it: an async def whose awaits are all inside it is
# an ordinary module, and a plain comprehension contains nothing async.
r['plain_def_clear'] = flag_of('def f():pass\n')
r['async_def_clear'] = flag_of('async def f():\n    await g()\n')
r['listcomp_clear'] = flag_of('[x for x in l]')
r['setcomp_clear'] = flag_of('{x for x in l}')
r['genexp_clear'] = flag_of('(x for x in l)')
r['dictcomp_clear'] = flag_of('{x:x for x in l}')
r['single_mode_sets_bit'] = flag_of('a = await sleep(0, result=1)', 'single')

# --- the gate ----------------------------------------------------------------

r['refused_without_flag'] = refused_without_flag('a = await sleep(0, result=1)')
r['async_for_refused_without_flag'] = refused_without_flag(
    'async for i in arange(1):\n    a = 1')
# The flag relaxes MODULE scope only: a plain def is still a synchronous scope
# and awaiting in one is still a SyntaxError, flag or no flag.
r['await_in_def_still_refused'] = refused_with_flag('def f():  await arange(10)\n')
r['async_for_in_def_still_refused'] = refused_with_flag(
    'def f():\n    async for i in arange(1):\n        a = 1\n')
r['async_comp_in_def_still_refused'] = refused_with_flag(
    'def f():  [x async for x in arange(10)]\n')

# --- running the result ------------------------------------------------------

r['eval_answers_coroutine'] = drive(
    lambda: eval(compile('a = await sleep(0, result=1)', '?', 'exec', flags=F),
                 {'sleep': sleep, 'a': 0}))
r['eval_binds_await'] = run_via_eval('a = await sleep(0, result=1)')
r['eval_binds_async_for'] = run_via_eval('async for i in arange(1):\n    a = 1')
r['eval_binds_async_with'] = run_via_eval('async with Lock() as l:\n    a = 1')
r['eval_binds_async_comp'] = run_via_eval('a = [x async for x in arange(2)][1]')
r['eval_binds_awaiting_comp'] = run_via_eval(
    'a = [await sleep(0, x) async for x in arange(2)][1]')
r['eval_binds_single_mode'] = run_via_eval('a = await sleep(0, result=1)', 'single')
# gh-121637: under -OO the assert is optimized away, and the bit must still be
# set and the rest of the body must still run.
r['eval_binds_optimized_assert'] = run_via_eval(
    'assert not await sleep(0); a = 1', 'exec', 2)
r['optimized_assert_keeps_bit'] = flag_of(
    'assert not await sleep(0); a = 1', 'exec', 2)

r['functiontype_binds_await'] = run_via_function_type('a = await sleep(0, result=1)')
r['functiontype_binds_async_with'] = run_via_function_type(
    'async with Lock() as l:\n    a = 1')

# eval() must not leave the machinery it used behind in the caller's globals.
_g = {'sleep': sleep, 'a': 0}
drive(lambda: eval(compile('a = await sleep(0, result=1)', '?', 'exec', flags=F), _g))
r['eval_leaves_no_wrapper'] = sorted(k for k in _g if 'grail' in k.lower())

# FunctionType refuses what CPython refuses.
def _type_error(*args):
    from types import FunctionType
    try:
        FunctionType(*args)
    except TypeError:
        return True
    return False

r['functiontype_needs_two_args'] = _type_error()
r['functiontype_needs_code'] = _type_error(1, {})

EXPECTED = {
    'await_sets_bit': True,
    'async_for_sets_bit': True,
    'async_with_sets_bit': True,
    'async_listcomp_sets_bit': True,
    'async_setcomp_sets_bit': True,
    'async_dictcomp_sets_bit': True,
    'nested_async_comp_sets_bit': True,
    'plain_def_clear': False,
    'async_def_clear': False,
    'listcomp_clear': False,
    'setcomp_clear': False,
    'genexp_clear': False,
    'dictcomp_clear': False,
    'single_mode_sets_bit': True,
    'refused_without_flag': True,
    'async_for_refused_without_flag': True,
    'await_in_def_still_refused': True,
    'async_for_in_def_still_refused': True,
    'async_comp_in_def_still_refused': True,
    'eval_answers_coroutine': 'coroutine',
    'eval_binds_await': 1,
    'eval_binds_async_for': 1,
    'eval_binds_async_with': 1,
    'eval_binds_async_comp': 1,
    'eval_binds_awaiting_comp': 1,
    'eval_binds_single_mode': 1,
    'eval_binds_optimized_assert': 1,
    'optimized_assert_keeps_bit': True,
    'functiontype_binds_await': 1,
    'functiontype_binds_async_with': 1,
    'eval_leaves_no_wrapper': [],
    'functiontype_needs_two_args': True,
    'functiontype_needs_code': True,
}

_disagreeing = sorted(k for k, v in EXPECTED.items() if r.get(k) != v)

SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(_disagreeing), _disagreeing,
    sorted(r) == sorted(EXPECTED))

if __name__ == '__main__':
    for key in EXPECTED:
        got = r.get(key)
        want = EXPECTED[key]
        print('%-36s %-10s got=%r want=%r' % (
            key, 'OK' if got == want else 'FAIL', got, want))
    print(SUMMARY)
