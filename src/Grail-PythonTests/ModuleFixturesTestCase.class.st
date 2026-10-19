Class {
	#name : 'ModuleFixturesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Support' }
ModuleFixturesTestCase >> cpythonSuiteHarness [
	"test/_grail_harness.py, loaded the way scripts/run_one_cpython_module.gs
	loads it -- so these tests exercise the object the scoreboard uses."

	^ importlib
		loadModuleFromPath: (importlib @env1:___moduleNameToPath___: 'test._grail_harness')
		name: 'test._grail_harness'

]

{ #category : 'Grail-Support' }
ModuleFixturesTestCase >> freshFixtureModule [
	"A fresh tests/python/module_fixtures.py.  Evicted from sys.modules first:
	importing it RUNS its checks, and a cached copy would answer with the trace
	a previous test left behind."

	importlib @env1:modules removeKey: #'module_fixtures' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_fixtures.py')
		name: 'module_fixtures'

]

{ #category : 'Grail-Tests - module fixtures' }
ModuleFixturesTestCase >> testAModuleWithNoFixtureIsLeftAlone [
	"Most modules have no setUpModule, so the common case is the one that must
	stay free: nothing to run, nothing reported."

	| harness |
	harness := self cpythonSuiteHarness.
	self assert: (harness @env1:setup_module: harness) asString equals: ''

]

{ #category : 'Grail-Tests - module fixtures' }
ModuleFixturesTestCase >> testEveryModuleFixtureCheckAgreesWithCPython [
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

]

{ #category : 'Grail-Tests - module fixtures' }
ModuleFixturesTestCase >> testTheSuiteHarnessBracketsThePerTestLoopWithTheFixture [
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

]

{ #category : 'Grail-Tests - module fixtures' }
ModuleFixturesTestCase >> testTheSuiteHarnessNamesAFixtureThatRaisesInsteadOfSwallowingIt [
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

]
