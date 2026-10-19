Class {
	#name : 'TypeBuiltClassOverridesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
TypeBuiltClassOverridesTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'type_built_class_overrides' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_built_class_overrides.py')
		name: 'type_built_class_overrides'.

]

{ #category : 'Grail-Setup' }
TypeBuiltClassOverridesTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'type_built_class_overrides' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
TypeBuiltClassOverridesTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
