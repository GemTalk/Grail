Class {
	#name : 'PathWalkAndMountTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PathWalkAndMountTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PathWalkAndMountTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PathWalkAndMountTestCase >> setUp [

	importlib @env1:modules removeKey: #'path_walk_and_mount' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/path_walk_and_mount.py')
		name: 'path_walk_and_mount'

]

{ #category : 'Grail-Tests - os.path' }
PathWalkAndMountTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 19 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 19

]

{ #category : 'Grail-Tests - os.path' }
PathWalkAndMountTestCase >> testIsJunctionIsFalseOffWindows [

	self assertAll: #('isjunction_is_false_off_windows'
		'path_is_junction_is_false_too')

]

{ #category : 'Grail-Tests - os.path' }
PathWalkAndMountTestCase >> testIsMountAnswersForTheRootAndForADirectory [

	self assertAll: #('ismount_of_the_root_directory'
		'ismount_of_an_ordinary_directory' 'ismount_of_a_link_or_a_missing_path'
		'path_is_mount_answers_for_the_root_and_for_a_directory')

]

{ #category : 'Grail-Tests - pathlib' }
PathWalkAndMountTestCase >> testPathWalkWalksTheTreeAndCanBePruned [

	self assertAll: #('path_walk_treats_a_link_as_a_file'
		'path_walk_following_links_descends_into_one'
		'path_walk_yields_path_objects'
		'path_walk_bottom_up_yields_the_leaves_first'
		'path_walk_can_be_pruned_by_mutating_dirnames')

]

{ #category : 'Grail-Tests - os.path' }
PathWalkAndMountTestCase >> testRelpathAnswersAPathRelativeToItsStart [

	self assertAll: #('relpath_of_a_path_under_its_start'
		'relpath_emits_one_dotdot_per_component_left_behind'
		'relpath_defaults_its_start_to_the_working_directory')

]

{ #category : 'Grail-Tests - os.walk' }
PathWalkAndMountTestCase >> testWalkAnswersEachOfItsThreeSymlinkModes [

	self assertAll: #('walk_reports_a_link_as_a_directory_it_does_not_enter'
		'walk_following_links_descends_into_one'
		'walk_with_the_sentinel_reports_a_link_as_a_file'
		'the_sentinel_is_an_object_of_its_own'
		'walk_bottom_up_still_yields_the_leaves_first')

]
