"A format spec CPython refuses is refused with CPython's message -- a
thousands separator with the wrong type, an int's precision and 'c' sign, a
str's sign, z and '#' -- and a bool formats as the int it is.  Each test reads
tests/python/format_spec_validation.py, which measures the behaviour and
carries what CPython 3.14 answers."
Class {
	#name : 'FormatSpecValidationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FormatSpecValidationTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FormatSpecValidationTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'format_spec_validation' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/format_spec_validation.py'
		name: 'format_spec_validation'

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testABoolFormatsAsAnInt [

	#('a_bool_formats_as_an_int' 'a_bool_with_an_empty_spec_is_its_str' 'a_bool_is_refused_as_an_int_is')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testAnIntRefusesWhatCPythonRefuses [

	#('an_int_refuses_a_precision' 'c_refuses_a_sign_or_alternate_form' 'an_int_refuses_z')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testASeparatorGoesOnlyWithItsTypes [

	#('a_separator_with_bin_oct_hex' 'an_underscore_with_bin_oct_hex_groups_by_four'
	'a_separator_with_decimal_or_no_type' 'a_separator_with_c_or_n' 'a_str_refuses_a_separator'
	'a_float_refuses_a_separator_with_x_first' 'a_huge_int_is_refused_too')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testAStrRefusesWhatCPythonRefuses [

	self assertAgreesWithCPythonAt: 'a_str_refuses_a_sign_z_or_alternate_form'.
	self assertAgreesWithCPythonAt: 'a_str_unknown_code_names_it'

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '19 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
FormatSpecValidationTestCase >> testValidSpecsStillFormat [

	#('an_int_with_a_float_type_takes_one' 'c_without_them' 'a_float_keeps_its_separators_and_z'
	'a_float_unknown_code_names_it')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
