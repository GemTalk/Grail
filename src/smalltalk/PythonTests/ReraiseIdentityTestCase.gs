! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReraiseIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReraiseIdentityTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReraiseIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReraiseIdentityTestCase
!
! Re-raising an exception must propagate THE SAME OBJECT, and must start a FRESH
! handler search from the raise point.  Grail could do either, never both.
!
! WHY, and it is structural rather than a bug.  GemStone LIFTS a handler onto the
! signalling frame rather than UNWINDING to it, so a signalled exception is not
! inert data -- it is the live ANCHOR joining a still-running signal point to its
! handler.  Those are the frames the VM appends as indexed slots: _basicSize is 5
! inside the handler and 0 the moment it returns, that return being the deferred
! unwind.  One object cannot anchor two live signals, which is exactly the
! UncontinuableError 6011 (``Exception has already been signaled'').
!
! Python is the opposite.  ``raise'' UNWINDS, so by the time an ``except'' body
! runs the original propagation is over and the exception is ordinary data that
! may be raised again freely -- and CPython requires the re-raised object to BE
! the caught one, because ``is'' comparisons are built on it.
!
! So Grail was asking ONE object to be both, and had three ways out, all wrong:
!
!   * #signal -> 6011 while the handler is live.
!   * #pass   -> keeps identity, but CONTINUES THE ORIGINAL SEARCH: it resumes
!                OUTSIDE the active on:do:, so a handler established INSIDE the
!                except body was skipped entirely and the exception left the
!                function as an uncatchable Smalltalk error.
!   * #copy   -> signals cleanly and matches the same ``except'', so it LOOKS
!                right -- and silently breaks the identity Python depends on.
!
! THE FIX stops conflating the two roles.  The Python exception is never
! re-signalled; a fresh throwaway CARRIER of its own class is signalled instead,
! referencing it (BaseException ___signalCarrying___:), and handlers unwrap
! through the one sanctioned crossing (___payloadOf___:).  Same class, so
! ``on: ValueError do:'' selection is unchanged, including for a user-defined
! ``class MyError(ValueError)''.  The payload is never signalled, so it never
! acquires frames and stays raisable for ever.
!
! A LAST RESORT, deliberately: with no live frames the payload is signalled
! DIRECTLY, so carriers appear only where a plain #signal was impossible.
! Wrapping unconditionally broke test_yield_from's ``gen.throw(exc) is exc'' on
! StopIteration and lost an exception's __notes__ in test_dict -- not every
! catcher unwraps, and anything holding the object across the raise sees whatever
! was actually signalled.
!
! THREE BOUNDARIES had to be converted, and missing one is the characteristic
! failure of this design -- it reintroduces the identity bug, but rarer:
!
!   * TryAst      -- the ``as e'' binding, sys.exc_info(), and the catching
!                    frame push.  The frame push is why the traceback stayed
!                    correct: it must run on the PAYLOAD, whose captured stack
!                    dates from the ORIGINAL signal.  Pushed on the carrier, the
!                    walk rebuilt from the RE-RAISE point and recorded the
!                    re-raising function twice -- ``mid'' at its ``raise'' as
!                    well as at the call the exception entered on.
!   * WithAst     -- __exit__ receives Python's exception.  Handing it the
!                    carrier gave managers an exception with NO args, which is
!                    how assertRaisesRegex started reporting
!                    ``'...' does not match '''''.
!   * PythonGenerator -- gen.throw(), an exception escaping the body, and a
!                    re-raise at a suspension point.  This is the one that
!                    reaches test_with: contextlib's
!                    _GeneratorContextManager.__exit__ is literally
!                    ``if exc is not value: raise'', so a COPY made every
!                    @contextmanager decide the exception was new and re-raise
!                    it.  It also removes the cross-PROCESS problem -- #pass acts
!                    on the current process's handler chain and a generator body
!                    runs on a forked producer, so there was nothing in flight on
!                    the consumer to continue.
!
! Drives tests/python/reraise_identity.py.  test_with ExceptionalTestCase
! (9 -> 6 for the module).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReraiseIdentityTestCase removeAllMethods.
ReraiseIdentityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReraiseIdentityTestCase
setUp
	"Reload tests/python/reraise_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reraise_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reraise_identity.py')
		name: 'reraise_identity'.
%

category: 'Grail-Private'
method: ReraiseIdentityTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Identity'
method: ReraiseIdentityTestCase
testAnExplicitReraisePropagatesTheSameObject
	"``except E as e: raise e''.  #copy answered a different object that matched
	the same ``except'', so this read as working until something compared with
	``is''."

	self assert: (self resultAt: 'explicit_reraise') asString
		equals: '[''ValueError'', True]'.
%

category: 'Grail-Tests - Identity'
method: ReraiseIdentityTestCase
testABareReraisePropagatesTheSameObject
	self assert: (self resultAt: 'bare_reraise') asString
		equals: '[''ValueError'', True]'.
%

category: 'Grail-Tests - Identity'
method: ReraiseIdentityTestCase
testAnExceptionSurvivesRepeatedRoundTrips
	"The payload is never signalled, so it never accumulates frames -- there is
	no count of re-raises after which it stops being raisable."

	self assert: (self resultAt: 'reraised_repeatedly') asString equals: 'True'.
%

category: 'Grail-Tests - Handler search'
method: ReraiseIdentityTestCase
testAReraiseIsCaughtByAHandlerInsideTheExceptBody
	"What #pass could not do.  The search resumed OUTSIDE the active on:do:, so
	this handler never ran and the exception left the function as an
	UNCATCHABLE Smalltalk error.  A carrier is an ordinary #signal from the
	raise point -- CPython's fresh search."

	self assert: (self resultAt: 'reraise_inside_with') asString
		equals: '[''RuntimeError'', True]'.
%

category: 'Grail-Tests - Boundaries'
method: ReraiseIdentityTestCase
testTheExceptionsOwnDataSurvives
	self assert: (self resultAt: 'args_survive') asString
		equals: '[''payload text'', (''payload text'',)]'.
%

category: 'Grail-Tests - Boundaries'
method: ReraiseIdentityTestCase
testAContextManagerExitSeesThePayload
	"REGRESSION GUARD for the WithAst boundary.  __exit__ receives Python's
	exception; handed the CARRIER it got one with no args, and unittest's
	assertRaisesRegex began reporting ``'...' does not match '''''.  Four
	test_wave cases caught it."

	self assert: (self resultAt: 'exit_sees_payload') asString
		equals: '[''ValueError'', ''seen by exit'', (''seen by exit'',)]'.
%

category: 'Grail-Tests - Traceback'
method: ReraiseIdentityTestCase
testAReraiseDoesNotRecordItsFrameTwice
	"REGRESSION GUARD for the TryAst frame-push boundary, and the subtlest part
	of this change.  CPython records ONE frame per function unwound through, at
	the line where the exception ENTERED it -- ``_mid'' at its ``_leaf()'' call,
	never at its own ``raise''.  The catching frame push must therefore run on
	the PAYLOAD, whose captured stack dates from the original signal; run on the
	carrier, the walk rebuilt from the re-raise point and reported ``_mid''
	twice."

	self assert: (self resultAt: 'reraise_frame_chain') asString
		equals: '[(''_catch'', 138), (''_mid'', 131), (''_leaf'', 126)]'.
%
