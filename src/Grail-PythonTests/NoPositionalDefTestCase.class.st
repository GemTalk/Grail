Class {
	#name : 'NoPositionalDefTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
NoPositionalDefTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'no_positional_def' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_positional_def.py')
		name: 'no_positional_def'.

]

{ #category : 'Grail-Setup' }
NoPositionalDefTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'no_positional_def' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
NoPositionalDefTestCase >> testEveryCallPathMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
