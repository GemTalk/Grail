## Progress — cut 64 (nested defs: the closure block inside the enclosing IR method)

Roadmap item 4, first cut.  `stmt:FunctionDefAst` (76 stdlib top-level defs
+ 77 class methods refused because a def INSIDE them had no IR emit) and the
`nestedDef` tally (204 nested defs counted separately) were the largest
remaining refusal family after cuts 57-59.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `plain(x)`, `capture(x,
y)`, `with_default(x)`, `star(x)`, `deep(x)`, `gen_inner(x)`, `deco(x)`,
`counter()`, `posonly(x)`, `in_loop(xs)`, `reassigned(x)` and the methods
`K.m(self, x)` / `K.nl(self)` -- printSmalltalkOn:'s non-module branch):

    inner := ([| ___default_b___ |                          (defaults only: an immediately-
        ___default_b___ := 10.                              evaluated wrapper, def-time, enclosing scope)
        [:___positional___ :___kwargs___ |
            | a b ___curPos___ |                            (every parameter + body local: block temps)
            ((___positional___ size) > 2) ifTrue: [TypeError ___signal___: ('with_default.<locals>.inner() takes from 1 to 2 ...')].
            (___kwargs___ isNil) not ifTrue: [___kwargs___ keysDo: [:___k___ | ...unexpected keyword...]].
            ((___positional___ size) < 1) ifTrue: [TypeError ___checkMissingPositional___: ... qualifiedName: 'with_default.<locals>.inner'].
            a := ((___positional___ size) >= 1) ifTrue: [___positional___ at: 1] ifFalse: [(kwargs gate) ... ifFalse: [TypeError ___signalMissingArguments___: ...]].
            b := ((___positional___ size) >= 2) ifTrue: [___positional___ at: 2] ifFalse: [(kwargs gate) ... ifFalse: [___default_b___]].
            args := tuple perform: #withAll: env: 0 withArguments: { ___positional___ copyFrom: 3 to: ___positional___ size }.   (*args)
            kw := ___kwargs___ ifNil: [(PyDict perform: #new env: 0)].                                                        (**kw: the PLAIN ALIAS)
            [
                [ stmt. stmt. PythonReturn ___signal___: (value). ] value.
                None.
            ] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]
        ]] value) @env0:shallowCopy
            @env0:___pyNamed___: 'inner' [doc: 'Doc here.'];
            @env0:___pyModuleNamed___: 'nprobe';
            @env0:___pyQualname___: 'with_default.<locals>.inner';
            @env0:___pyCode___: (((PyCode @env0:name: 'inner' filename: '...' firstlineno: 12 argcount: 2 posonlyargcount: 0 kwonlyargcount: 0) @env0:___setFlags___: 19) @env0:___setFreevars___: #( 'x' ));
            @env0:___pySig___: { { 'a'. 1 }. { 'b'. 1. '10' } };
            @env0:___pyClosure___: { (PyCell @env0:reader: [x]). }.
    inner := wrap value: { inner } value: nil.                                          (one decorator)
    inner := [:___grailDecoFns___ | ((___grailDecoFns___ at: 1) value: { ((___grailDecoFns___ at: 2)
        value: { inner } value: nil) } value: nil)] @env0:value: { d1. d2 }.             (a chain)

The def's name is a body local of the ENCLOSING def (a method temp on the IR
path already); the block captures enclosing temps natively -- `capture`'s
`x + y` are the method's arguments read from inside the block, `deep`'s
`inner` reads `y`, a block temp of `mid`'s block, one level up.  `counter`'s
``nonlocal n; n += 1'' is the text writing the enclosing temp from inside the
block (`n := (n) ___augmentedOp___: ...`) -- there is no cell mechanism for a
nested def in a def; the `___cell_<name>___` pairs belong to a CLASS body
nested in a def.  A generator nested def wraps the same body in
`PythonGenerator withBlock: [:___gen___ | ...] name:qualname:code:` as the
block's value (no `^`).  A reassigned enclosing parameter is the one case the
closure cell gets a `setter:` (the text's rule: the free variable's read
source is the bare name AND the binding scope assigns it); a body local's
guarded read disqualifies its cell.  A default may read an enclosing local
(`in_loop`'s `def f(m=v)`): the wrapper runs at the def site.

**What the IR emits** (`FunctionDefAst>>___emitIRStatementOn___:` and
`___emitIRNestedFunctionValueOn___:` / `___emitIRNestedBlockOn___:` /
`___emitIRNestedBodyOn___:`): the same sends, the same block nesting.

* The closure is `PyMethodIRBuilder>>blockWithArgs:temps:do:` (new: several
  arguments AND temps, ``[:a :b | | t1 t2 | ...]'') over `___positional___` /
  `___kwargs___`, with every parameter and body local of the nested def a
  block temp bound into the local table by `withLocals:do:` for the block's
  duration -- so a read or store inside resolves to the block temp and an
  enclosing local of the same name is shadowed (`nd_shadow`, `nd_shadow_local`),
  and a deeper nested def's free variables resolve to the enclosing closure's
  temps (`nd_deep`).  The `___po___` / `___unk___` collectors of the
  positional-only keyword guard join the temps when the shape needs them.
* The prologue is cuts 40-43's own emitters (`___emitIRArgCountChecksOn___:`,
  `___emitIRMissingPositionalCheckOn___:`, `___emitIRPositionalBindingOn___:`,
  `___emitIRVarargBindingOn___:`) over the two block-argument leaves; their
  qualified name comes from the scope stack (`with_default.<locals>.inner`,
  `K.m.<locals>.inner`, `deep.<locals>.mid.<locals>.inner`) because the emit
  pushes the nested def's frame and sets functionBeingCompiled for the body's
  window, as printSmalltalkOn: does.  ONE hook: `___irDefTimeDefault___:node:on:`
  answers the wrapper's `___default_<p>___` temp when the local table holds
  one -- the defaults wrapper is `blockWithTemps:do:` + `withLocals:do:` over
  those names, evaluated (`send: #value env: 0`) at the def site.  The **kwarg
  is the closure form's own plain alias (`___emitIRNestedKwargBindingOn___:`),
  not the varargs method's copy-and-remove.
* The body is `[ [stmts] value. None ] on: PythonReturn do: [:___ex___ |
  ___ex___ returnValue]` (env 0; `returnValue` env 1), statements the text's
  `___reachableStatements___:`; ReturnAst signals PythonReturn inside it
  through a new builder flag, `inNestedFunction` (`nestedFunctionDo:`), the
  twin of cut 53's genLeaf test.  genLeaf is cleared for the nested body and
  set to the nested def's OWN `___gen___` when it is a generator / coroutine
  (`nd_generator`, `Nester.gen_method`), whose wrapper is the block's last
  statement, its code thunk cut 53's `___emitIRPyCodeExprOn___:qualname:nested:`
  with nested: true.
* `shallowCopy` (env 0) then the cascade (`cascade:specs:`): `___pyNamed___:`
  or `___pyNamed___:doc:` (`___docString___`), `___pyModuleNamed___:`,
  `___pyQualname___:` when it differs from the name, `___pyCode___:` with the
  def-site form (`___emitIRNestedPyCodeOn___:` -- `name:filename:firstlineno:
  argcount:posonlyargcount:kwonlyargcount:`, no qualname field, flags with
  CO_NESTED, `___setFreevars___:` when there are free variables),
  `___pySig___:` as fresh brace arrays of `{ name. kind [. default source
  text] }` (`___emitIRSignatureSpecOn___:`), and `___pyClosure___:` with one
  `PyCell reader: [x]` per free variable, `reader:setter:` exactly when the
  text emits a setter -- decided by the text's own two predicates
  (`CallAst ___freeVariableReadSource___:parent:` = the bare name and
  `___freeVariableIsAssignable___:for:`), so the two paths agree by
  construction (`nd_cell_setter`: 50 / 50 on both).  A captured method receiver
  reads as `self` (`Nester.closure_over_self`: co_freevars `('self',)`).
* Decorators (`___emitIRNestedDecoratorsOn___:leaf:`): one is `name := deco
  value: { name } value: nil` (env 1); a chain is the ordered one-statement
  form over a `[:___grailDecoFns___ | ...]` block and the brace array of
  decorator values, applied innermost-first (`nd_deco`: `['d1', 'd2', 'd1']`).
  A bare-name decorator resolves in printDecoratorReceiverOn:deco:'s order: a
  module variable through `(<Mod> ___instance___) ___moduleAttrLoad___:`
  (`nd_module_deco`), else the enclosing local's leaf, else the resolvable
  global.

**Eligibility and flow** (`___irNestedDefReason___:`, each exit a census row).
`FunctionDefAst>>___irEligibleStatementLocals___:` now exists, so the body
walk of the enclosing def admits a nested def; its body is judged against
`___irNestedLocals___:` (the enclosing set plus its own parameters and body
locals -- also its `___irChildLocals___:` for the census walk) and must be
bound-before-read on its own: `body ___irFlowBound___:` seeded with its
parameters and every enclosing local it does not shadow (`nestedDef:flow`
otherwise).  For the ENCLOSING flow analysis the def statement reads its
defaults and decorators plus the free variables of its body
(`___irReadLocalNamesInto___:locals:` walks the body against the enclosing
set minus its own names), writes what its body writes to enclosing names
(none until cut 66), and binds its name; `___irFlowBound___:locals:` lets an
UNDECORATED def read its own name (`nd_recursive`'s `fact(k - 1)` -- the
closure cannot run before the assignment completes) while a decorated one
keeps the plain rule, as CPython's decorator call would NameError there.
Refused, by label: `nestedDef:kwonly` (keyword-only parameters -- the text's
mutable `___kwdefaults___` cell and `___pyKwDefaults___:` stamp are a
different prologue, deferred), `nestedDef:annotations` (the `annotate:` block),
`nestedDef:nonlocal` (cut 66), `nestedDef:global`, `nestedDef:reservedName`
(a pseudo-variable parameter or local: the text's `_self` transport),
`nestedDef:typeParams`, `nestedDef:decorator` (a class-body sibling name, or a
name a doit must look up at run time), `nestedDef:defaultExpr`,
`nestedDef:moduleScopeTarget` (a def whose name lands at module scope),
`nestedDef:reclassed`, `nestedDef:classBodyRuntime`.  Mutual recursion between
two nested defs (the first reads the second before it is bound) is
`nestedDef:flow`, deliberately.

**How nested defs are counted.**  A nested def is a block inside its parent's
GsNMethod, not a method: the tripwire's `compiled` counts the top-level defs
and class methods built through the seam, so a def with nested defs counts
ONCE however many it nests.  The census's `nestedDef` row is unchanged (it
tallies nested defs and lambdas per top-level def whatever path built them);
what moved is `stmt:FunctionDefAst`, which no longer occurs in the fixture.

**Probes** (three modules, each verified against CPython 3.14.6 first): the
eleven-shape `nprobe.py` compiles 11 of 19 defs / methods under the flag
(the eight held back are exactly the labels above plus `value:LambdaAst` --
cut 65 -- and `stmt:NonlocalAst`), `nprobe2.py` 8 of 10 (annotations, a
lambda), both with the text's OUT; `nprobe3.py` compares thirteen
introspection facts flag-on against flag-off -- `__name__`, `__qualname__`,
`__module__`, `__doc__`, `str(inspect.signature(f))`, co_flags / co_freevars
/ co_argcount / co_posonlyargcount / co_kwonlyargcount / co_name /
co_firstlineno, `__closure__`, the cell setter, the four arity TypeError
messages, the positional-only-as-keyword message, distinct objects per def
execution (`stamp_run`: `('ABSENT', 'ABSENT')`), generator identity, and
decorator order -- all equal.

Fixture: 29 module defs (`nd_plain` .. `nd_async_gen_loop`: capture of one and two
locals, positional-only + defaults, `*args` / `**kw`, a returned closure, two
levels of nesting, recursion, a def in a loop with a loop-variable default, a
docstring, `__code__` fields, `__closure__` and co_freevars, the cell setter,
the TypeError messages verbatim, the positional-only report, distinct objects,
per-object stamps, a generator, one and two decorators, a module-function
decorator, parameter and body-local shadowing, an early return, try / except
/ finally inside the closure, a def bound in both branches of an `if`) and
class `Nester` (a closure over `self` and a parameter, `co_freevars` of a
captured receiver, a decorator factory defined in the method, a generator
closure over `self`).  Compiled 353 -> 386 -> 390, fallbacks 0: the 31 new defs and
methods, the four interleaving cases, plus two pre-existing fixture defs
(`doubled`, `labelled`) that a nested def had kept on text (`Nester.nested_super`
stays on text by design); the fixture census now shows no
`stmt:FunctionDefAst` -- only the deliberate controls (`flow` x2,
`globalDeclaration`).  Flag OFF: ALL_OK at compiled=0.

**Defects found, six.**  (1) GemStone's Array has no `with:collect:` (the
first build fell back for every def: `a Array does not understand
#with:collect:`, ten fallbacks in the log -- a fallback is safe, and the
fallbackLog named it at once); the zips are `(1 to: n) collect:` now.  (2)
Under `python3 tests/python/ir_codegen_smoke.py` a nested def's `__module__`
is `__main__`, so the fixture compares it to `__name__`.  (3) **The first
flag-on sweep hung for nine hours** (shard 0 at 519 CPU-minutes, killed by the
coordinator; shards 1 and 3 died of ``VM temporary object memory is full'',
the known cold-shard ceiling).  Shard 0's SUnit log ended at
`EventLoopTestCase>>testAFutureIsTheSuspensionPoint` with `MessageNotUnderstood:
a range_iterator class does not understand #__anext__` raised inside a
coroutine -- and an asyncio loop whose task died that way then spins forever,
which is the hang.  Reproduced alone (the class hangs flag-on, passes
flag-off), then with a six-variant probe: the shape is a nested ASYNC
GENERATOR whose body has a `for` loop, consumed by the enclosing coroutine's
`async for`.  Cause: the IR emitters allocate their helper temps lazily and
REUSE them by name -- ForAst's `___iter<depth>___` / `___item<depth>___`,
the unpack holder, `___fn___` -- as METHOD temps, which is sound within one
frame; a closure's block runs in the MIDDLE of the enclosing frame's
statements, so the nested generator's `for i in range(k)` stored its
range_iterator into the same `___iter0___` the enclosing `async for` was
iterating, and the next `__anext__` went to the range iterator.  The text has
no such sharing: it declares those helpers as block temps inside each loop.
Fix in the builder: `nestedFunctionDo:` opens a CLOSURE FRAME (the closure
block, its lexLevel, a copy of the local table), hides every inherited
``___``-prefixed helper binding (the def-time default temps excepted), and
`tempNamed:` allocates on the innermost closure block while one is open; the
table is restored whole on exit.  The same clobber reproduces with plain
synchronous defs (a nested def with its own loop called from the enclosing
loop stopped the enclosing loop after one iteration; a nested generator with
a loop consumed by an outer loop; a tuple unpack inside a closure called from
a tuple-unpacking loop) -- `nd_interleaved_loops`, `nd_gen_interleaved`,
`nd_unpack_interleaved`, `nd_async_gen_loop` pin all four, driven without
asyncio.  (4) `SuperPreconditionErrorsTestCase>>testANestedDefReadsItsOwnParameterList`
(shard 2): `def inner(): super()` inside a method was bound to the METHOD's
receiver by cut 55's `#superZero` shape, where the text asks the innermost def
and raises ``super(): no arguments''; a nested def whose body mentions `super`
is refused (`nestedDef:super`; `Nester.nested_super` is the fixture control,
"super(): no arguments" on both paths).  (5) **Twelve frame-walk tests** (NestedFunctionFramesTestCase x3,
GeneratorStackFrameTestCase, LambdaFrameNameTestCase,
FirstExceptionTracebackTestCase x2, CrossModuleFrameTestCase,
TracebackObjectTestCase, TracebackTestCase>>testForLoopIteratorErrorsReportTheForLine)
named every IR nested-def frame ``<nested>``: the walk classes a two-argument
block frame in a generated Python method as a nested function and names it
from the TEXT -- the ``___pyNamed___:`` stamp past the block's bracket
(`___stampedNameForBlock___:`) or the line-range scan of PyCode stamps
(`___nestedFunctionNameFor___:line:`) -- and an IR method's source is the
def's Python.  Three IR namers now sit beside the text ones, each tried
before its text twin and each answering nil (so falling through) for a text
home: `___irNestedNameForBlock___:home:` reads the nested ``def NAME`` (or
``lambda``) off the home's Python at the block's own `_firstSourceOffset` --
the LINE holding it, since a def two levels down reports a beginPosition one
character high -- taking the home from the WALK (`aMethod`), because a nested
def that captures nothing is a clean block and cannot supply one;
`___irNestedNameIn___:line:` finds the innermost nested def whose INDENTATION
range contains the Python line (the padded source's line indices are the
module's; the first ``def`` is the home's own header and is skipped); and
`___irSoleNestedNameIn___:` is the sole-nested-def fallback for a nil line.
Measured on the frames fixture: `['two_deep', 'a', 'b']`,
`['takes_a_parameter', 'middle', 'leaf']`, and ``['a', 'b']`` with every
derived line forced to nil, flag-on equal to flag-off.  (6)
`ClosureCellsPerActivationTestCase>>testDeletingTheCellUnbindsTheVariable`:
``del inner.__closure__[0].cell_contents`` then `inner()` answered the value
where CPython (and the text) raise -- the closure's read of a FREE variable
was bare, on the strength of the enclosing def's flow proof, which only holds
at the def statement; the binding can be emptied later (a ``del`` in the
enclosing body, or the cell).  NameAst now emits the text's guarded read,
``(x ifNil: [UnboundLocalError ___signalUnbound___: #x])``, for a free
variable inside a closure exactly when the text's own
`___guardedLocalNeedsCheck___:` would (a body local of the binding scope, or
a deleted parameter); the closure's own locals and plain parameters stay bare
(`___irFreeReadNeedsGuard___`).  Lessons recorded: a shape that runs a block
in the middle of the enclosing method's statements exposes every
lazily-shared method temp; a hung shard's SUnit<pid>.log names the test; and
a flow proof made at the def statement does not cover a binding a closure
reads later.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 390, fallbacks = 0; flag OFF ALL_OK at compiled=0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors` (three runs: before and after the sweep fixes);
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6419 passed, 10 failed, 2 errors`,
  seven minutes, every shard reporting -- the known nine at 91041f20 by name
  (TracebackTestCase>>testForLoopExceptionPositions,
  RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken,
  WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed,
  LambdaFrameTestCase>>testLambdaFrameSpans,
  LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver,
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling) plus three:
  `WithItemPositionsTestCase>>testANestedFunctionKeepsTheColumnsToo` and
  `>>testTheExitCaseSurvivesTwoLevelsOfNesting` -- the PEP 657 column family
  (`[108, None, None]` where the text gives `[108, 26, 38]`): the nested
  functions they inspect are IR block frames now, and an IR frame has no
  columns yet; both pass flag-off in the same harness -- and `[ERROR]
  TwilioClientTestCase>>testMessagesCreate`, whose text is the
  AlmostOutOfMemory notification (15 in shard 3's log, 0 elsewhere) and which
  passes 6/6 alone flag-on: the cold-shard pressure effect.  The first sweep
  (before defects 3-6 were fixed) read `21 failed, 2 errors` and, before defect
  3 was fixed, hung.

**Where item 4's first cut leaves the census (2026-09-08; stdlib corpus,
`census_stdlib.tpz` right after `./install.sh` on gs40 as Claude3, before the
sweep fixes -- the eligibility since differs only by `nestedDef:super`): 125
modules imported, 0 failures, 5554 IR compiles, 0 fallbacks.**  Of the
stdlib's 1570 top-level defs **1390 (88.5%)** compile through IR (was 1334,
85.0%, after cuts 57-59); of its 4427 class-body methods **4166 (94.1%)** are
eligible through the seam (was 3947, 89.2%).  No `stmt:FunctionDefAst` or
`cm:stmt:FunctionDefAst` row remains (were 76 + 77).  What the nested-def
family still refuses: `nestedDef:annotations` 23 top-level + 51 methods (the
`annotate:` block -- the largest, and a regular shape: a two-argument block
over a PyDict cascade of `PyAnnotate ___annotationValue___:source:format:`
sends, each expression in a thunk), `nestedDef:reservedName` 5 (dataclasses'
`_make_synthesized_*` and reprlib.recursive_repr, whose inner defs take a
`self` parameter), `nestedDef:kwonly` 1 (asyncio.tasks.create_eager_task_factory),
`nestedDef:flow` 1 + 1 (difflib._mdiff, argparse's _parse_known_args: a nested
def read before it is bound).  Beside it: `stmt:NonlocalAst` 3 + 2 (cut 66)
and `value:LambdaAst` 19 + 28 (cut 65).  The CENSUS.md rewrite is the other
lane's; these numbers are from the raw census log.
