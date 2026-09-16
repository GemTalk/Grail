## Progress — cut 79 (the method-local class's own METHOD BODIES)

Cuts 76-78 made the class STATEMENT work inside an IR method and said so
carefully: the `+355 class methods` were the ENCLOSING class-body methods, and
the inner class's own methods stayed text, refused as
`cm:method:classNotAtModuleScope` — a row that read **842 in both halves** of
that matched pair. This cut retires it. Those methods now go through the same
class-method seam a module-level class's methods use (cut 36).

**Why the body needs no new emit, read off the oracle rather than reasoned.**
`GRAIL_CODEGEN_TRACE_DIR` on a method-local class carrying an `__init__`, a
plain method, a captured read and a module-global read: the generated method
source is the SAME shape as a module-level class's, statement for statement.
The three differences are all things that already have a name:

* the qualname prefix in the argument-error literals —
  `mlc_methods.<locals>.P.get()` where a module-level class says `C.get()`,
  which is the qualname machinery both paths share;
* a captured enclosing local reads `(self @env1:___classCell___:
  #'___cell_tag___')` — a plain one-argument env-1 send on `self`, resolved at
  run time out of the class's own attrs — where a module-level class's method
  would name a module attribute. The IR path does not emit it yet, so those
  refuse, now as `NameAst:classCell` instead of being masked;
* `super()` and `__class__` were already refused for a method-local class
  (`CallAst:super-methodLocalClass`, `NameAst:__class__-methodLocalClass`).

So the body was never the problem. What differs is the LIFETIME.

**The lifetime, which is the whole cut.** A method-local class is rebuilt on
every CALL of its enclosing def, from the compiled helper of cut 76, and the
first of those calls may come long after `___irPurgeDefTableForModule___:`. Cut
36's registration therefore cannot be used as-is on two counts: it is RELEASED
on first consumption (`___irInstallDef:` drops the entry, because a
module-scope class builds once) and it is PURGED at end of load. A registration
that survived both would hold the def's AST — and through the parent chain the
whole module's — for the session, which is exactly the retention recorded at
`___irForgetClassDefIds___:` as what killed the first cold flag-on sweeps.

Neither of the two routes considered up front is what landed. Making the
registration survive (route a) is the retention above. Driving
`PyMethodIRBuilder` from the `FunctionDefAst` reachable through the enclosing
method's IR closure (route b) does not exist to be driven: the closure holds IR
nodes, not AST.

What landed is **build at emit time, memoize the finished IR NODE TREE, and
regenerate per class**:

* the build happens at the seam's REGISTRATION point, inside the class body's
  method loop — which is the point cut 76 already chose for generating the
  class's text, so `functionBeingCompiled`, the scope stack,
  `classBeingCompiled` and `selfParameterName` are the ones the text path would
  have used. It is also where the census row is taken, so eligibility and the
  build see one context;
* the memo (`importlib ___irSharedMethodTable___`) holds the builder, whose IR
  tree names no AST node: the position map is SmallIntegers, the attached
  source is a String, and the only class in it is the one regeneration
  replaces. **Measured: after six test modules the memo holds 347 entries and
  `___irDefTable___` holds 0** — nothing of the AST is retained;
* each run of the class-build statement calls
  `PyMethodIRBuilder>>___irRegenerateOn___:`, which re-points the methNode at
  THIS class and generates. `attachPositionMap` recomputes from `attachedSource`
  each time, so it is idempotent. That is primitive 679 over a finished node
  tree against the source compile of the whole method text that the flag-off
  path does on every one of those same calls, so the transport is cheaper than
  what it replaces, not dearer.

**Why regeneration and not one shared method** — the first attempt did share
one, on the strength of `___copyMethod___:from:to:category:`'s measured note
that "the method's inClass never matters to its execution". It matters here,
and not to execution. A `GsNMethod` carries an `inClass`, and
`whichClassIncludesSelector:environmentId:` is a CACHING PRIMITIVE (`flags :=
16r10000 bitOr: envId`, "cache lookup result") that answers that class rather
than the one whose dictionary holds the entry. So a getter built against the
stand-in reported `PythonInstance` as its owner while its read-only setter stub
reported the real class, `___grailPyDefinedAccessorPair___:setter:` saw a pair
spanning two classes and declined it, and `W(4).doubled` answered the
BoundMethod. One fixture entry, `mlc_body_property`, is that regression.
Regeneration gives each class its own method with its own correct `inClass`
(measured directly: two generations of one methNode for two classes, both
running, both carrying the same Python source, each owning its selector).

