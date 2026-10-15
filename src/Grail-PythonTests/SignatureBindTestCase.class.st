Class {
	#name : 'SignatureBindTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
SignatureBindTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'signature_bind' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signature_bind.py')
		name: 'signature_bind'.

]

{ #category : 'Grail-Setup' }
SignatureBindTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'signature_bind' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
SignatureBindTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 27.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
