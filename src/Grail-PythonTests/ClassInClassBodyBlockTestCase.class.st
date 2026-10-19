Class {
	#name : 'ClassInClassBodyBlockTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassInClassBodyBlockTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_in_class_body_block.py'

]

{ #category : 'Grail-Private' }
ClassInClassBodyBlockTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassInClassBodyBlockTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_in_class_body_block' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_in_class_body_block'.

]

{ #category : 'Grail-Setup' }
ClassInClassBodyBlockTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_in_class_body_block' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassInClassBodyBlockTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 9.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
