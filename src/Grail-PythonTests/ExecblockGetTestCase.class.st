Class {
	#name : 'ExecblockGetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecblockGetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/execblock_get.py'

]

{ #category : 'Grail-Private' }
ExecblockGetTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ExecblockGetTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'execblock_get' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'execblock_get'.

]

{ #category : 'Grail-Setup' }
ExecblockGetTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'execblock_get' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ExecblockGetTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 29.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
ExecblockGetTestCase >> testEveryRowMatchesCPythonWhenRunByPath [
	"The same rows from a copy run by runpy.run_path, where the fixture's own
	module-level functions are ExecBlocks too."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
