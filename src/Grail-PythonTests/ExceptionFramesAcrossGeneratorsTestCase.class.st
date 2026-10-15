Class {
	#name : 'ExceptionFramesAcrossGeneratorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExceptionFramesAcrossGeneratorsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ExceptionFramesAcrossGeneratorsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ExceptionFramesAcrossGeneratorsTestCase >> setUp [

	importlib @env1:modules removeKey: #'exception_frames_across_generators' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_frames_across_generators.py')
		name: 'exception_frames_across_generators'

]

{ #category : 'Grail-Tests - context' }
ExceptionFramesAcrossGeneratorsTestCase >> testAFinallyChainsToTheExceptionThrownIn [

	self assertAll: #('finally_raising_during_a_throw_chains_to_the_thrown_exception'
		'contextmanager_cleanup_chains_every_link')

]

{ #category : 'Grail-Tests - tracebacks' }
ExceptionFramesAcrossGeneratorsTestCase >> testAMethodFrameNamesItsOwnFile [

	self assertAll: #('a_method_frame_names_its_own_file_when_contextlib_catches_first')

]

{ #category : 'Grail-Tests - tracebacks' }
ExceptionFramesAcrossGeneratorsTestCase >> testAnExceptionCaughtInsideTheBodyHasATraceback [

	self assertAll: #('an_exception_caught_inside_a_generator_has_a_traceback'
		'an_exception_caught_inside_a_coroutine_has_a_traceback')

]

{ #category : 'Grail-Tests - slots' }
ExceptionFramesAcrossGeneratorsTestCase >> testASlottedSecondaryBaseKeepsTheDict [

	self assertAll: #('a_slotted_secondary_base_does_not_remove_the_dict')

]

{ #category : 'Grail-Tests - slots' }
ExceptionFramesAcrossGeneratorsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests - tracebacks' }
ExceptionFramesAcrossGeneratorsTestCase >> testReRaisingKeepsEveryFrame [

	self assertAll: #('raise_exc_adds_the_frame_of_the_raise'
		'a_bare_raise_out_of_a_generator_keeps_the_consumer_frames')

]

{ #category : 'Grail-Tests - tracebacks' }
ExceptionFramesAcrossGeneratorsTestCase >> testStopExceptionsKeepTheirTraceback [

	self assertAll: #('a_caught_stop_iteration_has_a_traceback'
		'an_async_with_keeps_the_traceback_of_what_its_body_raised')

]
