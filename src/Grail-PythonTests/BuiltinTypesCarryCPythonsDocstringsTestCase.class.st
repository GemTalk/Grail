Class {
	#name : 'BuiltinTypesCarryCPythonsDocstringsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinTypesCarryCPythonsDocstringsTestCase >> testEachTypeAnswersAsCPythonsDoes [

	"tests/python/builtin_types_carry_cpythons_docstrings.py: every type the
	builtins module binds answers CPython's __doc__, not object's, and a class
	the program defines keeps its own (#1724).  Each check agrees with CPython
	3.14."

	| fixture |

	importlib @env1:modules removeKey: #'builtin_types_carry_cpythons_docstrings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/builtin_types_carry_cpythons_docstrings.py'
		name: 'builtin_types_carry_cpythons_docstrings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
