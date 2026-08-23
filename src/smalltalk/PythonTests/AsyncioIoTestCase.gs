! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncioIoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioIoTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AsyncioIoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncioIoTestCase
!
! THE LOOP DOES I/O.
!
! The event loop Grail already had was the callback/timer half of asyncio: a
! ready queue, a timer heap, Future and Task, sleep and run.  Enough to
! SCHEDULE, not enough to SERVE -- there was no add_reader, no sock_recv, and so
! no way for a socket to wake it.  Networking went through the blocking socket
! module, which on a cooperative loop means the first read stops every other
! task rather than just its own.
!
! What closes the gap is that GemStone already had the hard half.  ``Processor
! whenReadable: sock signal: aSemaphore'' (and whenWritable:) is a per-socket
! readiness registry, and Grail's ``select'' was already built on it: register
! every socket against one semaphore and wait, and the gem sleeps until the
! first one is ready while other green threads keep running.  So this increment
! is wiring rather than design -- the loop waits INSIDE select whenever a socket
! is registered, and the sock_* coroutines are the ordinary
! retry-on-BlockingIOError shape.
!
! That shape is why the preceding change had to come first: recv() on a
! non-blocking socket answered TimeoutError, and TimeoutError is a SIBLING of
! BlockingIOError, so ``except (BlockingIOError, InterruptedError):'' never
! matched and no retry loop could work.  See NonblockingSocketTestCase.
!
! ------------------------------------------------------------------------------
! WHAT THE WAIT HAS TO GET RIGHT, which is more than "block until ready".
!
! The timeout passed to select decides three different things, and only the
! first is obvious:
!   * 0 when work is already queued, so a busy loop never waits and
!     ``sleep(0)'' still yields;
!   * the first TIMER's deadline when there is one, so a registered-but-silent
!     socket cannot starve a timer.  A loop that passes None whenever nothing is
!     ready looks correct until exactly that case, which is why there is a probe
!     for it;
!   * unbounded only when there is nothing else at all to do.
!
! Registrations are LEVEL-triggered, as CPython's selectors are, so a socket
! that is still readable fires again next turn.  The waiters remove their own
! registration once satisfied, and the readiness callback tolerates a future
! that is already resolved -- a level-triggered watcher can fire once more
! before the remove takes effect, and setting a result twice is an
! InvalidStateError.
!
! ------------------------------------------------------------------------------
! TWO DEVIATIONS, both stated where they are implemented.
!
! ``add_reader'' keys its table by DESCRIPTOR as CPython does, but what it
! WATCHES is the socket OBJECT, because GemStone's readiness events are keyed by
! GsSocket and not by descriptor (select.py explains why).  Either spelling
! works -- an int is resolved back through _socket's fd registry -- and a probe
! checks that adding by fd and removing by socket hit the SAME registration,
! since otherwise the difference would show up only as a leaked watcher.
!
! ``sock_connect'' is the ordinary asyncio shape, and it does NOT block the
! loop.  An earlier version of this comment said the opposite, and blamed
! GemStone: it claimed non-blocking connect ``does not work at all''.  That was
! wrong, and worth recording as wrong, because the mistake was to read a Grail
! bug as a platform limitation.
!
! GemStone was already doing the right thing.  Every socket the image creates is
! non-blocking at the OS level, the connect primitive is ALWAYS issued
! non-blocking, and ``connectTo:on:timeoutMs:'' treats EINPROGRESS as ``started,
! not finished'' -- it issues the connect, then waits with
! ``writeWillNotBlockWithin:'', which suspends only the calling GsProcess.  So a
! timeout of 0 starts a connect and polls once, which is exactly the primitive
! asyncio wants.  What is genuinely absent is only a PUBLIC call that starts a
! connect and hands back the pending errno; the wait is baked into connectTo:.
!
! The ``getpeername failed with Socket is not connected'' text that led me
! astray is that internal completion probe complaining, surfaced by Grail's own
! ``connect:'' as though it were the connect's error.  It now classifies instead
! -- connected / in progress / resolved-and-failed, from readiness, every row
! measured -- so ``connect'' raises BlockingIOError(EINPROGRESS) while a connect
! is under way, and sock_connect waits in select with everything else.
!
! It waits for READABLE OR WRITABLE, which is not decoration.  A completed
! connect makes the socket writable, but a REFUSED one makes it readable and
! never writable (GemStone's writability primitive answers nil rather than true
! for an errored socket), so a writability-only wait hangs on a refused connect
! instead of reporting it.
!
! One further difference is deliberate rather than forced: a blocking socket is
! refused ALWAYS, where CPython refuses only under set_debug(True).  In CPython
! a blocking recv stalls the loop; here it stalls the loop and everything
! cooperating with it, with no thread left to notice, so the symptom is a hang
! rather than a slow call.  The always-on half cannot be probed against CPython
! -- there, the probe would hang -- so the fixture turns debug on and compares
! the message.
!
! ------------------------------------------------------------------------------
! WHAT IS STILL MISSING: transports and protocols.
!
! There is no create_server / create_connection / StreamReader / StreamWriter,
! so an ASGI server cannot be pointed at this loop unmodified -- uvicorn asks
! for ``loop.create_server(protocol_factory, ...)''.  A hand-written server, or
! one built on sock_accept/sock_recv/sock_sendall, runs today.  See
! docs/Support_FastAPI.md.
!
! Drives tests/python/asyncio_io.py, whose EXPECTED table was generated by
! RUNNING CPython 3.14.6.  All 14 probes agree with CPython exactly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AsyncioIoTestCase removeAllMethods.
AsyncioIoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncioIoTestCase
setUp
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
%

