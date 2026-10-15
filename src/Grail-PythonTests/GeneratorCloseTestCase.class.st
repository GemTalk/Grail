Class {
	#name : 'GeneratorCloseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Generators' }
GeneratorCloseTestCase >> testCloseAnswersTheValueACaughtExitReturns [
	"tests/python/generator_close_return_value.py: ``except GeneratorExit:
	return 0'' makes close() answer 0, once; a return in a finally is
	answered too; an uncaught exit, an unstarted or finished generator and a
	delegator all answer None.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_close_return_value' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_close_return_value.py')
		name: 'generator_close_return_value'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
