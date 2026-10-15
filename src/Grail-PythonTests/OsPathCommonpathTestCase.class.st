Class {
	#name : 'OsPathCommonpathTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsPathCommonpathTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsPathCommonpathTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsPathCommonpathTestCase >> setUp [

	importlib @env1:modules removeKey: #'os_path_commonpath' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_commonpath.py')
		name: 'os_path_commonpath'

]

{ #category : 'Grail-Tests - os.path' }
OsPathCommonpathTestCase >> testAbsolutePaths [

	self assertAll: #('only_the_root_in_common'
		'a_shared_prefix'
		'one_contains_the_other'
		'the_root_and_a_child'
		'redundant_separators_and_trailing_slash'
		'dot_components_are_dropped'
		'a_single_path'
		'component_not_character_prefix'
		'pytest_sees_an_unrelated_tree_as_rooted_at_slash')

]

{ #category : 'Grail-Tests - os.path' }
OsPathCommonpathTestCase >> testErrorsAndArgumentKinds [

	self assertAll: #('an_empty_sequence'
		'absolute_and_relative'
		'str_and_bytes'
		'bytes'
		'a_generator_argument')

]

{ #category : 'Grail-Tests - os.path' }
OsPathCommonpathTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 16 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 16

]

{ #category : 'Grail-Tests - os.path' }
OsPathCommonpathTestCase >> testRelativePaths [

	self assertAll: #('relative_paths_stay_relative' 'relative_with_nothing_in_common')

]
