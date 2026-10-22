"int and float at their edges raise what CPython raises and compare exactly:
int() of a non-finite float, an infinity against a huge int, ``**'' with an int
too large for a float, and int.to_bytes's signed range.  Each test reads
tests/python/int_float_edges.py, which measures the behaviour and carries what
CPython 3.14 answers."
Class {
	#name : 'IntFloatEdgesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IntFloatEdgesTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
IntFloatEdgesTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'int_float_edges' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/int_float_edges.py'
		name: 'int_float_edges'

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testAnInfinityComparesWithAnIntAsWithZero [

	#('inf_against_a_huge_int' 'minus_inf_against_a_huge_negative_int' 'a_huge_int_against_inf' 'nan_against_a_huge_int')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testFiniteValuesKeepTheirResults [

	#('finite_floats_still_convert' 'finite_comparisons_stay_exact' 'pow_that_fits_is_unchanged')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testIntOfANonFiniteFloatRaises [

	#('int_of_a_nonfinite_float' 'trunc_of_a_nonfinite_float' 'floor_ceil_round_still_raise')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testPowWithAnIntTooLargeForAFloatRaises [

	self assertAgreesWithCPythonAt: 'pow_with_an_int_too_large_for_a_float'

]

{ #category : 'Grail-Tests' }
IntFloatEdgesTestCase >> testToBytesChecksTheSignedRange [

	#('to_bytes_signed_out_of_range' 'to_bytes_signed_in_range' 'to_bytes_unsigned')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
