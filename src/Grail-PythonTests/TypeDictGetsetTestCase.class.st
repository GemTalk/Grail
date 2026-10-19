Class {
	#name : 'TypeDictGetsetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeDictGetsetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/type_dict_getset.py'

]

{ #category : 'Grail-Private' }
TypeDictGetsetTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
TypeDictGetsetTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'type_dict_getset' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'type_dict_getset'.

]

{ #category : 'Grail-Setup' }
TypeDictGetsetTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'type_dict_getset' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
TypeDictGetsetTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
