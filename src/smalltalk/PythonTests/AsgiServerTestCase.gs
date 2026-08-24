! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsgiServerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsgiServerTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #( sharedFixture )
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AsgiServerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsgiServerTestCase
!
! AN ASGI APP, SERVED.  The first test in this tree where Grail runs a PROTOCOL
! rather than exercising a primitive: every probe is one or more real HTTP
! requests over a real loopback socket into ``grail.asgi.Server''.
!
! WHY THERE IS A SERVER AT ALL, given that uvicorn cannot run yet.  uvicorn asks
! the loop for ``create_server(protocol_factory, ...)'' and Grail has no
! transports, so ``run an ASGI app'' looks blocked behind a large increment.  But
! ASGI is just ``async def app(scope, receive, send)'', and accept / read / write
! already exist as sock_accept / sock_recv / sock_sendall.  Transports are how
! CPython's asyncio prefers to REACH those calls, not a precondition for them --
! so the server under test is written straight onto the socket coroutines, and
! the milestone lands three increments earlier than the transports route would
! allow.
!
! WHAT MAKES IT WORTH TESTING is that a wrong answer here is almost never
! localised.  A request that comes back with the right status, headers and body
! has already required accept to hand over a usable socket, readiness to fire, a
! partial read to be resumed, a partial write to be finished, a task to be
! scheduled, and a keep-alive connection to park without stalling anything else.
! The socket fixtures test those one at a time; this tests them composed, and
! composition is where the interesting failures live -- as this increment
! demonstrated the hard way (see BUG below).
!
! ------------------------------------------------------------------------------
! THE BUG THIS INCREMENT FOUND, because it is the reason the diff is not just a
! new file.
!
! The first request never completed.  connect() answered EISCONN straight past
! an ``except OSError'' written to catch exactly that -- and then past an
! ``except BaseException'' too, which is the tell: the exception was not going to
! the wrong clause, it was being refused by every clause of that try.
!
! Grail shields a try's LATER clauses while one of its own handlers runs, because
! Python's except clauses are alternatives for the try BODY only (see
! ExceptClauseShieldTestCase).  The bookkeeping for that -- how many handler
! bodies are running, and which try activations they belong to -- lived in ONE
! SESSION-WIDE stack.  But a coroutine is a generator, and a generator body runs
! on its own forked GsProcess: a second call stack.  ``except BlockingIOError:
! await ...'' is therefore a suspension INSIDE a handler, and it is not an exotic
! shape -- it is how every socket coroutine in the event loop is written.
!
! So with two coroutines parked in handlers at once -- which is the ORDINARY
! state of a server, the accept loop being permanently parked inside
! sock_accept's own retry -- the one that resumed first unwound the other's entry
! and left its own behind.  Its try site then looked ``already handling'' for the
! rest of the session and every later clause of it was dead.
!
! The fix is the one the currently-handled exception (sys.exc_info()) already
! had: save and restore that state across every suspension, from both sides.
! BaseException >> ___captureHandlerState___, used by PythonGenerator
! >> ___yield___: (the body) and >> ___captureConsumerState___ (the consumer).
! Pinned socket-free in CoroutineSuspensionTestCase and, synchronously, in
! ExceptClauseShieldTestCase -- because a bug found through a protocol should not
! be guarded only by the protocol.
!
! ------------------------------------------------------------------------------
! THE PROBES THAT MATTER MOST.
!
!   * ``two_clients_interleave'' -- a slow client connects first and its handler
!     parks; a fast client connects second and completes first.  Every other
!     probe here would also pass on a server that ran each connection to
!     completion before looking at the next, which is exactly the bug a
!     cooperative loop invites.  The recorded answer is the completion ORDER, so
!     serving in arrival order produces the wrong one.
!
!   * ``keep_alive_then_a_second_request'' and
!     ``both_requests_pipelined_into_one_write'' -- a keep-alive connection is
!     the one case where bytes for request N+1 arrive in the same read that
!     finished request N.  A server with a per-request buffer discards them and
!     then waits forever for a request it has already been sent.  No
!     single-request test can reach that.  (The fixture's own client had this
!     bug first, and CPython caught it.)
!
! ------------------------------------------------------------------------------
! WHAT THE SERVER DOES NOT CLAIM, so a green run is not read as more than it is:
! no TLS, no HTTP/2, no WebSocket, no chunked REQUEST bodies (refused with 411 --
! there is a probe for the refusal, because treating a chunked body as empty
! would make an app succeed WRONGLY), no streaming request body (delivered as one
! message), and no timeouts.  Also still missing from asyncio itself:
! ``Event'' / ``Lock'' / ``Semaphore'' / ``Queue'' -- the interleave probe uses a
! Future where it would rather use an Event.
!
! The fixture is ordinary CPython throughout -- asyncio, socket, and an ASGI app
! written to the published interface -- and the server module is pure Python with
! no Grail-specific spelling.  That is what lets tests/python/asgi_server.py be
! ground truth rather than a description of what Grail happens to do.  EXPECTED
! was generated by RUNNING CPython 3.14.6.
! ===============================================================================

