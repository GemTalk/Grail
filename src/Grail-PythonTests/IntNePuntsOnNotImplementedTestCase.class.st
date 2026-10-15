Class {
	#name : 'IntNePuntsOnNotImplementedTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
IntNePuntsOnNotImplementedTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
IntNePuntsOnNotImplementedTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
IntNePuntsOnNotImplementedTestCase >> setUp [

	importlib @env1:modules removeKey: #'int_ne_punts_on_notimplemented' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_ne_punts_on_notimplemented.py')
		name: 'int_ne_punts_on_notimplemented'

]

{ #category : 'Grail-Tests - comparison' }
IntNePuntsOnNotImplementedTestCase >> testAnIntComparedWithAnOperandThatDeclines [

	self assertAll: #('a_declining_object_is_unequal_to_an_int'
		'with_the_int_written_on_the_left'
		'the_same_for_a_bool_and_a_float'
		'a_class_that_declines_only_in_eq'
		'and_the_equality_spelling_agrees'
		'an_int_in_a_container_of_declining_objects'
		'two_of_them_still_compare_by_value')

]

{ #category : 'Grail-Tests - comparison' }
IntNePuntsOnNotImplementedTestCase >> testASubclassOfIntOrFloatIsTheOtherPairOfMethods [
	"AbstractPyInt / AbstractPyFloat rather than int / float, so fixing the
	two concrete classes alone left these raising -- measured, by reverting
	just the two wrapper classes and watching all four cases raise again."

	self assertAll: #('an_int_subclass_declines_the_same_way'
		'a_float_subclass_declines_the_same_way'
		'an_int_enum_member_declines_the_same_way'
		'an_int_flag_member_declines_the_same_way')

]

{ #category : 'Grail-Tests - comparison' }
IntNePuntsOnNotImplementedTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 18 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 18

]

{ #category : 'Grail-Tests - comparison' }
IntNePuntsOnNotImplementedTestCase >> testTheComparisonsThatAlreadyWorkedAreUnchanged [
	"__ne__ delegates to __eq__ rather than the native ~= so that the
	__index__ path is shared -- 0 != False has to answer False.  The punt
	must not cost that."

	self assertAll: #('an_int_against_an_int'
		'an_int_against_a_bool'
		'an_int_against_a_float'
		'an_int_against_an_unrelated_type'
		'an_int_against_none'
		'a_subclass_still_equals_the_value_it_carries'
		'an_int_enum_member_still_equals_its_value')

]
