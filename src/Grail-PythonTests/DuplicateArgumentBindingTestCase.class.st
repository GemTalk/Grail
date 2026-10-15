Class {
	#name : 'DuplicateArgumentBindingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DuplicateArgumentBindingTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/duplicate_argument_binding.py'

]

{ #category : 'Grail-Private' }
DuplicateArgumentBindingTestCase >> ___irModule___ [
	"The fixture again with the IR path FORCED ON, under a second module name.
	The guard has a separate emitter on each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'duplicate_argument_binding_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'duplicate_argument_binding_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
DuplicateArgumentBindingTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DuplicateArgumentBindingTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'duplicate_argument_binding'.

]

{ #category : 'Grail-Setup' }
DuplicateArgumentBindingTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'duplicate_argument_binding_ir'.
	testModule := nil.
	irModule := nil

]

{ #category : 'Grail-Tests' }
DuplicateArgumentBindingTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 21.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
DuplicateArgumentBindingTestCase >> testEveryRowMatchesCPythonUnderIR [
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
DuplicateArgumentBindingTestCase >> testTheIRArmDidNotFallBack [
	"Correct answers prove nothing if the IR build fell back to text."
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]
