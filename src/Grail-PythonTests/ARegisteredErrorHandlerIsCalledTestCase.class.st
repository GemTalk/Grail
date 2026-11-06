Class {
	#name : 'ARegisteredErrorHandlerIsCalledTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ARegisteredErrorHandlerIsCalledTestCase >> testStrEncodeAndBytesDecodeCallARegisteredHandler [

	"tests/python/a_registered_error_handler_is_called.py: str.encode and
	bytes.decode call a handler codecs.register_error registered, once for each
	error and with CPython's span, check what it answers, and resume where it
	says, in what it left in exc.object.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'a_registered_error_handler_is_called' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_registered_error_handler_is_called.py')
		name: 'a_registered_error_handler_is_called'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '19 checks, 0 disagreeing [], keys match: True'

]
