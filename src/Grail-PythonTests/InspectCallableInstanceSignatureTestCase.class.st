Class {
	#name : 'InspectCallableInstanceSignatureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
InspectCallableInstanceSignatureTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'inspect_callable_instance_signature' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_callable_instance_signature.py')
		name: 'inspect_callable_instance_signature'.

]

{ #category : 'Grail-Setup' }
InspectCallableInstanceSignatureTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'inspect_callable_instance_signature' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
InspectCallableInstanceSignatureTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
