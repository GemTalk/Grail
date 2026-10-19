Class {
	#name : 'StaticmethodDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StaticmethodDefaultsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/staticmethod_defaults.py'

]

{ #category : 'Grail-Private' }
StaticmethodDefaultsTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
StaticmethodDefaultsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'staticmethod_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'staticmethod_defaults'.

]

{ #category : 'Grail-Setup' }
StaticmethodDefaultsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'staticmethod_defaults' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
StaticmethodDefaultsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 26.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
StaticmethodDefaultsTestCase >> testEveryRowMatchesCPythonWhenRunByPath [
	"The same rows from a copy run by runpy.run_path."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
