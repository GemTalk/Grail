Class {
	#name : 'ChainedIdentityCompareTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ChainedIdentityCompareTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cic_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cic_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'cic_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
ChainedIdentityCompareTestCase >> ___disagreeingKeys___ [
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
ChainedIdentityCompareTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/chained_identity_compare.py'

]

{ #category : 'Grail-Private' }
ChainedIdentityCompareTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cic_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cic_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cic_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
ChainedIdentityCompareTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('two_is_ops_all_true' 'two_is_ops_first_false' 'two_is_ops_second_false'
	    'rich_then_a_final_in' 'a_non_final_in' 'a_non_final_not_in'
	    'an_is_not_chain' 'two_in_ops' 'the_chain_short_circuits'
	    'a_middle_operand_is_evaluated_once'
	    'a_non_final_in_evaluates_its_container_once'
	    'a_mixed_three_op_chain')

]

{ #category : 'Grail-Setup' }
ChainedIdentityCompareTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cic_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'cic_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cic_ir'.
	self ___forgetCanonicalModule___: 'cic_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - chained is/in' }
ChainedIdentityCompareTestCase >> testAChainWithIsOrInIsNowEligible [
	"The assertion that fails if the cut is reverted.

	MEASURED BOTH WAYS on this fixture.  With the folder's refusal in place it
	censuses 6 `shape:CompareAst' against 2 compiled, and the behavioural test
	above STILL PASSES -- the text twin answers all twelve correctly.  With the
	cut, 8 compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'shape:CompareAst' ifAbsent: [0]) = 0
		description: 'a chain with is/in still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 8
		description: 'fewer defs compiled than the cut measured (8): '
			, counts printString

]

{ #category : 'Grail-Tests - chained is/in' }
ChainedIdentityCompareTestCase >> testEveryChainedIdentityShapeAgreesWithCPythonUnderIR [
	"All twelve shapes with the seam forced on.

	``a_non_final_in_evaluates_its_container_once'' is the one the second temp
	exists for: the container is the receiver, so a folder that re-emitted the
	comparator for the next link would call the probe twice and still answer
	True."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'chained is/in shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - chained is/in' }
ChainedIdentityCompareTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
	self assert: (stats at: #compiled) >= 8
		description: 'fewer defs compiled than the cut measured (8, against 2 with '
			, 'the refusal): compiled = ' , (stats at: #compiled) printString

]
