Class {
	#name : 'ClassBodyDroppedStatementsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyDroppedStatementsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_body_dropped_statements.py'

]

{ #category : 'Grail-Private' }
ClassBodyDroppedStatementsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassBodyDroppedStatementsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_body_dropped_statements' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_dropped_statements'.

]

{ #category : 'Grail-Setup' }
ClassBodyDroppedStatementsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_body_dropped_statements' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
