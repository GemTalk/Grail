"""Fixture: eager task start, and the task factory that was never consulted.

``loop.set_task_factory(asyncio.eager_task_factory)`` makes every task created
on that loop run its body IMMEDIATELY, up to its first suspension, instead of
being queued for the loop's next turn.  test_taskgroups' TestEagerTaskTaskGroup
re-runs the whole TaskGroup suite that way.

Three separate things had to be true and only the first is about eagerness:

  * ``Task(eager_start=True)`` has to drive the first step inline.
  * ``loop.create_task`` has to CONSULT ``_task_factory``.  Grail stored it and
    never read it, so ``set_task_factory`` was a silent no-op -- the failure
    mode where nothing raises and every eager assertion quietly measures lazy
    tasks.
  * the module-level ``asyncio.create_task`` has to go THROUGH the loop rather
    than construct a Task, or the factory applies to some spellings and not
    others.

The current-task check below is the one that fails on a plausible-looking
implementation.  Eager start runs inside the CREATOR's step, so the slot naming
the running task is already occupied; ``_step`` sets it and then deletes it on
the way out, which is right when the loop drove the step and wrong when it was
nested -- it leaves the creator with no current task for the rest of its own
body.  ``current_task()`` then answers None inside an ordinary coroutine.
"""

import asyncio


def eager_body_runs_before_create_task_returns():
    """The defining behaviour: no loop turn between create and first suspend."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)
        trace = []

        async def body():
            trace.append('ran')
            await asyncio.sleep(0)
            trace.append('resumed')

        task = loop.create_task(body())
        started_immediately = trace == ['ran']
        await task
        return started_immediately and trace == ['ran', 'resumed']
    return asyncio.run(main())


def a_lazy_task_has_not_started_when_created():
    """The contrast, so the check above is measuring eagerness and not luck."""
    async def main():
        loop = asyncio.get_running_loop()
        trace = []

        async def body():
            trace.append('ran')

        task = loop.create_task(body())
        not_yet = trace == []
        await task
        return not_yet and trace == ['ran']
    return asyncio.run(main())


def the_factory_is_actually_consulted():
    """set_task_factory must not be a no-op; a custom factory must be called."""
    async def main():
        loop = asyncio.get_running_loop()
        seen = []

        def factory(loop, coro, **kwargs):
            seen.append('called')
            return asyncio.Task(coro, loop=loop, **kwargs)

        loop.set_task_factory(factory)
        async def body():
            return 1
        task = loop.create_task(body())
        await task
        return seen == ['called'] and loop.get_task_factory() is factory
    return asyncio.run(main())


def module_level_create_task_uses_the_factory_too():
    """asyncio.create_task must route through the loop, not around it."""
    async def main():
        loop = asyncio.get_running_loop()
        seen = []

        def factory(loop, coro, **kwargs):
            seen.append('called')
            return asyncio.Task(coro, loop=loop, **kwargs)

        loop.set_task_factory(factory)
        async def body():
            return 1
        await asyncio.create_task(body())
        return seen == ['called']
    return asyncio.run(main())


def eager_start_leaves_the_creator_as_current_task():
    """The nesting check: the creator is still current after an eager start."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)
        me = asyncio.current_task()

        async def body():
            await asyncio.sleep(0)

        task = loop.create_task(body())
        still_me = asyncio.current_task() is me
        await task
        return still_me and me is not None
    return asyncio.run(main())


def an_eager_task_sees_itself_as_current():
    """During its inline first step the new task is the current one."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)
        seen = []

        async def body():
            seen.append(asyncio.current_task())
            await asyncio.sleep(0)

        task = loop.create_task(body())
        await task
        return seen == [task]
    return asyncio.run(main())


def an_eager_task_that_never_suspends_is_already_done():
    """No suspension means the whole body ran inside create_task."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)

        async def body():
            return 42

        task = loop.create_task(body())
        done_at_once = task.done()
        return done_at_once and await task == 42
    return asyncio.run(main())


def eager_tasks_keep_their_name():
    """name reaches the constructor, not a set_name after the body ran."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)
        seen = []

        async def body():
            seen.append(asyncio.current_task().get_name())

        task = loop.create_task(body(), name='eagerly')
        await task
        return seen == ['eagerly'] and task.get_name() == 'eagerly'
    return asyncio.run(main())


def create_eager_task_factory_accepts_a_subclass():
    """The public builder, used with a Task subclass as documented."""
    async def main():
        class MyTask(asyncio.Task):
            pass

        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.create_eager_task_factory(MyTask))
        trace = []

        async def body():
            trace.append('ran')

        task = loop.create_task(body())
        started = trace == ['ran']
        await task
        return started and isinstance(task, MyTask)
    return asyncio.run(main())


def taskgroup_children_are_eager_too():
    """What test_taskgroups' TestEagerTaskTaskGroup is actually exercising."""
    async def main():
        loop = asyncio.get_running_loop()
        loop.set_task_factory(asyncio.eager_task_factory)
        trace = []

        async def body():
            trace.append('ran')
            await asyncio.sleep(0)

        async with asyncio.TaskGroup() as tg:
            tg.create_task(body())
            started_before_the_group_exited = trace == ['ran']
        return started_before_the_group_exited and trace == ['ran']
    return asyncio.run(main())


def the_public_names_are_exported():
    return (asyncio.eager_task_factory is asyncio.tasks.eager_task_factory
            and asyncio.create_eager_task_factory
                is asyncio.tasks.create_eager_task_factory)


CHECKS = (
    eager_body_runs_before_create_task_returns,
    a_lazy_task_has_not_started_when_created,
    the_factory_is_actually_consulted,
    module_level_create_task_uses_the_factory_too,
    eager_start_leaves_the_creator_as_current_task,
    an_eager_task_sees_itself_as_current,
    an_eager_task_that_never_suspends_is_already_done,
    eager_tasks_keep_their_name,
    create_eager_task_factory_accepts_a_subclass,
    taskgroup_children_are_eager_too,
    the_public_names_are_exported,
)

r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