**Registration is gated so the two kinds of class register in exactly OPPOSITE
emits** (`importlib ___irClassSeamEnabled___`, now one line): a module-scope
class while its emit is the module's own output and not a transport helper's; a
method-local class ONLY while its emit is the transport one. Its other emit is
the one inside an enclosing class-body method's text twin — generated whatever
path builds that method, since it is the fallback literal of its own install
statement — and registering there would register every such def twice, once for
a statement that runs and once for a statement that runs only if the enclosing
method fell back.

**Eligibility reads the parent chain, not the compile context.**
`classDefIsModuleScope` answers false for THREE shapes and only one of them is
this one (`isModuleScopeClassDef`: no module class, nested in a class body,
nested in a function), so `FunctionDefAst>>___irEnclosingClassIsMethodLocal___`
walks up to the nearest `ClassDefAst` and then up again, answering true at the
first `FunctionDefAst` / `LambdaAst` and false at the first `ClassDefAst`. Two
new refusals, both because the build has no real class yet:

* `method:methodLocalSlots` — a `__slots__` entry is an instVar leaf resolved by
  OFFSET against the class the method is built on (cut 51), and here the class
  does not exist at emit time, its base is a runtime expression, and every call
  makes a new one. 15 class methods in the subset;
* `method:methodLocalNestedClass` — a `class` statement inside such a method
  would have cut 76 compile ITS helper onto `aBuilder targetClass`, which for
  this build is the stand-in, i.e. onto `PythonInstance`. 6 class methods.

**Census.** Fourteen-module test subset, measured as a MATCHED PAIR on one
stone with `./install.sh` immediately before each half — `git checkout
origin/main -- <the five sources>` for the control, then back. Both halves read
the SAME denominators (4103 class methods, 918 top-level defs), which is how the
pair is known to be a pair:

| | before | after |
| --- | ---: | ---: |
| class methods eligible | 3071 / 4103 (74.8%) | **3696 / 4103 (90.1%)** |
| top-level defs compiled | 801 / 918 | 801 / 918 |
| runtime `compiled` (`___irStats___`) | 3869 | **4335** |

`cm:method:classNotAtModuleScope` 842 -> **5**. The row-by-row account, so the
total is checkable: `NameAst:classCell` +120, `NameAst:super` +38,
`method:methodLocalSlots` +15, `NonlocalAst:notLocal` +11,
`NameAst:__class__-methodLocalClass` +8, `method:noSelf` +7,
`method:methodLocalNestedClass` +6, `classNotAtModuleScope` 5 left,
`NameAst:reservedIdentifier` +3, `method:selfRebound` +2,
`NonlocalAst:classCell` +1, `frameSensitive-globals` +1 = 217, and
842 - 217 = **625**, which is the `cm:eligible` move exactly.

**The two numbers disagree by 159, and the reason is worth stating rather than
smoothing.** Eligibility moves +625; the runtime build count moves +466. The
census judges a def at the ORDINARY emit, where the enclosing def's own fate is
not yet known; the BUILD happens only in the transport emit, which exists only
when the class statement itself is admitted and the enclosing def is IR-built.
So a method-local class whose `classDef:*` row still refuses (decorated 23,
keywords 14, nonlocalBelow 9, bodyStatement 3, outerBinding 1) contributes
eligible methods that nothing builds. Those become real the moment the class
decorator / keyword cut lands; until then the honest headline is the runtime
one.

Stdlib corpus (`experiments/ir/census_stdlib.tpz`, 125 imports, `./install.sh`
first): top-level defs unchanged at 1570 / 1592; class methods 4544 ->
**4565 / 4621 (98.79%)**; runtime compiled 6106 -> **6127**, 0 fallbacks. Only
+21, and for the reason cut 76 already recorded: the stdlib is not where this
refusal lived. `cm:method:classNotAtModuleScope` reads 3 there now and
`cm:NameAst:classCell` 10.

