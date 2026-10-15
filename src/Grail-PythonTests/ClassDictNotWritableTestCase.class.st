Class {
	#name : 'ClassDictNotWritableTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassDictNotWritableTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_dict_not_writable.py'

]

{ #category : 'Grail-Private' }
ClassDictNotWritableTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassDictNotWritableTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_dict_not_writable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_dict_not_writable'.

]

{ #category : 'Grail-Setup' }
ClassDictNotWritableTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_dict_not_writable' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassDictNotWritableTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 15.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
