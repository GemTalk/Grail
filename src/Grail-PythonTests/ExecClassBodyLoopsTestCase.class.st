Class {
	#name : 'ExecClassBodyLoopsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecClassBodyLoopsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/exec_class_body_loops.py'

]

{ #category : 'Grail-Private' }
ExecClassBodyLoopsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ExecClassBodyLoopsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'exec_class_body_loops' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'exec_class_body_loops'.

]

{ #category : 'Grail-Setup' }
ExecClassBodyLoopsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'exec_class_body_loops' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ExecClassBodyLoopsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
