Class {
	#name : 'RealpathSymlinksTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
RealpathSymlinksTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
RealpathSymlinksTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
RealpathSymlinksTestCase >> setUp [

	importlib @env1:modules removeKey: #'realpath_symlinks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/realpath_symlinks.py')
		name: 'realpath_symlinks'

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testASymlinkLoopIsAnsweredAndThenReported [

	self assertAll: #('realpath_of_a_loop_answers_the_path_it_could_not_resolve'
		'strict_realpath_of_a_loop_raises_too_many_levels')

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 18 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 18

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testPathResolveResolvesTheLinkToo [

	self assertAll: #('path_resolve_resolves_the_link'
		'path_resolve_answers_a_path_object'
		'path_resolve_strict_of_a_dangling_link_is_file_not_found')

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testRealpathAnswersWhatCannotBeResolvedUnchanged [

	self assertAll: #('realpath_answers_a_missing_path_unchanged'
		'realpath_answers_what_a_dangling_link_names'
		'realpath_leaves_a_path_with_no_links_alone'
		'realpath_agrees_with_posixpath_itself')

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testRealpathResolvesALinkWhereverItAppears [

	self assertAll: #('realpath_resolves_a_link_to_a_directory'
		'realpath_resolves_a_link_in_the_middle_of_a_path'
		'realpath_resolves_a_relative_link_against_its_own_directory'
		'realpath_resolves_a_chain_of_links'
		'realpath_unwinds_dotdot_after_following'
		'realpath_resolves_a_relative_argument_against_the_directory')

]

{ #category : 'Grail-Tests - os.path' }
RealpathSymlinksTestCase >> testStrictRealpathRaisesWhereCPythonRaises [

	self assertAll: #('strict_realpath_resolves_what_is_there'
		'strict_realpath_of_a_dangling_link_is_file_not_found'
		'strict_realpath_of_a_missing_component_is_file_not_found')

]
