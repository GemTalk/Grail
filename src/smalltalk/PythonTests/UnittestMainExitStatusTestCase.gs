! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnittestMainExitStatusTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnittestMainExitStatusTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnittestMainExitStatusTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnittestMainExitStatusTestCase - main() exits non-zero, and finds __main__
! ===============================================================================
! unittest.main() was ``main(module=None, verbosity=1, exit=False)'' and had two
! faults that showed up in OPPOSITE directions.
!
! exit=False meant main() PRINTED the failure and returned, so a failing run left
! the process at 0: the summary said FAILED (failures=1) and ./grail still exited
! 0.  Any CI step calling main() reported every failing run as GREEN.
!
! module was required, and the reason given was that ``Grail has no __main__
! introspection''.  That had stopped being true: under ./grail a script IS
! sys.modules['__main__'], with __name__ == '__main__'.  So the ordinary closing
! line of a test file -- ``if __name__ == "__main__": unittest.main()'' -- raised
! TypeError, and since a TypeError also exits 1, a FAILING script exited 1 for
! the wrong reason.  Only a PASSING script revealed that fault (#1237).
!
! Adding ``import sys'' was part of it: three sys.modules reads were already in
! the file -- TestCase's __file__ lookup and the setUpModule/tearDownModule walk
! -- with nothing importing sys, so each would have raised NameError on the path
! that reaches it.  main()'s sys.exit is what finally ran into it.
!
! WHAT IS TESTED WHERE.  The exit STATUS cannot be asserted in-process (it would
! end the process asserting it), and main()'s no-argument default needs
! sys.modules['__main__'], which a script has and this embedded session does not.
! Both live in tests/scripts/run_unittest_main_exit_test.sh, which runs real
! scripts through ./grail and compares each status with CPython's on the same
! file.  Measured with the change reverted, it fails two checks, one in each
! direction.
!
! tests/python/unittest_main_exit_status.py holds the 9 checks that do hold
! wherever it is loaded from, run under real CPython 3.14 by
! scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnittestMainExitStatusTestCase removeAllMethods.
UnittestMainExitStatusTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnittestMainExitStatusTestCase
setUp

	importlib @env1:modules removeKey: #'unittest_main_exit_status' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_main_exit_status.py')
		name: 'unittest_main_exit_status'
%

category: 'Grail-Helpers'
method: UnittestMainExitStatusTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: UnittestMainExitStatusTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - unittest'
method: UnittestMainExitStatusTestCase
testMainExitsRatherThanReturningItsResult

	self assertAll: #('exit_is_true_by_default'
		'a_failing_suite_would_exit_one'
		'a_passing_suite_would_exit_zero'
		'a_mixed_suite_would_exit_one')
%

category: 'Grail-Tests - unittest'
method: UnittestMainExitStatusTestCase
testAModuleArgumentIsNoLongerDemanded

	self assertAll: #('a_module_argument_no_longer_raises_the_old_type_error'
		'a_string_module_name_is_accepted')
%

category: 'Grail-Tests - unittest'
method: UnittestMainExitStatusTestCase
testWhatCallersOfExitFalseStillGet

	self assertAll: #('exit_false_still_answers_a_usable_result'
		'was_successful_still_reads_the_two_lists'
		'the_counts_are_unchanged')
%

category: 'Grail-Tests - unittest'
method: UnittestMainExitStatusTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
