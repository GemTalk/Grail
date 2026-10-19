Class {
	#name : 'OperandTypeErrorMessagesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
OperandTypeErrorMessagesTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/operand_typeerror_messages.py'

]

{ #category : 'Grail-Private' }
OperandTypeErrorMessagesTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
OperandTypeErrorMessagesTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'operand_typeerror_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'operand_typeerror_messages'.

]

{ #category : 'Grail-Setup' }
OperandTypeErrorMessagesTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'operand_typeerror_messages' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
OperandTypeErrorMessagesTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 41.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
