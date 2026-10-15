Class {
	#name : 'MethodClosureFrameCaptureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodClosureFrameCaptureTestCase >> assertReleased: aName [
	"Every probe answers a Python bool; True means the sentinel was reclaimed."

	self assert: (testModule @env1:___pyAttrLoad___: aName asSymbol) equals: true.

]

{ #category : 'Grail-Setup' }
MethodClosureFrameCaptureTestCase >> setUp [
	"Sweep first, then load the fixture fresh.  Every probe in the module body
	runs at import and asks whether a sentinel was reclaimed, so a surviving
	stack root from an earlier test would read as a retained frame here.  Same
	preliminary sweep WeakrefModuleTestCase does, for the same reason."

	| mods |
	System _generationScavenge_vmMarkSweep.
	System _vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons.
	mods := importlib @env1:modules.
	mods removeKey: #'method_closure_frame_capture' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_closure_frame_capture.py')
		name: 'method_closure_frame_capture'.

]

{ #category : 'Grail-Tests - A Method Frame Is Released' }
MethodClosureFrameCaptureTestCase >> testALambdaCapturesNoMoreThanANestedDef [
	"A lambda is the same closure with different syntax and was retaining the
	same frame."

	self assertReleased: 'method_lambda_releases_the_argument'.

]

{ #category : 'Grail-Tests - A Method Frame Is Released' }
MethodClosureFrameCaptureTestCase >> testAMethodWithADefaultAlsoReleasesIt [
	"A method with a default argument compiles through the VARARGS generator,
	which emitted its own copy of the wrapper block -- fixing only the
	simple-positional shape would have left every such method leaking."

	self assertReleased: 'method_with_default_releases_the_argument'.

]

{ #category : 'Grail-Tests - A Method Frame Is Released' }
MethodClosureFrameCaptureTestCase >> testANestedDefDoesNotRetainTheMethodsArgument [
	"THE TEST THIS EXISTS FOR.  ``watch(self, obj)'' builds a callback that
	reads one local and nothing else; ``obj'' must die with the caller's last
	reference to it."

	self assertReleased: 'method_closure_releases_the_argument'.

]

{ #category : 'Grail-Tests - What It Fixed' }
MethodClosureFrameCaptureTestCase >> testAWeakKeyDictionaryForgetsADeadKey [
	"End to end, and how this was found.  A WeakKeyDictionary entry has to
	vanish when its key is collected; the per-key remover's captured frame kept
	the key alive, so len() still counted it."

	self assertReleased: 'weak_key_dictionary_forgets_a_dead_key'.

]

{ #category : 'Grail-Tests - What It Fixed' }
MethodClosureFrameCaptureTestCase >> testAWeakSetForgetsADeadMember [
	"WeakSet builds its remover in ``_make_remover(self)'', whose frame holds
	no member -- so this passed before the fix too.  It is here because the
	same class is one edit away from the leaking shape (a remover built in
	``add(self, obj)'' instead), and because a WeakSet member must be
	reclaimable whichever way the callback is built."

	self assertReleased: 'weak_set_forgets_a_dead_member'.

]

{ #category : 'Grail-Tests - The Closure Still Works' }
MethodClosureFrameCaptureTestCase >> testTheCallbackStillReadsItsFreeVariable [
	"Releasing the frame must not cost the closure its free variables: the
	callback built in the method still reads the local it closed over, and the
	reference it was handed is the one the watcher kept."

	self assertReleased: 'callback_closure_still_reads_its_free_variable'.

]

{ #category : 'Grail-Tests - A Method Frame Is Released' }
MethodClosureFrameCaptureTestCase >> testTheModuleLevelShapeStillReleasesIt [
	"The control, and the half that was never broken: the identical code at
	module scope always released its argument.  If this ever fails, the method
	path did not join the function path -- both regressed together."

	self assertReleased: 'function_closure_releases_the_argument'.

]
