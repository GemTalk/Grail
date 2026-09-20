## Progress — cut 54 (async defs)

Roadmap item 9, second half: `async def` (66 stdlib class methods in the
2026-09-07 census), covering coroutines AND async generators.  The `#async`
refusal goes; `___irIneligibilityReason___` no longer consults
`___wrapsBody___` at all.

**What the text emits** is cut 53's wrapper with a different class and three
more ___gen___ sends (trace of `co`, `loop_it` and `K.fetch`):

    PythonCoroutine @env1:withBlock: [:___gen___ |
    [
      a := (___gen___ @env1:___grailAwait___: (v)).
      ___iter0___ := PythonCoroutine @env1:___grailAiter___: ((ait)).
      ... i := ([(___gen___ @env1:___grailAwaitAnext___: (___iter0___ __anext__))]
             @env0:on: StopAsyncIteration do: [:___dx___ | PythonLoopDrained ...]).
      ... PythonCoroutine @env0:___checkAsyncCM___: ___cm___.
          ___val___ := (___gen___ @env1:___grailAwaitAenter___: ((___cm___ ... #'__aenter__') ...)).
          ... (___gen___ @env1:___grailAwaitAexit___: (...))
      PythonReturn ___signal___: (...).
      None.
    ] @env0:on: PythonReturn do: [...]] name: 'co' qualname: 'co' code: [... ___setFlags___: 131)]

**What the IR emits.** `___emitIRWrappedBodyOn___:` already took the class
from `___lazyWrapperClass___` (PythonCoroutine; PythonAsyncGenerator when the
body also yields, whose YieldAst emit already switched to `___asyncYield___:`
on the enclosing function), so the def-level change is the refusal alone.
The statement shapes follow the text's own hook structure, so `for` /
`async for` and `with` / `async with` share one emitter each:

* `AwaitAst` gains the IR protocol with printSmalltalkOn:'s two-emit rule:
  inside a wrapped body (`aBuilder genLeaf` set) the INSTANCE-side `___gen___
  ___grailAwait___: v` (env 1), which can suspend the awaiting coroutine
  through ___yieldFrom___:; anywhere else the class-side `PythonCoroutine
  ___grailAwait___: v` (env 0) -- the same form the `with` emitter has used
  since cut 34 for its protocol calls;
* `ForAst`'s emit now goes through three hooks -- `___emitIRIteratorFrom___:on:`
  (`__iter__`), `___emitIRNextFrom___:on:` (`__next__`) and
  `___irExhaustedExceptionSymbol___` (#StopIteration) -- the IR twins of the
  text's `___emitIteratorFrom___:on:` / `___nextExpressionFor___:` /
  `___exhaustedExceptionName___`.  `AsyncForAst` overrides them:
  `PythonCoroutine ___grailAiter___: it` (env 1), `___gen___
  ___grailAwaitAnext___: (___iterN___ __anext__)` (env 1, the strict variant
  that makes a non-awaitable __anext__ a TypeError rather than an endless
  loop) and #StopAsyncIteration.  The loop machinery -- the whileTrue, the
  drain guard, break / continue, target binding -- is untouched;
* `WithAst`'s protocol call takes its selectors from `___enterSelector___` /
  `___exitSelector___` and its await from a new per-site hook
  `___emitIRAwait___:site:on:` (class-side pass-through), and runs
  `___emitIRProtocolPreflightOn___:builder:` (nothing) before the enter call.
  `AsyncWithAst` overrides both: inside a wrapped body `___gen___
  ___grailAwaitAenter___:` / `___grailAwaitAexit___:` (env 1) -- the
  suspending instance forms whose absence once ran an `async with lock:` body
  without the lock -- else the inherited class-side form, as the text; and the
  `PythonCoroutine ___checkAsyncCM___: ___cm___` preflight (env 0) so a
  missing __aexit__ refuses before __aenter__ runs.

**What is still refused**: nothing async-specific.  An async body refuses for
what any body refuses.  `await` / `async for` / `async with` outside a wrapped
body take the text's class-side forms, never a raise, so an `async with` in a
plain def (legal in Grail, a SyntaxError in Python) still compiles either way.

Fixture: a suspending awaitable (`Suspend.__await__`, itself an IR generator
method), an async iterator class (`__aiter__`, `async def __anext__` raising
StopAsyncIteration), an async context manager (`async def __aenter__` /
`__aexit__` logging the exception type), and coroutines for `await`, a plain
return, `async for`, `async with` (clean and with a raise caught outside),
awaiting another coroutine, an async generator consumed by `async for`, and
`return` through finally -- all driven by a hand-rolled `send(None)` loop
that also counts suspensions, plus `type(c).__name__` and `__qualname__`.
Every expected value verified under CPython 3.14.6 and against the text path.
Compiled 243 -> 262 (all nineteen new defs), fallbacks 0, first try; with the
flag OFF the fixture reads ALL_OK at compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 262, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors` --
  the same nine as cut 53 and 18ae8495, by name (the five PEP 657 span
  tests, LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, and the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling).  No new
  failure.  Roadmap item 9 is done; the census should now show no
  `generator` / `async` rows.
