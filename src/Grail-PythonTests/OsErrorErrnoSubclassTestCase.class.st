Class {
	#name : 'OsErrorErrnoSubclassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsErrorErrnoSubclassTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsErrorErrnoSubclassTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsErrorErrnoSubclassTestCase >> setUp [

	importlib @env1:modules removeKey: #'oserror_errno_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/oserror_errno_subclass.py')
		name: 'oserror_errno_subclass'

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testAnErrnoAnswersItsOwnSubclass [

	self assertAll: #('every_shared_errno_answers_its_own_subclass'
		'an_unmapped_errno_stays_a_plain_os_error')

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testASubclassNamedByTheCallerIsKept [

	self assertAll: #('a_subclass_named_by_the_caller_is_kept')

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testErrnoIsTheRunningPlatformsAndMapsEverySubclass [
	"errno was the macOS table on every platform, so on Linux it disagreed with
	every number os raised, and OSError's errnomap could only cover the errnos
	both platforms number alike: OSError(EAGAIN, ...) stayed an OSError
	(test_exception_hierarchy).  tests/python/errno_platform_tables.py holds
	CPython 3.14.8's table for each platform; the fixture checks the running
	one against CPython, and GRAIL_ROWS compares BOTH of Grail's tables, so the
	row this machine does not run is checked too."

	| fixture |
	importlib @env1:modules removeKey: #'errno_platform_tables' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/errno_platform_tables.py')
		name: 'errno_platform_tables'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #GRAIL_ROWS_SUMMARY) asString
		equals: '{''darwin'': True, ''linux'': True}'

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testTheNarrowingDoesNotDependOnHowItWasWritten [

	self assertAll: #('the_arity_does_not_decide_the_class'
		'one_argument_or_none_stays_a_plain_os_error'
		'a_non_integer_errno_stays_a_plain_os_error')

]

{ #category : 'Grail-Tests - OSError' }
OsErrorErrnoSubclassTestCase >> testTheSubclassCatchesAndKeepsItsFields [

	self assertAll: #('a_raised_two_argument_os_error_is_caught_as_its_subclass'
		'the_fields_survive_the_narrowing' 'isinstance_still_sees_an_os_error')

]
