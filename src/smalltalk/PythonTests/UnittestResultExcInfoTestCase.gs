! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnittestResultExcInfoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnittestResultExcInfoTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnittestResultExcInfoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnittestResultExcInfoTestCase - a TestResult is handed (type, value, traceback)
! ===============================================================================
! Grail's unittest handed addError / addFailure / addExpectedFailure a
! description string where CPython hands the exc_info triple.  pytest's
! unittest plugin builds its report from the traceback, took the string for a
! sequence of traceback entries, and ended the run with an INTERNALERROR at the
! first failing unittest-style test -- seven packages of the census stopped
! there.  The base TestResult still keeps a one-line description per error.
! tests/python/unittest_result_exc_info.py holds the 7 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnittestResultExcInfoTestCase removeAllMethods.
UnittestResultExcInfoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnittestResultExcInfoTestCase
setUp

	importlib @env1:modules removeKey: #'unittest_result_exc_info' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_result_exc_info.py')
		name: 'unittest_result_exc_info'
%

category: 'Grail-Helpers'
method: UnittestResultExcInfoTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: UnittestResultExcInfoTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - the triple'
method: UnittestResultExcInfoTestCase
testEveryOutcomeIsHandedTheTriple

	self assertAll: #('a_failure_is_handed_the_triple' 'an_error_is_handed_the_triple'
		'an_expected_failure_is_handed_the_triple' 'a_setup_error_is_handed_the_triple'
		'a_teardown_error_is_handed_the_triple' 'a_cleanup_error_is_handed_the_triple')
%

category: 'Grail-Tests - the triple'
method: UnittestResultExcInfoTestCase
testTheBaseResultStillKeepsAString

	self assertAll: #('the_base_result_keeps_a_string_per_error')
%

category: 'Grail-Tests - the triple'
method: UnittestResultExcInfoTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7
%