expectvalue /Metaclass3
doit
AsgiServerTestCase removeAllMethods.
AsgiServerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsgiServerTestCase
setUp
	"Import the fixture ONCE per session and share it across all 28 tests.

	This one is not a micro-optimisation.  Every probe runs at IMPORT, and each
	probe binds a listener, serves real requests over loopback and shuts the
	server down -- so a per-test import would run all 28 probes 28 times, which is
	both the slowest class in the gate and, in a session with a default temp-object
	cache, an outright method-code-space exhaustion from recompiling the module
	that many times.  It was measured: ``VM temporary object memory is full, code
	space doits_meths overflow''.

	Sharing is sound because every test here only READS the module-level ``r'' and
	``EXPECTED'' dicts that the import already computed; none writes.  A test added
	later that MUTATES the module must import its own copy, and drop this one --
	see DunderNewTestCase >> freshFixture, which is the same pattern and says the
	same thing.

	Sockets are not a reason to re-import, incidentally: each probe opens and
	closes its own, and what survives the import is only the recorded VALUES."

	testModule := self class sharedFixture ifNil: [
		self class sharedFixture: self freshFixture].
%

category: 'Grail-Helpers'
classmethod: AsgiServerTestCase
sharedFixture
	"The session's shared fixture module, or nil before the first import.
	Class-side because that is where the cache has to live: SUnit builds a NEW
	test-case instance per test method, so an instance variable would cache
	nothing."

	^ sharedFixture
%

category: 'Grail-Helpers'
classmethod: AsgiServerTestCase
sharedFixture: aModule
	sharedFixture := aModule.
	^ aModule
%

category: 'Grail-Helpers'
method: AsgiServerTestCase
freshFixture
	"A newly-imported copy of the fixture, which re-runs every probe."

	(importlib @env1:modules) removeKey: #'asgi_server' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asgi_server.py')
		name: 'asgi_server'.
%

category: 'Grail-Private'
method: AsgiServerTestCase
resultAt: key
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString
%

