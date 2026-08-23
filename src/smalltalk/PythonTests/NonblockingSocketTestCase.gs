! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonblockingSocketTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonblockingSocketTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NonblockingSocketTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonblockingSocketTestCase
!
! CPython'S NON-BLOCKING SOCKET CONTRACT, AND THE OSError FIELDS THAT REPORT IT.
!
! There are THREE timeout states, not two.  ``settimeout(None)'' blocks;
! ``settimeout(n)'' blocks for n seconds and then raises TimeoutError;
! ``settimeout(0)'' -- equivalently ``setblocking(False)'' -- does not wait at
! all and raises BlockingIOError.  Grail had the third state right in every
! respect except the exception: it raised TimeoutError there too, because
! ``readWillNotBlockWithin: 0'' answering false looks exactly like a timeout
! expiring from inside the primitive.
!
! WHY THAT ONE SUBSTITUTION MATTERS.  TimeoutError and BlockingIOError are
! SIBLINGS under OSError -- neither is a subclass of the other, here or in
! CPython -- so this, the idiom every non-blocking reader is written in:
!
!     try:
!         data = sock.recv(n)
!     except (BlockingIOError, InterruptedError):
!         <wait for readiness, then retry>
!
! could not work.  The except clause never matched, the first attempt escaped as
! a TimeoutError, and nothing retried.  It is not a hypothetical idiom: Grail's
! own VENDORED CPython socket.py contains that clause twice (makefile's raw
! reader, and the sendfile fallback), so those paths could never reach their
! retry branch, and asyncio's sock_recv / sock_accept are written the same way
! -- which is where this surfaced.
!
! ------------------------------------------------------------------------------
! THE REPORTING SIDE, which turned out to be the larger half.
!
! ``except OSError as e: e.errno'' is how Python code tells one OS error from
! another.  Grail's OSError populated errno/strerror/filename only from
! CPython's ``OSError(errno, strerror, ...)'' form, and left them UNSET
! otherwise -- and an unset dynamic instVar reads back as ABSENT, so ``e.errno''
! raised AttributeError from inside the handler.  Every OSError Grail's socket
! layer raises is the one-argument form (``[Errno 9] Bad file descriptor'' as a
! single message string), so that was the common case, not the exotic one.  It
! is the other reason the vendored socket.py could not work: its retry test is
! ``e.errno in (EAGAIN, EWOULDBLOCK)''.
!
! A 2..5-argument OSError also stringified as its args TUPLE -- ``(35,
! 'Resource temporarily unavailable')'' -- where CPython says ``[Errno 35]
! Resource temporarily unavailable''.  That is the shape of every
! errno-carrying error, so the difference showed up anywhere one was printed.
!
! Three details of CPython's unpacking, all MEASURED against 3.14.6 rather than
! read off the C source, because all three are easy to get plausibly wrong:
!   * ABSENT and None are different.  ``OSError(2, None)'' renders ``[Errno 2]
!     None'': the C code tests the slot for non-NULL, not for truth.
!   * filename is kept only when SUPPLIED, and filename2 only inside that test,
!     so ``OSError(2, 'm', None, None, 'g')'' reports neither.
!   * args is truncated to (errno, strerror) by that SAME test, not by arity:
!     ``OSError(2, 'm', None).args'' is the whole 3-tuple.
!
! ------------------------------------------------------------------------------
! ONE PINNED DEVIATION, and one thing deliberately left alone.
!
! Above five positional arguments CPython does no unpacking and keeps args
! whole.  Grail's exception constructors accept at most five, so it raises
! TypeError first -- which makes the ``> 5'' branch of OSError >> ___args___:
! unreachable from Python today.  Recorded below rather than worked around.
!
! ``connect'' is NOT changed here.  A non-blocking connect should raise
! BlockingIOError(EINPROGRESS), but GemStone's non-blocking connect does not
! work today at all -- it reports ``getpeername failed with Socket is not
! connected'' and connect_ex answers 0 for a connection that never completed --
! so making it raise the right exception would be dressing up a broken
! primitive.  ``recvfrom'' likewise still ignores the timeout entirely (UDP).
! Both are separate, and neither is on the path this work needs.
!
! Drives tests/python/nonblocking_sockets.py, whose EXPECTED table was generated
! by RUNNING CPython 3.14.6 and self-verifies against it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NonblockingSocketTestCase removeAllMethods.
NonblockingSocketTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonblockingSocketTestCase
setUp
	"Reload tests/python/nonblocking_sockets.py fresh each test.  Every probe
	runs at import and each opens its own loopback pair, so a shared instance
	would let one test read a socket another had closed."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nonblocking_sockets' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonblocking_sockets.py')
		name: 'nonblocking_sockets'.
