Class {
	#name : 'LambdaArityMessageTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
LambdaArityMessageTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/lambda_arity_messages.py'

]

{ #category : 'Grail-Private' }
LambdaArityMessageTestCase >> ___irModule___ [
	"The fixture again with the IR path FORCED ON, under a second module name.
	The guards have a separate emitter on each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'lambda_arity_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'lambda_arity_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'lambda_arity_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
LambdaArityMessageTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
LambdaArityMessageTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'lambda_arity_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'lambda_arity_messages'.

]

{ #category : 'Grail-Setup' }
LambdaArityMessageTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'lambda_arity_messages' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'lambda_arity_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'lambda_arity_ir'.
	testModule := nil.
	irModule := nil

]

{ #category : 'Grail-Tests' }
LambdaArityMessageTestCase >> testEveryMessageMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 32.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
LambdaArityMessageTestCase >> testEveryMessageMatchesCPythonUnderIR [
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
LambdaArityMessageTestCase >> testTheIRArmDidNotFallBack [
	"Correct answers prove nothing if the IR build fell back to text."
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]
