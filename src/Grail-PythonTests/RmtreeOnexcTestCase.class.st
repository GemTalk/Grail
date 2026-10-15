Class {
	#name : 'RmtreeOnexcTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
RmtreeOnexcTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
RmtreeOnexcTestCase >> readOnlyChecks [

	^ #('onexc_hears_each_failure_and_rmtree_goes_on'
		'onerror_gets_an_exc_info_triple'
		'ignore_errors_removes_what_it_can'
		'a_handler_that_retries_finishes_the_job'
		'without_a_handler_the_first_failure_is_raised'
		'os_remove_and_rmdir_report_permission_denied')

]

{ #category : 'Grail-Helpers' }
RmtreeOnexcTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
RmtreeOnexcTestCase >> setUp [

	importlib @env1:modules removeKey: #'rmtree_onexc' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rmtree_onexc.py')
		name: 'rmtree_onexc'

]

{ #category : 'Grail-Tests - shutil' }
RmtreeOnexcTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"Six unconditional checks, plus the six read-only ones when the directory
	protection held.  A check added to the fixture without being listed would
	pass unasserted here, so the count is pinned."

	| n |
	n := self results @env1:__len__.
	self assert: (n = 6 or: [n = 12]) description: 'checks: ' , n printString

]

{ #category : 'Grail-Tests - shutil' }
RmtreeOnexcTestCase >> testFailuresInAReadOnlyDirectory [
	"Run only where chmod 0o500 protects a directory; elsewhere the fixture
	records none of these, and testEveryFixtureCheckIsAssertedByATestHere says
	so."

	| present |
	present := self readOnlyChecks select: [:name |
		(self results @env1:__contains__: name) == true].
	self assertAll: present

]

{ #category : 'Grail-Tests - shutil' }
RmtreeOnexcTestCase >> testOnexcHearsWhatCPythonReports [

	self assertAll: #('onexc_hears_a_missing_path_from_lstat'
		'onexc_hears_a_file_twice'
		'onexc_hears_a_top_level_link_refused'
		'onexc_hears_a_dangling_link_from_open')

]

{ #category : 'Grail-Tests - shutil' }
RmtreeOnexcTestCase >> testSignature [

	self assertAll: #('onexc_wins_over_onerror' 'dir_fd_none_is_accepted')

]
