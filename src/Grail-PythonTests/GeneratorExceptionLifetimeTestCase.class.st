Class {
	#name : 'GeneratorExceptionLifetimeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Generators' }
GeneratorExceptionLifetimeTestCase >> testAnExceptionLeavingAGeneratorDoesNotOutliveItsCatcher [
	"tests/python/generator_exception_lifetime.py: an exception that escapes a
	generator -- raised in the body, or thrown in and out again -- and is
	caught by the consumer releases what the generator held once the catcher
	lets go of it, twenty in a loop included.  The body-side frames stashed
	for its traceback used to sit in a session-wide table keyed by the
	exception until the session ended (test_exceptions
	test_generator_throw_cleanup_exc_state).  The generator's frames are still
	spliced into the consumer's traceback.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_exception_lifetime' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_exception_lifetime.py')
		name: 'generator_exception_lifetime'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
