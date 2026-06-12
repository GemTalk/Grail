! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnittestTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnittestTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnittestTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
UnittestTestCase removeAllMethods: 0.
UnittestTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Helpers'
method: UnittestTestCase
loadFixture: fixtureName
	"Same caching pattern as FlaskScaffoldingTestCase >> loadFixture:."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods @env0:at: fullName @env0:asSymbol ifAbsent: [nil].
	cached @env0:notNil ifTrue: [^ cached].
	(mods @env0:includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

category: 'Grail-Tests - unittest'
method: UnittestTestCase
testLoaderAndOutcomes
	"TestLoader discovers the 6 test_ methods (not the helper); the run
	produces 1 failure + 1 error + 1 skip + 3 passes; setUp/tearDown
	run per test (skip via skipTest still runs tearDown)."

	| mod facts |
	mod := self loadFixture: 'unittest_fixture'.
	facts := mod @env1:run_sample.
	self assert: (facts @env1:__getitem__: 'count') equals: 6.
	self assert: (facts @env1:__getitem__: 'run') equals: 6.
	self assert: (facts @env1:__getitem__: 'failures') equals: 1.
	self assert: (facts @env1:__getitem__: 'errors') equals: 1.
	self assert: (facts @env1:__getitem__: 'skipped') equals: 1.
	self deny: (facts @env1:__getitem__: 'ok').
	self assert: (facts @env1:__getitem__: 'setups') equals: 6.
	self assert: (facts @env1:__getitem__: 'teardowns') equals: 6
%

category: 'Grail-Tests - unittest'
method: UnittestTestCase
testFailureAndErrorMessages
	"Failure carries the custom message; error carries the exception
	class name and text; the right tests are attributed."

	| mod facts |
	mod := self loadFixture: 'unittest_fixture'.
	facts := mod @env1:run_sample.
	self assert: ((facts @env1:__getitem__: 'fail_msg') includesString: 'one is not two').
	self assert: ((facts @env1:__getitem__: 'error_msg') includesString: 'RuntimeError').
	self assert: ((facts @env1:__getitem__: 'error_msg') includesString: 'kaboom').
	self assert: (facts @env1:__getitem__: 'skip_msg') equals: 'not today'.
	self assert: ((facts @env1:__getitem__: 'fail_names') @env1:__getitem__: 0)
		equals: 'test_fails (SampleTests)'.
	self assert: ((facts @env1:__getitem__: 'error_names') @env1:__getitem__: 0)
		equals: 'test_errors (SampleTests)'
%

category: 'Grail-Tests - unittest'
method: UnittestTestCase
testModuleDiscovery
	"loadTestsFromModule finds the TestCase subclass via dir+issubclass."

	| mod |
	mod := self loadFixture: 'unittest_fixture'.
	self assert: mod @env1:run_module_discovery equals: 6
%

category: 'Grail-Tests - unittest'
method: UnittestTestCase
testAssertionMessages
	"Individual assertions raise AssertionError; an assertRaises block
	that does NOT raise produces a 'not raised' failure."

	| mod out |
	mod := self loadFixture: 'unittest_fixture'.
	out := mod @env1:run_assertion_failures.
	self assert: (out @env1:__getitem__: 0) equals: 'assertTrue'.
	self assert: (out @env1:__getitem__: 1) equals: 'assertIn'.
	self assert: (out @env1:__getitem__: 2) equals: 'assertIsInstance'.
	self assert: (out @env1:__getitem__: 3) equals: 'assertGreater'.
	self assert: ((out @env1:__getitem__: 4) includesString: 'ValueError not raised')
%

category: 'Grail-Tests - unittest'
method: UnittestTestCase
testTextRunner
	"TextTestRunner writes the summary to a supplied stream."

	| mod result |
	mod := self loadFixture: 'unittest_fixture'.
	result := mod @env1:run_text_runner.
	self assert: (result @env1:__getitem__: 0) equals: 6.
	self assert: (result @env1:__getitem__: 1).
	self assert: (result @env1:__getitem__: 2)
%
