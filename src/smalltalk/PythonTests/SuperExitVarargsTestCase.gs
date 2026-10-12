! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperExitVarargsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperExitVarargsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperExitVarargsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperExitVarargsTestCase - #1457
! ===============================================================================
!   super().__exit__(a, b, c) into a base whose __exit__ takes *exc_info.  The
!   base's fixed-arity FORWARDER sent into its varargs body through the
!   receiver, so super() from the subclass landed back in the subclass's own
!   keyword companion and recursed -- uncatchably inside a ``with''.  Super >>
!   _unforwarded: now runs the body the forwarder stands for.
!
! tests/python/super_exit_varargs.py holds the 10 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperExitVarargsTestCase removeAllMethods.
SuperExitVarargsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperExitVarargsTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/super_exit_varargs.py'
		name: 'super_exit_varargs'
%

category: 'Grail-Helpers'
method: SuperExitVarargsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SuperExitVarargsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: SuperExitVarargsTestCase
testSuperReachesAVarargsBaseExit

	self assertAll: #('super_call' 'two_levels' 'bound_then_called'
		'splat_call' 'unbound_call')
%

category: 'Grail-Tests'
method: SuperExitVarargsTestCase
testAWithStatementChainsExitThroughTheBase

	self assertAll: #('with_clean' 'with_exception')
%

category: 'Grail-Tests'
method: SuperExitVarargsTestCase
testShapesThatAlreadyWorkedStillDo

	self assertAll: #('mirror_varargs_over_fixed' 'direct_base' 'direct_inherited')
%

category: 'Grail-Tests - coverage'
method: SuperExitVarargsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
