Class {
	#name : 'IntToBytesDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
IntToBytesDefaultsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
IntToBytesDefaultsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
IntToBytesDefaultsTestCase >> setUp [

	importlib @env1:modules removeKey: #'int_to_bytes_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_to_bytes_defaults.py')
		name: 'int_to_bytes_defaults'

]

{ #category : 'Grail-Tests - int' }
IntToBytesDefaultsTestCase >> testAValueThatDoesNotFitStillOverflows [

	self assertAll: #('a_value_too_big_for_the_default_length_overflows'
		'a_negative_value_needs_signed')

]

{ #category : 'Grail-Tests - int' }
IntToBytesDefaultsTestCase >> testBoolInheritsItAndTheRoundTripHolds [

	self assertAll: #('bool_to_bytes_defaults_too'
		'to_bytes_and_from_bytes_answer_each_other')

]

{ #category : 'Grail-Tests - int' }
IntToBytesDefaultsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - int' }
IntToBytesDefaultsTestCase >> testTheDefaultedFormsAnswerWhatCPythonAnswers [

	self assertAll: #('no_arguments_is_one_big_endian_byte'
		'a_length_alone_is_big_endian' 'a_length_of_zero_is_empty'
		'the_two_and_three_argument_forms_still_work'
		'every_argument_is_nameable')

]
