Class {
	#name : 'SlotMemberDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SlotMemberDescriptorTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/slot_member_descriptor.py'

]

{ #category : 'Grail-Private' }
SlotMemberDescriptorTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
SlotMemberDescriptorTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'slot_member_descriptor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'slot_member_descriptor'.

]

{ #category : 'Grail-Setup' }
SlotMemberDescriptorTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'slot_member_descriptor' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
SlotMemberDescriptorTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
