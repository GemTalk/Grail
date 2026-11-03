Class {
	#name : 'PercentCNamesTheQualifiedTypeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PercentCNamesTheQualifiedTypeTestCase >> testPercentCNamesARefusedTypeAsCPythonsPercentTDoes [
	"tests/python/percent_c_names_the_qualified_type.py: str and bytes %c
	name a refused operand's type as CPython's %T does -- module.qualname,
	the qualname alone in __main__, a built-in's bare name -- and %d, %i and
	%u convert by __int__ before __index__.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'percent_c_names_the_qualified_type' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/percent_c_names_the_qualified_type.py')
		name: 'percent_c_names_the_qualified_type'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
