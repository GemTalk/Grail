! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeleteGlobalNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DeleteGlobalNameTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DeleteGlobalNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DeleteGlobalNameTestCase
!
! ``del'' OF A NAME THE DEF DOES NOT OWN, THROUGH THE DIRECT-TO-IR PATH.
!
! `shape:DeleteAst' (7 class methods) was the IR path having ONE of the text's
! four ``del name'' branches.  printSmalltalkOn: emits a different thing for each
! scope the name can be in:
!
!     del <local>          ->  x := nil
!     del <module global>  ->  <module> removeDynamicInstVar: #x
!     del <class-body>     ->  <Cls> ___classBodyDefinitionalDelete___: #x
!     nonlocal __class__; del __class__
!                          ->  <Cls> ___grailClearClassCell___
!
! The IR emit had only the first, and refused any target that was not a local --
! which is exactly what ``global x; del x'' makes it, and what test_global is
! built out of.
!
! THE MODULE BRANCH IS THE UNDO OF A STORE THE IR PATH ALREADY EMITS, so the
! receiver is now a shared helper (___emitIRModuleReceiverOn___:) rather than a
! second spelling: a delete that named a different object from the store would
! leave the binding in place and report nothing.
!
! THE TWO REMAINING BRANCHES KEEP THEIR OWN CENSUS ROWS -- `DeleteAst:classBody'
! and `DeleteAst:classCell' -- rather than sharing one bucket, because they are
! different cuts.  The class-cell one is worth naming for a second reason: it
! fails as a silent NO-OP rather than an error, which is what Grail did before
! the text branch existed, leaving a later zero-argument super() with a working
! proxy where CPython reports an empty cell.
!
! WHAT LOCAL-VERSUS-GLOBAL ACTUALLY CHANGES, and what the fixture pins: deleting
! a local leaves a nil temp whose later read raises UnboundLocalError, while
! deleting a global REMOVES the binding -- so the read raises NameError, the name
! leaves globals(), and every OTHER function sees it gone.  A nil temp could
! reproduce none of those three.
! ===============================================================================

doit
DeleteGlobalNameTestCase removeAllMethods.
DeleteGlobalNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DeleteGlobalNameTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'dgn_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'dgn_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'dgn_ir'.
	self ___forgetCanonicalModule___: 'dgn_census'.
	irModule := nil
%

category: 'Grail-Private'
method: DeleteGlobalNameTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/delete_global_name.py'
%

category: 'Grail-Private'
method: DeleteGlobalNameTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison.

	``deleting_twice_raises'' is deliberately absent -- it is the fixture's
	XFAIL, pinned by its own test below."

	^ #('deleting_a_global_then_reading_it' 'another_function_sees_the_deletion'
	    'rebinding_after_the_delete' 'the_name_leaves_globals'
	    'two_globals_in_one_statement' 'a_local_and_a_global_together'
	    'a_method_deleting_a_global' 'a_plain_local_still_unbinds'
	    'subscript_and_attribute_targets')
%

category: 'Grail-Private'
method: DeleteGlobalNameTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'dgn_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dgn_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'dgn_ir'.
	^ irModule
%

category: 'Grail-Private'
method: DeleteGlobalNameTestCase
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

category: 'Grail-Tests - deleting a global'
method: DeleteGlobalNameTestCase
testEveryDeleteShapeAgreesWithCPythonUnderIR
	"Nine shapes with the seam forced on.

	``a_local_and_a_global_together'' is the one that separates the two
	branches in a single statement: ``del loc, mixed'' must nil a temp for the
	first target and remove a module binding for the second, and the two raise
	DIFFERENT exceptions afterwards."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'del shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - deleting a global'
method: DeleteGlobalNameTestCase
testDeletingAnAbsentGlobalIsStillSilent
	"The fixture's XFAIL, pinned rather than hidden: deleting an
	ALREADY-DELETED global must raise NameError, and Grail's
	``removeDynamicInstVar:'' is silent when the name is absent, so the second
	``del'' succeeds.

	Both paths do it, because the IR emit reproduces the text's send for send;
	it is a gap in the delete primitive, not in either codegen.  When that is
	fixed this test fails, which is the point of it."

	| mod got |
	mod := self ___irModule___.
	got := ((mod @env1:___pyAttrLoad___: #'r')
		@env1:__getitem__: 'deleting_twice_raises') @env1:__repr__ @env0:asString.
	self assert: got = '''no raise'''
		description: 'the silent-absent-delete divergence moved (CPython raises '
			, 'NameError on the second del): ' , got
%

category: 'Grail-Tests - deleting a global'
method: DeleteGlobalNameTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 11
		description: 'fewer defs compiled than the cut measured (11, against 3 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: DeleteGlobalNameTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dgn_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dgn_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'dgn_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - deleting a global'
method: DeleteGlobalNameTestCase
testDeletingAGlobalIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	7 `shape:DeleteAst' and 1 `cm:shape:DeleteAst' and compiles 3 defs, and the
	behavioural test above STILL PASSES -- the text twin answers all nine
	correctly.  With the cut, 10 compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'shape:DeleteAst' ifAbsent: [0]) = 0
		description: 'a def deleting a global still refuses: ' , counts printString.
	self assert: (counts at: #'cm:shape:DeleteAst' ifAbsent: [0]) = 0
		description: 'a method deleting a global still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 10
		description: 'fewer defs compiled than the cut measured (10): '
			, counts printString
%
