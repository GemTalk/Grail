! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncioTimeoutTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioTimeoutTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncioTimeoutTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncioTimeoutTestCase
!
! ``asyncio.timeout'' -- the 3.11 async context manager -- from upstream's
! asyncio/timeouts.py, vendored VERBATIM and needing no adaptation at all.
! Drives tests/python/asyncio_timeout.py, whose ten checks pass identically
! under CPython 3.14.6 (self-running, so scripts/check_python_fixtures.sh
! runs them there on every gate).
!
! THE REASON IT NEEDED NOTHING is worth recording, because it is the payoff
! from an earlier change rather than luck.  A timeout does not raise: it
! CANCELS the task, then converts the resulting CancelledError into
! TimeoutError on the way out.  Telling "the timeout cancelled me" apart from
! "somebody else cancelled me" is precisely what Task's cancel COUNT is for,
! and Grail carried a boolean ``_cancel_requested'' until the counting
! ``cancelling()'' / ``uncancel()'' landed with TaskGroup.  On the boolean
! build the happy paths here would still pass and the two propagation checks
! would not -- which is why those two are in the fixture rather than a tidier
! set of five.
!
! ``timeout(-1)'' has its own check because test_taskgroups reaches for that
! exact spelling: a deadline already in the past must fire at the first
! suspension, which is a different path from a positive delay expiring.
!
! WHAT THIS DOES NOT COVER: transports, and therefore nothing about a timeout
! around real socket I/O. Every check drives asyncio.run over sleeps and
! futures. See docs/Support_FastAPI.md.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: AsyncioTimeoutTestCase
setUp
	"Reload the fixture fresh each test.  Its module body RUNS the checks, and
	most of them drive a real event loop through asyncio.run, so a shared
	instance would let one test observe another's loop state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_timeout' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asyncio_timeout.py')
		name: 'asyncio_timeout'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: AsyncioTimeoutTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- The budget itself

category: 'Grail-Tests - The Budget'
method: AsyncioTimeoutTestCase
testWorkInsideTheBudgetIsUneventful
	self assert: (self at: 'completes_inside_the_budget') equals: true
%

category: 'Grail-Tests - The Budget'
method: AsyncioTimeoutTestCase
testExpiryRaisesTimeoutErrorNotCancelledError
	"The conversion is the whole feature.  A CancelledError escaping here
	would be the cancel arriving without being translated."

	self assert: (self at: 'expiry_raises_timeout_error') equals: true
%

category: 'Grail-Tests - The Budget'
method: AsyncioTimeoutTestCase
testANegativeDelayExpiresAtTheFirstSuspension
	"test_taskgroups uses ``asyncio.timeout(-1)'' specifically: an already-past
	deadline must fire rather than never fire."

	self assert: (self at: 'a_negative_delay_expires_immediately') equals: true
%

category: 'Grail-Tests - The Budget'
method: AsyncioTimeoutTestCase
testNoneMeansNoDeadline
	self assert: (self at: 'none_means_no_deadline') equals: true
%

! ------------------- Cancellation, which is where a boolean flag fails

category: 'Grail-Tests - Cancellation'
method: AsyncioTimeoutTestCase
testAnOuterCancellationIsNotConvertedToTimeout
	"Somebody else cancels the task while a LIVE timeout is in scope.  That is
	a CancelledError and must stay one; reporting TimeoutError would tell the
	caller a deadline passed when none did.  This is the check that fails on a
	build with a boolean _cancel_requested rather than a count."

	self assert: (self at: 'an_outer_cancellation_is_not_converted') equals: true
%

category: 'Grail-Tests - Cancellation'
method: AsyncioTimeoutTestCase
testTheTimeoutErrorIsChainedFromTheCancellation
	self assert: (self at: 'the_error_is_chained_from_cancellation') equals: true
%

! ------------------- Introspection and rescheduling

category: 'Grail-Tests - Introspection'
method: AsyncioTimeoutTestCase
testExpiredFlipsOnlyAfterExpiry
	self assert: (self at: 'expired_reports_true_after_expiry') equals: true
%

category: 'Grail-Tests - Introspection'
method: AsyncioTimeoutTestCase
testRescheduleExtendsTheBudget
	self assert: (self at: 'reschedule_extends_the_budget') equals: true
%

category: 'Grail-Tests - Introspection'
method: AsyncioTimeoutTestCase
testTimeoutAtTakesAnAbsoluteDeadline
	self assert: (self at: 'timeout_at_takes_an_absolute_deadline') equals: true
%

category: 'Grail-Tests - Exports'
method: AsyncioTimeoutTestCase
testThePublicNamesAreExported
	"asyncio.timeout / timeout_at / Timeout, each identical to the submodule's."

	self assert: (self at: 'the_public_names_are_exported') equals: true
%
