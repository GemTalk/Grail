"
A class in a def that redefines its own name with the old binding as a base
(#1461).  On the IR arm the class helper declared the name twice -- as the
class it answers and as an enclosing local it reads -- which is a CompileError
the module load cannot survive.  Fixture: tests/python/local_class_redefines_itself.py.
"
Class {
	#name : 'LocalClassRedefinesItselfTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
LocalClassRedefinesItselfTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/local_class_redefines_itself.py'

]

{ #category : 'Grail-Private' }
LocalClassRedefinesItselfTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
LocalClassRedefinesItselfTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'local_class_redefines_itself' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'local_class_redefines_itself'.

]

{ #category : 'Grail-Setup' }
LocalClassRedefinesItselfTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'local_class_redefines_itself' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
LocalClassRedefinesItselfTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 7.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
