Class {
	#name : 'GeneratorFrameLocalsWriteTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GeneratorFrameLocalsWriteTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/generator_frame_locals_write.py'

]

{ #category : 'Grail-Private' }
GeneratorFrameLocalsWriteTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
GeneratorFrameLocalsWriteTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'generator_frame_locals_write' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'generator_frame_locals_write'.

]

{ #category : 'Grail-Setup' }
GeneratorFrameLocalsWriteTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'generator_frame_locals_write' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
GeneratorFrameLocalsWriteTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