%

category: 'Grail-Private'
method: NonblockingSocketTestCase
resultAt: key
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString
%

category: 'Grail-Private'
method: NonblockingSocketTestCase
assertMatchesCPythonAt: key
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.
%

! ------------------- the three states

category: 'Grail-Tests - Timeout states'
method: NonblockingSocketTestCase
testTheThreeTimeoutStatesAreThree
	"None / n / 0, with getblocking() false ONLY in the middle -- a socket with
	a 2.5s timeout is still blocking.  This part Grail already had; it is here
	because the exception fix below only makes sense against it."

	self assertMatchesCPythonAt: 'three_states'.
%

category: 'Grail-Tests - Timeout states'
method: NonblockingSocketTestCase
testATimeoutIsStoredAsAFloat
	"``settimeout(1); gettimeout()'' answers 1.0 in CPython -- it converts
	whatever it is given.  Grail kept the integer, so the value read back with a
	different TYPE than CPython reports, and tests/python/raw_socket.py had
	pinned that integer as though it were the expectation."

	self assertMatchesCPythonAt: 'timeouts_are_floats'.
%

! ------------------- what the non-blocking state raises

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testANonblockingReadRaisesBlockingIOError
	"And carries an errno equal to errno.EAGAIN.  The probe compares against
	the NAME rather than the number on purpose: EAGAIN is 35 on BSD/macOS and
	11 on Linux, and what has to hold is that Grail's socket layer and Grail's
	errno module agree -- which is the comparison real code makes."

	self assertMatchesCPythonAt: 'recv_nonblocking_raises_blocking_io_error'.
%

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testANonblockingAcceptRaisesBlockingIOError
	"accept() is the other half: a server loop polls its listener exactly the
	way a reader polls a connection."

	self assertMatchesCPythonAt: 'accept_nonblocking_raises_blocking_io_error'.
%

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testAPositiveTimeoutStillRaisesTimeoutError
	"The state that DOES wait keeps its own exception, and TimeoutError is not
	a BlockingIOError.  Collapsing the two the other way round would be just as
	wrong as the bug being fixed."

	self assertMatchesCPythonAt: 'a_positive_timeout_still_raises_timeout_error'.
%

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testATimeoutTooSmallToMeasureIsStillATimeout
	"``settimeout(0.0001)'' rounds to zero MILLISECONDS, which is the unit
	GemStone's readiness primitive takes -- so deciding the state from the
	rounded value would call it non-blocking and answer BlockingIOError,
	reintroducing the same confusion in the other direction.  ___notReadyNow___
	reads timeoutSecs instead, which is the state itself."

	self assertMatchesCPythonAt: 'a_timeout_too_small_to_measure_is_still_a_timeout'.
%

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testTheTwoErrorsAreSiblings
	"Which is exactly why substituting one for the other was invisible to the
	type system and fatal to the retry idiom."

	self assertMatchesCPythonAt: 'the_two_are_siblings_not_parent_and_child'.
%

! ------------------- THE HEADLINE

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testTheRetryIdiomRuns
	"THE POINT OF THE CHANGE.  A non-blocking read that catches
	``(BlockingIOError, InterruptedError)'', waits for readiness and retries --
	the shape of every selector-driven reader, and of asyncio's sock_recv.
	Before the fix the except clause did not match, so the first attempt
	escaped as a TimeoutError and the loop never ran a second time.

	The trace is the evidence: ``not ready'' THEN the payload, so both branches
	were taken in order."

	self assertMatchesCPythonAt: 'the_retry_idiom_works'.
%

category: 'Grail-Tests - BlockingIOError'
method: NonblockingSocketTestCase
testANonblockingSendThatFitsStillSends
	"send() gained the same guard, and a guard that refuses a write which would
	have succeeded is worse than the bug it fixes.  The readiness probe fails
	OPEN for that reason -- if GsSocket cannot answer writeWillNotBlock the
	write is attempted as before."

	self assertMatchesCPythonAt: 'a_nonblocking_send_that_fits_still_sends'.
