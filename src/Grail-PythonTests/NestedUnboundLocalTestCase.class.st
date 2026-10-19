Class {
	#name : 'NestedUnboundLocalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NestedUnboundLocalTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_unbound_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nested_unbound_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'nested_unbound_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
NestedUnboundLocalTestCase >> ___disagreeingKeys___ [
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
NestedUnboundLocalTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/nested_unbound_local.py'

]

{ #category : 'Grail-Private' }
NestedUnboundLocalTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nested_unbound_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nested_unbound_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'nested_unbound_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
NestedUnboundLocalTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('branch_not_taken' 'bound_after_the_read'
	    'comprehension_does_not_bind_the_name' 'deleted_then_read'
	    'unbound_only_on_one_branch' 'plainly_bound'
	    'bound_in_both_branches' 'bound_by_a_loop_then_read'
	    'parameters_are_bound_on_entry' 'a_none_valued_local_is_not_unbound'
	    'reads_an_enclosing_local' 'shadows_an_enclosing_local'
	    'a_closure_two_levels_down')

]

{ #category : 'Grail-Setup' }
NestedUnboundLocalTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nested_unbound_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'nested_unbound_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nested_unbound_ir'.
	self ___forgetCanonicalModule___: 'nested_unbound_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - nested unbound local' }
NestedUnboundLocalTestCase >> testEveryUnboundShapeAgreesWithCPythonUnderIR [
	"All thirteen shapes with the seam forced on.

	Five must RAISE: a binding in a branch that does not run, a binding after
	the read, a comprehension that does not bind the enclosing name (Python 3
	gives it its own scope), a ``del'' that unbinds again, and the unbound arm
	of a two-arm def.  The rest must NOT raise -- the plainly bound local, both
	arms binding, a loop-built value, parameters of every kind, and a local
	holding None, which is the one a nil-test guard could get wrong."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'unbound-local shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - nested unbound local' }
NestedUnboundLocalTestCase >> testNestedFlowIsNowEligible [
	"The assertion that catches the OTHER revert -- putting the refusal back.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	6 `nestedDef:flow' and compiles 8 of the 14, and the behavioural test above
	STILL PASSES, because a refused closure sends its enclosing def to text and
	the text guards every such read.  With the cut, 14 compiled and no refusal."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'nestedDef:flow' ifAbsent: [0]) = 0
		description: 'a nested def still refuses on the flow walk: '
			, counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 14
		description: 'fewer defs compiled than the cut measured (14): '
			, counts printString

]

{ #category : 'Grail-Tests - nested unbound local' }
NestedUnboundLocalTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is exactly what the old refusal did.

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

]
