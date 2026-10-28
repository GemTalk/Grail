Class {
	#name : 'ExceptionCopyAndReduceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExceptionCopyAndReduceTestCase >> testExceptionsReduceCopyAndPickleWithTheirArguments [
	"tests/python/exception_copy_and_reduce.py: __reduce__ answers CPython's
	shape, so copy.copy, copy.deepcopy and pickle keep an exception's args,
	attributes, OSError filename and ImportError name/path/name_from, and
	SyntaxError has print_file_and_line.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exception_copy_and_reduce' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_copy_and_reduce.py')
		name: 'exception_copy_and_reduce'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
