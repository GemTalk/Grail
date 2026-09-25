! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReflectedComparisonPriorityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReflectedComparisonPriorityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReflectedComparisonPriorityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReflectedComparisonPriorityTestCase - a subtype earns priority by BEING one
! ===============================================================================
! For ``a < b'', CPython's do_richcompare tries b's reflected __gt__ before a's
! __lt__ whenever type(b) is a proper subtype of type(a).  The test is on the
! TYPE: it asks only that the subtype have a rich-compare slot, which every
! Python class has.  It does not ask whether the subclass overrode anything.
!
! ___reflectedFirst___: asked the second question -- a subclass that INHERITED
! the reflected dunder was read as ``no override, no priority'' -- and sent the
! comparison down the forward path instead.  That is a different computation,
! because the operands are swapped, so the two directions can disagree.  Every
! check in the fixture therefore records WHICH method ran, not just the answer: a
! comparison of results alone would pass while the wrong method computed it.
!
! Measured: this cost only the four ORDERING operators.  ==/!= reach the priority
! by a different route and were already correct, and the fixture keeps them as a
! guard on that route rather than as a check on this repair.
!
! tests/python/reflected_comparison_priority.py holds the 9 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReflectedComparisonPriorityTestCase removeAllMethods.
ReflectedComparisonPriorityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReflectedComparisonPriorityTestCase
setUp

	importlib @env1:modules removeKey: #'reflected_comparison_priority' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reflected_comparison_priority.py')
		name: 'reflected_comparison_priority'
%

category: 'Grail-Helpers'
method: ReflectedComparisonPriorityTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ReflectedComparisonPriorityTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - comparison'
method: ReflectedComparisonPriorityTestCase
testAnInheritingSubclassGetsTheReflectedCallFirst
	"The two checks that failed before the repair, measured by reverting it."

	self assertAll: #('an_inheriting_subclass_gets_the_reflected_call_first'
		'and_so_does_every_other_ordering_operator')
%

category: 'Grail-Tests - comparison'
method: ReflectedComparisonPriorityTestCase
testThePriorityRulesThatAlreadyHeldAreUnchanged

	self assertAll: #('and_the_equality_pair_too'
		'an_overriding_subclass_still_gets_priority'
		'a_declining_reflected_call_falls_through_to_the_forward_one'
		'the_same_type_on_both_sides_is_not_reflected'
		'the_subclass_on_the_LEFT_is_not_reflected'
		'an_unrelated_type_is_not_reflected'
		'a_subclass_with_no_dunders_anywhere')
%

category: 'Grail-Tests - comparison'
method: ReflectedComparisonPriorityTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
