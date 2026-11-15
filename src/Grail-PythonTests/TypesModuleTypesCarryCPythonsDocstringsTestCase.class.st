Class {
	#name : 'TypesModuleTypesCarryCPythonsDocstringsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypesModuleTypesCarryCPythonsDocstringsTestCase >> testEachTypeAnswersAsCPythonsDoes [

	"tests/python/types_module_types_carry_cpythons_docstrings.py: the types the
	types module names -- CodeType, GeneratorType, NoneType, FunctionType, ... --
	answer CPython's __doc__, None where CPython has none, and a program's class
	of the same name keeps its own.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'types_module_types_carry_cpythons_docstrings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/types_module_types_carry_cpythons_docstrings.py'
		name: 'types_module_types_carry_cpythons_docstrings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
