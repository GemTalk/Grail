Class {
	#name : 'InstanceClassAssignmentTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InstanceClassAssignmentTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/instance_class_assignment.py'

]

{ #category : 'Grail-Private' }
InstanceClassAssignmentTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
InstanceClassAssignmentTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'instance_class_assignment' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'instance_class_assignment'.

]

{ #category : 'Grail-Setup' }
InstanceClassAssignmentTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'instance_class_assignment' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
InstanceClassAssignmentTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 28.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
