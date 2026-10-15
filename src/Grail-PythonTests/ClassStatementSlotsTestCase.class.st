Class {
	#name : 'ClassStatementSlotsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassStatementSlotsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_statement_slots.py'

]

{ #category : 'Grail-Private' }
ClassStatementSlotsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassStatementSlotsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_statement_slots' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_statement_slots'.

]

{ #category : 'Grail-Setup' }
ClassStatementSlotsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_statement_slots' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassStatementSlotsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 31.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
