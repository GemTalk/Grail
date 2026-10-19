Class {
	#name : 'SetUpBridgeFixture',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Testing' }
SetUpBridgeFixture class >> isAbstract [
	"Keep this deliberately-failing fixture out of ``PythonTestCase suite''.
	buildSuite skips subclasses that answer true; SetUpBridgeTestCase still
	builds individual cases with ``SetUpBridgeFixture selector: #...''."

	^ true

]

{ #category : 'Grail-helpers' }
SetUpBridgeFixture >> raisePythonException [
	"Raise a real Grail Python exception -- the same ModuleNotFoundError the
	original report hit, not a Smalltalk Error, since being a non-Error is
	the whole point."

	self eval: 'import grail_no_such_module_for_bridge_test'

]

{ #category : 'Grail-helpers' }
SetUpBridgeFixture >> setUp [
	super setUp.
	self selector == #testRaisingSetUp ifTrue: [self raisePythonException]

]

{ #category : 'Grail-helpers' }
SetUpBridgeFixture >> tearDown [
	self selector == #testRaisingTearDown
		ifTrue: [self raisePythonException].
	super tearDown

]

{ #category : 'Grail-Fixtures' }
SetUpBridgeFixture >> testPasses [

]

{ #category : 'Grail-Fixtures' }
SetUpBridgeFixture >> testPlainFailure [
	"A TestFailure must stay a FAILURE, not be turned into an error."

	self assert: false description: 'deliberate failure'

]

{ #category : 'Grail-Fixtures' }
SetUpBridgeFixture >> testRaisingBody [
	"The already-bridged path: performTest converts this one."

	self raisePythonException

]

{ #category : 'Grail-Fixtures' }
SetUpBridgeFixture >> testRaisingSetUp [
	"Never reached -- setUp raises first."

]

{ #category : 'Grail-Fixtures' }
SetUpBridgeFixture >> testRaisingTearDown [
	"Passes, then tearDown raises."

]
