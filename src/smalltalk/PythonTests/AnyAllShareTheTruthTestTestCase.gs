! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AnyAllShareTheTruthTestTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AnyAllShareTheTruthTestTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AnyAllShareTheTruthTestTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AnyAllShareTheTruthTestTestCase - any/all ask the same question ``if'' does
! ===============================================================================
! builtins >> any: and all: each ran their own truth test -- ``item __bool__''
! under a MessageNotUnderstood handler that answered TRUE -- instead of the
! shared ___isTruthy___.  str, list, dict and every other container define no
! __bool__; ___truthOf___ goes on to __len__ for them, which is why bool() and
! ``if'' were always right, and why the private probe was wrong for all of them:
!
!     all(['x', ''])                     answered True,  CPython False
!     any(f.strip() for f in ['', ' '])  answered True,  CPython False
!
! Nothing raised and the answer looked plausible, which is how it survived.  It
! was found in a Flask roster importer whose blank-row check never saw a blank
! row (#1234).
!
! The same private test carried two smaller faults: a MessageNotUnderstood raised
! INSIDE a user's __bool__ was swallowed and read as true, and a __bool__
! returning a non-bool raised an UNCATCHABLE ImproperOperation (error 2085)
! rather than the TypeError bool() gives.  That last one is why the fixture does
! not merely fail without the fix -- it does not LOAD.
!
! tests/python/any_all_share_the_truth_test.py holds the 15 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AnyAllShareTheTruthTestTestCase removeAllMethods.
AnyAllShareTheTruthTestTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AnyAllShareTheTruthTestTestCase
setUp

	importlib @env1:modules removeKey: #'any_all_share_the_truth_test' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/any_all_share_the_truth_test.py')
		name: 'any_all_share_the_truth_test'
%

category: 'Grail-Helpers'
method: AnyAllShareTheTruthTestTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: AnyAllShareTheTruthTestTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - builtins'
method: AnyAllShareTheTruthTestTestCase
testAnEmptyContainerIsFalseToAnyAndAll

	self assertAll: #('any_of_a_lone_empty_is_false'
		'all_of_a_lone_empty_is_false'
		'they_agree_with_bool_on_every_one'
		'the_blank_row_check_that_found_it'
		'a_mixed_sequence'
		'a_generator_not_just_a_list')
%

category: 'Grail-Tests - builtins'
method: AnyAllShareTheTruthTestTestCase
testWhatDunderBoolRaisesReachesTheCaller
	"The non-bool return was an UNCATCHABLE ImproperOperation, so before the
	repair the fixture could not even load to report this."

	self assertAll: #('a_non_bool_dunder_raises_the_catchable_type_error'
		'and_it_matches_what_bool_itself_raises'
		'an_exception_from_inside_dunder_bool_propagates'
		'an_attribute_error_inside_dunder_bool_is_not_read_as_true')
%

category: 'Grail-Tests - builtins'
method: AnyAllShareTheTruthTestTestCase
testTheAnswersThatWereAlreadyRightAreUnchanged

	self assertAll: #('the_falsey_values_that_already_worked'
		'truthy_values_are_still_true'
		'the_empty_iterable_conventions'
		'any_stops_at_the_first_true_element'
		'all_stops_at_the_first_false_element')
%

category: 'Grail-Tests - builtins'
method: AnyAllShareTheTruthTestTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 15 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15
%
