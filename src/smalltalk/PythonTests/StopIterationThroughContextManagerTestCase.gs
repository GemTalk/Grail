! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StopIterationThroughContextManagerTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StopIterationThroughContextManagerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StopIterationThroughContextManagerTestCase
!
! Raising StopIteration inside a ``with'' over a @contextmanager must surface
! THAT StopIteration -- not the PEP 479 RuntimeError the generator machinery
! wraps it in on the way past.
!
! CPython and Grail AGREE on the wrapping: gen.throw(StopIteration()) comes back
! as RuntimeError('generator raised StopIteration'), because a StopIteration
! leaving a generator frame is indistinguishable from the generator reporting
! exhaustion.  contextlib knows this and unwraps it:
!
!     except RuntimeError as exc:
!         if isinstance(value, StopIteration) and exc.__cause__ is value:
!             return False        "do not suppress; let the original out"
!
! That is an IDENTITY test, and the CARRIER machinery broke it.  A carrier is the
! throwaway raised when a payload cannot be signalled directly -- and
! gen.throw(value) is called from INSIDE the with-statement's own handler, so
! value is in flight and always travels wrapped.  _signalEscapedException then
! chained the CARRIER as __cause__, ``exc.__cause__ is value'' answered False,
! and __exit__ re-raised the RuntimeError instead of stepping aside.  Unwrapping
! to the payload before the PEP 479 chaining is the whole fix.
!
! Worth noting how it presented: the pieces all tested correct in isolation.
! gen.throw(StopIteration()) chained the right object; contextlib had the right
! branch, already written.  Only the combination failed, because only there is
! the thrown exception already in flight.
!
! THE SECOND CASE is unrelated and older.  ``raise next(iter([]))'': RaiseAst
! routes every BARE-NAME callee through the construct-and-signal path, on the
! reasoning that a bare name usually denotes an exception class.  ``next'' does
! not, and the callee was REJECTED BEFORE THE CALL WAS MADE -- reporting
! "exceptions must derive from BaseException" about a call whose entire purpose
! is to raise before returning.  CPython evaluates the call and raises the
! RESULT.  ___pyRaiseNew___ now does the same, which keeps the guard that
! motivated the branch: ``raise NewStyleClass()'' still constructs an instance
! and ___pyRaise___ still finds it is not a BaseException, so the same TypeError
! arrives -- diagnosed from the value rather than from the callee.
!
! WHAT THIS DOES NOT CLOSE: ``raise NAME(...)'' cannot see a BUILTIN name.
! RaiseAst emits the callee as a bare-name load that does not consult builtins,
! while the same call NOT under ``raise'' resolves fine.  That is about how
! RaiseAst emits its callee, not about StopIteration.
!
! Drives tests/python/stopiteration_through_contextmanager.py.  test_with
! ExceptionalTestCase testRaisedStopIteration1 / testRaisedStopIteration3
! (test_with 3 -> 1, and the module leaves ERROR for FAIL).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StopIterationThroughContextManagerTestCase removeAllMethods.
StopIterationThroughContextManagerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StopIterationThroughContextManagerTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stopiteration_through_contextmanager' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/stopiteration_through_contextmanager.py')
		name: 'stopiteration_through_contextmanager'.
%

category: 'Grail-Private'
method: StopIterationThroughContextManagerTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Through a context manager'
method: StopIterationThroughContextManagerTestCase
testAnInstantiatedStopIterationSurvivesTheWith
	"The exception the body raised is what the caller sees.  It used to arrive as
	``RuntimeError: generator raised StopIteration'' -- the PEP 479 wrapper that
	contextlib is supposed to see through."

	self assert: (self resultAt: 'instantiated') asString
		equals: 'StopIteration: from with'.
%

category: 'Grail-Tests - Through a context manager'
method: StopIterationThroughContextManagerTestCase
testACallThatRaisesBeforeReturningIsEvaluated
	"``raise f()'' where f raises before returning anything.  The callee was
	rejected before being called, so the diagnosis was about the callee rather
	than about a value that never existed."

	self assert: (self resultAt: 'uninstantiated') asString equals: 'StopIteration: '.
%

category: 'Grail-Tests - PEP 479 is unchanged'
method: StopIterationThroughContextManagerTestCase
testTheWrapperAndItsCauseAreStillCorrect
	"REGRESSION GUARD, and the reason the fix is an UNWRAP rather than a skip:
	the RuntimeError is right, and only contextlib is entitled to look past it.
	The second element is the identity that entitles it."

	self assert: (self resultAt: 'thrown_in_wraps_and_chains') asString
		equals: '[''generator raised StopIteration'', True]'.
	self assert: (self resultAt: 'raised_by_body_wraps') asString
		equals: '''generator raised StopIteration'''.
%

category: 'Grail-Tests - PEP 479 is unchanged'
method: StopIterationThroughContextManagerTestCase
testRaisingANonExceptionIsStillATypeError
	"REGRESSION GUARD for what the rejected-callee branch was protecting.  The
	instance is now constructed first and ___pyRaise___ finds it is not a
	BaseException, so the same TypeError arrives -- from the value."

	self assert: (self resultAt: 'non_exception_value') asString
		equals: 'TypeError: exceptions must derive from BaseException'.
%

category: 'Grail-Tests - Known gaps'
method: StopIterationThroughContextManagerTestCase
testRaiseCannotSeeABuiltinCalleeWhichIsAKnownGap
	"Recorded, NOT endorsed, and separate from StopIteration.  ``raise
	next(iter([]))'' answers NameError because RaiseAst emits its callee as a
	bare-name load that does not consult builtins -- the same call NOT under
	``raise'' resolves fine.  test_with's own shape resolves, which is why it
	passes; this does not."

	self assert: (self resultAt: 'module_level_raise_builtin_is_a_known_gap') asString
		equals: 'NameError: name ''next'' is not defined'.
%
