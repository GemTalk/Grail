Class {
	#name : 'NewResultSkipsInitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NewResultSkipsInitTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/new_result_skips_init.py'

]

{ #category : 'Grail-Private' }
NewResultSkipsInitTestCase >> ___irModule___ [
	"The fixture again with the IR path FORCED ON, under a second module name.
	The check is emitted by each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'new_result_skips_init_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'new_result_skips_init_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'new_result_skips_init_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
NewResultSkipsInitTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
NewResultSkipsInitTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'new_result_skips_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'new_result_skips_init'.

]

{ #category : 'Grail-Setup' }
NewResultSkipsInitTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'new_result_skips_init' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'new_result_skips_init_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'new_result_skips_init_ir'.
	testModule := nil.
	irModule := nil

]

{ #category : 'Grail-Tests' }
NewResultSkipsInitTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 9.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
NewResultSkipsInitTestCase >> testEveryRowMatchesCPythonUnderIR [
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
NewResultSkipsInitTestCase >> testTheIRArmDidNotFallBack [
	"Correct answers prove nothing if the IR build fell back to text."
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]
