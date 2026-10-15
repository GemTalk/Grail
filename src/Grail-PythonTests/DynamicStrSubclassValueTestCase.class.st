Class {
	#name : 'DynamicStrSubclassValueTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DynamicStrSubclassValueTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/dynamic_str_subclass_value.py'

]

{ #category : 'Grail-Private' }
DynamicStrSubclassValueTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DynamicStrSubclassValueTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'dynamic_str_subclass_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'dynamic_str_subclass_value'.

]

{ #category : 'Grail-Setup' }
DynamicStrSubclassValueTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'dynamic_str_subclass_value' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
DynamicStrSubclassValueTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 37.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