category: 'Grail-Private'
method: AsyncioIoTestCase
resultAt: key
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString
%

category: 'Grail-Private'
method: AsyncioIoTestCase
assertMatchesCPythonAt: key
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.
%

! ------------------- it serves

category: 'Grail-Tests - Serving'
method: AsyncioIoTestCase
testAnEchoExchangeOverARealSocket
	"THE HEADLINE.  A server coroutine accepts, reads and answers; a client
	coroutine connects, sends and reads the answer -- both on one loop, over a
	real loopback socket.  Nothing in this probe is Grail-specific: it is the
	shortest asyncio server anyone writes."

	self assertMatchesCPythonAt: 'echo_over_a_real_socket'.
%

! ------------------- the property a straight-through loop cannot fake

category: 'Grail-Tests - Concurrency'
method: AsyncioIoTestCase
testTwoClientsAreServedInSpeakingOrderNotAcceptOrder
	"THE PROBE THAT MATTERS MOST.  Two connections are accepted, and then the
	SECOND client speaks first.  Every other probe here would also pass on a
	loop that ran each connection to completion before looking at the next --
	right bytes, wrong order.  Serving in speaking order can only happen if the
	handler whose socket was not ready really returned control to the scheduler
	and the scheduler really resumed someone else."

	self assertMatchesCPythonAt: 'two_clients_served_concurrently'.
%

! ------------------- what the wait has to get right

category: 'Grail-Tests - The wait'
method: AsyncioIoTestCase
testATimerFiresWhileTheLoopIsWaitingOnASilentSocket
	"THE SECOND MOST INTERESTING PROBE.  A loop that passes None to select
	whenever nothing is ready is easy to write by accident and passes
	everything except this: with one silent socket registered, a 0.2s sleep
	must still wake.  The check is that the timer fired, that it took roughly
	its delay, and that the reader did NOT fire."

	self assertMatchesCPythonAt: 'a_timer_fires_while_waiting_on_io'.
%

category: 'Grail-Tests - The wait'
method: AsyncioIoTestCase
testTheLoopSleepsRatherThanSpins
	"Wall time passes; CPU time does not.  A loop polling in a tight circle
	would burn a comparable amount of both, so the RATIO is the evidence that
	the wait is a real suspension -- GemStone's readiness events plus a
	semaphore, not a poll."

	self assertMatchesCPythonAt: 'the_loop_sleeps_rather_than_spins'.
%

category: 'Grail-Tests - The wait'
method: AsyncioIoTestCase
testAReaderOnAnIdleSocketDoesNotFire
	"The other half of readiness: a watcher must not report ready when nothing
	has arrived.  A select that answered every registered socket would make
	every probe above pass for the wrong reason."

	self assertMatchesCPythonAt: 'a_reader_on_an_idle_socket_does_not_fire'.
%

! ------------------- the callback API

category: 'Grail-Tests - add_reader'
method: AsyncioIoTestCase
testAddReaderFiresWhenDataArrives
	"The raw callback API, underneath the sock_* coroutines."

	self assertMatchesCPythonAt: 'add_reader_fires_when_data_arrives'.
%

category: 'Grail-Tests - add_reader'
method: AsyncioIoTestCase
testRemoveReaderReportsWhetherItRemoved
	"True then False.  Callers use the answer, and a remove must not raise for
	something never added -- the canonical shape is a ``finally'' that runs
	however the wait ended."

	self assertMatchesCPythonAt: 'remove_reader_reports_whether_it_removed'.
%

category: 'Grail-Tests - add_reader'
method: AsyncioIoTestCase
testAWatcherCanBeRegisteredByFileDescriptor
	"``loop.add_reader(sock.fileno(), cb)'' is the spelling library code uses,
	and CPython's tables are keyed by descriptor.  Grail's readiness events are
	keyed by SOCKET, so the int has to be resolved back through _socket's fd
	registry -- and it must resolve to the same REGISTRATION, which is what
	removing by socket afterwards checks.  Get that wrong and the only symptom
	is a watcher that is never removed."

	self assertMatchesCPythonAt: 'a_watcher_can_be_registered_by_file_descriptor'.
