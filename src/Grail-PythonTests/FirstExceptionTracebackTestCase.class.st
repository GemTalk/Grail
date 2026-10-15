Class {
	#name : 'FirstExceptionTracebackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FirstExceptionTracebackTestCase >> assertCheckPasses: aName [
	"The fixture answers true, or EVIDENCE naming what it saw.  Reported either
	way: the state this depends on is session-wide and arranged by the caller, so
	a bare ``false'' could not distinguish a lost frame from a setup that failed
	to disarm."

	| answer |
	answer := self withCaptureDisarmedDo: [
		testModule @env0:perform: aName asSymbol env: 1].
	self assert: (answer = true)
		description: 'first-exception check failed: ' , aName , ' -> ' , answer printString.

]

{ #category : 'Grail-Setup' }
FirstExceptionTracebackTestCase >> setUp [
	"Loaded HERE and never inside the disarmed window: importing raises
	internally, and that raise would arm the capture and make the check vacuous
	-- it would then pass whether or not the fix is present."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'first_exception_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/first_exception_traceback.py')
		name: 'first_exception_traceback'.

]

{ #category : 'Grail-Tests' }
FirstExceptionTracebackTestCase >> testAnExplicitFirstExceptionReportsItsCaller [
	"The CONTROL, and the reason it earns a test of its own: this path always
	worked, so if it ever fails alongside the one above the cause is the capture
	WALK, and if it passes while the one above fails the cause is the ARMING.
	One test covering both kinds could not tell those apart."

	self assertCheckPasses: 'an_explicit_first_exception_reports_its_caller'.

]

{ #category : 'Grail-Tests' }
FirstExceptionTracebackTestCase >> testAnImplicitFirstExceptionReportsItsCaller [
	"THE REGRESSION.  ``1/0'' in a nested function, as the session's first
	exception, must report ['_implicit_frames', 'inner'] and not just the outer
	frame.  This is the one that failed before arming moved to the common funnel."

	self assertCheckPasses: 'an_implicit_first_exception_reports_its_caller'.

]

{ #category : 'Grail-Tests' }
FirstExceptionTracebackTestCase >> testNeitherKindOfRaiseIsPrivileged [
	"Stated as a relation rather than two absolutes: CPython gives an implicit
	and an explicit raise the same traceback depth, and the whole bug was that
	Grail gave the explicit one a deeper stack purely because of where a flag got
	set.  A depth comparison fails even if both are wrong in the same direction,
	which two independent equality checks would not."

	self assertCheckPasses: 'both_kinds_agree'.

]

{ #category : 'Grail-Private' }
FirstExceptionTracebackTestCase >> withCaptureDisarmedDo: aBlock [
	"Run aBlock in the state a brand-new session is in: no Grail memo saying the
	capture was armed, and the VM flag actually off.  Both halves are needed --
	clearing only the memo would let ___ensureStackCapture___ re-set a flag that
	was already true, and clearing only the flag would leave the memo claiming
	otherwise so nothing would re-arm it.

	Restored in an ensure: because the cost of not restoring is not a failing
	test, it is every LATER traceback in this shard silently losing its frames."

	| st |
	st := SessionTemps current.
	st removeKey: #'GrailStackCaptureOn' otherwise: nil.
	[System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: false]
		on: Error do: [:ex | ex return: nil].
	^ [aBlock value]
		ensure: [BaseException ___ensureStackCapture___]

]
