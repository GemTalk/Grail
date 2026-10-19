Class {
	#name : 'DeleteGlobalNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DeleteGlobalNameTestCase >> ___censusCountsForFixture___ [
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

]

{ #category : 'Grail-Private' }
DeleteGlobalNameTestCase >> ___disagreeingKeys___ [
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

]

{ #category : 'Grail-Private' }
DeleteGlobalNameTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/delete_global_name.py'

]

{ #category : 'Grail-Private' }
DeleteGlobalNameTestCase >> ___irModule___ [
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

]

{ #category : 'Grail-Private' }
DeleteGlobalNameTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison.

	``deleting_twice_raises'' is deliberately absent -- it is the fixture's
	XFAIL, pinned by its own test below."

	^ #('deleting_a_global_then_reading_it' 'another_function_sees_the_deletion'
	    'rebinding_after_the_delete' 'the_name_leaves_globals'
	    'two_globals_in_one_statement' 'a_local_and_a_global_together'
	    'a_method_deleting_a_global' 'a_plain_local_still_unbinds'
	    'subscript_and_attribute_targets')

]

{ #category : 'Grail-Setup' }
DeleteGlobalNameTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'dgn_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'dgn_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'dgn_ir'.
	self ___forgetCanonicalModule___: 'dgn_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - deleting a global' }
DeleteGlobalNameTestCase >> testDeletingAGlobalIsNowEligible [
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

]

{ #category : 'Grail-Tests - deleting a global' }
DeleteGlobalNameTestCase >> testDeletingAnAbsentGlobalIsStillSilent [
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

]

{ #category : 'Grail-Tests - deleting a global' }
DeleteGlobalNameTestCase >> testEveryDeleteShapeAgreesWithCPythonUnderIR [
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

]

{ #category : 'Grail-Tests - deleting a global' }
DeleteGlobalNameTestCase >> testTheIRArmActuallyCompiledTheFixture [
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

]
