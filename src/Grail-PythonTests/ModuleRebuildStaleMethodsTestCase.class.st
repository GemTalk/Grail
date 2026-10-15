Class {
	#name : 'ModuleRebuildStaleMethodsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ModuleRebuildStaleMethodsTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'module_rebuild_stale_methods' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_rebuild_stale_methods.py')
		name: 'module_rebuild_stale_methods'.

]

{ #category : 'Grail-Setup' }
ModuleRebuildStaleMethodsTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'module_rebuild_stale_methods' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ModuleRebuildStaleMethodsTestCase >> testRebuiltModulesMatchCPython [
	"Every row of the fixture agrees with CPython, and the one known
	divergence (a handle fetched before the reload) still diverges."

	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