`CENSUS.md` IS regenerated, on the combined tree, and the reason given here for
not regenerating it was stale rather than a real blocker: the corpus-2 scripts
(`census_tests_00..02.tpz`) landed with the census fix in #887 and are in the
repository. The subset pair above still stands as the measurement FOR THIS CUT --
a matched pair on one stone with agreeing denominators is the stronger evidence
for a delta -- but the committed board no longer has to be reasoned around.

**Fixture**: seven shapes, each chosen for something the shared build could get
wrong that nothing else in the file would notice — `mlc_body_twice` (two calls,
two classes, two instances, `type(p) is not type(q)`), `mlc_body_property` (the
inClass regression above), `mlc_body_decorated` (@staticmethod and @classmethod,
which build onto the metaclass), `mlc_body_varargs` (`*args`, a keyword-only
default, and a default the prologue binds), `mlc_body_generator` (the
`___wrapsBody___` branch, whose build must also stop short of installing),
`mlc_body_raises` (a raise unwinding out of such a method), and `mlcer79_run`
(a class inside a class-body METHOD, the corpus's dominant shape, including a
@property there). `mlc_body_traceback` is called from a test of its own rather
than from RESULTS, because `import traceback` would put a few hundred stdlib
defs into the exact compiled count `testIRPathWasActuallyTaken` asserts — and
that count would then depend on whether some earlier test had already imported
it. Compiled 500 -> **536**, 0 fallbacks, RESULTS true with the flag on and off
and under CPython 3.14.6. The traceback through a method-local class's method
names the method and shows ITS line with carets, measured before the fixture
was written.

**Gates** (both from wt/d on gs40 through `scripts/with_stone_lock.sh`; 8 of 8
shards reporting, per-shard counts summing to the suite line, no "Login
failed"):

* flag-off `6561 run, 6561 passed, 0 failed, 0 errors`;
* flag-on cold sweep `6561 run, 6554 passed, 6 failed, 1 errors` — SEVEN
  residue items, and a flag-on cold CONTROL run from `origin/main` on the same
  stone reads `6560 run, 6553 passed, 6 failed, 1 errors` with the same seven
  BY NAME: `LiveFrameProbeResilienceTestCase>>testTheProbeClassifiesBothShapes`,
  `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
  `NestedOperandSpanTestCase>>testALiveFrameKeepsTheStatementsLine`,
  `FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`,
  `TracebackTestCase>>testForLoopExceptionPositions`,
  `ImportlibTestCase>>testInstanceMethodNoOuterBlock`, and the
  `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling` recursion-guard
  flap. The 6561/6560 difference is the one test method this cut adds. Neither
  flag-on run shows an `AlmostOutOfMemory` or a "temporary object memory" line
  in any shard.

**A census trap worth recording, because it produced a confident wrong pair.**
The first "after" reading was `cm:eligible` 2735 and a 3127 denominator — a
REGRESSION on a change that can only add. It was measured immediately after a
`run_tests.sh`, whose Flask-deploy and concurrent-import acceptance checks
COMMIT canonically-deployed modules; the census's imports then hit that cache
and compiled nothing, so both the numerator and the DENOMINATOR fell. The next
`./install.sh` bumps `GrailRuntimeGeneration` and drops the stale canonical
registries, which is why the control run that followed looked normal and made
the reading look like a real regression. **A census pair is only a pair when
both halves ran immediately after an `install.sh`, and the denominators are the
check that says so.**

**What is next in this family, and it is now unambiguous.**
`cm:NameAst:classCell` at 120 is the single biggest remaining refusal in the
subset, and it is the cheapest kind: the text emits `(self @env1:___classCell___:
#'___cell_x___')`, one env-1 send on `self` with a Symbol literal, which the IR
path can already spell. After that, `NameAst:super` 43 (a method-local class's
`super()`), then the class DECORATOR and KEYWORD cut that cuts 76-78 left, which
would also convert ~50 of the eligible-but-unbuilt methods above into real ones.