%

! ------------------- OSError's fields

category: 'Grail-Tests - OSError fields'
method: NonblockingSocketTestCase
testErrnoDefaultsToNoneRatherThanRaising
	"``OSError('a message').errno'' is None in CPython and raised
	AttributeError here.  Since every OSError the socket layer raises is that
	one-argument form, the failure landed INSIDE the handler that was trying to
	classify the error."

	self assertMatchesCPythonAt: 'errno_defaults_to_none_not_attribute_error'.
%

category: 'Grail-Tests - OSError fields'
method: NonblockingSocketTestCase
testErrnoIsADataAttributeNotAMethod
	"``e.errno'', not ``e.errno()''.  The accessors are defaults for fields that
	were never stored, so they need OSError class >> ___pythonValueAttrs___ --
	without it ___pyAttrLoad___ answers a BoundMethod, which is TRUTHY, so
	``if e.errno:'' takes the wrong branch instead of failing loudly."

	self assertMatchesCPythonAt: 'errno_is_a_data_attribute_not_a_method'.
%

category: 'Grail-Tests - OSError fields'
method: NonblockingSocketTestCase
testAnErrorFromTheSocketLayerHasAReadableErrno
	"The value is platform- and implementation-specific; that reading it
	answers at all is not."

	self assertMatchesCPythonAt: 'a_closed_socket_reports_an_oserror_whose_errno_reads'.
%

category: 'Grail-Tests - OSError str'
method: NonblockingSocketTestCase
testStrOfAnErrnoOSError
	"``[Errno n] strerror'', plus ``: filename'' and `` -> filename2'' when
	supplied -- and the filenames arrive QUOTED, because CPython formats them
	with %R rather than %S.  Grail rendered the args tuple instead."

	self assertMatchesCPythonAt: 'str_of_an_errno_oserror'.
%

category: 'Grail-Tests - OSError str'
method: NonblockingSocketTestCase
testStrFallsBackWhenTheErrnoFormWasNotUsed
	"One argument is not the (errno, strerror) form, so BaseException's
	rendering stands."

	self assertMatchesCPythonAt: 'str_falls_back_outside_the_errno_form'.
%

category: 'Grail-Tests - OSError str'
method: NonblockingSocketTestCase
testASuppliedNoneIsNotTheSameAsAbsent
	"``OSError(2, None)'' is ``[Errno 2] None''.  The C code tests the slot for
	non-NULL rather than for truth, which is why ABSENCE -- not None -- is what
	tells __str__ there is no errno form to report, and why nothing at all is
	stored outside 2..5 arguments."

	self assertMatchesCPythonAt: 'none_is_not_absent'.
%

category: 'Grail-Tests - OSError unpacking'
method: NonblockingSocketTestCase
testFilenameIsKeptOnlyWhenSupplied
	"And filename2 only INSIDE that test, so a None filename discards both.
	Grail stored filename2 unconditionally."

	self assertMatchesCPythonAt: 'filename_is_kept_only_when_supplied'.
%

category: 'Grail-Tests - OSError unpacking'
method: NonblockingSocketTestCase
testArgsTruncationFollowsFilenameNotArity
	"``OSError(2, 'm', None).args'' keeps all three; supplying a REAL filename
	is what cuts args down to (errno, strerror).  Grail truncated on arity
	alone, which lost the None case."

	self assertMatchesCPythonAt: 'args_truncation_follows_filename_not_arity'.
%

! ------------------- the pinned deviation

category: 'Grail-Tests - Known deviations'
method: NonblockingSocketTestCase
testMoreThanFiveArgumentsRaisesInsteadOfKeepingArgsWhole
	"KNOWN DEVIATION, asserted as Grail's answer rather than CPython's.

	Above five positional arguments CPython does no unpacking and str() is the
	args tuple.  Grail's exception constructors accept at most five, so the
	TypeError arrives before the question of unpacking does -- which makes the
	``> 5'' branch of OSError >> ___args___: unreachable from Python today.  The
	branch is kept because it is what CPython specifies and the constructor
	limit is the thing that should move.

	Pinned so that lifting the constructor limit shows up HERE as a failing
	test rather than as a silent change in what OSError renders."

	self assert: (self resultAt: 'more_than_five_arguments')
		equals: '''TypeError: OSError() takes wrong number of arguments (6 positional, 0 keyword) - no matching method'''.
%
