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
Python apart from Grail''s own runtime.  It has three routes: the
``<grailPython>'' pragma (text path only), an in-memory temps probe for a
method-level marker (``___curPos___'' on the text path, ``___grailPython___''
on the direct-to-IR path), and a SOURCE STRING read.  The first two read
in-memory debugInfo and cannot fault; but a def whose body compiles into an
inner block declares its marker block-side, where only the source shows it --
and the source string is the one read in the walk that goes back to the
repository, which under four concurrent shard workers can fault.

Two tests here read REAL generated methods and so depend on which emitter
ran.  Both are explicit about it: blockTempMethod pins its subject to the text
path, because direct-to-IR produces no block-temp shape at all, and
testTheTempsFastPathNeedsNoSource accepts either marker name, because the
property it measures holds on both paths.

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
	in-memory temps probe cannot see it and only the pragma or the source probe
	can answer -- the exact shape the transient fault could erase.

	TEXT PATH BY CONSTRUCTION, via the fixture's ``block_target'', whose body is
	a ``with'' and so compiles into a protected block.  It used to be
	_py_warnings' resetwarnings, found rather than built, and direct-to-IR broke
	that in a way worth recording: an IR-built method declares its identity
	marker at METHOD level, so under GRAIL_IR_CODEGEN there is no block-temp
	shape for this helper to return at all.  resetwarnings then came back with
	``argsAndTemps = anArray( #'___grailPython___')'' and no pragma, the premise
	assertion below passed VACUOUSLY (it only knew the other spelling), and
	testTheProbeClassifiesBothShapes failed on the pragma instead.

	So the subject is now pinned to the text path rather than taken from
	whichever path last imported a stdlib module -- which also stops this
	helper reloading _py_warnings underneath the warnings machinery."

	| m names |
	m := self textPathFixture class
		compiledMethodAt: #'block_target:' environmentId: 1 otherwise: nil.
	self assert: m notNil description: 'block_target: not found in the fixture'.
	"The premise: NEITHER marker is a method-level temp here.  Both names are
	checked, because knowing only one is how the vacuous pass above happened.
	If codegen ever moves a marker to method level for this shape, the test
	wants rewriting around a shape that still block-declares it."
	names := m argsAndTemps ifNil: [#()].
	self deny: (names includes: #'___curPos___')
		description: 'block_target: carried a method-level ___curPos___: '
			, names printString.
	self deny: (names includes: #'___grailPython___')
		description: 'block_target: carried a method-level ___grailPython___: '
			, names printString.
	^ m
%

category: 'Grail-Helpers'
method: LiveFrameProbeResilienceTestCase
textPathFixture
	"tests/python/live_frame_probe_fixture.py, loaded fresh on the TEXT path
	whatever the IR flag says, with the flag restored in the ensure: -- the
	idiom UnboundLocalErrorTestCase >> unboundGuardFixture uses, for the same
	reason: the caller measures a property of the TEXT emitter's output, which
	an IR-built method cannot show."

	| savedIRFlag |
	(importlib @env1:modules) removeKey: #'live_frame_probe_fixture' ifAbsent: [].
	savedIRFlag := importlib ___irCodegenFlag___.
	importlib ___irCodegenForce___: false.
	^ [importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/live_frame_probe_fixture.py')
		name: 'live_frame_probe_fixture']
			ensure: [importlib ___irCodegenForce___: savedIRFlag]
%

category: 'Grail-Helpers'
method: LiveFrameProbeResilienceTestCase
legacyBlockTempMethod
	"A generated method in the shape codegen produced BEFORE the
	``<grailPython>'' pragma: ___curPos___ declared in an INNER BLOCK, and no
	pragma.  Neither of the two in-memory probes can answer it, so only the
	SOURCE probe can -- which is the path the retry below exists to protect.

	CONSTRUCTED rather than found, and that is the point of the change these
	tests were rewritten for.  They used to use a real module method
	(_py_warnings >> resetwarnings) for this, and it stopped exercising the
	retry the moment codegen started stamping the pragma: the probe now answers
	from the method's pragmas and never reaches the source at all.  Which is the
	improvement -- 26 of argparse's 129 generated methods used to depend on that
	source read for their identity -- but it left these two tests measuring
	nothing, passing the seam through untouched.

	So the legacy shape has to be built by hand now.  It is still worth testing:
	a module class already in a repository keeps its pre-pragma methods until
	something reimports it, and those still take this path.

	A DOIT, because it needs no class to hang from and leaves nothing behind."

	^ '^ [ | ___curPos___ | ___curPos___ := 1. 1] value'
		_compileInContext: nil
		symbolList: System myUserProfile symbolList
		oldLitVars: nil
		environmentId: 1
		flags: 0
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
	is not.  The baseline the resilience below must not disturb.

	The subject is TEXT-COMPILED (see blockTempMethod), so the pragma assertion
	below is a claim about the text emitter and stays true whatever the IR flag
	says.  The IR path's own answer -- the ``___grailPython___'' marker, with no
	pragma -- is asserted in
	IRCodegenSmokeTestCase >> testIRMethodIsRecognisedAsPython, where the flag
	is already forced on."

	self freshProbeStateDo: [
		| modern |
		modern := self blockTempMethod.
		self assert: (BaseException ___isGeneratedPythonMethod___: modern).
		"AND IT IS THE PRAGMA THAT ANSWERS, not one of the two probes behind it.
		Asserted rather than assumed: this method's whole point is that the
		block-temp shape defeats the in-memory TEMPS probe, so without the pragma
		the answer would come from the source read -- which is what the resilience
		tests below now have to construct a legacy method to reach at all."
		self assert: (BaseException ___hasPythonPragma___: modern).
		self deny: ((modern argsAndTemps ifNil: [#()]) includes: #'___curPos___').
		"Any hand-written method does for the negative half; the kernel's own
		printString is the most durable non-Python method there is."
		self deny: (BaseException ___isGeneratedPythonMethod___:
			(Object compiledMethodAt: #printString)).
		self deny: (BaseException ___hasPythonPragma___:
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
		self assert: (BaseException ___isGeneratedPythonMethod___: self legacyBlockTempMethod).
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
		m := self legacyBlockTempMethod.
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
	"A module-level def declares its identity marker as a METHOD temp, so the
	in-memory probe is conclusive: even with faults injected, no source read
	happens and the answer is immediate.

	FLAG-AGNOSTIC, and the one test in this class that can be. The two codegen
	paths SPELL the marker differently -- the text emitter stores
	``___curPos___'', a position marker the probe reads opportunistically, while
	direct-to-IR stores ``___grailPython___'', declared for identity alone
	because an IR method can carry no pragma -- but both put it at METHOD level,
	which is the only property the fast path depends on. So this accepts either
	name and keeps covering whichever path is live, rather than pinning itself
	to text (as blockTempMethod has to) and leaving the IR fast path untested.

	Measured on 4.0: ``anArray( #'x', #'___curPos___', #'y')'' on the text path,
	``anArray( #'x', #'___grailPython___', #'y')'' with the flag on."

	| st mm m names |
	st := SessionTemps current.
	mm := importlib @env1:modules.
	mm removeKey: #'live_frame_probe_fixture' ifAbsent: [].
	m := (importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/live_frame_probe_fixture.py')
		name: 'live_frame_probe_fixture') class
			compiledMethodAt: #'probe_target:' environmentId: 1.
	names := m argsAndTemps ifNil: [#()].
	self assert: ((names includes: #'___curPos___')
			or: [names includes: #'___grailPython___'])
		description: 'no method-level identity marker in argsAndTemps: '
			, names printString.
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
