"``&'', ``|'' and ``^'' on a bool and an operand that is not an int raise
CPython's TypeError rather than a Smalltalk doesNotUnderstand that ended the
process.  Each test reads tests/python/bool_bitwise_operands.py, which measures
the behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'BoolBitwiseOperandsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BoolBitwiseOperandsTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
BoolBitwiseOperandsTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'bool_bitwise_operands' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/bool_bitwise_operands.py'
		name: 'bool_bitwise_operands'

]

{ #category : 'Grail-Tests' }
BoolBitwiseOperandsTestCase >> testABitwiseOperatorWithANonIntRaisesCPythonsTypeError [

	#('with_a_str' 'with_an_object' 'with_none' 'with_a_float' 'with_a_list' 'augmented')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
BoolBitwiseOperandsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
BoolBitwiseOperandsTestCase >> testIntOperandsKeepIntSemantics [

	#('bool_with_bool' 'bool_with_int' 'bool_with_an_int_subclass' 'bool_with_an_intflag')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
BoolBitwiseOperandsTestCase >> testTheDunderDeclinesANonIntOperand [

	self assertAgreesWithCPythonAt: 'the_dunders_decline'

]

{ #category : 'Grail-Tests' }
BoolBitwiseOperandsTestCase >> testTheOperandsReflectedDunderAnswers [

	self assertAgreesWithCPythonAt: 'the_reflected_dunder_answers'

]
