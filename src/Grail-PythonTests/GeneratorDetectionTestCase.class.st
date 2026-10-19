Class {
	#name : 'GeneratorDetectionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Generators' }
GeneratorDetectionTestCase >> testAYieldInADefaultOrDecoratorMakesTheEnclosingFunctionAGenerator [
	"tests/python/generator_detection.py: a yield in a lambda's positional or
	keyword-only default, in a nested def's default or decorator, and in a
	comprehension's outermost iterable makes the enclosing function a
	generator, and one in a lambda's body does not -- checked on a module and
	again through exec(), which compiles on Grail's other path -- plus the
	``outside function'' messages.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_detection' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_detection.py')
		name: 'generator_detection'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
