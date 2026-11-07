Class {
	#name : 'UnregisterErrorIsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnregisterErrorIsCPythonsTestCase >> testUnregisterErrorRemovesOnlyACustomHandler [

	"tests/python/unregister_error_is_cpythons.py: _codecs._unregister_error
	removes a handler codecs.register_error registered and answers True, answers
	False for a name with no handler, refuses the eight built-in handlers, and
	takes only a str without NUL.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unregister_error_is_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unregister_error_is_cpythons.py')
		name: 'unregister_error_is_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
