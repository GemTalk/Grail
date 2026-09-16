## Progress — cut 53 (generators)

Roadmap item 9, first half: a def whose body contains `yield` (65 stdlib class
methods and a share of 24 top-level defs in the 2026-09-07 census).  The
refusal (`#generator`) went with the `___wrapsBody___` test in
`___irIneligibilityReason___`; `#async` stays for cut 54.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on a module def `gen(n)` and a
class method `K.walk(self, n)` -- the two differ only in the outer block's
parameter copies):

    ^ [| ___curPos___ x r |
    PythonGenerator @env1:withBlock: [:___gen___ |
    [
      x := (___gen___ @env1:___yield___: (n)).
      r := (___gen___ @env1:___yieldFrom___: (...)).
      PythonReturn ___signal___: (5).
      None.
    ] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]]
      name: 'gen' qualname: 'gen'
      code: [((PyCode @env0:name: 'gen' qualname: 'gen' filename: '...'
          firstlineno: 6 argcount: 1 posonlyargcount: 0 kwonlyargcount: 0)
          @env0:___setFlags___: 35)].
    ] value

**What the IR emits** (`FunctionDefAst>>___emitIRWrappedBodyOn___:`, after the
unchanged argument / temp / transport / varargs prologue): the same sends, the
same block nesting.  The method's temps and arguments stand in for the text's
outer-block temps -- the wrapper block closes over them like any IR loop or
handler block -- and the method's one statement is `^ <wrapper class>
withBlock:name:qualname:code:` (env 1) over a `[:___gen___ | ...]` block whose
body is `[stmts. None] on: PythonReturn do: [:___ex___ | ___ex___ returnValue]`
(env 0, `returnValue` env 1), plus the code thunk
(`___emitIRPyCodeExprOn___:qualname:nested:`, the text's PyCode expression
field for field: `___irFileName___`, `beginLine`, the three parameter counts,
`___coFlags___:`, and `___setFreevars___:` when the def has free variables).
The statement list is the text's `___reachableStatements___:`.  The wrapper
class is `___lazyWrapperClass___` -- PythonGenerator here, PythonCoroutine /
PythonAsyncGenerator once cut 54 admits async.

Three node emits carry the body:

* `PyMethodIRBuilder>>genLeaf` holds the `___gen___` block-argument leaf while
  the wrapped body emits (nil outside one; set/cleared under an ensure);
* `YieldAst` / `YieldFromAst` gain the IR protocol: `___gen___ ___yield___: v`
  (`___asyncYield___:` inside an async generator, the text's gate on the
  enclosing function) and `___gen___ ___yieldFrom___: it`, env 1, value the
  send's answer -- so `x = yield v` binds what send() passed.  A yield with no
  ___gen___ raises in the emit (the text's compile error), which the seam
  turns into a fallback;
* `ReturnAst` inside a wrapped body signals `PythonReturn ___signal___: v`
  (env 1) instead of a home return: the home method answered the wrapper
  before the body ever ran, on the generator's own GsProcess, so `^` has no
  live home -- this is the text's #exception return mode, and the wrapper's
  on:do: hands the value to the runtime as StopIteration.value.  Outside a
  wrapped body the direct `^` is unchanged, and it remains the only place
  the IR emits a home return besides the fall-off `^ None`.

Nothing else changed shape: `for` / `while` / `try` / `with` / `if` inside
the generator block are the cuts 5-34 emits, and a `return` through
try/finally inside a generator unwinds through `___ensureFinally___:finally:`
the way the signal does in the text (gen_ret_finally).  The runtime cannot
tell the two apart: send / throw / close, `yield from` delegation, the
StopIteration value, `__name__` / `__qualname__` / `type(g).__name__`, and
the forked-process frame walk all see a PythonGenerator over a block whose
home is the def's method.

**What is still refused**: nothing generator-specific.  A generator body
refuses for what any body refuses (nested defs, comprehensions, the 1c tail).
The async wrappers are cut 54.

**A method-mode gap the fixture found**: `Walker.pairs` and `Walker.take`
stayed on text -- `cm:AugAssignAst:target-NameAst`, for `i += 1`.
`AugAssignAst>>___irLocalNameTarget___:` refused EVERY Name target under
`classBeingCompiled`, a cut-36 conservatism; the text's only method-specific
Name branch is a `nonlocal` of an enclosing function reached past the class
(the closure cells).  The predicate now refuses exactly that
(`___enclosingFunctionLocalBeyondClass___:`) and admits the rest, which take
the same simple-local `___augmentedOp___` send the module form emits.

Fixture: nine generator defs (a counter, `send()` round-trips returning the
received list, `yield from` a sub-generator and a list with the sub-generator's
return value, an early bare `return`, try/finally with `close()`, an except
clause receiving `throw()`, a defaulted `gen_step(n, step=1)` on the varargs
form, `return value` through finally), five consumers (for-loop consumption,
next / send / throw / close, StopIteration.value, `list()`), and class
`Walker` with four generator methods (`for` over `self.items`, a `while` with
`i += 1`, an early return inside the loop, a defaulted `take(self, n=2)`) plus
`type(g).__name__` / `__qualname__` / `__name__` checks; every expected
value verified under CPython 3.14.6.  Compiled 224 -> 241 -> 243 (the last
two are the AugAssign widening), fallbacks 0, first try; the fixture with the
flag OFF reads ALL_OK with compiled=0, so both paths agree.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 243, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors` --
  exactly the known residue at 18ae8495, by name: the five PEP 657 span
  tests (TracebackTestCase>>testForLoopExceptionPositions,
  RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken,
  WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed,
  LambdaFrameTestCase>>testLambdaFrameSpans),
  LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, and the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling.  No new
  failure: generator bodies through the wrapper are invisible to the sweep.
