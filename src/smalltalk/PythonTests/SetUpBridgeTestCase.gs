! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definitions
! SetUpBridgeFixture is a DELIBERATELY FAILING test case, run only by hand from
! SetUpBridgeTestCase.  isAbstract answers true so TestCase class>>buildSuite
!
!     self allSubclasses do: [:each | each isAbstract ifFalse: [...]]
!
! skips it and ``PythonTestCase suite'' never picks it up on its own.
expectvalue /Class
doit
PythonTestCase subclass: 'SetUpBridgeFixture'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SetUpBridgeFixture category: 'Grail-SUnit'
%

expectvalue /Class
doit
PythonTestCase subclass: 'SetUpBridgeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SetUpBridgeTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SetUpBridgeFixture removeAllMethods: 0.
SetUpBridgeFixture class removeAllMethods: 0.
SetUpBridgeTestCase removeAllMethods: 0.
SetUpBridgeTestCase class removeAllMethods: 0.
%

! ===============================================================================
! A Python exception raised in setUp or tearDown must be RECORDED as one test
! error, not escape the run.
!
! Grail's Python exceptions are not kinds of Error:
!
!     ModuleNotFoundError -> ImportError -> Exception -> BaseException
!                         -> Exception -> AbstractException -> Object
!
! and SUnit's TestResult>>runCase: handler is ``TestFailure , Error''.
! PythonTestCase>>performTest bridges BaseException -> Error for the test
! method, but stock TestCase>>runCase is
!
!     [self setUp. self performTest] ensure: [self tearDown]
!
! so setUp and tearDown sat OUTSIDE that bridge.  A Python exception from either
! matched neither arm, escaped to topaz, and killed the whole run: a bare
! ``PythonTestCase suite run'' died on the `import shutil' in
! ShutilTestCase>>setUp (grailDir unset) and ~4000 unrelated tests never ran.
! PythonTestCase>>runCase now wraps super in the same bridge.
!
! The fixture keeps its five behaviours on ONE class, selected by test selector,
! so exactly one deliberately-failing class has to be kept out of the suite.
! ===============================================================================

set compile_env: 0

category: 'Grail-Testing'
classmethod: SetUpBridgeFixture
isAbstract
	"Keep this deliberately-failing fixture out of ``PythonTestCase suite''.
	buildSuite skips subclasses that answer true; SetUpBridgeTestCase still
	builds individual cases with ``SetUpBridgeFixture selector: #...''."

	^ true
%

category: 'Grail-helpers'
method: SetUpBridgeFixture
raisePythonException
	"Raise a real Grail Python exception -- the same ModuleNotFoundError the
	original report hit, not a Smalltalk Error, since being a non-Error is
	the whole point."

	self eval: 'import grail_no_such_module_for_bridge_test'
%

category: 'Grail-helpers'
method: SetUpBridgeFixture
setUp
	super setUp.
	self selector == #testRaisingSetUp ifTrue: [self raisePythonException]
%

category: 'Grail-helpers'
method: SetUpBridgeFixture
tearDown
	self selector == #testRaisingTearDown
		ifTrue: [self raisePythonException].
	super tearDown
%

category: 'Grail-Fixtures'
method: SetUpBridgeFixture
testRaisingSetUp
	"Never reached -- setUp raises first."
%

category: 'Grail-Fixtures'
method: SetUpBridgeFixture
testRaisingTearDown
	"Passes, then tearDown raises."
%

category: 'Grail-Fixtures'
method: SetUpBridgeFixture
testRaisingBody
	"The already-bridged path: performTest converts this one."

	self raisePythonException
%

category: 'Grail-Fixtures'
method: SetUpBridgeFixture
testPlainFailure
	"A TestFailure must stay a FAILURE, not be turned into an error."

	self assert: false description: 'deliberate failure'
%

category: 'Grail-Fixtures'
method: SetUpBridgeFixture
testPasses
%

set compile_env: 0

category: 'Grail-helpers'
method: SetUpBridgeTestCase
runFixture: aSelector
	"Run one fixture case into its own result.  If the fixture's exception
	escapes -- the bug -- it propagates out of HERE and this test errors,
	which is exactly the signal wanted."

	| suite |
	suite := TestSuite new.
	suite addTest: (SetUpBridgeFixture selector: aSelector).
	^ GrailTestResult run: suite
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testPythonExceptionInSetUpIsRecorded
	"THE REGRESSION: this used to escape the handler and take the run down."

	| result |
	result := self runFixture: #testRaisingSetUp.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in setUp must be ONE recorded error, got '
			, result printString.
	self assert: result failureCount = 0
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testPythonExceptionInTearDownIsRecorded
	"tearDown runs from super runCase's ensure: block -- also outside the
	performTest bridge, so it escaped for the same reason."

	| result |
	result := self runFixture: #testRaisingTearDown.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in tearDown must be ONE recorded error, got '
			, result printString
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testPythonExceptionInTestBodyStillRecorded
	"The path performTest already handled: wrapping runCase must not have
	broken or double-wrapped it."

	| result |
	result := self runFixture: #testRaisingBody.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in the test body must stay one error, got '
			, result printString
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testAssertionFailureIsStillAFailure
	"The new handler catches BaseException only.  A TestFailure is a sibling
	of Error under Exception, so it must pass through and still count as a
	FAILURE -- promoting failures to errors would lose the distinction across
	the whole suite."

	| result |
	result := self runFixture: #testPlainFailure.
	self assert: result runCount = 1.
	self assert: result failureCount = 1
		description: 'assert: false must stay a FAILURE, got ' , result printString.
	self assert: result errorCount = 0
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testPassingFixtureStillPasses
	"Guard against the wrapper swallowing a clean run."

	| result |
	result := self runFixture: #testPasses.
	self assert: result runCount = 1.
	self assert: result hasPassed
		description: 'a passing fixture must still pass, got ' , result printString
%

category: 'Grail-Tests - setUp bridge'
method: SetUpBridgeTestCase
testFixtureIsNotInTheMainSuite
	"If the fixture ever leaked into ``PythonTestCase suite'' it would add
	four permanent defects to every run.  isAbstract is what keeps it out."

	self assert: SetUpBridgeFixture isAbstract
		description: 'SetUpBridgeFixture must stay out of the built suite'
%
