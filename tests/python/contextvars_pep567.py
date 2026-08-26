"""Fixture: contextvars (PEP 567) -- real contexts, not one global slot.

Grail's contextvars stored ONE value per ContextVar, on the ContextVar itself,
and its Context class had a ``run`` that simply called its argument.  That was
written for werkzeug.local, which uses ContextVar purely as proxy-storage
indirection in a single-gem process, and it was correct for exactly as long as
nothing needed two contexts at once.

asyncio needs two.  ``loop.create_task(coro, context=ctx)`` exists so a task
runs its steps inside a caller-supplied Context and its ContextVar writes land
THERE -- which is how unittest shares one context across setUp/test/tearDown,
and how a server keeps one request's state out of another's.  Under the stub
every write went to the same slot, so ``context=`` had nothing to select
between and asyncio did not plumb it at all: not through Task, not through
create_task, not through call_soon, and Runner.run documented the argument as
accepted-and-ignored.

The checks are grouped by what they would catch.  The mapping and Token ones
are ordinary conformance.  The three worth naming are:

  * ``a_task_gets_a_copy_not_the_original`` -- the stub's real failure.  Writes
    from inside a task were visible to its creator afterwards, because there
    was only ever one place to write.
  * ``a_context_cannot_be_entered_twice`` -- Context.run saves the previous
    context in the Context object, so a re-entry would overwrite that save and
    the inner exit would restore the WRONG context.  The corruption surfaces
    arbitrarily far from the offending call, so it has to be refused at it.
  * ``a_callback_sees_its_schedulers_context`` -- Handle captures the context
    at call_soon time, not at run time.  Capturing at run time would give the
    callback whatever happened to be current several loop turns later.
"""

import asyncio
import contextvars


# ------------------------------------------------------------ get / set / reset

def an_unset_var_with_no_default_raises_lookuperror():
    v = contextvars.ContextVar('unset_no_default')
    try:
        v.get()
    except LookupError:
        return True
    return False


def a_constructor_default_is_returned_when_unset():
    v = contextvars.ContextVar('has_default', default='fallback')
    return v.get() == 'fallback'


def an_argument_default_beats_the_constructor_default():
    """A caller saying "or this" means this call, not this variable."""
    v = contextvars.ContextVar('both_defaults', default='ctor')
    return v.get('arg') == 'arg'


def a_set_value_beats_every_default():
    v = contextvars.ContextVar('set_wins', default='ctor')
    v.set('actual')
    return v.get('arg') == 'actual'


def none_is_a_real_value_not_an_absence():
    """The sentinel for "unset" must be distinct from None."""
    v = contextvars.ContextVar('none_valued', default='ctor')
    v.set(None)
    return v.get('arg') is None


def reset_restores_the_previous_value():
    v = contextvars.ContextVar('resettable')
    v.set('first')
    tok = v.set('second')
    v.reset(tok)
    return v.get() == 'first'


def reset_of_a_first_set_removes_the_variable():
    """Token.MISSING is why reset can remove rather than only overwrite."""
    v = contextvars.ContextVar('removable')
    tok = v.set('only')
    if tok.old_value is not contextvars.Token.MISSING:
        return 'old_value was not MISSING'
    v.reset(tok)
    try:
        v.get()
    except LookupError:
        return True
    return 'variable survived the reset'


def a_token_is_single_use():
    v = contextvars.ContextVar('single_use')
    tok = v.set('x')
    v.reset(tok)
    try:
        v.reset(tok)
    except RuntimeError:
        return True
    return False


def a_token_belongs_to_one_var():
    a = contextvars.ContextVar('tok_a')
    b = contextvars.ContextVar('tok_b')
    tok = a.set(1)
    try:
        b.reset(tok)
    except ValueError:
        return True
    return False


def a_token_belongs_to_one_context():
    v = contextvars.ContextVar('tok_ctx')
    holder = {}

    def grab():
        holder['tok'] = v.set('inner')

    contextvars.copy_context().run(grab)
    try:
        v.reset(holder['tok'])
    except ValueError:
        return True
    return False


# --------------------------------------------------------- Context as a mapping

def a_context_reports_what_was_set_in_it():
    v = contextvars.ContextVar('mapped')

    def write():
        v.set('written')

    ctx = contextvars.copy_context()
    ctx.run(write)
    return (ctx.get(v) == 'written'
            and ctx[v] == 'written'
            and v in ctx
            and len(ctx) >= 1
            and v in list(ctx)
            and v in ctx.keys()
            and 'written' in ctx.values()
            and (v, 'written') in ctx.items())


def a_context_get_of_an_absent_var_is_none():
    """test_taskgroups' first assertion is exactly this."""
    v = contextvars.ContextVar('absent')
    return contextvars.copy_context().get(v) is None


def a_context_getitem_of_an_absent_var_raises_keyerror():
    v = contextvars.ContextVar('absent_item')
    try:
        contextvars.copy_context()[v]
    except KeyError:
        return True
    return False


# --------------------------------------------------------------- Context.run

def run_makes_the_context_current_and_then_restores_it():
    v = contextvars.ContextVar('scoped')
    v.set('outer')
    seen = {}

    def inner():
        seen['before'] = v.get()
        v.set('inner')
        seen['after'] = v.get()

    contextvars.copy_context().run(inner)
    return (seen['before'] == 'outer'
            and seen['after'] == 'inner'
            and v.get() == 'outer')


