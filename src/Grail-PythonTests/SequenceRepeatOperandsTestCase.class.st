"Repeating a sequence by something that is not an int raises CPython's
TypeError instead of recursing until RecursionError, and the operand's
__rmul__ still answers first.  Each test reads
tests/python/sequence_repeat_operands.py, which measures the behaviour and
carries what CPython 3.14 answers."
Class {
	#name : 'SequenceRepeatOperandsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SequenceRepeatOperandsTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
SequenceRepeatOperandsTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'sequence_repeat_operands' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/sequence_repeat_operands.py'
		name: 'sequence_repeat_operands'

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testAnAugmentedRepeatRaisesTheOperatorsMessage [

	self assertAgreesWithCPythonAt: 'augmented'

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testBytesNamesTheOperandsType [

	#('bytes_by_a_str' 'a_str_by_bytes' 'a_float_and_bytes' 'bytearray_by_a_float')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testIntAndIndexCountsStillRepeat [

	self assertAgreesWithCPythonAt: 'an_int_still_repeats'.
	self assertAgreesWithCPythonAt: 'an_index_still_repeats'

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testTheOperandsReflectedDunderAnswers [

	self assertAgreesWithCPythonAt: 'the_reflected_dunder_answers'.
	self assertAgreesWithCPythonAt: 'augmented_by_a_reflecting_operand'

]

{ #category : 'Grail-Tests' }
SequenceRepeatOperandsTestCase >> testTwoBuiltinSequencesRaiseInsteadOfRecursing [

	#('list_by_a_str' 'tuple_by_a_str' 'str_by_a_list' 'str_by_a_tuple' 'list_by_a_tuple' 'a_complex_and_a_str')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
