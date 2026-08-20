! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FirstExceptionTracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FirstExceptionTracebackTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FirstExceptionTracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FirstExceptionTracebackTestCase
!
! The session's FIRST exception must carry its caller frames, even when the
! RUNTIME raised it rather than a ``raise'' statement.
!
! Grail reconstructs a traceback from the VM's raise-time stack capture, which is
! a per-session GEM configuration (#GemExceptionSignalCapturesStack) that must be
! armed BEFORE the signal or there is nothing to walk.  Arming lived only on the
! explicit-raise path, BaseException class>>___pyRaiseNew___:args:kw:cause:,
! whose comment claimed it ``covers even the session's first raise''.  It covered
! the first explicit one.  An exception the runtime raises on the user's behalf
! -- ZeroDivisionError from ``1/0'', TypeError, AttributeError, KeyError, all far
! more common in real code than an explicit raise -- never reaches that method,
! so as the session's first exception it got a ONE-FRAME traceback and lost every
! caller.  Measured in a fresh session before the fix:
!
!     IMPLICIT (1/0) first  -> ('probe_implicit')
!     EXPLICIT (raise)      -> ('probe_explicit' 'inner')
!     IMPLICIT (1/0) again  -> ('probe_implicit' 'inner')
!
! CPython answers two frames for both, always.
!
! WHY IT MATTERED BEYOND ONE TRACEBACK.  A session's traceback depth came to
! depend on which KIND of exception happened first, which no program controls.
! It also made every frame-shape test ORDER-DEPENDENT: they pass inside the full
! SUnit suite, where something raises explicitly long before they run, and
! NestedFunctionFramesTestCase failed 25 times out of 25 in a fresh session.  On
! CI, where shard composition decides the order, that is the intermittent
! TracebackTestCase>>testLiveFramesAndGetframe -- observed once on a PR whose
! diff was two text files, re-run green on the same commit, same shard, same 2690
! tests.
!
! THE FIX is the same correction the implicit-CONTEXT fix in BaseException >>
! ___signal___: had already made one paragraph above, for the same reason --
! CPython does not care who raised -- so arming now sits at that same funnel,
! which every hand-built runtime raise already comes through.
!
! HOW THESE TESTS REACH A "FIRST" EXCEPTION.  A test inside a suite is never the
! session's first raise, so the state is recreated rather than waited for:
! ``withCaptureDisarmedDo:'' drops Grail's SessionTemps memo AND turns the VM
! flag back off, which is exactly the state a brand-new session starts in.  The
! restore is in an ensure: block for a reason -- leaving capture off would
! silently shorten every traceback in the rest of the shard, turning one failure
! into a cascade that named the wrong cause.
!
! Drives tests/python/first_exception_traceback.py, which is self-running and so
! self-verifies against CPython under scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FirstExceptionTracebackTestCase removeAllMethods.
FirstExceptionTracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FirstExceptionTracebackTestCase
setUp
	"Loaded HERE and never inside the disarmed window: importing raises
	internally, and that raise would arm the capture and make the check vacuous
	-- it would then pass whether or not the fix is present."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'first_exception_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/first_exception_traceback.py')
		name: 'first_exception_traceback'.
%

category: 'Grail-Private'
method: FirstExceptionTracebackTestCase
withCaptureDisarmedDo: aBlock
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
%

category: 'Grail-Private'
method: FirstExceptionTracebackTestCase
assertCheckPasses: aName
	"The fixture answers true, or EVIDENCE naming what it saw.  Reported either
	way: the state this depends on is session-wide and arranged by the caller, so
	a bare ``false'' could not distinguish a lost frame from a setup that failed
	to disarm."

	| answer |
	answer := self withCaptureDisarmedDo: [
		testModule @env0:perform: aName asSymbol env: 1].
	self assert: (answer = true)
		description: 'first-exception check failed: ' , aName , ' -> ' , answer printString.
%

category: 'Grail-Tests'
method: FirstExceptionTracebackTestCase
testAnImplicitFirstExceptionReportsItsCaller
	"THE REGRESSION.  ``1/0'' in a nested function, as the session's first
	exception, must report ['_implicit_frames', 'inner'] and not just the outer
	frame.  This is the one that failed before arming moved to the common funnel."

	self assertCheckPasses: 'an_implicit_first_exception_reports_its_caller'.
%

category: 'Grail-Tests'
method: FirstExceptionTracebackTestCase
testAnExplicitFirstExceptionReportsItsCaller
	"The CONTROL, and the reason it earns a test of its own: this path always
	worked, so if it ever fails alongside the one above the cause is the capture
	WALK, and if it passes while the one above fails the cause is the ARMING.
	One test covering both kinds could not tell those apart."

	self assertCheckPasses: 'an_explicit_first_exception_reports_its_caller'.
%

category: 'Grail-Tests'
method: FirstExceptionTracebackTestCase
testNeitherKindOfRaiseIsPrivileged
	"Stated as a relation rather than two absolutes: CPython gives an implicit
	and an explicit raise the same traceback depth, and the whole bug was that
	Grail gave the explicit one a deeper stack purely because of where a flag got
	set.  A depth comparison fails even if both are wrong in the same direction,
	which two independent equality checks would not."

	self assertCheckPasses: 'both_kinds_agree'.
%

set compile_env: 0