def a_context_cannot_be_entered_twice():
    ctx = contextvars.copy_context()
    out = {}

    def reenter():
        try:
            ctx.run(lambda: None)
        except RuntimeError:
            out['refused'] = True

    ctx.run(reenter)
    return out.get('refused') is True


def a_context_is_reusable_after_it_exits():
    """Refusing re-ENTRY must not mean refusing a second, sequential entry."""
    v = contextvars.ContextVar('reusable')
    ctx = contextvars.copy_context()
    ctx.run(lambda: v.set(1))
    ctx.run(lambda: v.set(v.get() + 1))
    return ctx.get(v) == 2


def run_restores_the_context_even_when_the_callable_raises():
    v = contextvars.ContextVar('raiser')
    v.set('outer')

    def boom():
        v.set('inner')
        raise ValueError('boom')

    try:
        contextvars.copy_context().run(boom)
    except ValueError:
        pass
    return v.get() == 'outer'


def copy_context_snapshots_values_and_then_diverges():
    v = contextvars.ContextVar('snapshot')
    v.set('original')
    ctx = contextvars.copy_context()
    ctx.run(lambda: v.set('changed'))
    return v.get() == 'original' and ctx.get(v) == 'changed'


# --------------------------------------------------------------- with asyncio

def a_task_gets_a_copy_not_the_original():
    """The stub's actual failure: a task's writes came back to its creator."""
    v = contextvars.ContextVar('task_local')

    async def child():
        v.set('child')

    async def main():
        v.set('parent')
        await asyncio.create_task(child())
        return v.get()

    return asyncio.run(main()) == 'parent'


def a_task_can_read_what_its_creator_set():
    v = contextvars.ContextVar('inherited')
    out = {}

    async def child():
        out['seen'] = v.get()

    async def main():
        v.set('from parent')
        await asyncio.create_task(child())

    asyncio.run(main())
    return out.get('seen') == 'from parent'


def an_explicit_context_collects_writes_from_several_tasks():
    """test_taskgroup_task_context, reduced: the writes must land in ``ctx``
    and be readable from OUTSIDE the tasks, across two awaits."""
    v = contextvars.ContextVar('shared')
    out = {}

    async def coro(val):
        await asyncio.sleep(0)
        v.set(val)

    async def main():
        async with asyncio.TaskGroup() as g:
            ctx = contextvars.copy_context()
            out['before'] = ctx.get(v)
            await g.create_task(coro(1), context=ctx)
            out['after_first'] = ctx.get(v)
            await g.create_task(coro(2), context=ctx)
            out['after_second'] = ctx.get(v)

    asyncio.run(main())
    return out == {'before': None, 'after_first': 1, 'after_second': 2}


def a_context_survives_a_suspension_mid_task():
    """A task enters its context per STEP, so a write before an await must
    still be visible after it -- the context is re-entered, not rebuilt."""
    v = contextvars.ContextVar('across_await')
    out = {}

    async def body():
        v.set('before')
        await asyncio.sleep(0)
        out['after'] = v.get()

    asyncio.run(body())
    return out.get('after') == 'before'


def a_callback_sees_its_schedulers_context():
    """Handle captures the context at call_soon time, not at run time."""
    v = contextvars.ContextVar('callback_ctx')
    out = {}

    def cb():
        out['seen'] = v.get(None)

    async def main():
        v.set('at schedule time')
        asyncio.get_running_loop().call_soon(cb)
        v.set('at run time')
        await asyncio.sleep(0)
        await asyncio.sleep(0)

    asyncio.run(main())
    return out.get('seen') == 'at schedule time'


def get_context_answers_the_tasks_own_context():
    v = contextvars.ContextVar('own_context')
    out = {}

    async def body():
        v.set('mine')

    async def main():
        t = asyncio.create_task(body())
        await t
        out['from_task'] = t.get_context().get(v)

    asyncio.run(main())
    return out.get('from_task') == 'mine'


CHECKS = (
    an_unset_var_with_no_default_raises_lookuperror,
    a_constructor_default_is_returned_when_unset,
    an_argument_default_beats_the_constructor_default,
    a_set_value_beats_every_default,
    none_is_a_real_value_not_an_absence,
    reset_restores_the_previous_value,
    reset_of_a_first_set_removes_the_variable,
    a_token_is_single_use,
    a_token_belongs_to_one_var,
    a_token_belongs_to_one_context,
    a_context_reports_what_was_set_in_it,
    a_context_get_of_an_absent_var_is_none,
    a_context_getitem_of_an_absent_var_raises_keyerror,
    run_makes_the_context_current_and_then_restores_it,
    a_context_cannot_be_entered_twice,
    a_context_is_reusable_after_it_exits,
    run_restores_the_context_even_when_the_callable_raises,
    copy_context_snapshots_values_and_then_diverges,
    a_task_gets_a_copy_not_the_original,
    a_task_can_read_what_its_creator_set,
    an_explicit_context_collects_writes_from_several_tasks,
    a_context_survives_a_suspension_mid_task,
    a_callback_sees_its_schedulers_context,
    get_context_answers_the_tasks_own_context,
)

# Run at IMPORT, so the Smalltalk side reads results rather than driving each
# call across the boundary -- same shape as asyncio_timeout.py.
r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
