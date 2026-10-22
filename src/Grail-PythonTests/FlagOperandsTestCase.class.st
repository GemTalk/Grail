"A flag's |, & and ^ take the operands CPython's Flag._get_value admits and
answer NotImplemented for the rest, and ``in'' takes only the flag's own
members.  Each test reads tests/python/flag_operands.py, which measures the
behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'FlagOperandsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FlagOperandsTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FlagOperandsTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'flag_operands' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/flag_operands.py'
		name: 'flag_operands'

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testABoolIsAnIntOperand [

	#('intflag_with_a_bool' 'a_bool_with_an_intflag' 'mixed_with_a_bool')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testAnInadmissibleOperandRaisesCPythonsTypeError [

	#('intflag_with_a_str' 'intflag_with_a_float' 'a_str_with_an_intflag' 'flag_with_an_int_or_bool')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testContainsTakesOnlyTheFlagsOwnMembers [

	self assertAgreesWithCPythonAt: 'contains_own_members'.
	self assertAgreesWithCPythonAt: 'contains_refuses_others'

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testIntAndOwnMemberOperandsStillCombine [

	self assertAgreesWithCPythonAt: 'intflag_with_an_int_and_int_subclass'.
	self assertAgreesWithCPythonAt: 'flag_with_its_own_members'

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testTheDundersDeclineAnInadmissibleOperand [

	#('intflag_dunders_decline' 'mixed_dunder_declines' 'flag_dunder_declines')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FlagOperandsTestCase >> testTheOperandsReflectedDunderAnswers [

	#('intflag_with_a_reflecting_operand' 'mixed_with_a_reflecting_operand' 'flag_with_a_reflecting_operand')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
