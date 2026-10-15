Class {
	#name : 'OsRenameErrorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsRenameErrorsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsRenameErrorsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsRenameErrorsTestCase >> setUp [

	importlib @env1:modules removeKey: #'os_rename_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_rename_errors.py')
		name: 'os_rename_errors'

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testRenameAndReplaceStillMoveAndOverwrite [

	self assertAll: #('rename_moves_the_file' 'rename_overwrites_an_existing_file'
		'replace_overwrites_an_existing_file')

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testRenameOfAMissingFileRaisesFileNotFoundNamingBothPaths [

	self assertAll: #('rename_of_a_missing_file_is_file_not_found'
		'rename_of_a_missing_file_names_both_paths' 'rename_of_a_missing_file_creates_no_target'
		'a_failed_rename_leaves_the_source_alone')

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testRenameRaisesTheErrnosOwnSubclass [

	self assertAll: #('rename_of_a_file_onto_a_directory_is_a_directory_error'
		'rename_of_a_directory_onto_a_file_is_not_a_directory'
		'rename_of_a_directory_onto_a_full_one_is_a_plain_os_error')

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testReplaceAndPathlibReportFailureToo [

	self assertAll: #('replace_of_a_missing_file_is_file_not_found'
		'path_rename_of_a_missing_file_is_file_not_found' 'path_replace_answers_the_target')

]

{ #category : 'Grail-Tests - os' }
OsRenameErrorsTestCase >> testStrerrorIsTheTextOfTheError [

	self assertAll: #('strerror_words_the_errnos_both_platforms_share'
		'strerror_is_the_text_of_the_error')

]
