! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleFixturesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFixturesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFixturesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFixturesTestCase - setUpModule / tearDownModule
! ===============================================================================
! unittest has three fixture scopes: per test (setUp), per class (setUpClass)
! and per module (setUpModule).  Grail had the first two and silently ignored
! the third.  A module-level fixture that builds the thing under test therefore
! did not run, and the tests then failed naming whatever the fixture was
! supposed to have created -- which is a long way from naming the fixture.
!
! That is the same quiet wrong answer the class fixtures were added to fix, one
! scope out, and it is measurable: test.test_xml_etree is 226 tests of which 224
! error, all on one root -- its setUpModule is where the module under test gets
! imported.
!
! TWO PATHS need the fixture, because Grail runs the CPython corpus twice over.
! unittest.TestSuite is the ordinary one.  The scoreboard is the other: it hands
! out one TestCase at a time from topaz, so that an uncatchable Smalltalk error
! in one test cannot void the module's whole score, and test/_grail_harness.py
! fires the fixtures around that loop instead.  The class fixture is re-run per
! test there; the module fixture is run once, because one topaz session scores
! exactly one module.
!
! tests/python/module_fixtures.py holds the nine checks below and is run under
! real CPython 3.14 by scripts/check_python_fixtures.sh, so the ORDER asserted
! here -- setUpModule, the classes, tearDownModule, then the module cleanups --
! is measured against CPython rather than against Grail's own output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFixturesTestCase removeAllMethods.
ModuleFixturesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Support'
method: ModuleFixturesTestCase
cpythonSuiteHarness
	"test/_grail_harness.py, loaded the way scripts/run_one_cpython_module.gs
	loads it -- so these tests exercise the object the scoreboard uses."

	^ importlib
		loadModuleFromPath: (importlib @env1:___moduleNameToPath___: 'test._grail_harness')
		name: 'test._grail_harness'
%

category: 'Grail-Support'
method: ModuleFixturesTestCase
freshFixtureModule
	"A fresh tests/python/module_fixtures.py.  Evicted from sys.modules first:
	importing it RUNS its checks, and a cached copy would answer with the trace
	a previous test left behind."

	importlib @env1:modules removeKey: #'module_fixtures' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_fixtures.py')
		name: 'module_fixtures'
%

category: 'Grail-Tests - module fixtures'
method: ModuleFixturesTestCase
testEveryModuleFixtureCheckAgreesWithCPython
	"Every check in tests/python/module_fixtures.py, which the fixture gate also
	runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| results names |
	results := self freshFixtureModule @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_failing_fixture_fails_the_run'
	  'a_failing_fixture_is_not_torn_down'
	  'a_failing_fixture_runs_no_test'
	  'a_failing_fixture_still_runs_its_cleanups'
	  'a_run_with_a_working_fixture_succeeds'
	  'enter_module_context_exits_during_cleanup'
	  'the_fixture_is_found_through_sys_modules'
	  'the_module_fixture_brackets_the_whole_run'
	  'two_classes_set_the_module_up_once').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 9
%

category: 'Grail-Tests - module fixtures'
method: ModuleFixturesTestCase
testTheSuiteHarnessBracketsThePerTestLoopWithTheFixture
	"The scoreboard's path, which unittest.TestSuite never runs: setup_module
	before the first test and teardown_module after the last, with the module
	cleanups draining behind tearDownModule."

	| fixture trace |
	fixture := self freshFixtureModule.
	trace := fixture @env1:___pyAttrLoad___: #TRACE.
	trace @env1:clear.
	self cpythonSuiteHarness @env1:setup_module: fixture.
	self cpythonSuiteHarness @env1:teardown_module: fixture.
	self assert: (trace @env1:__len__) equals: 3.
	self assert: (trace @env1:__getitem__: 0) asString equals: 'setUpModule'.
	self assert: (trace @env1:__getitem__: 1) asString equals: 'tearDownModule'.
	self assert: (trace @env1:__getitem__: 2) asString equals: 'moduleCleanup'
%

category: 'Grail-Tests - module fixtures'
method: ModuleFixturesTestCase
testTheSuiteHarnessNamesAFixtureThatRaisesInsteadOfSwallowingIt
	"A setUpModule Grail cannot satisfy must cost the module its fixture and
	not its whole score, so the harness catches the exception -- but catching
	it SILENTLY is what made a broken class fixture indistinguishable from an
	absent one.  It answers the reason instead, and run_one appends it to the
	detail of any test that then goes wrong."

	| fixture answer |
	fixture := self freshFixtureModule.
	fixture @env1:set_failure: true.
	answer := [self cpythonSuiteHarness @env1:setup_module: fixture]
		ensure: [fixture @env1:set_failure: false].
	self assert: answer asString equals: 'RuntimeError: setUpModule says no'
%

category: 'Grail-Tests - module fixtures'
method: ModuleFixturesTestCase
testAModuleWithNoFixtureIsLeftAlone
	"Most modules have no setUpModule, so the common case is the one that must
	stay free: nothing to run, nothing reported."

	| harness |
	harness := self cpythonSuiteHarness.
	self assert: (harness @env1:setup_module: harness) asString equals: ''
%
