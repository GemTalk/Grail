Class {
	#name : 'ReflectedComparisonPriorityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ReflectedComparisonPriorityTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ReflectedComparisonPriorityTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ReflectedComparisonPriorityTestCase >> setUp [

	importlib @env1:modules removeKey: #'reflected_comparison_priority' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reflected_comparison_priority.py')
		name: 'reflected_comparison_priority'

]

{ #category : 'Grail-Tests - comparison' }
ReflectedComparisonPriorityTestCase >> testAnInheritingSubclassGetsTheReflectedCallFirst [
	"The two checks that failed before the repair, measured by reverting it."

	self assertAll: #('an_inheriting_subclass_gets_the_reflected_call_first'
		'and_so_does_every_other_ordering_operator')

]

{ #category : 'Grail-Tests' }
ReflectedComparisonPriorityTestCase >> testAnIntTimesASequenceSubclassAsksItsRmul [
	"``3 * S('b')'' for ``class S(str)'' with an __rmul__ is S.__rmul__'s answer,
	not 'bbb' (#1552): CPython's int declines a sequence and the sequence's
	reflected multiply runs.  The reflected half is the BUILTIN repeat even for
	a subclass that overrides __mul__ (``3 * M('b')'' is 'bbb'), and an __rmul__
	that declines is a TypeError.  tests/python/int_times_sequence_subclass.py
	holds the checks, for str, list, tuple, bytes and bytearray subclasses and a
	bool on the left, and agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'int_times_sequence_subclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_times_sequence_subclass.py')
		name: 'int_times_sequence_subclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ReflectedComparisonPriorityTestCase >> testASubclassOfABuiltinOnTheRightIsAskedFirst [
	"``0 == C3(11)'' for ``class C3(int)'', and the same for float and str on
	the left: the subclass's reflected method goes first (#1495).  A Python
	subclass of int, float or str does not inherit from the kernel class of the
	builtin's values, so the subclass test never saw it, and membership,
	count and index -- test_range's ``C3(11) in range(10)'' -- answered False.
	tests/python/reflected_subclass_priority.py holds the checks and agrees
	with CPython 3.14, and covers the arithmetic half of the rule too (#1545),
	where the reflected method must be the subclass's own and a declining one
	is not called twice."

	| fixture |
	importlib @env1:modules removeKey: #'reflected_subclass_priority' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reflected_subclass_priority.py')
		name: 'reflected_subclass_priority'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '21 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - comparison' }
ReflectedComparisonPriorityTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - comparison' }
ReflectedComparisonPriorityTestCase >> testThePriorityRulesThatAlreadyHeldAreUnchanged [

	self assertAll: #('and_the_equality_pair_too'
		'an_overriding_subclass_still_gets_priority'
		'a_declining_reflected_call_falls_through_to_the_forward_one'
		'the_same_type_on_both_sides_is_not_reflected'
		'the_subclass_on_the_LEFT_is_not_reflected'
		'an_unrelated_type_is_not_reflected'
		'a_subclass_with_no_dunders_anywhere')

]
