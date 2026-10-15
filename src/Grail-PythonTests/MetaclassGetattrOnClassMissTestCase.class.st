Class {
	#name : 'MetaclassGetattrOnClassMissTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassGetattrOnClassMissTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/metaclass_getattr_on_class_miss.py'

]

{ #category : 'Grail-Private' }
MetaclassGetattrOnClassMissTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
MetaclassGetattrOnClassMissTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'metaclass_getattr_on_class_miss' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'metaclass_getattr_on_class_miss'.

]

{ #category : 'Grail-Setup' }
MetaclassGetattrOnClassMissTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'metaclass_getattr_on_class_miss' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
MetaclassGetattrOnClassMissTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
