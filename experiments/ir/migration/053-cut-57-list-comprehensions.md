## Progress — cut 57 (list comprehensions)

Roadmap item 8, first cut: `value:ListCompAst` was the largest remaining
refusal family in the 2026-09-07 census (71 stdlib class methods + 45
top-level defs).

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `squares(xs)`,
`pairs(xs, ys)`, `unpack(items)` and the method `K.doubled(self)`):

    ^ (([| ___r___ |
        ___r___ := (OrderedCollection perform: #new env: 0).
        [
        [| ___src1___ |
          ___src1___ := (xs).
          [| ___iter1___ x |
            ___iter1___ := ___src1___ __iter__.
            [true] whileTrue: [
              x := ([___iter1___ __next__] @env0:on: StopIteration do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
              (cond) ___isTruthy___ ifTrue: [
                [| ___iter2___ b |  ___iter2___ := (ys) __iter__.  [true] whileTrue: [ ... ] ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
              ].
            ].
          ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
        ] value
        ] @env0:on: Exception do: [:___tex___ | ___tex___ @env0:___pushTracebackFrame___: (PyCode @env0:name: 'squares' filename: '...' firstlineno: 1) lineno: 2 colno: 27 endLineno: 2 endColno: 29 line: '    return [x * x for x in xs]'. ___tex___ @env0:pass].
        ___r___
    ] value))

-- ComprehensionAst class>>emitGenerators:from:on:innerBody:outerSource:
around ListCompAst's accumulator.  Everything is a BLOCK temp: the
accumulator, the hoisted outermost iterable (evaluated in the ENCLOSING scope,
before any target temp exists -- CPython's rule, and what lets `[x * 2 for x
in x]` read the parameter), one iterator temp per clause, and the clause's
target names, so a target shadows an enclosing method temp or parameter for
the comprehension's extent only (`shadow`: `x = 100; ys = [x + 1 for x in
xs]; return (x, ys)` answers `(100, [...])`, the text's read of the shadowing
`x` going through the unbound guard because the def also declares it).  A
tuple target lands in `___item1___`, is normalised through `PythonCoroutine
___unpackNormalize___:` and stored leaf by leaf off `(___item1___ __getitem__:
i)`, as ForAst's tuple branch.  The outermost clause is wrapped in the
traceback-frame handler that prepends ONE frame for the enclosing function at
the iterable's PEP 657 position.

**What the IR emits**: the same sends, the same block nesting, through two
new builder primitives -- `blockWithTemps:do:` (a zero-argument
GsComBlockNode declaring block temps, leaves handed to the body) and
`withLocals:do:` (a SCOPED shadow of the builder's local table: the target
names resolve to the clause block's temp leaves for the body's duration and
to whatever they were before -- a method temp, a parameter, nothing --
afterwards, restored under ensure:).  The clause emitter is class-side on
ComprehensionAst (`___emitIRGenerators___:from:on:innerBody:outerSource:`,
`___emitIRClause___:...`, `___emitIRFilters___:...`, `___emitIRUnpack___:...`,
`___emitIRTracebackHandlerFor___:on:`) so the three other comprehension kinds
reuse it with their own accumulator and innermost statement.  The
`[...] value` of the accumulator and source blocks is a plain env-0 `value`
send to the block node; `[true] whileTrue: [...]` is the ForAst loop's
inlined whileTrue:, without the break / continue handlers a comprehension
cannot need.  The traceback handler is emitted as the text's: its frame's
code is `CallAst functionBeingCompiled`'s name and line, which
`___installIRMethodOn___:` sets around the IR build exactly as printBodyOn:
does.  Measured on `[x for x in None]` and `[x + "a" for x in [1]]` caught by
a text def: the IR traceback names the same two frames with the same lines
and source text as the text path's; only the PEP 657 carets differ, the
known IR-frame column family (the text's carets underline the whole return
statement there, CPython's the iterable, so neither is right).

**Scoping in the predicates.** A comprehension target is not a local of the
def -- the parser keeps it out of the body's `variables` and `writes`
(declareWrite:) -- so the flow analysis and the eligibility walk had to learn
the comprehension's own scope: `ComprehensionAst class>>___irScopeLocals___:
generators:` is the enclosing set plus every clause target, the element /
filters / later iterables are judged against it and the FIRST iterable
against the enclosing set (`___irClausesEligible___:locals:`); the read
collector (`___irReadsOf___:parts:into:locals:`) treats the first iterable's
reads as the enclosing scope's and drops the target names from every other
read, ForAst's rule.  A new hook, `AbstractNode>>___irChildLocals___:`,
lets the census walk (`FunctionDefAst>>___irFirstRefusedChildOf___:`) judge
a comprehension's children in that scope too; without it a comprehension
refused for something else was blamed on its own target read.  A target
named like a builtin (`[dir + 1 for dir in xs]`) already shadows it in the
call classifier through the text's own `___pythonBindingShadows___:`, which
consults the enclosing comprehension targets.

**What is refused**, each a census label of its own: an `async for` clause
(`Comprehension:async`), a starred target (`Comprehension:starTarget` -- the
text's slice shape needs a Smalltalk `-` send the IR does not make, as for
the for-loop), a subscript or attribute target (`Comprehension:target-
SubscriptAst` / `-AttributeAst`, the `___emitTargetStore___:` shapes).  A
walrus in a comprehension refuses as `value:NamedExprAst`, unchanged.

Fixture: sixteen module defs -- squares, two filters, nested `for`, an inner
iterable reading the outer target, tuple and nested-tuple targets, a target
shadowing a local, a parameter, a builtin, `_`, a nested comprehension, a
nested comprehension iterating the outer target, comprehensions as call
arguments, a comprehension after a for loop over the same name, the
iterator-protocol TypeError and a body TypeError caught -- and class `Comp`
(a self-send in the element, `for` over `self.items` and another instance's,
an `enumerate` tuple target with a filter), all values verified under CPython
3.14.6.  `lc_after_target_read` first read its for-loop target after the
loop and was refused `flow` (a zero-trip loop binds nothing, cut 31's rule --
not a comprehension matter); it pre-binds the name now.  Compiled 280 -> 302
(all 22 new defs), fallbacks 0; with the flag OFF the fixture reads ALL_OK at
compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 302, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  first run `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 9 failed,
  2 errors` -- the known nine at 9b72095b by name (the five PEP 657 span
  tests, LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling) plus two,
  both re-run alone flag-on in a fresh topaz:
  `TracebackTestCase>>testTheLineCacheIsNotPoisonedByRecycledMethodOops`
  failed alone too (``only 280 derivations checked'') and is attributed to
  this cut and fixed (below); `WeakReferenceTestCase>>testCallbackFiredOnCollection`
  ERRORed on an AlmostOutOfMemory notification (4 in that run's shard logs)
  and passes 13/13 alone -- the recorded cold-shard pressure effect.

**The line-cache test.** `testTheLineCacheIsNotPoisonedByRecycledMethodOops`
compares the cached ip -> line accessor against the UNCACHED TEXT derivation
(`___derivePythonLineForMethod___:ip:`, the ``___curPos___ :='' scan), which
answers nil for an IR-built method -- its source is the Python def.  Its
fixture, frame_depth.py, is fourteen defs that are almost all list
comprehensions over `traceback.extract_tb`; under the flag twelve of them
became IR with this cut (census: 2 refusals left, a nested def and a genexp),
the checked count fell from >500 to exactly 280 (40 generations x 7) and the
test's own vacuous-pass guard fired -- correctly: it was about to prove
nothing.  The bug it guards (asOop-keyed caches recycling) belongs to the
cache, not to either codegen path, so the test now loads its fixture on the
text path whatever the flag says (`___irCodegenForce___: false`, the flag
restored in its ensure:) and reads 46/46 flag-off, 45/46 flag-on (the known
testForLoopExceptionPositions).

**The sweep is at the memory ceiling, and that is not this cut.**  Two
re-runs of the flag-on cold sweep after the test fix both lost SHARD 1 to
``VM temporary object memory is full'' (old space 374911/374912K, once as
``old space overflow'' at 1828 scavenges / 261 markSweeps, once as ``too many
markSweeps since last successful scavenge'') -- `4672 run, 4650 passed, 9
failed, 13 errors`, the twelve extra ERRORs all AlmostOutOfMemory-driven
(ZipfileTestCase's `encodeAsUTF8` at the top of every stack, a
SuperShadowingTestCase, a WeakrefModuleTestCase), 12 notifications in the
surviving shards, and the crash landing on a different test each time
(PropertyNotDynamicClassAttributeTestCase, then SubprocessTestCase).  The
CONTROL -- the same sweep on a clean `git checkout 9b72095b`, installed on the
same stone as the same user -- reproduces it exactly: shard 1 crashes, `4672
run, 4653 passed, 9 failed, 10 errors`, 9 notifications, the same
Zipfile/Warning/Tarfile ERROR shapes.  Cuts 53-54's sweeps on this machine
had ZERO notifications, so the pressure arrived with the merge of cuts 55-56
(186 + 89 more methods through the seam) and is the ``larger temp-object
cache for cold shards'' follow-up the roadmap already lists, now urgent: with
shard 1 blind the sweep cannot see PrivateNameManglingTestCase or anything
else in that shard.  A candidate contributor, measured but not yet
attributed: an IR method's attached source is the def slice PREFIXED with
(beginLine - 1) newlines so the VM reports absolute lines
(___installIRMethodBodyOn___:), and over the vendored stdlib that padding is
26.2 MB against 13.8 MB of actual def source -- each late method in a long
module carries kilobytes of newlines.  Whether that or the text methods'
larger generated sources dominates a cold shard's old space has not been
measured.
