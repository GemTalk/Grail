Class {
	#name : 'NulPathsLongKeysTempfilesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
NulPathsLongKeysTempfilesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
NulPathsLongKeysTempfilesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
NulPathsLongKeysTempfilesTestCase >> setUp [

	importlib @env1:modules removeKey: #'nul_paths_long_keys_tempfiles' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nul_paths_long_keys_tempfiles.py')
		name: 'nul_paths_long_keys_tempfiles'

]

{ #category : 'Grail-Tests - nul' }
NulPathsLongKeysTempfilesTestCase >> testAnEmbeddedNulIsRefusedBeforeTheKernelSeesIt [

	self assertAll: #('stat_refuses_an_embedded_nul'
		'lstat_and_listdir_refuse_it_too'
		'mutating_calls_refuse_it_before_touching_anything'
		'linecache_ignores_a_nul_filename')

]

{ #category : 'Grail-Tests - long key' }
NulPathsLongKeysTempfilesTestCase >> testDictPopTakesAKeyTooLongForASymbol [

	self assertAll: #('dict_pop_accepts_a_long_str_key'
		'a_missing_long_key_is_a_key_error'
		'linecache_ignores_a_very_long_filename')

]

{ #category : 'Grail-Tests - tempfile' }
NulPathsLongKeysTempfilesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 14 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14

]

{ #category : 'Grail-Tests - nul' }
NulPathsLongKeysTempfilesTestCase >> testPredicatesAndStringFunctionsAreUnchanged [
	"The half that must not move: the predicates say no rather than raise, and
	the pure string functions never looked at the filesystem at all."

	self assertAll: #('the_predicates_answer_false'
		'string_functions_let_a_nul_through')

]

{ #category : 'Grail-Tests - tempfile' }
NulPathsLongKeysTempfilesTestCase >> testTempfileCreatesRealFiles [

	self assertAll: #('mkstemp_creates_a_private_file'
		'named_temporary_file_delete_false_keeps_the_file'
		'named_temporary_file_text_mode_is_removed_on_exit'
		'named_temporary_file_close_removes_it'
		'temporary_file_reads_back_what_was_written')

]
