Class {
	#name : 'TheBuiltinErrorHandlersAreCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TheBuiltinErrorHandlersAreCPythonsTestCase >> testEachHandlerTakesOnlyTheErrorsItHandles [

	"tests/python/the_builtin_error_handlers_are_cpythons.py: codecs'
	built-in handlers refuse anything but the Unicode errors each handles,
	check the error's object, name a character for namereplace, escape four
	bytes at a time for surrogateescape and pass a surrogate through the UTF
	the error names for surrogatepass.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'the_builtin_error_handlers_are_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/the_builtin_error_handlers_are_cpythons.py')
		name: 'the_builtin_error_handlers_are_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '16 checks, 0 disagreeing [], keys match: True'

]
