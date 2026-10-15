Class {
	#name : 'NonblockingSocketTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NonblockingSocketTestCase >> assertMatchesCPythonAt: key [
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.

]

{ #category : 'Grail-Private' }
NonblockingSocketTestCase >> resultAt: key [
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString

]

{ #category : 'Grail-Setup' }
NonblockingSocketTestCase >> setUp [
	"Reload tests/python/nonblocking_sockets.py fresh each test.  Every probe
	runs at import and each opens its own loopback pair, so a shared instance
	would let one test read a socket another had closed."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nonblocking_sockets' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonblocking_sockets.py')
		name: 'nonblocking_sockets'.

]

{ #category : 'Grail-Tests - OSError fields' }
NonblockingSocketTestCase >> testAnErrorFromTheSocketLayerHasAReadableErrno [
	"The value is platform- and implementation-specific; that reading it
	answers at all is not."

	self assertMatchesCPythonAt: 'a_closed_socket_reports_an_oserror_whose_errno_reads'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testANonblockingAcceptRaisesBlockingIOError [
	"accept() is the other half: a server loop polls its listener exactly the
	way a reader polls a connection."

	self assertMatchesCPythonAt: 'accept_nonblocking_raises_blocking_io_error'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testANonblockingReadRaisesBlockingIOError [
	"And carries an errno equal to errno.EAGAIN.  The probe compares against
	the NAME rather than the number on purpose: EAGAIN is 35 on BSD/macOS and
	11 on Linux, and what has to hold is that Grail's socket layer and Grail's
	errno module agree -- which is the comparison real code makes."

	self assertMatchesCPythonAt: 'recv_nonblocking_raises_blocking_io_error'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testANonblockingSendThatFitsStillSends [
	"send() gained the same guard, and a guard that refuses a write which would
	have succeeded is worse than the bug it fixes.  The readiness probe fails
	OPEN for that reason -- if GsSocket cannot answer writeWillNotBlock the
	write is attempted as before."

	self assertMatchesCPythonAt: 'a_nonblocking_send_that_fits_still_sends'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testAPositiveTimeoutStillRaisesTimeoutError [
	"The state that DOES wait keeps its own exception, and TimeoutError is not
	a BlockingIOError.  Collapsing the two the other way round would be just as
	wrong as the bug being fixed."

	self assertMatchesCPythonAt: 'a_positive_timeout_still_raises_timeout_error'.

]

{ #category : 'Grail-Tests - OSError unpacking' }
NonblockingSocketTestCase >> testArgsTruncationFollowsFilenameNotArity [
	"``OSError(2, 'm', None).args'' keeps all three; supplying a REAL filename
	is what cuts args down to (errno, strerror).  Grail truncated on arity
	alone, which lost the None case."

	self assertMatchesCPythonAt: 'args_truncation_follows_filename_not_arity'.

]

{ #category : 'Grail-Tests - OSError str' }
NonblockingSocketTestCase >> testASuppliedNoneIsNotTheSameAsAbsent [
	"``OSError(2, None)'' is ``[Errno 2] None''.  The C code tests the slot for
	non-NULL rather than for truth, which is why ABSENCE -- not None -- is what
	tells __str__ there is no errno form to report, and why nothing at all is
	stored outside 2..5 arguments."

	self assertMatchesCPythonAt: 'none_is_not_absent'.

]

{ #category : 'Grail-Tests - Timeout states' }
NonblockingSocketTestCase >> testATimeoutIsStoredAsAFloat [
	"``settimeout(1); gettimeout()'' answers 1.0 in CPython -- it converts
	whatever it is given.  Grail kept the integer, so the value read back with a
	different TYPE than CPython reports, and tests/python/raw_socket.py had
	pinned that integer as though it were the expectation."

	self assertMatchesCPythonAt: 'timeouts_are_floats'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testATimeoutTooSmallToMeasureIsStillATimeout [
	"``settimeout(0.0001)'' rounds to zero MILLISECONDS, which is the unit
	GemStone's readiness primitive takes -- so deciding the state from the
	rounded value would call it non-blocking and answer BlockingIOError,
	reintroducing the same confusion in the other direction.  ___notReadyNow___
	reads timeoutSecs instead, which is the state itself."

	self assertMatchesCPythonAt: 'a_timeout_too_small_to_measure_is_still_a_timeout'.

]

{ #category : 'Grail-Tests - OSError fields' }
NonblockingSocketTestCase >> testErrnoDefaultsToNoneRatherThanRaising [
	"``OSError('a message').errno'' is None in CPython and raised
	AttributeError here.  Since every OSError the socket layer raises is that
	one-argument form, the failure landed INSIDE the handler that was trying to
	classify the error."

	self assertMatchesCPythonAt: 'errno_defaults_to_none_not_attribute_error'.

]

{ #category : 'Grail-Tests - OSError fields' }
NonblockingSocketTestCase >> testErrnoIsADataAttributeNotAMethod [
	"``e.errno'', not ``e.errno()''.  The accessors are defaults for fields that
	were never stored, so they need OSError class >> ___pythonValueAttrs___ --
	without it ___pyAttrLoad___ answers a BoundMethod, which is TRUTHY, so
	``if e.errno:'' takes the wrong branch instead of failing loudly."

	self assertMatchesCPythonAt: 'errno_is_a_data_attribute_not_a_method'.

]

{ #category : 'Grail-Tests - OSError unpacking' }
NonblockingSocketTestCase >> testFilenameIsKeptOnlyWhenSupplied [
	"And filename2 only INSIDE that test, so a None filename discards both.
	Grail stored filename2 unconditionally."

	self assertMatchesCPythonAt: 'filename_is_kept_only_when_supplied'.

]

{ #category : 'Grail-Tests' }
NonblockingSocketTestCase >> testMoreThanFiveArgumentsKeepsArgsWhole [
	"Above five positional arguments CPython does no unpacking and str() is the
	args tuple.  This was a pinned deviation -- Grail's exception constructors
	took at most five arguments, so OSError(1, 2, 3, 4, 5, 6) was a TypeError
	before unpacking arose -- kept so that lifting the limit would show up here.
	BaseException class >> _new:kw: lifted it; the ``> 5'' branch of
	OSError >> ___args___: is now reached, and the answer is CPython's."

	self assertMatchesCPythonAt: 'more_than_five_arguments'.

]

{ #category : 'Grail-Tests - OSError str' }
NonblockingSocketTestCase >> testStrFallsBackWhenTheErrnoFormWasNotUsed [
	"One argument is not the (errno, strerror) form, so BaseException's
	rendering stands."

	self assertMatchesCPythonAt: 'str_falls_back_outside_the_errno_form'.

]

{ #category : 'Grail-Tests - OSError str' }
NonblockingSocketTestCase >> testStrOfAnErrnoOSError [
	"``[Errno n] strerror'', plus ``: filename'' and `` -> filename2'' when
	supplied -- and the filenames arrive QUOTED, because CPython formats them
	with %R rather than %S.  Grail rendered the args tuple instead."

	self assertMatchesCPythonAt: 'str_of_an_errno_oserror'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testTheRetryIdiomRuns [
	"THE POINT OF THE CHANGE.  A non-blocking read that catches
	``(BlockingIOError, InterruptedError)'', waits for readiness and retries --
	the shape of every selector-driven reader, and of asyncio's sock_recv.
	Before the fix the except clause did not match, so the first attempt
	escaped as a TimeoutError and the loop never ran a second time.

	The trace is the evidence: ``not ready'' THEN the payload, so both branches
	were taken in order."

	self assertMatchesCPythonAt: 'the_retry_idiom_works'.

]

{ #category : 'Grail-Tests - Timeout states' }
NonblockingSocketTestCase >> testTheThreeTimeoutStatesAreThree [
	"None / n / 0, with getblocking() false ONLY in the middle -- a socket with
	a 2.5s timeout is still blocking.  This part Grail already had; it is here
	because the exception fix below only makes sense against it."

	self assertMatchesCPythonAt: 'three_states'.

]

{ #category : 'Grail-Tests - BlockingIOError' }
NonblockingSocketTestCase >> testTheTwoErrorsAreSiblings [
	"Which is exactly why substituting one for the other was invisible to the
	type system and fatal to the retry idiom."

	self assertMatchesCPythonAt: 'the_two_are_siblings_not_parent_and_child'.

]
