Class {
	#name : 'TypeSlotsWeakrefDictOverBaseTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeSlotsWeakrefDictOverBaseTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/type_slots_weakref_dict_over_base.py'

]

{ #category : 'Grail-Private' }
TypeSlotsWeakrefDictOverBaseTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
TypeSlotsWeakrefDictOverBaseTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'type_slots_weakref_dict_over_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'type_slots_weakref_dict_over_base'.

]

{ #category : 'Grail-Setup' }
TypeSlotsWeakrefDictOverBaseTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'type_slots_weakref_dict_over_base' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
TypeSlotsWeakrefDictOverBaseTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 25.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
