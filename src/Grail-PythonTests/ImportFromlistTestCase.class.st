Class {
	#name : 'ImportFromlistTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ImportFromlistTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'import_fromlist' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_fromlist.py')
		name: 'import_fromlist'.

]

{ #category : 'Grail-Setup' }
ImportFromlistTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'import_fromlist' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ImportFromlistTestCase >> testFromlistMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 20.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
