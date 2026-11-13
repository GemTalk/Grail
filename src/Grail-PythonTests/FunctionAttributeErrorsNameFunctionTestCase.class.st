Class {
	#name : 'FunctionAttributeErrorsNameFunctionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FunctionAttributeErrorsNameFunctionTestCase >> testEachMissAnswersAsCPythonsDoes [

	"tests/python/function_attribute_errors_name_function.py: reading or deleting
	an attribute a function lacks raises ``'function' object has no attribute'',
	with the error's name and obj set, for a lambda, a nested def and a
	module-level def alike.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'function_attribute_errors_name_function' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/function_attribute_errors_name_function.py'
		name: 'function_attribute_errors_name_function'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
