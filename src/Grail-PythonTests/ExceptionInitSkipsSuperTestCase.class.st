Class {
	#name : 'ExceptionInitSkipsSuperTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExceptionInitSkipsSuperTestCase >> testSubclassWhoseInitSkipsSuperKeepsItsArgs [
	"tests/python/exception_init_skips_super.py: an exception whose __init__
	never calls super().__init__ still has the args it was constructed with, as
	CPython's BaseException_new stores them, while SyntaxError and ImportError
	leave their fields to __init__ and OSError and exception groups parse in
	__new__.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exception_init_skips_super' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_init_skips_super.py')
		name: 'exception_init_skips_super'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
