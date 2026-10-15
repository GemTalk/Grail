Class {
	#name : 'ComparisonProtocolInsideSequencesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ComparisonProtocolInsideSequencesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ComparisonProtocolInsideSequencesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ComparisonProtocolInsideSequencesTestCase >> setUp [

	importlib @env1:modules removeKey: #'comparison_protocol_inside_sequences' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comparison_protocol_inside_sequences.py')
		name: 'comparison_protocol_inside_sequences'

]

{ #category : 'Grail-Tests - comparison' }
ComparisonProtocolInsideSequencesTestCase >> testAClassAttributeReflectedDunderGetsPriority [

	self assertAll: #('a_class_attribute_reflected_dunder_gets_priority'
		'and_the_other_direction_is_unchanged')

]

{ #category : 'Grail-Tests - comparison' }
ComparisonProtocolInsideSequencesTestCase >> testASequenceComparesItsElementsThroughTheOperator [
	"The four that stayed wrong once the probe alone was fixed, measured by
	reverting the sequence change."

	self assertAll: #('inside_a_one_element_tuple'
		'inside_a_longer_tuple_after_an_equal_prefix'
		'inside_a_list'
		'sorted_agrees_with_the_bare_comparison'
		'the_reverse_direction_inside_a_tuple'
		'equality_inside_a_tuple_matches_the_bare_equality')

]

{ #category : 'Grail-Tests - comparison' }
ComparisonProtocolInsideSequencesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 13 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13

]

{ #category : 'Grail-Tests - comparison' }
ComparisonProtocolInsideSequencesTestCase >> testOrdinarySequenceComparisonIsUnchanged [

	self assertAll: #('plain_numbers_and_strings'
		'an_equal_prefix_then_the_shorter_one_wins'
		'unorderable_elements_still_raise_the_same_TypeError'
		'all_four_orderings_on_the_subclass_pair'
		'a_tuple_of_total_ordering_values_by_value')

]