category: 'Grail-Private'
method: AsgiServerTestCase
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
method: AsgiServerTestCase
testAGetReturnsTheAppsBytes
	"THE HEADLINE.  A real HTTP request over a real socket into a real ASGI app,
	and the status, content-type and body all come back."

	self assertMatchesCPythonAt: 'a_get_returns_the_apps_bytes'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testTheScopeTheAppSees
	"The ASGI contract, from the app's side: type, method, scheme, http_version,
	path, query_string and root_path are what the spec says they are.  An app
	routes on these, so a server that gets them subtly wrong fails only in the
	frameworks it is meant to run."

	self assertMatchesCPythonAt: 'the_scope_the_app_sees'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testHeadersReachTheAppLowercased
	"ASGI requires lower-cased header names and values as raw bytes with the
	surrounding whitespace stripped.  Frameworks look headers up by lower-cased
	name and simply miss them otherwise."

	self assertMatchesCPythonAt: 'headers_reach_the_app_lowercased'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testAPostBodyReachesTheApp
	"receive() answers one ``http.request'' carrying the whole body, with
	more_body False."

	self assertMatchesCPythonAt: 'a_post_body_reaches_the_app'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testPathIsDecodedAndRawPathIsNot
	"A SECURITY distinction, not a tidiness one.  ``path'' is percent-decoded,
	so a traversal check written against it sees the decoded form; anything that
	must reject an ENCODED slash has to read ``raw_path''.  A server that
	supplied only one of them would make the safe check impossible to write."

	self assertMatchesCPythonAt: 'path_is_decoded_and_raw_path_is_not'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testAStatusOtherThan200RoundTrips
	self assertMatchesCPythonAt: 'a_status_other_than_200_round_trips'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testAStreamedResponseArrivesWhole
	"Several ``http.response.body'' messages with more_body -- how a real app
	streams."

	self assertMatchesCPythonAt: 'a_streamed_response_arrives_whole'.
%

category: 'Grail-Tests - Serving'
method: AsgiServerTestCase
testReceiveAfterTheBodyReportsDisconnect
	self assertMatchesCPythonAt: 'receive_after_the_body_reports_disconnect'.
%

! ------------------- the property a sequential server cannot fake

category: 'Grail-Tests - Concurrency'
method: AsgiServerTestCase
testTwoClientsInterleave
	"THE PROBE THAT MATTERS MOST.  A slow client connects first and its handler
	parks; a fast client connects second and is released immediately.  The
	recorded answer is the completion ORDER, so a server that ran each
	connection to completion before looking at the next -- which is exactly the
	bug a cooperative loop invites, and which every other probe here would
	tolerate -- produces the reverse.

	It is also the probe the handler-stack bug showed up in most sharply, since
	interleaving is what puts two coroutines inside except handlers at once."

	self assertMatchesCPythonAt: 'two_clients_interleave'.
%

category: 'Grail-Tests - Concurrency'
method: AsgiServerTestCase
testManyClientsAreAllServed
	"Eight concurrent connections, each asking for its own path.  Asserts the
	SET of answers, not the order: the order is a scheduling detail, and pinning
	local timing as protocol has already cost this repo three CI failures."

	self assertMatchesCPythonAt: 'many_clients_are_all_served'.
%

! ------------------- keep-alive, where the read-ahead bugs live

category: 'Grail-Tests - Keep-alive'
method: AsgiServerTestCase
testKeepAliveThenASecondRequest
	"Two requests on ONE connection, the second sent as soon as the first
	response is read -- so its head very often arrives in the same read that
	completed the first response's body.  A server that buffers per REQUEST
	drops those bytes and then waits forever for a request it already has."

	self assertMatchesCPythonAt: 'keep_alive_then_a_second_request'.
%

category: 'Grail-Tests - Keep-alive'
method: AsgiServerTestCase
testBothRequestsPipelinedIntoOneWrite
	"The same hazard stated as sharply as it can be: both requests in a SINGLE
	write, so the server certainly holds request 2 before it has answered
	request 1."

	self assertMatchesCPythonAt: 'both_requests_pipelined_into_one_write'.
%

category: 'Grail-Tests - Keep-alive'
method: AsgiServerTestCase
testNoContentLengthClosesTheConnection
	"A response with no content-length is framed by the CLOSE -- that is how the
	client knows it is complete.  Keeping such a connection open leaves the
	client waiting for bytes that are never coming, so the server must close and
	must say so."

	self assertMatchesCPythonAt: 'no_content_length_closes_the_connection'.
%

category: 'Grail-Tests - Keep-alive'
method: AsgiServerTestCase
testConnectionCloseFromTheClientIsHonoured
	self assertMatchesCPythonAt: 'connection_close_from_the_client_is_honoured'.
%

category: 'Grail-Tests - Keep-alive'
method: AsgiServerTestCase
testHttp10GetsNoKeepAlive
	self assertMatchesCPythonAt: 'http_1_0_gets_no_keep_alive'.
