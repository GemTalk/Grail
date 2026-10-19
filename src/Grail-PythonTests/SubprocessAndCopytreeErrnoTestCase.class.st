Class {
	#name : 'SubprocessAndCopytreeErrnoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SubprocessAndCopytreeErrnoTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SubprocessAndCopytreeErrnoTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SubprocessAndCopytreeErrnoTestCase >> setUp [

	importlib @env1:modules removeKey: #'subprocess_and_copytree_errno' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subprocess_and_copytree_errno.py')
		name: 'subprocess_and_copytree_errno'

]

{ #category : 'Grail-Tests - subprocess' }
SubprocessAndCopytreeErrnoTestCase >> testAMissingProgramIsNamedByTheError [

	self assertAll: #('running_a_missing_program_names_it'
		'popen_of_a_missing_program_names_it_too'
		'the_message_is_the_one_cpython_prints'
		'a_program_that_exists_still_runs')

]

{ #category : 'Grail-Tests - shutil' }
SubprocessAndCopytreeErrnoTestCase >> testCopytreeNamesTheTreeItRefusedAndStillCopies [

	self assertAll: #('copytree_onto_an_existing_tree_names_it'
		'the_refused_tree_is_left_alone'
		'copytree_still_copies_into_a_new_tree'
		'dirs_exist_ok_still_copies_over_an_existing_tree')

]

{ #category : 'Grail-Tests - shutil' }
SubprocessAndCopytreeErrnoTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8

]
