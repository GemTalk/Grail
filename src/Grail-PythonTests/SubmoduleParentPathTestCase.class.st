Class {
	#name : 'SubmoduleParentPathTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SubmoduleParentPathTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SubmoduleParentPathTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SubmoduleParentPathTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/submodule_parent_path.py'
		name: 'submodule_parent_path'

]

{ #category : 'Grail-Tests' }
SubmoduleParentPathTestCase >> testAPackageRegisteredUnderAnotherNameFindsItsSubmodules [
	"setuptools' shape: a meta-path finder answers ``spp_alias'' with the
	already-imported spp_real.  Its submodules, a relative import inside one,
	and two namespace levels under it all live in spp_real's directory."

	self assertAll: #('alias_is_the_real_package' 'alias_submodule'
		'alias_relative_import' 'alias_namespace_levels')

]

{ #category : 'Grail-Tests' }
SubmoduleParentPathTestCase >> testAPackageThatEditsItsPathFindsItsSubmodules [

	self assertAll: #('appended_path_entry' 'replaced_path')

]

{ #category : 'Grail-Tests - coverage' }
SubmoduleParentPathTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8

]

{ #category : 'Grail-Tests' }
SubmoduleParentPathTestCase >> testOrdinarySubmodulesAreUnchanged [

	self assertAll: #('ordinary_submodule' 'missing_submodule')

]
