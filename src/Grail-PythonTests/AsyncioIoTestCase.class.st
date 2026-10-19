Class {
	#name : 'AsyncioIoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncioIoTestCase >> assertMatchesCPythonAt: key [
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.

]

{ #category : 'Grail-Private' }
AsyncioIoTestCase >> resultAt: key [
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString

]

{ #category : 'Grail-Setup' }
AsyncioIoTestCase >> setUp [
	"Reload tests/python/asyncio_io.py fresh each test.  Every probe runs at
	import and each one opens its own listener, runs its own loop and closes
	everything, so a shared instance would let one test read another's closed
	sockets."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_io' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asyncio_io.py')
		name: 'asyncio_io'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testABlockingSocketIsRefused [
	"With set_debug(True) both CPython and Grail raise, and the message is
	CPython's so the failure reads the same.  Grail refuses in either mode,
	which CANNOT be probed against CPython: there, with debug off, the probe
	would perform a blocking recv and hang."

	self assertMatchesCPythonAt: 'sock_recv_requires_a_nonblocking_socket'.

]

{ #category : 'Grail-Tests - add_reader' }
AsyncioIoTestCase >> testAddReaderFiresWhenDataArrives [
	"The raw callback API, underneath the sock_* coroutines."

	self assertMatchesCPythonAt: 'add_reader_fires_when_data_arrives'.

]

{ #category : 'Grail-Tests - Serving' }
AsyncioIoTestCase >> testAnEchoExchangeOverARealSocket [
	"THE HEADLINE.  A server coroutine accepts, reads and answers; a client
	coroutine connects, sends and reads the answer -- both on one loop, over a
	real loopback socket.  Nothing in this probe is Grail-specific: it is the
	shortest asyncio server anyone writes."

	self assertMatchesCPythonAt: 'echo_over_a_real_socket'.

]

{ #category : 'Grail-Tests - connect' }
AsyncioIoTestCase >> testAnImmediateRepollAnswersEALREADY [
	"The other half of the state machine, asserted HERE rather than in the
	fixture because it is not observable from Python: a loopback connect
	completes before a second Python statement can run, so from up there
	whether EALREADY is ever seen is timing rather than behaviour.  Two
	back-to-back sends at this level are deterministic -- measured 5 of 5.

	EALREADY is a BlockingIOError like EINPROGRESS, which is what lets a caller
	write one except clause covering both the first call and every poll after
	it; asyncio's sock_connect depends on exactly that.

	An open listener, not a closed port: a refused connect resolves immediately
	on Linux, so asking about a REFUSAL tells you nothing about the in-progress
	state.  CI caught that -- this test's first version connected to port 1."

	| srv addr s codes eisconn |
	srv := GsSocket new.
	srv makeServer: 4 atPort: 0.
	addr := { '127.0.0.1' . srv port }.
	s := (Python at: #PyRawSocket) @env1:__new__.
	s @env1:__init__.
	s @env1:setblocking: false.
	codes := OrderedCollection new.
	1 to: 5 do: [:i |
		codes add: (s @env1:connect_ex: addr).
		(Delay forMilliseconds: 20) wait].
	s @env1:close.
	srv close.

	"THE INVARIANTS, and they are the ones that survived three CI runs on Linux.
	A resolved connect ENDS UP at EISCONN, and success is reported AT MOST ONCE.

	Not ``the second call is EALREADY'': whether the connect is still in
	progress by then is timing, and it differs by platform.  Not ``the second
	call is never 0'' either -- that was my second guess and it is macOS-only,
	because on Linux the call that COMPLETES a non-blocking connect returns 0
	and only later ones raise EISCONN.  Grail's old behaviour was Linux-like for
	exactly one call; the bug was repeating it forever, which is what made a
	retry loop look as though it worked."
	"By name: the platform's own numbers, 56 / 36 / 37 on Darwin and
	106 / 115 / 114 on Linux."
	eisconn := OSError @env1:___errnoNamed: 'EISCONN'.
	self assert: codes last equals: eisconn.
	self assert: (codes occurrencesOf: 0) <= 1.

	"EALREADY when it IS still in progress, which is what a poll before
	completion must answer -- asserted only in that case, since forcing it is
	not portable."
	(codes first = (OSError @env1:___errnoNamed: 'EINPROGRESS')
		and: [(codes at: 2) ~= 0 and: [(codes at: 2) ~= eisconn]])
			ifTrue: [self assert: (codes at: 2) equals: (OSError @env1:___errnoNamed: 'EALREADY')]

]

{ #category : 'Grail-Tests - connect' }
AsyncioIoTestCase >> testANonblockingConnectReportsInProgress [
	"The socket-level primitive underneath sock_connect: a non-blocking connect
	STARTS and says so, with BlockingIOError(EINPROGRESS).

	Grail used to answer a bare OSError here -- ``connect failed: getpeername
	failed with Socket is not connected'' -- which is the internal completion
	probe's complaint rather than the connect's, and which I first read as
	GemStone being unable to do non-blocking connects at all.  It can; every
	connect it issues is non-blocking."

	self assertMatchesCPythonAt: 'a_nonblocking_connect_reports_in_progress'.

]

{ #category : 'Grail-Tests - The wait' }
AsyncioIoTestCase >> testAReaderOnAnIdleSocketDoesNotFire [
	"The other half of readiness: a watcher must not report ready when nothing
	has arrived.  A select that answered every registered socket would make
	every probe above pass for the wrong reason."

	self assertMatchesCPythonAt: 'a_reader_on_an_idle_socket_does_not_fire'.

]

{ #category : 'Grail-Tests - The wait' }
AsyncioIoTestCase >> testATimerFiresWhileTheLoopIsWaitingOnASilentSocket [
	"THE SECOND MOST INTERESTING PROBE.  A loop that passes None to select
	whenever nothing is ready is easy to write by accident and passes
	everything except this: with one silent socket registered, a 0.2s sleep
	must still wake.  The check is that the timer fired, that it took roughly
	its delay, and that the reader did NOT fire."

	self assertMatchesCPythonAt: 'a_timer_fires_while_waiting_on_io'.

]

{ #category : 'Grail-Tests - add_reader' }
AsyncioIoTestCase >> testAWatcherCanBeRegisteredByFileDescriptor [
	"``loop.add_reader(sock.fileno(), cb)'' is the spelling library code uses,
	and CPython's tables are keyed by descriptor.  Grail's readiness events are
	keyed by SOCKET, so the int has to be resolved back through _socket's fd
	registry -- and it must resolve to the same REGISTRATION, which is what
	removing by socket afterwards checks.  Get that wrong and the only symptom
	is a watcher that is never removed."

	self assertMatchesCPythonAt: 'a_watcher_can_be_registered_by_file_descriptor'.

]

{ #category : 'Grail-Tests - connect' }
AsyncioIoTestCase >> testConnectAnswersTheCPythonStateMachine [
	"THE FIX the state machine is named for: Grail used to answer None when
	connect() was called again on a connect that had completed, where CPython
	raises EISCONN.

	EISCONN matters more than it looks.  It is NOT a BlockingIOError, so a loop
	written as ``try: connect() except BlockingIOError: wait'' terminates on it
	rather than quietly succeeding -- which is why nobody writes the
	retry-connect pattern against CPython, and why Grail answering None there
	was a silent invitation to write it.

	The probe asserts PROPERTIES, not a transcript, and that is the second
	attempt: the first recorded the whole sequence and failed the fixture gate on
	Linux, because the SHAPE varies by platform and not merely the numbers -- a
	loopback connect resolves synchronously there, so the EINPROGRESS step macOS
	always shows can be absent.  Where it ENDS UP does not vary, so that is what
	is checked: EISCONN after the connect resolved, never a second silent
	success, and a refusal reported as itself.

	Errno NAMES, not numbers, for the same reason one layer down: EISCONN is 56
	on BSD/macOS and 106 on Linux, and ___normalizeConnectErrno___: maps the
	platform's code onto the value errno.py publishes so the name comparison
	holds on both."

	self assertMatchesCPythonAt: 'connect_state_machine'.

]

{ #category : 'Grail-Tests - connect' }
AsyncioIoTestCase >> testConnectExAnswersACodeRatherThanRaising [
	"connect_ex has exactly one contract -- never raise -- and it was not being
	kept: measured, a BLOCKING connect_ex to a closed port raised ``OSError:
	connect failed'' instead of answering ECONNREFUSED.  That half was
	pre-existing rather than introduced here.  It shares the classifier with
	connect now, so the two also cannot disagree about what happened."

	self assertMatchesCPythonAt: 'connect_ex_answers_a_code_rather_than_raising'.

]

{ #category : 'Grail-Tests - add_reader' }
AsyncioIoTestCase >> testRemoveReaderReportsWhetherItRemoved [
	"True then False.  Callers use the answer, and a remove must not raise for
	something never added -- the canonical shape is a ``finally'' that runs
	however the wait ended."

	self assertMatchesCPythonAt: 'remove_reader_reports_whether_it_removed'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testSockAcceptAnswersANonblockingSocket [
	"gettimeout() is 0.0 on the accepted socket.  A server that read from a
	blocking one would stall every other connection on the loop, so this is not
	a convenience."

	self assertMatchesCPythonAt: 'sock_accept_answers_a_nonblocking_socket'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testSockConnectConnects [
	"It BLOCKS while connecting -- GemStone's non-blocking connect does not
	work, see the class comment -- but it still has to connect, and the socket
	has to come back non-blocking so that the reads which follow are
	cooperative.  gettimeout() being 0.0 afterwards is that second half."

	self assertMatchesCPythonAt: 'sock_connect_connects'.

]

{ #category : 'Grail-Tests - connect' }
AsyncioIoTestCase >> testSockConnectReportsARefusedConnection [
	"The failure path has to arrive as an exception rather than as a wait that
	never ends -- and it is exactly the case a writability-only wait gets
	wrong, because a refused connect makes the socket READABLE and never
	writable."

	self assertMatchesCPythonAt: 'sock_connect_reports_a_refused_connection'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testSockRecvAtEofIsEmptyBytes [
	"EOF is b'''', not an error -- the condition every read loop terminates on."

	self assertMatchesCPythonAt: 'sock_recv_at_eof_is_empty_bytes'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testSockRecvIntoFillsABuffer [
	"recv_into is what a buffered reader uses, so it matters for throughput
	rather than for correctness -- but it has to honour the same retry."

	self assertMatchesCPythonAt: 'sock_recv_into_fills_a_buffer'.

]

{ #category : 'Grail-Tests - sock_*' }
AsyncioIoTestCase >> testSockSendallSendsMoreThanOneWriteWorth [
	"64KiB is past a loopback send buffer, so this exercises the partial-write
	path: send answers a short count and sendall waits for WRITABILITY before
	continuing from where it stopped.  It is also why send, not sendall, is the
	primitive underneath -- a partial sendall cannot report how far it got."

	self assertMatchesCPythonAt: 'sock_sendall_sends_more_than_one_write_worth'.

]

{ #category : 'Grail-Tests - The wait' }
AsyncioIoTestCase >> testTheLoopSleepsRatherThanSpins [
	"Wall time passes; CPU time does not.  A loop polling in a tight circle
	would burn a comparable amount of both, so the RATIO is the evidence that
	the wait is a real suspension -- GemStone's readiness events plus a
	semaphore, not a poll."

	self assertMatchesCPythonAt: 'the_loop_sleeps_rather_than_spins'.

]

{ #category : 'Grail-Tests - Concurrency' }
AsyncioIoTestCase >> testTwoClientsAreServedInSpeakingOrderNotAcceptOrder [
	"THE PROBE THAT MATTERS MOST.  Two connections are accepted, and then the
	SECOND client speaks first.  Every other probe here would also pass on a
	loop that ran each connection to completion before looking at the next --
	right bytes, wrong order.  Serving in speaking order can only happen if the
	handler whose socket was not ready really returned control to the scheduler
	and the scheduler really resumed someone else."

	self assertMatchesCPythonAt: 'two_clients_served_concurrently'.

]
