Class {
	#name : 'ABoundMethodIsNamedByItsFunctionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ABoundMethodIsNamedByItsFunctionTestCase >> testAnInheritedMethodIsNamedByTheClassThatDefinesIt [

	"tests/python/a_bound_method_is_named_by_its_function.py: a bound method's
	__qualname__ and repr name the class that defines its function, so an
	inherited method reads ``Base.method''; a built-in's still reads by its
	type.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'a_bound_method_is_named_by_its_function' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_bound_method_is_named_by_its_function.py')
		name: 'a_bound_method_is_named_by_its_function'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
