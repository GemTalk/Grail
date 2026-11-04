Class {
	#name : 'BoolAnswersIntsMethodsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BoolAnswersIntsMethodsTestCase >> testBoolAnswersTheMethodsItInheritsFromInt [
	"tests/python/bool_answers_ints_methods.py: True has int's rounding,
	shift, reflected-arithmetic, bit_count and is_integer methods, dir(bool)
	lists them, they answer what int's do -- NotImplemented for an operand that is no int, so a TypeError names bool -- and two bools'
	reflected bitwise operators still answer a bool.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'bool_answers_ints_methods' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bool_answers_ints_methods.py')
		name: 'bool_answers_ints_methods'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
