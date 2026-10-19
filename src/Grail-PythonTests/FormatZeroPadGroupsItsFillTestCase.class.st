Class {
	#name : 'FormatZeroPadGroupsItsFillTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FormatZeroPadGroupsItsFillTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
FormatZeroPadGroupsItsFillTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
FormatZeroPadGroupsItsFillTestCase >> setUp [

	importlib @env1:modules removeKey: #'format_zero_pad_groups_its_fill' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_zero_pad_groups_its_fill.py')
		name: 'format_zero_pad_groups_its_fill'

]

{ #category : 'Grail-Tests - formatting' }
FormatZeroPadGroupsItsFillTestCase >> testASignSitsOutsideTheGroupedDigits [

	self assertAll: #('a_sign_is_outside_the_grouped_digits'
		'an_explicit_plus_counts_as_the_sign')

]

{ #category : 'Grail-Tests - formatting' }
FormatZeroPadGroupsItsFillTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17

]

{ #category : 'Grail-Tests - formatting' }
FormatZeroPadGroupsItsFillTestCase >> testOnlyTheSignAwarePadJoinsTheGrouping [

	self assertAll: #('an_explicit_alignment_pads_outside_the_grouping'
		'a_non_zero_fill_never_joins_the_grouping'
		'the_explicit_equals_alignment_does_join'
		'grouping_without_a_width_is_unchanged'
		'a_width_without_a_zero_fill_is_unchanged'
		'zero_itself'
		'decimal_still_groups_in_threes')

]

{ #category : 'Grail-Tests - formatting' }
FormatZeroPadGroupsItsFillTestCase >> testTheFillZerosAreGroupedWithTheDigits [

	self assertAll: #('a_zero_padded_binary_groups_its_fill'
		'the_128_bit_width_the_same_way'
		'a_prefix_is_outside_the_grouped_digits'
		'hex_groups_in_fours_too'
		'a_width_already_reached_still_gains_separators')

]

{ #category : 'Grail-Tests - formatting' }
FormatZeroPadGroupsItsFillTestCase >> testTheGroupedWidthMayOvershootTheField [

	self assertAll: #('the_result_may_be_wider_than_the_field'
		'the_whole_ladder_of_widths'
		'two_widths_can_answer_the_same_string')

]
