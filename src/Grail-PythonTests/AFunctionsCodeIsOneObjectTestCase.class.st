Class {
	#name : 'AFunctionsCodeIsOneObjectTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AFunctionsCodeIsOneObjectTestCase >> testAFunctionsCodeAndItsFramesCodeAreOneObject [

	"tests/python/a_functions_code_is_one_object.py: a module function's, a
	method's, a class or static method's and a nested function's __code__ is the
	same object at every read, and is its frame's f_code.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'a_functions_code_is_one_object' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_functions_code_is_one_object.py')
		name: 'a_functions_code_is_one_object'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
