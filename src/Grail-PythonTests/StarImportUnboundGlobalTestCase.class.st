Class {
	#name : 'StarImportUnboundGlobalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'addedPath'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
StarImportUnboundGlobalTestCase >> ___forgetFixtureModules___ [
	#( 'star_import_unbound_global' 'pkg_star_global' 'pkg_star_global.guessed'
	   'pkg_star_global.listed' 'pkg_star_global.uses_listed' ) do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: []]

]

{ #category : 'Grail-Setup' }
StarImportUnboundGlobalTestCase >> setUp [
	"tests/python goes on sys.path BEFORE the load, not from inside the
	fixture: ``from pkg_star_global.guessed import *'' is expanded when the
	fixture is PARSED, and an expansion that cannot find the package drops
	every name and leaves only the runtime merge -- which is already lenient,
	so the test would pass without exercising the fix at all."

	| path |
	self ___forgetFixtureModules___.
	path := (importlib @env1:lookupModule: 'sys') @env1:___pyAttrLoad___: #path.
	addedPath := importlib grailDir , '/tests/python'.
	path @env1:insert: 0 _: addedPath.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/star_import_unbound_global.py')
		name: 'star_import_unbound_global'.

]

{ #category : 'Grail-Setup' }
StarImportUnboundGlobalTestCase >> tearDown [
	addedPath ifNotNil: [:p |
		[((importlib @env1:lookupModule: 'sys') @env1:___pyAttrLoad___: #path) @env1:remove: p]
			on: Error do: [:ex | ex return: nil].
		addedPath := nil].
	self ___forgetFixtureModules___.
	testModule := nil

]

{ #category : 'Grail-Tests' }
StarImportUnboundGlobalTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 12.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
