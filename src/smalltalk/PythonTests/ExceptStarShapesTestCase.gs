! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptStarShapesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptStarShapesTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExceptStarShapesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptStarShapesTestCase
!
! PEP 654 ``except*'' THROUGH THE DIRECT-TO-IR PATH.
!
! ``except*'' is not a variation on ``except''.  Its clauses are not
! alternatives: EVERY clause runs, each taking its matching sub-exceptions out
! of the group and passing the remainder on, and whatever is left at the end is
! re-raised.  That cannot be expressed as the ordinary path's nest of on:do:,
! which by construction runs only the first matching clause -- so it is a
! genuinely different emit rather than a widened guard, and it was the largest
! row left on the census board at 25 class methods.
!
! THE SHAPE, which ___emitIRExceptStarPartOn___: reproduces node for node from
! printExceptStarOn::
!
!     [ body ] on: BaseException do: [:ex | | rest norm rr |
!         <push catching frame>
!         norm := normalize(ex).  rest := norm.  rr := OrderedCollection new.
!         rest := clause(rest, T1, rr, [:g | n1 := g.  body1]).
!         rest := clause(rest, T2, rr, [:g | n2 := g.  body2]).
!         finish(rest, ex, rr).
!         finishReraised(rest, ex, rr, norm) ]
!
! ONE handler block threading a remainder, not a nest.  The normalized group is
! kept SEPARATELY from the remainder because the remainder is consumed clause by
! clause and the final merge needs the whole group back to project onto.
!
! WHAT THE IR EMIT DELIBERATELY DOES NOT COPY.  The text stores ___curPos___
! between the two finish calls so its backwards text scan blames the ``except*''
! CLAUSE for a re-raise and the try body for an unhandled remainder.  That is a
! TEXT mechanism; this path passes ``pos: nil'' to ___pushCatchingFrame___
! throughout and derives every line from the captured ips, so the same
! distinction is a builder stamp -- applied under the text's own condition (one
! clause, inside a function), because CPython's answer is which clause actually
! re-raised and a single stamp cannot name a different one per run.
!
! The fixture self-verifies under CPython 3.14, so every expectation is
! CPython's behaviour and not Grail's opinion of it.  Two of them were WRONG in
! the first draft and CPython said so: ``return'' is a SyntaxError inside an
! except* block, and an exception raised by a clause body propagates BARE when
! there is no unmatched remainder to merge it with.
! ===============================================================================

doit
ExceptStarShapesTestCase removeAllMethods.
ExceptStarShapesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExceptStarShapesTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'except_star_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'except_star_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'except_star_ir'.
	self ___forgetCanonicalModule___: 'except_star_census'.
	irModule := nil.
%

category: 'Grail-Private'
method: ExceptStarShapesTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('one_clause_matches' 'every_matching_clause_runs'
	    'clauses_run_in_source_order' 'the_as_name_binds_a_group'
	    'a_naked_exception_is_wrapped' 'an_unmatched_remainder_propagates'
	    'a_wholly_unmatched_group_propagates' 'a_tuple_of_types_matches_either'
	    'the_clause_body_can_raise' 'a_bare_raise_reraises_the_subgroup'
	    'else_runs_when_the_body_does_not_raise'
	    'else_is_skipped_when_a_clause_ran' 'finally_runs_when_a_clause_ran'
	    'finally_runs_when_nothing_raised'
	    'finally_runs_while_a_remainder_propagates'
	    'a_local_written_in_a_clause_is_visible_after'
	    'nested_except_star_statements')
%

category: 'Grail-Private'
method: ExceptStarShapesTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'except_star_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'except_star_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/except_star_shapes.py')
		name: 'except_star_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ExceptStarShapesTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - PEP 654 except*'
method: ExceptStarShapesTestCase
testEveryExceptStarShapeAgreesWithCPythonUnderIR
	"All seventeen shapes with the seam forced on.

	``every_matching_clause_runs'' and ``clauses_run_in_source_order'' are the
	two that a nest-of-on:do: emit could not pass: one raise has to run BOTH
	clauses, in source order.  The rest pin the pieces around that -- the
	remainder propagating, the ``as'' name binding a GROUP rather than a leaf, a
	bare ``raise'' re-raising its own subgroup, and else/finally keeping the
	meanings the ordinary statement gives them."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'except* shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - PEP 654 except*'
method: ExceptStarShapesTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is precisely the failure an eligibility widening can hide.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: ExceptStarShapesTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'except_star_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'except_star_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/except_star_shapes.py')
		name: 'except_star_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - PEP 654 except*'
method: ExceptStarShapesTestCase
testExceptStarIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it: an eligibility refusal never reaches the seam, so it is
	not a FALLBACK and the test above would keep passing on the text twin.

	MEASURED BOTH WAYS on this fixture.  With ``except*'' refused it censuses 1
	top-level def compiled and 17 `shape:TryAst-exceptStar'; with the cut, 18
	compiled and no refusal of any kind -- every def in the file goes through
	IR."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'shape:TryAst-exceptStar' ifAbsent: [0]) = 0
		description: 'except* still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 18
		description: 'fewer top-level defs compiled than the cut measured (18): '
			, counts printString
%
