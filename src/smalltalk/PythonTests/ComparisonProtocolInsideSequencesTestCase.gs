! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComparisonProtocolInsideSequencesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ComparisonProtocolInsideSequencesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ComparisonProtocolInsideSequencesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ComparisonProtocolInsideSequencesTestCase - the operator, wherever it is called
! ===============================================================================
! Two places reached a comparison dunder directly and lost the rule that gives a
! proper subtype's REFLECTED dunder priority:
!
!   1. ___reflectedFirst___: looked for the reflected dunder only as a COMPILED
!      method.  @functools.total_ordering installs its derived comparisons with
!      setattr(cls, opname, opfunc), so they live in the class dict; the probe
!      answered ``object'' and the subclass looked like it had no reflected
!      method at all.  ___binOpFallback___ already consults
!      ___classAttrDunder___ for the arithmetic family, for the same reason.
!
!   2. SequenceableCollection's __lt__/__le__/__gt__/__ge__ compared the first
!      differing pair with a direct ``a __lt__: b'' send, bypassing the operator
!      layer.  So a tuple or list could order two elements the OPPOSITE way from
!      how the same two compare on their own.
!
! The fixture's Point/Labeled pair is what makes the second visible, and it is
! the shape CPython's ipaddress has: a subclass carrying MORE than its base, so
! an equal-valued base instance is not equal to it and the inherited __lt__
! computes a different answer from the base's.  Before the repair the bare
! comparison was right and the one inside a tuple was False -- measured, by
! reverting the sequence change and watching four checks flip.
!
! Only the first DIFFERING pair goes through the operator; the scan that finds it
! still uses the cheap comparison, so ordinary sequences are untouched.
!
! Together these take test.test_ipaddress to OK, 211 of 211.
!
! tests/python/comparison_protocol_inside_sequences.py holds the 13 checks, run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ComparisonProtocolInsideSequencesTestCase removeAllMethods.
ComparisonProtocolInsideSequencesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ComparisonProtocolInsideSequencesTestCase
setUp

	importlib @env1:modules removeKey: #'comparison_protocol_inside_sequences' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comparison_protocol_inside_sequences.py')
		name: 'comparison_protocol_inside_sequences'
%

category: 'Grail-Helpers'
method: ComparisonProtocolInsideSequencesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ComparisonProtocolInsideSequencesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - comparison'
method: ComparisonProtocolInsideSequencesTestCase
testAClassAttributeReflectedDunderGetsPriority

	self assertAll: #('a_class_attribute_reflected_dunder_gets_priority'
		'and_the_other_direction_is_unchanged')
%

category: 'Grail-Tests - comparison'
method: ComparisonProtocolInsideSequencesTestCase
testASequenceComparesItsElementsThroughTheOperator
	"The four that stayed wrong once the probe alone was fixed, measured by
	reverting the sequence change."

	self assertAll: #('inside_a_one_element_tuple'
		'inside_a_longer_tuple_after_an_equal_prefix'
		'inside_a_list'
		'sorted_agrees_with_the_bare_comparison'
		'the_reverse_direction_inside_a_tuple'
		'equality_inside_a_tuple_matches_the_bare_equality')
%

category: 'Grail-Tests - comparison'
method: ComparisonProtocolInsideSequencesTestCase
testOrdinarySequenceComparisonIsUnchanged

	self assertAll: #('plain_numbers_and_strings'
		'an_equal_prefix_then_the_shorter_one_wins'
		'unorderable_elements_still_raise_the_same_TypeError'
		'all_four_orderings_on_the_subclass_pair'
		'a_tuple_of_total_ordering_values_by_value')
%

category: 'Grail-Tests - comparison'
method: ComparisonProtocolInsideSequencesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 13 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13
%
