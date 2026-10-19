Class {
	#name : 'ImportlibFinderSurfaceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ImportlibFinderSurfaceTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ImportlibFinderSurfaceTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ImportlibFinderSurfaceTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/importlib_finder_surface.py'
		name: 'importlib_finder_surface'

]

{ #category : 'Grail-Tests' }
ImportlibFinderSurfaceTestCase >> testAbcClassesCanBeSubclassed [

	self assertAll: #('abc_names' 'abc_subclass_defaults')

]

{ #category : 'Grail-Tests' }
ImportlibFinderSurfaceTestCase >> testAMetaPathFinderSuppliesAModuleThroughItsOwnLoader [

	self assertAll: #('spec_keeps_loader' 'meta_path_loader_runs')

]

{ #category : 'Grail-Tests - coverage' }
ImportlibFinderSurfaceTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11

]

{ #category : 'Grail-Tests' }
ImportlibFinderSurfaceTestCase >> testPathFinderSearchesTheEntriesItIsGiven [

	self assertAll: #('pathfinder_module' 'pathfinder_package'
		'pathfinder_namespace' 'pathfinder_missing')

]

{ #category : 'Grail-Tests' }
ImportlibFinderSurfaceTestCase >> testSmallerNames [

	self assertAll: #('magic_number' 'file_reader' 'namespace_loader')

]
