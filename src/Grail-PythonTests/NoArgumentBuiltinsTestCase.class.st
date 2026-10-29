Class {
	#name : 'NoArgumentBuiltinsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
NoArgumentBuiltinsTestCase >> testObjectAndSingletonTypesRefuseArguments [
	"tests/python/no_argument_builtins.py: object and the types of None,
	Ellipsis and NotImplemented refuse any argument with CPython's
	TypeError -- at a call site and through a variable -- and object.__new__
	refuses a non-type, where a one-argument call used to send new to the
	argument.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'no_argument_builtins' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_argument_builtins.py')
		name: 'no_argument_builtins'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
