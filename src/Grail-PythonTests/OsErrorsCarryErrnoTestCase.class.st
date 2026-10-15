Class {
	#name : 'OsErrorsCarryErrnoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsErrorsCarryErrnoTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsErrorsCarryErrnoTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsErrorsCarryErrnoTestCase >> setUp [

	importlib @env1:modules removeKey: #'os_errors_carry_errno' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_errors_carry_errno.py')
		name: 'os_errors_carry_errno'

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testEveryErrorsStrerrorIsTheTextOfItsErrno [

	self assertAll: #('strerror_is_the_text_of_every_error_above')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 30 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 30

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testListdirAndStatCarryTheErrnoAndFilename [

	self assertAll: #('listdir_of_a_missing_path_carries_enoent'
		'listdir_of_a_file_carries_enotdir' 'stat_of_a_missing_path_carries_enoent'
		'stat_under_a_file_carries_enotdir' 'lstat_of_a_missing_path_carries_enoent'
		'str_of_the_error_names_the_path')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testOpenCarriesTheErrnoAndFilename [

	self assertAll: #('open_of_a_missing_file_carries_enoent'
		'open_of_a_directory_carries_eisdir_to_read_or_write'
		'exclusive_open_of_an_existing_file_carries_eexist'
		'open_under_a_file_carries_enotdir' 'open_of_a_path_object_names_it_as_a_str'
		'gzip_open_of_a_missing_file_carries_enoent')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testReadlinkCarriesTheErrnoAndFilename [

	self assertAll: #('readlink_of_a_missing_path_carries_enoent'
		'readlink_of_a_file_is_einval' 'readlink_under_a_file_carries_enotdir')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testStrerrorRefusesWhatCPythonRefuses [

	self assertAll: #('strerror_refuses_a_non_integer'
		'strerror_refuses_an_integer_beyond_a_c_int')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testSymlinkNamesBothPathsAndStillCreatesTheLink [

	self assertAll: #('symlink_onto_an_occupant_names_both_paths'
		'symlink_onto_a_dangling_link_is_file_exists'
		'symlink_into_a_missing_directory_names_both_paths'
		'symlink_under_a_file_carries_enotdir' 'str_of_a_symlink_error_names_both_paths'
		'symlink_still_creates_the_link')

]

{ #category : 'Grail-Tests - os' }
OsErrorsCarryErrnoTestCase >> testUtimeChmodAndRemoveCarryTheErrnoAndStillAct [

	self assertAll: #('utime_of_a_missing_file_carries_enoent'
		'chmod_of_a_missing_file_carries_enoent' 'chmod_still_sets_the_mode'
		'remove_of_a_missing_file_carries_enoent' 'remove_under_a_file_carries_enotdir'
		'remove_still_removes_a_dangling_link')

]
