Class {
	#name : 'FormatBuiltinSubclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FormatBuiltinSubclassTestCase >> testSubclassOfIntFloatOrStrFormatsItsValue [
	"tests/python/format_builtin_subclass.py: an instance of a subclass of
	int, float or str is formatted by its value, named by its own class in an
	error, and answers an empty spec with str() of itself.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'format_builtin_subclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_builtin_subclass.py')
		name: 'format_builtin_subclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
