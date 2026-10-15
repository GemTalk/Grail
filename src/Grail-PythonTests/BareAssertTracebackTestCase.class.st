Class {
	#name : 'BareAssertTracebackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
BareAssertTracebackTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
BareAssertTracebackTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
BareAssertTracebackTestCase >> setUp [

	importlib @env1:modules removeKey: #'bare_assert_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_assert_traceback.py')
		name: 'bare_assert_traceback'

]

{ #category : 'Grail-Tests - assert' }
BareAssertTracebackTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7

]

{ #category : 'Grail-Tests - assert' }
BareAssertTracebackTestCase >> testTheExceptionIsCPythons [

	self assertAll: #('a_bare_assert_has_no_args'
		'raised_while_handling_records_the_context'
		'a_falsy_value_still_fails')

]

{ #category : 'Grail-Tests - assert' }
BareAssertTracebackTestCase >> testTheTracebackHasEveryFrame [

	self assertAll: #('the_first_bare_assert_keeps_its_frames'
		'a_later_bare_assert_too'
		'an_assert_with_a_message'
		'the_innermost_line_is_the_assert')

]
