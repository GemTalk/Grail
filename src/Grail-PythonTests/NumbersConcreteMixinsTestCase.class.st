Class {
	#name : 'NumbersConcreteMixinsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NumbersConcreteMixinsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/numbers_concrete_mixins.py'

]

{ #category : 'Grail-Private' }
NumbersConcreteMixinsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
NumbersConcreteMixinsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'numbers_concrete_mixins' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'numbers_concrete_mixins'.

]

{ #category : 'Grail-Setup' }
NumbersConcreteMixinsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'numbers_concrete_mixins' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
NumbersConcreteMixinsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 22.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
