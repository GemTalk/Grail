Class {
	#name : 'UnpackModuleTargetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
UnpackModuleTargetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/unpack_module_target.py'

]

{ #category : 'Grail-Private' }
UnpackModuleTargetTestCase >> ___irModule___ [
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'umt_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'umt_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'umt_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
UnpackModuleTargetTestCase >> ___keys___ [
	^ #('two_globals' 'a_global_and_a_local' 'swap_two_globals'
	    'nested_tuple_target' 'starred_global' 'a_method_unpacking_globals'
	    'with_as_a_global' 'with_as_a_global_tuple' 'module_sees_the_change')

]

{ #category : 'Grail-Private' }
UnpackModuleTargetTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
UnpackModuleTargetTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'umt_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'umt_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - unpacking into module names' }
UnpackModuleTargetTestCase >> testAGlobalAndALocalLeafGoToDifferentPlaces [
	"The leaves are decided INDIVIDUALLY.  ``global c; c, loc = 'C', 'local'''
	must store one leaf on the module and the other in a temp; routing the
	statement as a whole would be wrong either way round, and each half looks
	right on its own -- only the read-back below catches it."

	| got |
	got := self ___reprOf___: 'a_global_and_a_local'.
	self assert: got = '(''C'', ''local'')'
		description: 'a mixed global/local unpack went one way for both leaves: '
			, got

]

{ #category : 'Grail-Tests - unpacking into module names' }
UnpackModuleTargetTestCase >> testEveryUnpackShapeAgreesWithCPythonUnderIR [
	"Nine checks: two globals, a global beside a local, a swap, a nested tuple,
	a starred leaf, the same statement in a METHOD (whose receiver is not the
	module), both ``with ... as'' shapes, and a read-back from module scope."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'module-target unpacks disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - unpacking into module names' }
UnpackModuleTargetTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: an eligibility refusal never reaches the seam, so
	the refused defs compiled the old way and every value above was already
	right."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 9
		description: 'fewer defs compiled than the cut measured (9): compiled = '
			, (stats at: #compiled) printString

]

{ #category : 'Grail-Tests - unpacking into module names' }
UnpackModuleTargetTestCase >> testTheModuleSeesEveryStore [
	"A leaf that stored into a method temp is right-looking inside its own
	function and invisible outside it, so every shape above is read back from
	MODULE SCOPE here -- including the ones a method and a ``with'' wrote."

	| got |
	got := self ___reprOf___: 'module_sees_the_change'.
	self assert: got = '(''wa'', ''wb'', ''from-with'', [2, 3])'
		description: 'a store did not reach the module binding: ' , got

]
