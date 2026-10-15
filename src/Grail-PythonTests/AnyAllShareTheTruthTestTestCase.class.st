Class {
	#name : 'AnyAllShareTheTruthTestTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
AnyAllShareTheTruthTestTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
AnyAllShareTheTruthTestTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
AnyAllShareTheTruthTestTestCase >> setUp [

	importlib @env1:modules removeKey: #'any_all_share_the_truth_test' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/any_all_share_the_truth_test.py')
		name: 'any_all_share_the_truth_test'

]

{ #category : 'Grail-Tests - builtins' }
AnyAllShareTheTruthTestTestCase >> testAnEmptyContainerIsFalseToAnyAndAll [

	self assertAll: #('any_of_a_lone_empty_is_false'
		'all_of_a_lone_empty_is_false'
		'they_agree_with_bool_on_every_one'
		'the_blank_row_check_that_found_it'
		'a_mixed_sequence'
		'a_generator_not_just_a_list')

]

{ #category : 'Grail-Tests - builtins' }
AnyAllShareTheTruthTestTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 15 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests - builtins' }
AnyAllShareTheTruthTestTestCase >> testTheAnswersThatWereAlreadyRightAreUnchanged [

	self assertAll: #('the_falsey_values_that_already_worked'
		'truthy_values_are_still_true'
		'the_empty_iterable_conventions'
		'any_stops_at_the_first_true_element'
		'all_stops_at_the_first_false_element')

]

{ #category : 'Grail-Tests - builtins' }
AnyAllShareTheTruthTestTestCase >> testWhatDunderBoolRaisesReachesTheCaller [
	"The non-bool return was an UNCATCHABLE ImproperOperation, so before the
	repair the fixture could not even load to report this."

	self assertAll: #('a_non_bool_dunder_raises_the_catchable_type_error'
		'and_it_matches_what_bool_itself_raises'
		'an_exception_from_inside_dunder_bool_propagates'
		'an_attribute_error_inside_dunder_bool_is_not_read_as_true')

]
