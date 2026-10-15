Class {
	#name : 'DecoratorReadsOwnNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DecoratorReadsOwnNameTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/decorator_reads_own_name.py'

]

{ #category : 'Grail-Private' }
DecoratorReadsOwnNameTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DecoratorReadsOwnNameTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'decorator_reads_own_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'decorator_reads_own_name'.

]

{ #category : 'Grail-Setup' }
DecoratorReadsOwnNameTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'decorator_reads_own_name' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
DecoratorReadsOwnNameTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 9.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
