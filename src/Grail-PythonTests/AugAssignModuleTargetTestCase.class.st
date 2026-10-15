Class {
	#name : 'AugAssignModuleTargetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AugAssignModuleTargetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/augassign_module_target.py'

]

{ #category : 'Grail-Private' }
AugAssignModuleTargetTestCase >> ___irModule___ [
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ama_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ama_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ama_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
AugAssignModuleTargetTestCase >> ___keys___ [
	^ #('bump_once' 'bump_twice' 'subtract' 'concat' 'in_place_extend'
	    'a_method_bumping_a_global' 'unbound_global' 'module_sees_the_change')

]

{ #category : 'Grail-Private' }
AugAssignModuleTargetTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
AugAssignModuleTargetTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ama_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ama_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - augmented assignment to a global' }
AugAssignModuleTargetTestCase >> testAMethodAndATopLevelDefReachTheSameBinding [
	"The receiver differs by scope -- a top-level def's ``self'' IS the module,
	a class method's is not -- so the two could plausibly bump DIFFERENT
	bindings and each look right on its own.  The fixture bumps from both and
	then reads module scope: 1 + 1 from the two top-level calls, then 10 from
	the method, is 12."

	| got |
	got := self ___reprOf___: 'module_sees_the_change'.
	self assert: got = '12'
		description: 'a method and a top-level def bumped different bindings: '
			, got

]

{ #category : 'Grail-Tests - augmented assignment to a global' }
AugAssignModuleTargetTestCase >> testAnUnboundGlobalStillRaises [
	"The guarded half, on its own.  The READ carries a NameError guard and the
	WRITE does not; an emit that stored without reading, or read without the
	guard, would answer nil for a never-bound global instead of raising -- a
	wrong value rather than an error, and invisible in every other check here."

	| got |
	got := self ___reprOf___: 'unbound_global'.
	self assert: got = '"NameError: name ''never_set_anywhere'' is not defined"'
		description: 'an unbound global stopped raising NameError: ' , got

]

{ #category : 'Grail-Tests - augmented assignment to a global' }
AugAssignModuleTargetTestCase >> testEveryOperatorAndScopeAgreesWithCPythonUnderIR [
	"Eight checks: +=, -=, += on a str, += on a list (the in-place dunder), the
	same statement inside a METHOD (whose receiver is not the module), the
	unbound case, and a read-back from module scope proving all of them reached
	one binding."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'module-scope augmented assignments disagreeing with '
			, 'CPython under IR: ' , bad asArray printString

]

{ #category : 'Grail-Tests - augmented assignment to a global' }
AugAssignModuleTargetTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
	self assert: (stats at: #compiled) >= 7
		description: 'fewer defs compiled than the cut measured (7, against 1 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString

]
