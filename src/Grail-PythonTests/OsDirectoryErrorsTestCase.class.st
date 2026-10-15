Class {
	#name : 'OsDirectoryErrorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsDirectoryErrorsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsDirectoryErrorsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsDirectoryErrorsTestCase >> setUp [

	importlib @env1:modules removeKey: #'os_directory_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_directory_errors.py')
		name: 'os_directory_errors'

]

{ #category : 'Grail-Tests - os' }
OsDirectoryErrorsTestCase >> testChdirCarriesTheErrnoAndStillChangesDirectory [

	self assertAll: #('chdir_to_a_missing_path_carries_enoent'
		'chdir_to_a_file_carries_enotdir' 'chdir_under_a_file_carries_enotdir'
		'str_of_the_error_names_the_path' 'chdir_still_changes_the_directory')

]

{ #category : 'Grail-Tests - os' }
OsDirectoryErrorsTestCase >> testEveryErrorsStrerrorIsTheTextOfItsErrno [

	self assertAll: #('strerror_is_the_text_of_every_error_above')

]

{ #category : 'Grail-Tests - os' }
OsDirectoryErrorsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests - os' }
OsDirectoryErrorsTestCase >> testRemoveOfADirectoryIsWhatThePlatformReports [

	self assertAll: #('remove_of_a_directory_is_what_the_platform_reports'
		'remove_of_a_directory_leaves_it_alone' 'remove_still_removes_a_file')

]

{ #category : 'Grail-Tests - os' }
OsDirectoryErrorsTestCase >> testRmdirCarriesTheErrnoAndStillRemovesAnEmptyDirectory [

	self assertAll: #('rmdir_of_a_missing_path_carries_enoent'
		'rmdir_of_a_file_carries_enotdir'
		'rmdir_of_a_symlink_to_a_directory_carries_enotdir'
		'rmdir_of_a_directory_holding_entries_is_not_empty'
		'rmdir_of_a_directory_holding_entries_leaves_it_alone'
		'rmdir_still_removes_an_empty_directory')

]
