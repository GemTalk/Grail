Class {
	#name : 'MethodArityMessageTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
MethodArityMessageTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'method_arity_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_arity_messages.py')
		name: 'method_arity_messages'.

]

{ #category : 'Grail-Setup' }
MethodArityMessageTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'method_arity_messages' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
MethodArityMessageTestCase >> testEveryMessageMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 28.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
