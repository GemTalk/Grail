"""durable -- durable execution on GemStone continuations (a spike).

A durable workflow is an ordinary Python function whose progress survives
the process running it.  Temporal, DBOS and Restate get that by journaling
each step and RE-EXECUTING the function on recovery, which is why they
forbid non-determinism inside it.  GemStone can commit a copy of the
running stack (``GsProcess continuationFromLevel:``) and resume it in
another gem, so Grail does not replay anything: ``checkpoint()`` commits
the live frames, and recovery continues from them, locals and all.

    import durable

    def fulfil(order):
        reserve(order)                 # side effects on persistent objects
        durable.checkpoint()           # commit the stack; recover from here
        charge(order)
        durable.sleep(hours=24)        # park; a free gem picks it up later
        if durable.recv('cancel', timeout=hours(48)) is None:
            ship(order)
        return 'done'

    h = durable.start(fulfil, order)   # a persistent Run, status 'pending'
    durable.run_executor()             # in any gem(s): runs what is runnable
    h.result()                         # from any session

Everything -- the run, its arguments, its inbox, its continuation -- lives
under ``gemdb.root['durable']`` and commits with the application's own
objects, so a step's writes and its checkpoint are one transaction.

Spike limits, deliberately: one workflow at a time per executor gem; no
heartbeat, so a step longer than ``LEASE_SECONDS`` looks crashed; no
audit of non-committable state on the stack beyond the commit's own
refusal; conflicts abort rather than retry.
"""

import time
import _thread

import gemstone
import gemdb

LEASE_SECONDS = 30.0

__all__ = ['start', 'checkpoint', 'sleep', 'recv', 'send', 'run_executor',
           'runs', 'Handle', 'Run', 'WorkflowFailed', 'CheckpointError',
           'LEASE_SECONDS']


class WorkflowFailed(Exception):
    """``Handle.result()`` for a run whose function raised."""


class CheckpointError(Exception):
    """The stack could not be committed -- something reachable from it is
    session-bound (a generator, an open file, a lock).  The message names
    the object GemStone refused."""


class Parked(BaseException):
    """Unwinds the worker process after ``sleep``/``recv`` committed the
    continuation.  BaseException so a workflow's ``except Exception`` does
    not swallow it."""


class _Wake:
    """What a parked continuation is resumed with; ``reason`` is one of
    'timer', 'message', 'timeout', 'recover'."""

    def __init__(self, reason):
        self.reason = reason

    def __repr__(self):
        return '_Wake(%r)' % (self.reason,)


def _now():
    return time.time()


def _session():
    # Session-local, never committed.  NOTHING on a workflow's stack may hold
    # this dict in a local: the continuation would then reach a non-persistent
    # object and the checkpoint's commit would be refused.
    return gemstone.sessionDict('durable')


def _commit():
    outcome = gemstone.___tryCommit___()
    if outcome is True:
        return
    if outcome is False:
        raise RuntimeError('durable: commit conflict (the spike does not retry)')
    # GemStone refused the commit outright: something session-bound is
    # reachable from it.  Commits stay disabled until the session aborts
    # (error 2424, measured), so the caller must abort before trying again.
    raise CheckpointError(outcome)


def _refresh():
    # See other sessions' commits.  Anything this session still holds
    # uncommitted (typically the script's own __main__ compile) is committed
    # first: a durable-execution session has nothing it means to throw away.
    if gemdb.needs_commit():
        _commit()
    gemdb.refresh()


def _registry():
    return gemdb.root.setdefault('durable', {}).setdefault('runs', {})


class Run:
    """The persistent record of one workflow execution."""

    def __init__(self, fn, args, kwargs):
        self.id = '%x' % id(self)      # the OOP: unique and stable once committed
        self.fn = fn
        self.name = getattr(fn, '__qualname__', repr(fn))
        self.args = args
        self.kwargs = kwargs
        # pending | running | sleeping | waiting | done | failed
        self.status = 'pending'
        self.result = None
        self.error = None
        self.continuation = None
        self.checkpoints = 0
        self.resumes = 0
        self.wake_at = None
        self.topic = None
        self.inbox = []
        self.lease_until = None
        self.owner = None
        self.created = _now()
        self.history = []

    def log(self, event):
        self.history.append((_now(), gemstone.session_serial, event))

    def __repr__(self):
        return '<Run %s %s %s>' % (self.id, self.name, self.status)


class Handle:
    def __init__(self, run_id):
        self.id = run_id

    @property
    def run(self):
        return _registry()[self.id]

    def status(self):
        _refresh()
        return self.run.status

    def result(self, timeout=None):
        deadline = None if timeout is None else _now() + timeout
        while True:
            _refresh()
            run = self.run
            if run.status == 'done':
                return run.result
            if run.status == 'failed':
                raise WorkflowFailed(run.error)
            if deadline is not None and _now() > deadline:
                raise TimeoutError('run %s is %s' % (run.id, run.status))
            time.sleep(0.05)


def start(fn, *args, **kwargs):
    """Record a run of ``fn(*args, **kwargs)`` and commit it.  It executes
    when an executor picks it up; the caller gets a ``Handle``."""
    run = Run(fn, args, kwargs)
    _registry()[run.id] = run
    run.log('started')
    _commit()
    return Handle(run.id)


def runs():
    _refresh()
    return list(_registry().values())


# --- inside a workflow -------------------------------------------------------

