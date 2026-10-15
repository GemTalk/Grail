Class {
	#name : 'UndefinedDecoratorNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
UndefinedDecoratorNameTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/undefined_decorator_name.py'

]

{ #category : 'Grail-Private' }
UndefinedDecoratorNameTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
UndefinedDecoratorNameTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'undefined_decorator_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'undefined_decorator_name'.

]

{ #category : 'Grail-Setup' }
UndefinedDecoratorNameTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'undefined_decorator_name' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
UndefinedDecoratorNameTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
