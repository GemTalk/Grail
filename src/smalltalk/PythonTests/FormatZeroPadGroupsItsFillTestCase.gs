! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FormatZeroPadGroupsItsFillTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FormatZeroPadGroupsItsFillTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FormatZeroPadGroupsItsFillTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FormatZeroPadGroupsItsFillTestCase - a zero pad joins its own grouping
! ===============================================================================
! ``format(x, '039_b')'' is a zero pad and a grouping at once, and the fill zeros
! are grouped along with the real digits.  ___formatIntValue___ grouped the real
! digits and left the fill to ___formatPadBody___, where the grouping never saw
! it, so the leading group came out ragged:
!
!     0000_0001_0000_0010_0000_0011_0010_1010   CPython  (32 digits, 7 separators)
!     000000001_0000_0010_0000_0011_0010_1010   Grail    (33 digits, 6 separators)
!
! Both are 39 wide.  Only the grouping tells them apart, which is why a width
! assertion alone would have passed -- and why the fixture compares strings.
!
! ___zeroPaddedForGrouping___ now sizes the fill before grouping: the smallest
! digit count whose grouped form REACHES the width, which routinely overshoots it
! (format(1234, '012,d') asks for 12 and answers 13).  That is CPython's answer,
! measured across 32 spec/value pairs, not a rounding-up.
!
! Found as two of the three remaining test.test_ipaddress failures, whose
! test_format compares every spelling of an address's integer value.
!
! tests/python/format_zero_pad_groups_its_fill.py holds the 17 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FormatZeroPadGroupsItsFillTestCase removeAllMethods.
FormatZeroPadGroupsItsFillTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FormatZeroPadGroupsItsFillTestCase
setUp

	importlib @env1:modules removeKey: #'format_zero_pad_groups_its_fill' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_zero_pad_groups_its_fill.py')
		name: 'format_zero_pad_groups_its_fill'
%

category: 'Grail-Helpers'
method: FormatZeroPadGroupsItsFillTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: FormatZeroPadGroupsItsFillTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - formatting'
method: FormatZeroPadGroupsItsFillTestCase
testTheFillZerosAreGroupedWithTheDigits

	self assertAll: #('a_zero_padded_binary_groups_its_fill'
		'the_128_bit_width_the_same_way'
		'a_prefix_is_outside_the_grouped_digits'
		'hex_groups_in_fours_too'
		'a_width_already_reached_still_gains_separators')
%

category: 'Grail-Tests - formatting'
method: FormatZeroPadGroupsItsFillTestCase
testTheGroupedWidthMayOvershootTheField

	self assertAll: #('the_result_may_be_wider_than_the_field'
		'the_whole_ladder_of_widths'
		'two_widths_can_answer_the_same_string')
%

category: 'Grail-Tests - formatting'
method: FormatZeroPadGroupsItsFillTestCase
testASignSitsOutsideTheGroupedDigits

	self assertAll: #('a_sign_is_outside_the_grouped_digits'
		'an_explicit_plus_counts_as_the_sign')
%

category: 'Grail-Tests - formatting'
method: FormatZeroPadGroupsItsFillTestCase
testOnlyTheSignAwarePadJoinsTheGrouping

	self assertAll: #('an_explicit_alignment_pads_outside_the_grouping'
		'a_non_zero_fill_never_joins_the_grouping'
		'the_explicit_equals_alignment_does_join'
		'grouping_without_a_width_is_unchanged'
		'a_width_without_a_zero_fill_is_unchanged'
		'zero_itself'
		'decimal_still_groups_in_threes')
%

category: 'Grail-Tests - formatting'
method: FormatZeroPadGroupsItsFillTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17
%
