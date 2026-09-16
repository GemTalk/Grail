## Progress — cut 66 (`nonlocal`, and annotated nested defs)

Roadmap item 4, third cut: `stmt:NonlocalAst` (3 stdlib top-level defs + 2
class methods after cut 64) and, folded in because it was the largest
remaining nested-def refusal, `nestedDef:annotations` (23 + 51).

**`nonlocal`: the text has no cell mechanism for it.**  Trace of `counter()`
and `K.nl(self)`: the nested block simply writes the enclosing temp --
``n := (n) @env1:___augmentedOp___: (1) inplace: #'__iadd__:' binary: #'__add__:'``
inside `[:___positional___ :___kwargs___ | ...]` -- because a Smalltalk block
captures its home's temps by reference; NonlocalAst>>printSmalltalkOn: emits
nothing.  The `___cell_<name>___` reader/writer pairs the roadmap mentions
belong to a CLASS body nested in a def (the class's methods are separate
methods with no lexical link), not to a def in a def.  So the IR needs no
runtime shape either: `NonlocalAst>>___irEligibleStatementLocals___:` admits a
declaration whose every name is an in-scope local and
`___emitIRStatementOn___:` emits nothing; the parser already strips the
declared names from the nested body's `variables` / `writes`, so they are not
block temps, and a store or augmented store to the name resolves through
`leafFor:` to the ENCLOSING leaf -- a method temp, or for two levels of
nesting the middle closure's block temp (`nl_two_levels`, `nl_mid_owner`).
The enclosing flow analysis already saw the write: the def statement's
`___irWriteLocalNamesInto___:locals:` (cut 64) reports the nested body's
writes to enclosing names, so the target must be bound before the def
(`n = 0` first); a nonlocal that FIRST binds its target from inside the closure
refuses as `flow` when the enclosing body reads it afterwards.  A closure's
read of the target takes cut 64's guard, as the text's does.  A nonlocal that
reaches past a class body stays refused (`___enclosingFunctionLocalBeyondClass___:`,
the AugAssign method-mode rule of cut 53).

**Two `nonlocal` shapes stay REFUSED, both found by the flag-on sweep rather
than by reading.**  The first build admitted every declaration whose names were
in-scope locals, and the cold sweep answered with four failures the flag-off
run did not have.  Both refusals are `NonlocalAst`'s own, named in the census:

* `NonlocalAst:classCell` -- **`nonlocal __class__`**.  It is the one name
  `popScope` EXEMPTS from stripping (it keeps it local, so the Smalltalk temp is
  declared and the method compiles at all), because CPython gives `__class__` to
  every method of a class as an implicit SHARED cell.  The text answers that by
  routing the class's `__class__` reads through the cell whenever anything
  rebinds it (`ClassDefAst>>___classCellIsRebindable___`); the IR has the READ
  shape (NameAst's `#dunderClass` arm, `___grailClassCellValue___`) but no
  transport for the STORE, so `nonlocal __class__; del __class__` emptied a
  fresh local nobody reads and left the cell intact.  Measured:
  `SuperPreconditionErrorsTestCase` >> `testDeletingTheClassCellEmptiesItForSuper`
  and `testTheCellIsSharedByEveryMethodOfTheClass`, three of
  tests/python/super_precondition_errors.py's keys (`empty_class_cell`,
  `empty_cell_again`, `bare_read_after_del`) answering NO RAISE where CPython
  raises.  This is test_super's `tearDown` shape, so it is worth a cut of its
  own rather than a quiet approximation.
* `NonlocalAst:del` -- a **`del` of a declared name**, the enclosing side of the
  same problem.  The delete UNBINDS the enclosing binding, and the enclosing
  method's own flow proof has no way to record that: cut 64's
  `___irWriteLocalNamesInto___:locals:` reports the nested body's writes as
  BINDINGS, which is the opposite of what a `del` does.  So the enclosing body's
  later read was emitted bare and answered nil where CPython raises
  UnboundLocalError -- `UnboundLocalErrorTestCase >>
  test_nested_nonlocal_del_keeps_guard_and_raises`, over
  tests/python/unbound_local_guard.py's `nested_nonlocal_del`.  Note this was a
  BEHAVIOURAL failure, not the `sourceString` kind: the test's first assertion
  reads the emitted text, but the `should:raise:` after it failed too.

