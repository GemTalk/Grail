! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntNePuntsOnNotImplementedTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntNePuntsOnNotImplementedTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntNePuntsOnNotImplementedTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IntNePuntsOnNotImplementedTestCase - __ne__ must punt where __eq__ punts
! ===============================================================================
! An operand that cannot handle the other type answers NotImplemented, and the
! OPERATOR layer decides what that means -- try the reflected dunder, then fall
! back to identity for ==/!=.  Four __ne__ methods were written as
! ``(self __eq__: other) not'', which is right whenever __eq__ answers a bool and
! wrong exactly when it PUNTS: ``not'' went to the NotImplemented singleton.
!
! What made it hard to see is that none of the four spells NotImplemented.  Their
! __eq__ forwards to a PythonInstance carrying its own __eq__, so the punt
! arrives THROUGH that forward -- grepping the bodies finds nothing.
!
! What made it hard to diagnose is that a doesNotUnderstand raised inside an
! operator is not a Python-level error: it is an uncatchable
! MessageNotUnderstood, so no handler records it against the comparison that
! raised it.  A unittest run scores the whole module ERROR and names no test.
! That is how it was found -- as the one unattributed error in
! test.test_ipaddress, whose IPv4Interface declines an int exactly this way.
!
! The four are int and float, plus AbstractPyInt and AbstractPyFloat -- the bases
! an int or float SUBCLASS is built on, which is how every IntEnum and IntFlag
! member reaches it.  All four were measured broken before the change and are
! pinned below.
!
! tests/python/int_ne_punts_on_notimplemented.py holds the 18 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntNePuntsOnNotImplementedTestCase removeAllMethods.
IntNePuntsOnNotImplementedTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IntNePuntsOnNotImplementedTestCase
setUp

	importlib @env1:modules removeKey: #'int_ne_punts_on_notimplemented' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_ne_punts_on_notimplemented.py')
		name: 'int_ne_punts_on_notimplemented'
%

category: 'Grail-Helpers'
method: IntNePuntsOnNotImplementedTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: IntNePuntsOnNotImplementedTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - comparison'
method: IntNePuntsOnNotImplementedTestCase
testAnIntComparedWithAnOperandThatDeclines

	self assertAll: #('a_declining_object_is_unequal_to_an_int'
		'with_the_int_written_on_the_left'
		'the_same_for_a_bool_and_a_float'
		'a_class_that_declines_only_in_eq'
		'and_the_equality_spelling_agrees'
		'an_int_in_a_container_of_declining_objects'
		'two_of_them_still_compare_by_value')
%

category: 'Grail-Tests - comparison'
method: IntNePuntsOnNotImplementedTestCase
testASubclassOfIntOrFloatIsTheOtherPairOfMethods
	"AbstractPyInt / AbstractPyFloat rather than int / float, so fixing the
	two concrete classes alone left these raising -- measured, by reverting
	just the two wrapper classes and watching all four cases raise again."

	self assertAll: #('an_int_subclass_declines_the_same_way'
		'a_float_subclass_declines_the_same_way'
		'an_int_enum_member_declines_the_same_way'
		'an_int_flag_member_declines_the_same_way')
%

category: 'Grail-Tests - comparison'
method: IntNePuntsOnNotImplementedTestCase
testTheComparisonsThatAlreadyWorkedAreUnchanged
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
%

category: 'Grail-Tests - comparison'
method: IntNePuntsOnNotImplementedTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 18 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 18
%