def _current():
    run = _session().get('current_run')
    if run is None:
        raise RuntimeError('durable: not inside a workflow')
    return run


def _park(run, status, **fields):
    """Commit a continuation of the caller's stack.  Answers None on the
    first return; a ``_Wake`` when the continuation is later resumed --
    possibly in another gem, possibly much later."""
    k = gemstone.___captureContinuation___()
    if gemstone.___isContinuation___(k):
        run.continuation = k
        run.checkpoints += 1
        run.status = status
        for name, value in fields.items():
            setattr(run, name, value)
        run.log('checkpoint -> %s' % status)
        try:
            _commit()
        except CheckpointError as e:
            # Usually a live generator or an open file in a local.  The abort
            # GemStone requires also rolls the workflow's uncommitted changes
            # back to its last successful checkpoint; the run record is then
            # re-marked so the executor does not see a stale continuation.
            gemstone.system.abort()
            run.continuation = None
            run.status = 'running'
            run.log('checkpoint refused')
            raise CheckpointError('durable: cannot checkpoint here: %s' % (e,)) from None
        return None
    run.resumes += 1
    run.log('resumed (%s)' % k.reason)
    return k


def checkpoint():
    """Commit the workflow's stack here.  Returns False now, and True if
    execution later resumes from this point after a crash."""
    run = _current()
    return _park(run, 'running') is not None


def sleep(seconds):
    """Park the workflow for ``seconds``; the gem is free meanwhile."""
    run = _current()
    if _park(run, 'sleeping', wake_at=_now() + seconds) is None:
        raise Parked()


def recv(topic, timeout=None):
    """The next message sent to this run on ``topic``, parking until one
    arrives; None on timeout."""
    run = _current()
    while True:
        for i, (t, message) in enumerate(run.inbox):
            if t == topic:
                del run.inbox[i]
                return message
        wake_at = None if timeout is None else _now() + timeout
        wake = _park(run, 'waiting', topic=topic, wake_at=wake_at)
        if wake is None:
            raise Parked()
        if wake.reason == 'timeout':
            return None


def send(run_id, topic, message):
    """Deliver ``message`` to a run's inbox and commit; an executor wakes
    the run if it is waiting on ``topic``."""
    run = _registry()[run_id]
    run.inbox.append((topic, message))
    run.log('inbox <- %r' % (topic,))
    _commit()


# --- the executor ------------------------------------------------------------

def _entry(run):
    # The base of every workflow stack, and so of every continuation: when a
    # resumed run finishes -- in whatever gem -- THIS frame records the result.
    # It holds no session-local objects in a local (see _session).
    _session()['current_run'] = run
    try:
        try:
            result = run.fn(*run.args, **run.kwargs)
        except Parked:
            return
        except BaseException as e:
            _record_failure(run, e)
            return
        run.status = 'done'
        run.result = result
        run.lease_until = None
        run.log('done')
        _commit()
    finally:
        _session()['finished'] = True


def _record_failure(run, e):
    run.status = 'failed'
    run.error = '%s: %s' % (type(e).__name__, e)
    run.lease_until = None
    run.log('failed')
    try:
        _commit()
    except CheckpointError:
        # The run itself reaches something non-committable (its continuation,
        # its arguments); the record must still say what happened.  The abort
        # reverted the fields set above, so they are set again without the
        # continuation.
        gemstone.system.abort()
        run.status = 'failed'
        run.error = '%s: %s' % (type(e).__name__, e)
        run.lease_until = None
        run.continuation = None
        _commit()


def _resume_entry(continuation, wake):
    gemstone.___resumeContinuation___(continuation, wake)


def _pick():
    now = _now()
    for run in list(_registry().values()):
        st = run.status
        if st == 'pending':
            return run, 'start'
        if st == 'sleeping' and run.wake_at <= now:
            return run, 'timer'
        if st == 'waiting':
            if any(t == run.topic for t, _ in run.inbox):
                return run, 'message'
            if run.wake_at is not None and run.wake_at <= now:
                return run, 'timeout'
        if st == 'running' and run.lease_until is not None and run.lease_until < now:
            return run, 'recover'
    return None, None


def _lease(run, lease):
    run.status = 'running'
    run.lease_until = _now() + lease
    run.owner = gemstone.session_serial
    run.log('leased')
    if gemstone.system.commit():
        return True
    gemstone.system.abort()
    return False


def _execute(run, reason):
    s = _session()
    s['current_run'] = run
    s['finished'] = False
    if reason == 'start' or run.continuation is None:
        _thread.start_new_thread(_entry, (run,))
    else:
        _thread.start_new_thread(_resume_entry, (run.continuation, _Wake(reason)))
    while not s['finished']:
        time.sleep(0.01)
    s['current_run'] = None


def run_executor(once=False, idle_timeout=None, poll=0.05, lease=LEASE_SECONDS):
    """Run whatever is runnable, one workflow at a time, until ``once`` has
    executed one or ``idle_timeout`` seconds pass with nothing to do.
    Returns how many runs it executed or resumed."""
    executed = 0
    idle_since = None
    while True:
        _refresh()
        run, reason = _pick()
        if run is None:
            if idle_timeout is not None:
                idle_since = idle_since or _now()
                if _now() - idle_since >= idle_timeout:
                    return executed
            time.sleep(poll)
            continue
        idle_since = None
        if not _lease(run, lease):
            continue
        _execute(run, reason)
        executed += 1
        if once:
            return executed
