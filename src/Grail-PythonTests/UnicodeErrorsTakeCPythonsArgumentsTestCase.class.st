Class {
	#name : 'UnicodeErrorsTakeCPythonsArgumentsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeErrorsTakeCPythonsArgumentsTestCase >> testTheUnicodeErrorsRefuseTheWrongArguments [

	"tests/python/unicode_errors_take_cpythons_arguments.py: UnicodeEncodeError,
	UnicodeDecodeError and UnicodeTranslateError refuse the wrong count or
	type of arguments as CPython's tp_init does -- called, raised, built as a
	subclass without an __init__, or initialized explicitly -- while an
	explicit __new__ takes anything.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicode_errors_take_cpythons_arguments' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_errors_take_cpythons_arguments.py')
		name: 'unicode_errors_take_cpythons_arguments'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
