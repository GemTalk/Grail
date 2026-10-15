Class {
	#name : 'UnittestMainExitStatusTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
UnittestMainExitStatusTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
UnittestMainExitStatusTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
UnittestMainExitStatusTestCase >> setUp [

	importlib @env1:modules removeKey: #'unittest_main_exit_status' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_main_exit_status.py')
		name: 'unittest_main_exit_status'

]

{ #category : 'Grail-Tests - unittest' }
UnittestMainExitStatusTestCase >> testAModuleArgumentIsNoLongerDemanded [

	self assertAll: #('a_module_argument_no_longer_raises_the_old_type_error'
		'a_string_module_name_is_accepted')

]

{ #category : 'Grail-Tests - unittest' }
UnittestMainExitStatusTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - unittest' }
UnittestMainExitStatusTestCase >> testMainExitsRatherThanReturningItsResult [

	self assertAll: #('exit_is_true_by_default'
		'a_failing_suite_would_exit_one'
		'a_passing_suite_would_exit_zero'
		'a_mixed_suite_would_exit_one')

]

{ #category : 'Grail-Tests - unittest' }
UnittestMainExitStatusTestCase >> testWhatCallersOfExitFalseStillGet [

	self assertAll: #('exit_false_still_answers_a_usable_result'
		'was_successful_still_reads_the_two_lists'
		'the_counts_are_unchanged')

]
