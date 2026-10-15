Class {
	#name : 'SetUpBridgeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
SetUpBridgeTestCase >> runFixture: aSelector [
	"Run one fixture case into its own result.  If the fixture's exception
	escapes -- the bug -- it propagates out of HERE and this test errors,
	which is exactly the signal wanted."

	| suite |
	suite := TestSuite new.
	suite addTest: (SetUpBridgeFixture selector: aSelector).
	^ GrailTestResult run: suite

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testAssertionFailureIsStillAFailure [
	"The new handler catches BaseException only.  A TestFailure is a sibling
	of Error under Exception, so it must pass through and still count as a
	FAILURE -- promoting failures to errors would lose the distinction across
	the whole suite."

	| result |
	result := self runFixture: #testPlainFailure.
	self assert: result runCount = 1.
	self assert: result failureCount = 1
		description: 'assert: false must stay a FAILURE, got ' , result printString.
	self assert: result errorCount = 0.
	"...and must NOT also be counted as a pass.  GsTestCase>>assert: signals a
	RESUMABLE failure, so announcing it through sunitAnnounce:toResult:
	(``self resume:'') let the test body continue past the failed assertion
	and fall through to addPass:.  runCount alone hides that: a double-counted
	test reads as 2 run, and only this check names the cause."
	self assert: result passedCount = 0
		description: 'a failing test must not also be recorded as a pass, got '
			, result printString

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testFixtureIsNotInTheMainSuite [
	"If the fixture ever leaked into ``PythonTestCase suite'' it would add
	four permanent defects to every run.  isAbstract is what keeps it out."

	self assert: SetUpBridgeFixture isAbstract
		description: 'SetUpBridgeFixture must stay out of the built suite'

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testPassingFixtureStillPasses [
	"Guard against the wrapper swallowing a clean run."

	| result |
	result := self runFixture: #testPasses.
	self assert: result runCount = 1.
	self assert: result hasPassed
		description: 'a passing fixture must still pass, got ' , result printString

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testPythonExceptionInSetUpIsRecorded [
	"THE REGRESSION: this used to escape the handler and take the run down."

	| result |
	result := self runFixture: #testRaisingSetUp.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in setUp must be ONE recorded error, got '
			, result printString.
	self assert: result failureCount = 0

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testPythonExceptionInTearDownIsRecorded [
	"tearDown runs from super runCase's ensure: block -- also outside the
	performTest bridge, so it escaped for the same reason."

	| result |
	result := self runFixture: #testRaisingTearDown.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in tearDown must be ONE recorded error, got '
			, result printString

]

{ #category : 'Grail-Tests - setUp bridge' }
SetUpBridgeTestCase >> testPythonExceptionInTestBodyStillRecorded [
	"The path performTest already handled: wrapping runCase must not have
	broken or double-wrapped it."

	| result |
	result := self runFixture: #testRaisingBody.
	self assert: result runCount = 1.
	self assert: result errorCount = 1
		description: 'a Python exception in the test body must stay one error, got '
			, result printString

]
