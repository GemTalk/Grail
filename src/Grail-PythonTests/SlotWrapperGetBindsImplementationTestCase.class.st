Class {
	#name : 'SlotWrapperGetBindsImplementationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SlotWrapperGetBindsImplementationTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/slot_wrapper_get_binds_implementation.py'

]

{ #category : 'Grail-Private' }
SlotWrapperGetBindsImplementationTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
SlotWrapperGetBindsImplementationTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'slot_wrapper_get_binds_implementation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'slot_wrapper_get_binds_implementation'.

]

{ #category : 'Grail-Setup' }
SlotWrapperGetBindsImplementationTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'slot_wrapper_get_binds_implementation' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
SlotWrapperGetBindsImplementationTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 18.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
