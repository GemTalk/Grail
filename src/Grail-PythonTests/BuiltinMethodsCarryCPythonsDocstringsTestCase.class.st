Class {
	#name : 'BuiltinMethodsCarryCPythonsDocstringsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinMethodsCarryCPythonsDocstringsTestCase >> testEachMethodAnswersAsCPythonsDoes [

	"tests/python/builtin_methods_carry_cpythons_docstrings.py: a builtin type's
	methods, bound or unbound, answer CPython's __doc__, a subclass inherits it,
	and an undocumented override answers None.  Each check agrees with CPython
	3.14."

	| fixture |

	importlib @env1:modules removeKey: #'builtin_methods_carry_cpythons_docstrings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/builtin_methods_carry_cpythons_docstrings.py'
		name: 'builtin_methods_carry_cpythons_docstrings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
