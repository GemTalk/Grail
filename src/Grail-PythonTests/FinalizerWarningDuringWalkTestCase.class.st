"Tests that a warning a finalizer hook raises at a safe point is not blamed on
the code that reached the safe point -- #1999.  Drives
tests/python/finalizer_warning_during_walk.py."
Class {
	#name : 'FinalizerWarningDuringWalkTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FinalizerWarningDuringWalkTestCase >> call: aName [

	^ (fixture @env1:___pyAttrLoad___: aName) @env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Private' }
FinalizerWarningDuringWalkTestCase >> queueHooksWithoutRunningThem [
	"weakref._collect's first three steps, without its drain: the hooks of
	whatever died are queued and wait for the next safe point."

	WeakReference _flushProcessStackAreas.
	System _generationScavenge_vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons

]

{ #category : 'Grail-Private' }
FinalizerWarningDuringWalkTestCase >> runHooksAlreadyDue [

	"Collect whatever earlier code dropped and run its hooks now, so the walk
	meets only the two this test queues.  A never-awaited coroutine an earlier
	test left behind warns at the walk's safe point too, and the recording then
	holds three warnings or more: on CI that was every run of the shard this
	class landed on once the shard plan moved it."

	self queueHooksWithoutRunningThem.
	FinalizerEphemeron _runPending

]

{ #category : 'Grail-Setup' }
FinalizerWarningDuringWalkTestCase >> setUp [

	super setUp.
	self runHooksAlreadyDue.
	importlib @env1:modules removeKey: #'finalizer_warning_during_walk' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/finalizer_warning_during_walk.py')
		name: 'finalizer_warning_during_walk'

]

{ #category : 'Grail-Tests' }
FinalizerWarningDuringWalkTestCase >> testAHookRunMidWalkWarnsAgainstSysAndLeavesTheGlobalsAlone [
	"The never-awaited asend step and coroutine are queued, the walk's
	generator reaches a safe point and runs them, and both still warn -- but
	against <sys>, line 0, so this module gains no __warningregistry__ and the
	walk finishes."

	self call: #'drop_unawaited_step_and_coroutine'.
	self queueHooksWithoutRunningThem.
	self assert: FinalizerEphemeron _queuedCount >= 2.
	self
		assert: (self call: #'walk_recording') printString
		equals: (self call: #'expected_walk') printString.
	self assert: FinalizerEphemeron _queuedCount equals: 0.
	self deny: (self call: #'registry_in_globals')

]
