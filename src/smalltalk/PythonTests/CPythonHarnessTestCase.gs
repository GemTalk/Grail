! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CPythonHarnessTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CPythonHarnessTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CPythonHarnessTestCase comment:
'Regression tests for the CPython regression-test harness plumbing:
runModule: (the python3 -m entry) and the score() discovery path that
scripts/run_one_cpython_module.gs drives.  Exercises the tiny fixture
test.grail_selfcheck (2 TestCase subclasses -> 3 tests: 1 pass, 1 skip,
1 fail).  See docs/CPython_Suite_Scoreboard.md.'
%

expectvalue /Class
doit
CPythonHarnessTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
CPythonHarnessTestCase removeAllMethods: 0.
CPythonHarnessTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Helpers'
method: CPythonHarnessTestCase
setUp
	"Drop the fixture + harness modules (and any __main__ left by
	runModule:) from the registry so each test rebuilds them from
	source, matching the pattern used by ImportlibUnloadTestCase."

	| mods |
	mods := importlib @env1:modules.
	#('__main__' 'test.grail_selfcheck' 'test._grail_harness') do: [:name |
		mods @env0:removeKey: name @env0:asSymbol ifAbsent: []].
%

category: 'Grail-Helpers'
method: CPythonHarnessTestCase
loadByName: aName
	"Import a module under its real dotted name (NOT __main__), the way
	the scoring driver does."

	^ importlib
		loadModuleFromPath: (importlib @env1:___moduleNameToPath___: aName)
		name: aName
%

category: 'Grail-Tests - harness'
method: CPythonHarnessTestCase
testRunModuleExecutesAsMain
	"runModule: resolves a dotted name, runs the file as __main__, and
	the module body (RESULT = _run()) computes the expected outcome:
	3 tests run, 1 failure, 0 errors, 1 skip."

	| mod result |
	mod := importlib runModule: 'test.grail_selfcheck'.
	result := mod @env1:___pyAttrLoad___: #RESULT.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 0.
	self assert: (result @env1:__getitem__: 3) equals: 1.
%

category: 'Grail-Tests - harness'
method: CPythonHarnessTestCase
testRunModuleUnknownRaises
	"An unresolvable dotted name signals a Python ModuleNotFoundError."

	self should: [importlib runModule: 'test.no_such_module_xyzzy']
		raise: ModuleNotFoundError
%

category: 'Grail-Tests - harness'
method: CPythonHarnessTestCase
testScorePathDiscoversTestCases
	"The score() helper the shell driver calls discovers both TestCase
	subclasses in the fixture via unittest and returns the same
	(testsRun, failures, errors, skipped) 4-tuple: (3, 1, 0, 1).  This
	regresses the exact path run_one_cpython_module.gs depends on."

	| harnessMod mod res |
	harnessMod := self loadByName: 'test._grail_harness'.
	mod := self loadByName: 'test.grail_selfcheck'.
	res := harnessMod @env1:score: mod.
	self assert: (res @env1:__getitem__: 0) equals: 3.
	self assert: (res @env1:__getitem__: 1) equals: 1.
	self assert: (res @env1:__getitem__: 2) equals: 0.
	self assert: (res @env1:__getitem__: 3) equals: 1.
%
