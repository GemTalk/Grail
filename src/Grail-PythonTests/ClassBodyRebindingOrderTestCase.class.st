Class {
	#name : 'ClassBodyRebindingOrderTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyRebindingOrderTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_body_rebinding_order.py'

]

{ #category : 'Grail-Private' }
ClassBodyRebindingOrderTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassBodyRebindingOrderTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_body_rebinding_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_rebinding_order'.

]

{ #category : 'Grail-Setup' }
ClassBodyRebindingOrderTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_body_rebinding_order' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassBodyRebindingOrderTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 7.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
