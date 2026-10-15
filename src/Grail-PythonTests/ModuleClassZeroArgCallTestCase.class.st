Class {
	#name : 'ModuleClassZeroArgCallTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleClassZeroArgCallTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/module_class_zero_arg_call.py'

]

{ #category : 'Grail-Private' }
ModuleClassZeroArgCallTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ModuleClassZeroArgCallTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'module_class_zero_arg_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'module_class_zero_arg_call'.

]

{ #category : 'Grail-Setup' }
ModuleClassZeroArgCallTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'module_class_zero_arg_call' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ModuleClassZeroArgCallTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 23.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
