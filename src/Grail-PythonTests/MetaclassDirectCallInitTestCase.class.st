Class {
	#name : 'MetaclassDirectCallInitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
MetaclassDirectCallInitTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'metaclass_direct_call_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_direct_call_init.py')
		name: 'metaclass_direct_call_init'.

]

{ #category : 'Grail-Setup' }
MetaclassDirectCallInitTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'metaclass_direct_call_init' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
MetaclassDirectCallInitTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
