# Durable Execution on GemStone Continuations

**Status:** a working spike (2026-09-23). `import durable` gives a Python
workflow `checkpoint()`, `sleep()`, `recv()`/`send()` and an executor; one
workflow has been run across six gems, one of them `kill -9`ed mid-flight, and
finished with the locals it computed in the first. The API is small and the
limits listed in §6 are real. Nothing here is tuned for load.

**Related:** [GemDB_Module.md](GemDB_Module.md) (the persistence API the
records live in), [Gemstone_Module.md](Gemstone_Module.md) (the primitives).
Code: [durable.py](../src/python/stdlib/durable.py),
[gemstone.gs](../src/smalltalk/Python/gemstone.gs) (category
`Grail-Continuations`), test driver
[run_durable_test.sh](../tests/scripts/run_durable_test.sh).

---

## 1. What "durable execution" is, and what the others do

A durable workflow is a function whose progress survives the process running
it: it can wait a day for a timer or a message, the machine can die, and it
carries on where it was. [Temporal](https://temporal.io/blog/what-is-durable-execution),
[DBOS](https://www.dbos.dev/) and [Restate](https://www.restate.dev/what-is-durable-execution)
all deliver that the same way underneath: every *step* the workflow takes is
journaled, and on recovery the workflow function is **re-executed from the
top** with each journaled step returning its recorded result instead of
running. It works, and it imposes a rule that is the whole developer
experience of those systems: the workflow function must be deterministic. No
`random`, no clock, no I/O, no iteration over an unordered set — anything that
could make the replay diverge from the journal.

They replay because none of them can do the obvious thing: freeze the running
stack and thaw it somewhere else.

## 2. GemStone can

`GsProcess class >> continuationFromLevel:` answers a **committable copy of the
running stack** from its base to the caller, temps and all. `value:` sent to
it, from any session, resumes execution in the top captured frame with the
argument as the result of the capturing call. Seaside on GemStone (GLASS) ran
on this for years: a `call:` captured a continuation, the request ended, and
whichever gem got the next request resumed it.

Measured on 2026-09-23 (GemStone 4.0, this checkout):

1. Session A runs a Python function that computes `y = x * 2`, appends to a
   persistent log, and calls a two-line builtin that captures the
   continuation. The function returns; A commits and **logs out**.
2. Session B fetches it: `isContinuation=true, depth=16` — topaz's doit,
   importlib's module load, the Python module body, the function.
3. B sends `value: 'RESUMED'`. Execution resumes *inside the Python function*
   with **locals intact** (`x=21 y=42`), builds a new list, commits.
4. The continuation runs to the bottom of its captured stack: B's topaz prints
   *A's* doit result, now `'RESUMED path'`.

Two earlier probes said "no", each for a reason that matters to the design:

* A process parked by `suspend` holds a `Processor` frame; a Grail generator
  or coroutine is a `GsProcess` parked on a `Semaphore`. Both classes are
  **non-persistent** and the commit refuses them by name (TransactionError
  2407: "instances of its class are non-persistent"). A continuation captured
  from *inside* the computation has neither.
* A native-format process committed but was `invalid process state` in the
  next session. `continuationFromLevel:` produces the portable form directly.

So Grail's durable execution does not replay. `checkpoint()` commits the live
frames; recovery continues from them.

## 3. The API

```python
import durable

def fulfil(order):
    reserve(order)                          # ordinary code, side effects on persistent objects
    durable.checkpoint()                    # commit the stack; a crash recovers from here
    charge(order)
    durable.sleep(24 * 3600)                # park; the gem is free; any executor wakes it
    if durable.recv('cancel', timeout=48 * 3600) is None:
        ship(order)
    return 'done'

h = durable.start(fulfil, order)            # a persistent Run, status 'pending'; committed
durable.run_executor()                      # in any gem: runs whatever is runnable
h.result()                                  # from any session; blocks until done
durable.send(h.id, 'cancel', reason)        # from anywhere; wakes a recv()
```

| call | inside a workflow? | what it does |
| --- | --- | --- |
| `start(fn, *args, **kw)` | either | records a `Run`, commits, answers a `Handle` |
| `checkpoint()` | yes | commits a continuation of the stack; `False` now, `True` when resumed after a crash |
| `sleep(seconds)` | yes | checkpoint, mark `sleeping` with a wake time, leave the process |
| `recv(topic, timeout=None)` | yes | next message on `topic` from the run's inbox, parking until one arrives; `None` on timeout |
| `send(run_id, topic, message)` | either | appends to the inbox and commits |
| `run_executor(once, idle_timeout, poll, lease)` | no | the worker loop |
| `Handle.result(timeout)`, `.status()` | no | poll the committed record |
| `runs()` | no | every `Run` |

A `Run` is a plain Python object under `gemdb.root['durable']['runs']`: the
function, its arguments, status, result or error, the continuation, an inbox,
a lease, and a history of `(time, session, event)` tuples. Nothing is
serialized; the arguments and results are whatever objects they are.

## 4. How it works

**Every workflow runs in a forked `GsProcess`** whose base frame is
`durable._entry`. That is deliberate: a continuation copies the stack from its
*base*, and `value:` replaces the resuming process's whole stack with the copy.
When a resumed run finishes — in whatever gem — the copy of `_entry` records
the result and commits, then the copied `GsProcess _start` frame terminates
the process. The executor never resumes a continuation on its own stack; it
forks a process whose only job is the `value:`.

**A park is a checkpoint plus an exit.** `sleep()` and `recv()` capture, set
the run's status and wake condition, commit, and raise `Parked` (a
`BaseException`, so a workflow's `except Exception` does not eat it). `_entry`
catches it and returns; the gem is free. The executor's `_pick` treats a
sleeping run whose time has come, a waiting run with a matching message in its
inbox, or a running run whose lease expired as runnable, leases it (a commit;
a conflict means another executor won), and forks the resume with a `_Wake`
whose `reason` says why. `recv()` loops on wake: a message makes it re-read
the inbox; a timeout returns `None`.

**Recovery is the same resume.** A gem that dies leaves its run `running`
with a lease. When the lease expires, any executor resumes the last committed
continuation with `_Wake('recover')`, so `checkpoint()` returns `True` there
and the code between that checkpoint and the crash runs again. Between
checkpoints, the guarantee is at-least-once, as it is in every system; the
idempotency key for an external call is `run.id` plus the checkpoint count.

**The session-local rule.** Nothing on a workflow's stack may hold a
session-bound object in a local, because the continuation would reach it and
the commit would be refused. `durable` keeps its own per-gem state (the
current run, the finished flag) in `gemstone.sessionDict('durable')` and never
binds that dict to a name on the workflow's side of `_entry`.

**A refused checkpoint is an exception, not a gem death.** `System commit`
signals TransactionError 2407 for a non-persistent object in the commit set,
and a Smalltalk error crossing into Python cannot be caught there — the first
version of this spike died on it. `gemstone.___tryCommit___` catches it in
Smalltalk and answers the message as data; `durable` raises `CheckpointError`
naming the object (`The object Semaphore(...) may not be committed`). After a
refusal GemStone disables commits until the session aborts (ImproperOperation
2424, measured), so `checkpoint()` aborts, which also rolls the workflow's
uncommitted changes back to its last successful checkpoint.

## 5. What it buys over checkpoint-and-replay

* **No determinism rules.** Branch on the clock, on `random`, on a set's
  iteration order. Nothing is replayed.
* **No step journal.** A step's result is a local in a committed frame.
  `@step` is sugar for "run it, then `checkpoint()`, with retries" and does
  not exist yet because nothing needs it.
* **Checkpoint and application state are one transaction.** A step's writes
  to persistent objects and the record that the step happened commit together
  or not at all. DBOS gets that only for steps that write DBOS's own Postgres.
* **Versioning inverts.** A continuation references the `GsNMethod` objects it
  was executing, so an in-flight run finishes on the code it started with,
  redeploy or not. Temporal's hardest operational problem becomes the default;
  what is left is a policy for *migrating* a long-parked run onto new code.
* **The workflow is Python.** Generators aside (§6), nothing is stubbed: the
  frames Seaside froze were Smalltalk's, these are Grail's.

## 6. Limits of the spike

* **A live generator or coroutine at the checkpoint is refused.** Grail's are
  `GsProcess` + `Semaphore` pairs. `for x in gen(): ... checkpoint()` raises
  `CheckpointError`. Making generators themselves checkpointable is the
  deepest of the follow-ups (their body process would have to park on
  something committable).
* **One workflow at a time per executor gem.** The current run is per-session
  state; concurrency is more gems, which is how GemStone scales anyway.
* **No heartbeat.** A step longer than `lease` (30 s default) looks crashed
  and is resumed from its last checkpoint by another executor while the first
  is still running it. Long steps need either a longer lease or a heartbeat.
* **Conflicts abort rather than retry**, and the run registry is a plain
  dict, so two sessions `start()`ing at once can conflict. An
  `RcKeyValueDictionary` is the fix importlib already uses.
* **Native code is untested.** This Mac runs interpreted; Linux CI runs
  `GEM_NATIVE_CODE_ENABLED`. `convertToPortableStack` exists for that case and
  the primitive is expected to handle it; the multi-gem test in `run_tests.sh`
  is what will say so when CI runs it.
* **No audit before the commit.** The refusal names one object; a
  `deploy_check`-style walk of the captured frames would name the Python
  local holding it.
* **Cancellation** is not implemented; it would be cooperative (a flag the
  workflow reads at its next `durable` call).

## 7. Tests

* `tests/scripts/run_durable_test.sh` (in `run_tests.sh` as the `durable`
  phase): `order_flow` across six gems — parked on `sleep()`, woken by timer,
  parked on `recv()`, woken by `send()`, finished with `total=42` from gem 1's
  locals; `crashy_flow` checkpointed and `kill -9`ed, recovered by the next
  gem (`checkpoint()` answered `True`, result `50`), and the log line written
  after the checkpoint in the killed gem correctly absent; `generator_flow`
  refused with a `CheckpointError` naming the Semaphore.
* `GemstoneContinuationTestCase` (SUnit): capture answers a continuation;
  `value: 42` returns 42 from the same call with locals restored; a
  continuation is multi-shot; `___isContinuation___` is false for anything else.
