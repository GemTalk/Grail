Class {
	#name : 'BoolReportsIntAsItsBaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BoolReportsIntAsItsBaseTestCase >> testEachReflectionAnswersAsCPythonsDoes [

	"tests/python/bool_reports_int_as_its_base.py: bool.__mro__ is (bool, int,
	object), bool.__bases__ (int,) and bool.__base__ int, and int and
	singledispatch are unchanged.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'bool_reports_int_as_its_base' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/bool_reports_int_as_its_base.py'
		name: 'bool_reports_int_as_its_base'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
