Class {
	#name : 'RmtreeSymlinksTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
RmtreeSymlinksTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
RmtreeSymlinksTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
RmtreeSymlinksTestCase >> setUp [

	importlib @env1:modules removeKey: #'rmtree_symlinks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rmtree_symlinks.py')
		name: 'rmtree_symlinks'

]

{ #category : 'Grail-Tests - shutil' }
RmtreeSymlinksTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests - shutil' }
RmtreeSymlinksTestCase >> testIgnoreErrorsSwallowsWhatRmtreeWouldRaise [

	self assertAll: #('rmtree_with_ignore_errors_swallows_the_refusal'
		'rmtree_with_ignore_errors_swallows_a_missing_path')

]

{ #category : 'Grail-Tests - shutil' }
RmtreeSymlinksTestCase >> testRmtreeLeavesWhatALinkInTheTreePointedAt [

	self assertAll: #('rmtree_removes_the_tree_it_was_given'
		'rmtree_leaves_what_a_link_pointed_at'
		'rmtree_leaves_the_file_a_link_pointed_at'
		'rmtree_unlinks_a_link_nested_deep_in_the_tree')

]

{ #category : 'Grail-Tests - shutil' }
RmtreeSymlinksTestCase >> testRmtreeOfALinkIsRefusedAndRemovesNothing [

	self assertAll: #('rmtree_of_a_link_to_a_directory_is_refused'
		'rmtree_of_a_refused_link_removes_nothing'
		'rmtree_of_a_link_to_a_file_is_refused_the_same_way'
		'rmtree_of_a_dangling_link_is_file_not_found')

]

{ #category : 'Grail-Tests - shutil' }
RmtreeSymlinksTestCase >> testRmtreeReportsAMissingPathAndAFile [

	self assertAll: #('rmtree_of_a_missing_path_is_file_not_found'
		'rmtree_of_a_file_is_not_a_directory')

]
