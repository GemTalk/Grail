Class {
	#name : 'UnsupportedOperationBasesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnsupportedOperationBasesTestCase >> testUnsupportedOperationIsAnOSErrorAndAValueError [
	"tests/python/unsupported_operation_bases.py: io.UnsupportedOperation has
	OSError and ValueError as its bases, in its __bases__, its __mro__, and to
	issubclass, isinstance and except -- a Python subclass of it too -- and its
	module is io.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unsupported_operation_bases' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unsupported_operation_bases.py')
		name: 'unsupported_operation_bases'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
