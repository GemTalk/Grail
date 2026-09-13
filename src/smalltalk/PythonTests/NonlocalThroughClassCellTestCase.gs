! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalThroughClassCellTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalThroughClassCellTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalThroughClassCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalThroughClassCellTestCase
!
! A METHOD-LOCAL CLASS WRITING AN ENCLOSING FUNCTION'S LOCAL, THROUGH IR.
!
!     def test_x():
!         calls = 0
!         class Key:
!             def __eq__(self, other):
!                 nonlocal calls
!                 calls += 1
!
! The CPython test corpus is full of this -- a counter owned by the test method
! and bumped from a class defined inside it.  A method string-compiles with no
! lexical link to the enclosing temp, so Grail cannot assign it directly: the
! class stores TWO cells per captured-and-written name, both created in the
! ENCLOSING scope,
!
!     Key ___pyAttrStore___: #'___cell_calls___'       put: [calls].
!     Key ___pyAttrStore___: #'___cellSetter_calls___' put: [:v | calls := v].
!
! and the inner method's write compiles to
! ``(self ___classCellSetter___: #'___cellSetter_calls___') value: <new>''.
!
! WHY IT REFUSED, AND WHY THE REFUSAL WAS RIGHT UNTIL NOW.  Under the flag a
! method-local class statement travels as a COMPILED-TEXT HELPER (cut 76/79)
! whose frame is not the enclosing method's, so the captures are handed in as
! the enclosing frame's own zero-argument reader BLOCKS.  The helper's prologue
! seeds a temp of the enclosing name from each block -- which means
! ``calls := v'' inside it compiles happily and writes the helper's local COPY.
! The enclosing binding never moves.  That is a wrong answer, not a missing
! feature, so ClassDefAst refused any ``nonlocal'' below the class outright,
! costing 19 rows on the suite manifest (`classDef:nonlocalBelow').
!
! WHAT THE CUT IS.  The recorded reason for the refusal was that a setter's
! identifier is an assignment TARGET and no block call can be one.  True, and
! beside the point: the enclosing frame can hand in a ONE-ARGUMENT block that
! performs the assignment, exactly as it hands in a zero-argument block that
! performs the read.  ___cellSetterSourceFor___: routes the setter cell's body
! through ``___irSetter_<i>___ value: ___cellSetVal___'', and the write lands
! where the reader reads.
!
! WHAT IT DOES NOT CLOSE.  The inner class's own methods still compile as text
! -- the helper emits the class body with the class-method seam suppressed --
! so the 21 `cm:NonlocalAst:notLocal' rows those methods contribute are a
! separate cut.  This one is the ENCLOSING half.
!
! Every check reads the counter from the ENCLOSING function after the class's
! method has run, never from inside the class: reading it back through the same
! cell would pass against a write that went into a copy, which is precisely the
! failure a wrong implementation produces.
! ===============================================================================

doit
NonlocalThroughClassCellTestCase removeAllMethods.
NonlocalThroughClassCellTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalThroughClassCellTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nonlocal_cell_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'nonlocal_cell_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nonlocal_cell_ir'.
	self ___forgetCanonicalModule___: 'nonlocal_cell_census'.
	irModule := nil.
%

category: 'Grail-Private'
method: NonlocalThroughClassCellTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('read_and_write' 'write_only' 'write_twice_accumulates'
	    'two_names_do_not_collide' 'the_enclosing_read_sees_it_immediately'
	    'a_read_only_capture_still_works' 'read_and_write_the_same_name'
	    'a_loop_variable_is_written')
%

category: 'Grail-Private'
method: NonlocalThroughClassCellTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nonlocal_cell_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nonlocal_cell_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonlocal_through_class_cell.py')
		name: 'nonlocal_cell_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NonlocalThroughClassCellTestCase
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

category: 'Grail-Tests - nonlocal through the class cell'
method: NonlocalThroughClassCellTestCase
testTheWriteReachesTheEnclosingBindingUnderIR
	"The assertion the cut exists for.  A setter that wrote the helper's own
	copy would leave every one of these reading its initial value, and
	``write_twice_accumulates'' would answer 4 rather than 7 even if a single
	write happened to land."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'nonlocal-through-cell shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - nonlocal through the class cell'
method: NonlocalThroughClassCellTestCase
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
method: NonlocalThroughClassCellTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nonlocal_cell_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nonlocal_cell_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonlocal_through_class_cell.py')
		name: 'nonlocal_cell_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - nonlocal through the class cell'
method: NonlocalThroughClassCellTestCase
testTheEnclosingDefsAreNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it: an eligibility refusal never reaches the seam, so it is
	not a FALLBACK and the test above would keep passing on the text twin.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	1 top-level def compiled and 7 `classDef:nonlocalBelow'; with the cut, 8
	compiled and none.

	The inner class's methods are NOT part of this cut and stay at 7
	`cm:NonlocalAst:notLocal' either way -- the helper emits the class body with
	the class-method seam suppressed, so they compile as text.  Asserted as a
	floor rather than an equality so that later cut does not have to come back
	and edit this number."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'classDef:nonlocalBelow' ifAbsent: [0]) = 0
		description: 'the enclosing defs still refuse as classDef:nonlocalBelow: '
			, counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 8
		description: 'fewer top-level defs compiled than the cut measured (8): '
			, counts printString
%
