Class {
	#name : 'InitReturnValueTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
InitReturnValueTestCase >> testInitReturningAnythingButNoneIsATypeError [
	"tests/python/init_return_value.py: calling a class whose __init__ returns
	anything but None -- its own, inherited, assigned, a type()-built class's,
	a metaclass's, an exception's raised by name -- is CPython's TypeError
	naming the result's type, while an __init__ called directly is not
	checked and ``return super().__init__(...)'' stays legal.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'init_return_value' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_return_value.py')
		name: 'init_return_value'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
