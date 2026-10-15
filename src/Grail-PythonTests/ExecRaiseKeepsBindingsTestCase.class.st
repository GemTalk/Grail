Class {
	#name : 'ExecRaiseKeepsBindingsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecRaiseKeepsBindingsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/exec_raise_keeps_bindings.py'

]

{ #category : 'Grail-Private' }
ExecRaiseKeepsBindingsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ExecRaiseKeepsBindingsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'exec_raise_keeps_bindings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'exec_raise_keeps_bindings'.

]

{ #category : 'Grail-Setup' }
ExecRaiseKeepsBindingsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'exec_raise_keeps_bindings' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ExecRaiseKeepsBindingsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
