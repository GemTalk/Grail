! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'LiveFrameProbeResilienceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
LiveFrameProbeResilienceTestCase comment:
'The live-frame walk survives a transient source-read fault.

Every frame-sensitive feature -- sys._getframe, tracebacks, warning
stacklevels -- stands on ___isGeneratedPythonMethod___, which tells compiled
Python apart from Grail''s own runtime by probing for the ``___curPos___''
marker.  The method-level probe reads in-memory debugInfo and cannot fault;
but a def whose body compiles into an inner block declares the marker
block-side, where only the SOURCE STRING shows it -- and the source string is
the one read in the walk that goes back to the repository, which under four
concurrent shard workers can fault.

A transient fault used to drop the frame from THAT ONE WALK: the chain came
up short (``ValueError: call stack is not deep enough''), the test of the
moment failed once, and every re-run was clean.  Three sightings in one week
-- WarningLocationTestCase (#594), FrameEqualityTestCase (#623),
TracebackTestCase (#626) -- none reproducible, because a page fault cannot be
scheduled.

So the probe retries once (the read that just faulted is the likeliest read
to succeed a moment later), a double fault leaves a breadcrumb in
#GrailPyProbeFailures so a run that still flakes says why, and failures stay
UNCACHED -- a real false is a property of the method, a failed probe is a
property of the moment.  #GrailPyProbeFailCount injects that many
consecutive simulated faults, which is the only way any of this is testable.'
%

expectvalue /Class
doit
LiveFrameProbeResilienceTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
LiveFrameProbeResilienceTestCase removeAllMethods: 0.
LiveFrameProbeResilienceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Helpers'
method: LiveFrameProbeResilienceTestCase
blockTempMethod
	"A generated method whose ___curPos___ lives in an INNER BLOCK, so the
	in-memory temps probe cannot see it and only the source probe answers --
	the exact shape the transient fault could erase.  _py_warnings'
	resetwarnings is compiled that way and is already loaded in any session
	the warnings machinery has touched."

	| pw m |
	pw := importlib @env1:lookupModule: '_py_warnings'.
	pw isNil ifTrue: [
		pw := importlib
			loadModuleFromPath: (importlib @env1:___moduleNameToPath___: '_py_warnings')
			name: '_py_warnings'].
	m := (pw class methodDictForEnv: 1) at: #'resetwarnings' otherwise: nil.
	self assert: m notNil description: 'resetwarnings not found'.
	"The premise: method-level temps do NOT carry the marker here.  If codegen
	ever moves the temp to method level this test wants rewriting around a
	shape that still block-declares it."
	self deny: ((m argsAndTemps ifNil: [#()]) includes: #'___curPos___').
	^ m
%

category: 'Grail-Helpers'
method: LiveFrameProbeResilienceTestCase
freshProbeStateDo: aBlock
	"Run aBlock against an empty probe cache and a clean seam, restoring
	both -- the cache is a session-wide memo other tests rely on being
	CORRECT, not on being full."

	| st saved |
	st := SessionTemps current.
	saved := st at: #'GrailPyMethodCache' otherwise: nil.
	st at: #'GrailPyMethodCache' put: KeyValueDictionary new.
	^ aBlock ensure: [
		st at: #'GrailPyMethodCache' put: saved.
		st at: #'GrailPyProbeFailCount' put: 0]
%

category: 'Grail-Tests'
method: LiveFrameProbeResilienceTestCase
testTheProbeClassifiesBothShapes
	"A block-temp generated method is Python; a hand-written runtime method
	is not.  The baseline the resilience below must not disturb."

	self freshProbeStateDo: [
		self assert: (BaseException ___isGeneratedPythonMethod___: self blockTempMethod).
		"Any hand-written method does for the negative half; the kernel's own
		printString is the most durable non-Python method there is."
		self deny: (BaseException ___isGeneratedPythonMethod___:
			(Object compiledMethodAt: #printString))]
%

category: 'Grail-Tests'
method: LiveFrameProbeResilienceTestCase
testOneTransientFaultIsAbsorbedByTheRetry
	"One injected fault: the answer is still true, no breadcrumb is left, and
	the seam was consumed -- the retry did the work.  This is the fix for the
	one-off ''call stack is not deep enough'' failures."

	| st before |
	st := SessionTemps current.
	self freshProbeStateDo: [
		before := st at: #'GrailPyProbeFailures' otherwise: 0.
		st at: #'GrailPyProbeFailCount' put: 1.
		self assert: (BaseException ___isGeneratedPythonMethod___: self blockTempMethod).
		self assert: (st at: #'GrailPyProbeFailures' otherwise: 0) equals: before.
		self assert: (st at: #'GrailPyProbeFailCount' otherwise: nil) equals: 0]
%

category: 'Grail-Tests'
method: LiveFrameProbeResilienceTestCase
testADoubleFaultLeavesABreadcrumbAndStaysUncached
	"Two injected faults exhaust the retry: this one walk sees false, the
	breadcrumb records it -- and the VERY NEXT probe of the same method
	answers true again, because a failed probe is never cached."

	| st before m |
	st := SessionTemps current.
	self freshProbeStateDo: [
		m := self blockTempMethod.
		before := st at: #'GrailPyProbeFailures' otherwise: 0.
		st at: #'GrailPyProbeFailCount' put: 2.
		self deny: (BaseException ___isGeneratedPythonMethod___: m).
		self assert: (st at: #'GrailPyProbeFailures' otherwise: 0) equals: before + 1.
		self assert: (BaseException ___isGeneratedPythonMethod___: m).
		self assert: (st at: #'GrailPyProbeFailures' otherwise: 0) equals: before + 1]
%

category: 'Grail-Tests'
method: LiveFrameProbeResilienceTestCase
testTheTempsFastPathNeedsNoSource
	"A module-level def declares ___curPos___ as a METHOD temp, so the
	in-memory probe is conclusive: even with faults injected, no source read
	happens and the answer is immediate."

	| st mm m |
	st := SessionTemps current.
	mm := importlib @env1:modules.
	mm removeKey: #'live_frame_probe_fixture' ifAbsent: [].
	m := (importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/live_frame_probe_fixture.py')
		name: 'live_frame_probe_fixture') class
			compiledMethodAt: #'probe_target:' environmentId: 1.
	self assert: ((m argsAndTemps ifNil: [#()]) includes: #'___curPos___').
	self freshProbeStateDo: [
		st at: #'GrailPyProbeFailCount' put: 2.
		self assert: (BaseException ___isGeneratedPythonMethod___: m).
		"Untouched: the fast path never reached the source probe."
		self assert: (st at: #'GrailPyProbeFailCount' otherwise: nil) equals: 2]
%

category: 'Grail-Tests - the locals walk'
method: LiveFrameProbeResilienceTestCase
testOneLocalsFaultIsAbsorbedByTheRetry
	"The locals-by-level sweep has the same disease the source probe had --
	one transient read truncated every level after it -- and the same cure.
	One injected fault: the sweep still reaches its normal depth, and no
	breadcrumb is left.

	BOTH measurements are plain statements at the same nesting, deliberately:
	the sweep's depth is the CALLER's depth, and wrapping one call in an
	ensure: block gives it an extra frame the other does not have."

	| st before with without |
	st := SessionTemps current.
	before := st at: #'GrailPyLocalsLevelFailures' otherwise: 0.
	without := (PyFrame ___liveFrameContentsByLevel___) size.
	st at: #'GrailPyLocalsFailCount' put: 1.
	with := (PyFrame ___liveFrameContentsByLevel___) size.
	st at: #'GrailPyLocalsFailCount' put: 0.
	self assert: with equals: without.
	self assert: (st at: #'GrailPyLocalsLevelFailures' otherwise: 0)
		equals: before
%

category: 'Grail-Tests - the locals walk'
method: LiveFrameProbeResilienceTestCase
testADoubleLocalsFaultLosesOneLevelNotTheTail
	"Two consecutive faults exhaust the retry at ONE level: that level
	becomes an empty placeholder -- both consumers read #() as ``no locals
	here'' -- the walk CONTINUES, and the breadcrumb records it.  Before the
	fix the walk STOPPED, and every level beyond the failure lost its locals."

	| st before baseline levels emptySlots |
	st := SessionTemps current.
	before := st at: #'GrailPyLocalsLevelFailures' otherwise: 0.
	baseline := (PyFrame ___liveFrameContentsByLevel___) size.
	st at: #'GrailPyLocalsFailCount' put: 2.
	levels := PyFrame ___liveFrameContentsByLevel___.
	st at: #'GrailPyLocalsFailCount' put: 0.
	emptySlots := (levels select: [:each | each size = 0]) size.
	self assert: emptySlots equals: 1.
	self assert: levels size equals: baseline.
	self assert: (st at: #'GrailPyLocalsLevelFailures' otherwise: 0)
		equals: before + 1
%
