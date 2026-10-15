Class {
	#name : 'NumbersAbcAbstractTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NumbersAbcAbstractTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/numbers_abc_abstract.py'

]

{ #category : 'Grail-Private' }
NumbersAbcAbstractTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
NumbersAbcAbstractTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'numbers_abc_abstract' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'numbers_abc_abstract'.

]

{ #category : 'Grail-Setup' }
NumbersAbcAbstractTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'numbers_abc_abstract' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
NumbersAbcAbstractTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 21.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
NumbersAbcAbstractTestCase >> testEveryRowMatchesCPythonWhenRunByPath [
	"The same rows from a copy run by runpy.run_path, not imported: the
	explicit __abstractmethods__ row only shows its bug in that role."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
