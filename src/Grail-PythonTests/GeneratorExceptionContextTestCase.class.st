Class {
	#name : 'GeneratorExceptionContextTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Generators' }
GeneratorExceptionContextTestCase >> testGeneratorExceptionStateMatchesCPython [
	"tests/python/generator_exception_context.py: sys.exception() in a body
	resumed from inside a handler, after the body's own handler ends, and across
	later resumes; the context throw() sets (the body's own handled exception,
	never the caller's) for a class, an instance, through ``yield from'' and on
	an unstarted generator; and a thrown class whose __new__ answers a
	non-exception.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_exception_context' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_exception_context.py')
		name: 'generator_exception_context'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