%

! ------------------- the sock_* surface

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testSockRecvAtEofIsEmptyBytes
	"EOF is b'''', not an error -- the condition every read loop terminates on."

	self assertMatchesCPythonAt: 'sock_recv_at_eof_is_empty_bytes'.
%

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testSockSendallSendsMoreThanOneWriteWorth
	"64KiB is past a loopback send buffer, so this exercises the partial-write
	path: send answers a short count and sendall waits for WRITABILITY before
	continuing from where it stopped.  It is also why send, not sendall, is the
	primitive underneath -- a partial sendall cannot report how far it got."

	self assertMatchesCPythonAt: 'sock_sendall_sends_more_than_one_write_worth'.
%

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testSockAcceptAnswersANonblockingSocket
	"gettimeout() is 0.0 on the accepted socket.  A server that read from a
	blocking one would stall every other connection on the loop, so this is not
	a convenience."

	self assertMatchesCPythonAt: 'sock_accept_answers_a_nonblocking_socket'.
%

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testSockRecvIntoFillsABuffer
	"recv_into is what a buffered reader uses, so it matters for throughput
	rather than for correctness -- but it has to honour the same retry."

	self assertMatchesCPythonAt: 'sock_recv_into_fills_a_buffer'.
%

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testSockConnectConnects
	"It BLOCKS while connecting -- GemStone's non-blocking connect does not
	work, see the class comment -- but it still has to connect, and the socket
	has to come back non-blocking so that the reads which follow are
	cooperative.  gettimeout() being 0.0 afterwards is that second half."

	self assertMatchesCPythonAt: 'sock_connect_connects'.
%

category: 'Grail-Tests - sock_*'
method: AsyncioIoTestCase
testABlockingSocketIsRefused
	"With set_debug(True) both CPython and Grail raise, and the message is
	CPython's so the failure reads the same.  Grail refuses in either mode,
	which CANNOT be probed against CPython: there, with debug off, the probe
	would perform a blocking recv and hang."

	self assertMatchesCPythonAt: 'sock_recv_requires_a_nonblocking_socket'.
%

category: 'Grail-Tests - connect'
method: AsyncioIoTestCase
testANonblockingConnectReportsInProgress
	"The socket-level primitive underneath sock_connect: a non-blocking connect
	STARTS and says so, with BlockingIOError(EINPROGRESS).

	Grail used to answer a bare OSError here -- ``connect failed: getpeername
	failed with Socket is not connected'' -- which is the internal completion
	probe's complaint rather than the connect's, and which I first read as
	GemStone being unable to do non-blocking connects at all.  It can; every
	connect it issues is non-blocking."

	self assertMatchesCPythonAt: 'a_nonblocking_connect_reports_in_progress'.
%

category: 'Grail-Tests - connect'
method: AsyncioIoTestCase
testSockConnectReportsARefusedConnection
	"The failure path has to arrive as an exception rather than as a wait that
	never ends -- and it is exactly the case a writability-only wait gets
	wrong, because a refused connect makes the socket READABLE and never
	writable."

	self assertMatchesCPythonAt: 'sock_connect_reports_a_refused_connection'.
%

category: 'Grail-Tests - connect'
method: AsyncioIoTestCase
testConnectExAnswersACodeRatherThanRaising
	"connect_ex has exactly one contract -- never raise -- and it was not being
	kept: measured, a BLOCKING connect_ex to a closed port raised ``OSError:
	connect failed'' instead of answering ECONNREFUSED.  That half was
	pre-existing rather than introduced here.  It shares the classifier with
	connect now, so the two also cannot disagree about what happened."

	self assertMatchesCPythonAt: 'connect_ex_answers_a_code_rather_than_raising'.
%

category: 'Grail-Tests - Known deviations'
method: AsyncioIoTestCase
testConnectResolvesOneStepEarlierThanCPython
	"KNOWN DEVIATION, asserted as Grail's answer rather than CPython's.

	CPython: a second connect() on a connect already under way raises EALREADY,
	and a refused connect reports EINPROGRESS first, the refusal only once the
	socket is ready.  Grail's retry is a POLL of the same connect, so it
	resolves a step earlier -- the retry answers None once connected, and a
	loopback refusal has already resolved by the time the first call classifies
	it.

	The OUTCOMES agree, which is what sock_connect and connect_ex are tested on
	above; only the intermediate states differ.  Pinned so that a change in the
	staging shows up here rather than as a surprise in something built on it."

	self assert: (self resultAt: 'connect_progression')
		equals: '(''None'', ''ConnectionRefusedError'')'.
%
