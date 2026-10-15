Class {
	#name : 'BuiltinBaseSlotsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinBaseSlotsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/builtin_base_slots.py'

]

{ #category : 'Grail-Private' }
BuiltinBaseSlotsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
BuiltinBaseSlotsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'builtin_base_slots' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'builtin_base_slots'.

]

{ #category : 'Grail-Setup' }
BuiltinBaseSlotsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'builtin_base_slots' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
BuiltinBaseSlotsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
