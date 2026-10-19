Class {
	#name : 'StructFormatWhitespaceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StructFormatWhitespaceTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/struct_format_whitespace.py'

]

{ #category : 'Grail-Private' }
StructFormatWhitespaceTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
StructFormatWhitespaceTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'struct_format_whitespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'struct_format_whitespace'.

]

{ #category : 'Grail-Setup' }
StructFormatWhitespaceTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'struct_format_whitespace' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
StructFormatWhitespaceTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 16.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