Both refusals cost the stdlib corpus nothing: neither row appears in the
125-module census (below), so the shapes live only in these fixtures.

**One shape the IR does that the text cannot.**  `def nl_assign(x): def
record(v): nonlocal x; ... x = v` -- a nonlocal REBINDING THE ENCLOSING DEF'S
PARAMETER.  The text fails to compile it flag-off (``expected an assignable
variable'', CompileError 1029/1001 at module load): the parameter is a bare
Smalltalk argument, and both the block's store and the closure cell's setter
write it.  The IR's first build fell back on the same shape (`generateFromIR
failed: emitStore: unexpected store to method or block arg`) -- and the
fallback then died in the text.  `___irReassignedParamNames___` now also
counts a parameter that any nested def declares `nonlocal`
(`___irNestedNonlocalNames___`), so it takes the cut-29 transport (`_x`
argument, `x` temp) and the closure writes the temp: `nl_assign(0)` answers
`(2, [0, 1])`, CPython's value, 0 fallbacks.  It cannot be in the fixture
(the fixture must load flag-off); it lives in the probe module nlprobe.py,
and `nl_cell_view` was rewritten over a local for the same reason.  Recorded
as a text-path defect: a nonlocal of an enclosing parameter takes the whole
module down under the text.

**Annotated nested defs** (`___emitIRAnnotateBlockOn___:`): emitAnnotateBlockOn:'s
PEP 649 block, send for send --

    ___pyNamed___: 'inner' annotate: [:___annArgs___ :___annKw___ | ((PyDict @env0:new)
        @env0:at: 'a' put: (PyAnnotate @env1:___annotationValue___: [int] source: 'int'
            format: (___annArgs___ @env0:at: 1));
        @env0:at: 'return' put: (...); @env0:yourself)] [doc: '...']

-- a `blockWithArgs:temps:do:` over the two arguments, a PyDict cascade of
`at:put:` sends ending in `yourself`, each value a `PyAnnotate
___annotationValue___:source:format:` send (env 1) whose expression sits in a
zero-argument thunk and whose source text is the node's
`___annotationSourceString___`.  Built at the DEF SITE, outside the closure's
local bindings and with `annotationOwnerDefNode` set, so the expressions
resolve in the enclosing scope as CPython evaluates them; the name stamp
becomes the one keyword send `___pyNamed___:annotate:` /
`___pyNamed___:annotate:doc:`.  Eligibility: every annotation an emittable
value of the enclosing scope with a spellable source text, else
`nestedDef:annotationExpr`.  `inner.__annotations__` answers `{'a': int,
'b': 'str', 'return': str}` flag-on as flag-off.

**The thunk is `nestedFunctionDo:`, and that is load-bearing.**  Each
annotation expression is emitted with `inNestedFunction` set, so a read of an
enclosing local carries the text's free-read guard
(`(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`,
`NameAst>>___irFreeReadNeedsGuard___`).  The enclosing flow proof does NOT
cover the annotate block -- PEP 649 exists precisely so an annotation naming a
not-yet-bound local can be built now and read later -- and the first build,
which emitted the read bare, answered nil where CPython raises: the flag-on
sweep failed `Pep649AnnotationsTestCase >>
testUpdateWrapperDefersAnUnresolvedAnnotation` with ``NO RAISE'' for a forward
reference bound after the def (`x: resolved_afterwards`, then
`resolved_afterwards = str`).  `UnboundLocalError` is a `NameError` subclass,
which is what makes the fixture's `except NameError` the right catch.

Fixture: `nl_counter` (`+=` through nonlocal, twice, then a call after the
read), `nl_two_levels` and `nl_mid_owner` (the target two levels up / owned by
the middle closure), `nl_cell_view` (`__closure__[0].cell_contents` before and
after the write), `nl_annotated` (three annotations including a string one
and a defaulted parameter), `nl_annotated_docd` (annotate + doc), class
`Nonlocaler` (nonlocal inside a method's closure reading `self.v`; an
annotated closure in a method).  Compiled 407 -> 417 (all 10), fallbacks 0;
flag OFF ALL_OK at compiled=0.  The probe modules: nprobe.py 15 -> 17
(`counter`, `K.nl`), nprobe2.py 9 -> 10 (`annot`), OUT unchanged; only
`kwonly` (`nestedDef:kwonly`) and `self_inner` (`nestedDef:reservedName`)
remain on text there.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 417, fallbacks = 0; flag OFF ALL_OK at compiled=0; `python3 tests/python/ir_codegen_smoke.py` ALL_OK: True;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 10 failed, 1 errors`,
  every shard reporting, 0 AlmostOutOfMemory notifications -- **exactly cut
  65's residue, name for name**: FrameReceiverSuggestionTestCase>>
  testASuggestionMayNameTheReceiver, LambdaFrameTestCase>>testLambdaFrameSpans,
  TracebackTestCase>>testForLoopExceptionPositions, ImportlibTestCase>>
  testInstanceMethodNoOuterBlock, LiveFrameProbeResilienceTestCase>>
  testTheTempsFastPathNeedsNoSource, RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken, the three
  WithItemPositionsTestCase column tests, and [ERROR]
  PrivateNameManglingTestCase>>testPrivateNameMangling.  Nothing
  nonlocal- or annotation-specific.

The four cut-66 regressions above were all found by an EARLIER flag-on sweep
of this cut and are fixed, not absorbed: re-run alone flag-on they pass
(UnboundLocalErrorTestCase 21/21, Pep649AnnotationsTestCase 12/12,
SuperPreconditionErrorsTestCase 13/13), with the same classes flag-off in the
same harness as the control.  That sweep also lost shards 1 and 3 to a FATAL
``VM temporary object memory is full, old space overflow'' (old gen at
374911/374912K of run_tests.sh's ~490MB `GEM_TEMPOBJ_CACHE_SIZE`, 3190 of
6431 tests run) while a second worktree's four shards were running on the same
host; it did not recur on the clean sweep.  Worth knowing that a cold flag-on
sweep sits near that ceiling -- `GRAIL_TEST_COLD=1` commits nothing, so every
IR-built method of the run stays in temp object memory, and each cut adds
more of them.

**Census** (125 vendored modules, flag forced, after `install.sh` so the
denominator is real -- a test run's framework deploy turns most of the stdlib
into cache hits).  Against the cut-64 census on the same corpus, cuts 65-66
close four rows and open none: `value:LambdaAst` 19 -> 0 and
`cm:value:LambdaAst` 28 -> 0 (cut 65); `nestedDef:annotations` 23 -> 0,
`cm:nestedDef:annotations` 51 -> 0, `stmt:NonlocalAst` 3 -> 0 and
`cm:stmt:NonlocalAst` 2 -> 0 (cut 66).  Top-level defs compiled 1390 -> 1426;
eligible class methods 4166 -> 4241.  Neither `NonlocalAst:classCell` nor
`NonlocalAst:del` appears at all.

What the freed defs now refuse for is the ranking for the next cut in this
lane -- 18 nested defs, in four rows:

| row | defs | example |
| --- | --- | --- |
| `nestedDef:reservedName` | 12 | `dataclasses._make_synthesized_init` |
| `cm:nestedDef:reservedName` | 2 | `werkzeug.local._ProxyIOp.__init__` |
| `nestedDef:flow` / `cm:nestedDef:flow` | 1 + 1 | `difflib._mdiff`, `argparse.ArgumentParser._parse_known_args` |
| `cm:nestedDef:super` | 1 | `_py_warnings.deprecated.__call__` |
| `nestedDef:kwonly` | 1 | `asyncio.tasks.create_eager_task_factory` |

`reservedName` -- a nested def with a `self` (or other Smalltalk
pseudo-variable) parameter or local, where the text renames the reads and the
IR has no transport -- is 14 of the 18 and grew from 5 as annotations stopped
masking it.  It is the next cut.