%

! ------------------- volume, which is where partial I/O appears

category: 'Grail-Tests - Volume'
method: AsgiServerTestCase
testABigResponseSurvivesPartialWrites
	"256 KiB, well past any loopback socket buffer, so sock_sendall has to park
	on writability and resume -- several times."

	self assertMatchesCPythonAt: 'a_big_response_survives_partial_writes'.
%

category: 'Grail-Tests - Volume'
method: AsgiServerTestCase
testABigRequestBodySurvivesPartialReads
	"200 000 bytes in, which cannot arrive in one read."

	self assertMatchesCPythonAt: 'a_big_request_body_survives_partial_reads'.
%

! ------------------- failure paths

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAnAppThatRaisesGetsA500
	"Nothing has been written yet, so a 500 is still possible -- and far more
	useful to the client than a dropped connection."

	self assertMatchesCPythonAt: 'an_app_that_raises_gets_a_500'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAnAppThatSendsNothingGetsA500
	self assertMatchesCPythonAt: 'an_app_that_sends_nothing_gets_a_500'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAnAppThatRaisesMidResponseDropsTheConnection
	"Once the head is out a 500 is impossible -- the status has been sent -- so
	the connection ends, which is the only signal left that says ``incomplete''.
	A server that instead kept the connection open would leave the client
	waiting on a content-length it will never receive."

	self assertMatchesCPythonAt:
		'an_app_that_raises_mid_response_drops_the_connection'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAMalformedRequestLineGets400
	self assertMatchesCPythonAt: 'a_malformed_request_line_gets_400'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAnUnsupportedHttpVersionGets505
	self assertMatchesCPythonAt: 'an_unsupported_http_version_gets_505'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAChunkedRequestBodyIsRefused
	"411 rather than treating the body as empty.  An app that receives an empty
	body where one was sent does not fail -- it succeeds WRONGLY, which is the
	worse outcome, so the limitation is announced rather than papered over."

	self assertMatchesCPythonAt: 'a_chunked_request_body_is_refused'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAnOversizedHeadGets431
	"The head-size limit, which the first version of the server did not actually
	enforce: it was checked only while the buffer GREW, and one recv routinely
	delivers the whole head, so the terminator was already present the first
	time through and the limit was never consulted.  The answer was a perfectly
	good 200, which is why it needed a probe with a 5 KB header against a 2 KB
	limit to notice."

	self assertMatchesCPythonAt: 'an_oversized_head_gets_431'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAFoldedHeaderIsRefused
	"Obsolete line folding, removed by RFC 7230 and a known request-smuggling
	vector.  Refused rather than unfolded."

	self assertMatchesCPythonAt: 'a_folded_header_is_refused'.
%

category: 'Grail-Tests - Failures'
method: AsgiServerTestCase
testAClientThatHangsUpCostsNothing
	"Connect and close without sending -- the ORDINARY end of a keep-alive
	connection, so it must not be an error.  The request that follows proves the
	server is still serving."

	self assertMatchesCPythonAt: 'a_client_that_hangs_up_costs_nothing'.
%

! ------------------- shutdown

category: 'Grail-Tests - Shutdown'
method: AsgiServerTestCase
testStopClosesTheListener
	"After stop the port must REFUSE, not accept-and-hang.  Only the exception
	name is recorded: the errno differs between BSD and Linux, and pinning it
	would fail on the other platform in CI."

	self assertMatchesCPythonAt: 'stop_closes_the_listener'.
%

category: 'Grail-Tests - Shutdown'
method: AsgiServerTestCase
testStopCancelsAParkedKeepAliveConnection
	"A keep-alive connection is parked in sock_recv with no natural end, so stop
	has to CANCEL it.  A server that only closed its listener would leave the
	connection task alive and the loop would never finish -- which is a hang, not
	a failure, and hangs are what this whole increment kept producing before the
	handler-stack bug was found."

	self assertMatchesCPythonAt: 'stop_cancels_a_parked_keep_alive_connection'.
%
