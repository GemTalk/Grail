Class {
	#name : 'JsonLoadsKeywordsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
JsonLoadsKeywordsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'json_loads_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/json_loads_keywords.py')
		name: 'json_loads_keywords'.

]

{ #category : 'Grail-Setup' }
JsonLoadsKeywordsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'json_loads_keywords' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
JsonLoadsKeywordsTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
