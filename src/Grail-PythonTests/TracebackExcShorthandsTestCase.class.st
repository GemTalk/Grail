Class {
	#name : 'TracebackExcShorthandsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
TracebackExcShorthandsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
TracebackExcShorthandsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
TracebackExcShorthandsTestCase >> setUp [

	importlib @env1:modules
		removeKey: #'traceback_exc_shorthands_honour_limit_and_chain'
		ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir ,
			'/tests/python/traceback_exc_shorthands_honour_limit_and_chain.py')
		name: 'traceback_exc_shorthands_honour_limit_and_chain'

]

{ #category : 'Grail-Tests - unchanged' }
TracebackExcShorthandsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17

]

{ #category : 'Grail-Tests - format_exc' }
TracebackExcShorthandsTestCase >> testFormatExcHonoursLimitPositionallyAndByKeywordAndChain [
	"The loud half: the two keyword spellings used to raise TypeError from
	inside the except block they were reporting on."

	self assertAll: #('format_exc_default_renders_everything'
		'format_exc_honours_a_positional_limit'
		'format_exc_honours_a_keyword_limit'
		'format_exc_honours_chain_false')

]

{ #category : 'Grail-Tests - print_exception' }
TracebackExcShorthandsTestCase >> testPrintExceptionForwardsChainToFormatException [
	"Not in the issue, and the reason fixing the shorthand alone was not
	enough -- print_exc renders through this function."

	self assertAll: #('print_exception_honours_chain_false'
		'print_exception_honours_limit')

]

{ #category : 'Grail-Tests - print_exc' }
TracebackExcShorthandsTestCase >> testPrintExcHonoursLimitAndChainAndTakesLimitFirst [
	"The quiet half: these raised nothing and printed the whole traceback."

	self assertAll: #('print_exc_default_renders_everything'
		'print_exc_honours_a_keyword_limit'
		'print_exc_honours_chain_false'
		'print_exc_takes_limit_then_file_positionally')

]

{ #category : 'Grail-Tests - module read' }
TracebackExcShorthandsTestCase >> testReadingTheFunctionOffTheModuleStillGivesACallable [
	"The regression *args existed to prevent.  format_exc now has all-default
	parameters, which is the shape that used to be invoked on attribute read,
	so reading it and calling the handle -- with and without the keyword --
	is the check that licences the new signature."

	self assertAll: #('read_then_call_still_works')

]

{ #category : 'Grail-Tests - unchanged' }
TracebackExcShorthandsTestCase >> testTheDelegateAndTheLimitEdgesAreUnchanged [
	"format_exception was already right, so it is asserted here: a ``fix'' that
	broke it could not pass.  limit=0 shows no frames and a negative limit
	counts from the END of the traceback, which is CPython's rule."

	self assertAll: #('format_exception_was_and_is_correct'
		'limit_zero_shows_no_frames'
		'a_negative_limit_counts_from_the_end'
		'chain_false_is_a_noop_without_a_context'
		'no_active_exception_still_reads_nonetype_none'
		'print_last_without_a_last_exception_still_raises')

]
