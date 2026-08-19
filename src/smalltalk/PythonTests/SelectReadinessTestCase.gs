! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SelectReadinessTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SelectReadinessTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SelectReadinessTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelectReadinessTestCase - select() over the scheduler's readiness events
!
! select.py used to poll: it woke every 50ms, only ever blocked on the FIRST
! socket in the list, and reported every socket in wlist writable WITHOUT
! ASKING.  It is now an N-way wait built on Processor whenReadable:signal: /
! whenWritable:signal:, so these pin the three properties the polling version
! could not offer: it really blocks, a quiet socket is really not ready, and
! writability is really tested.
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SelectReadinessTestCase removeAllMethods: 0.
SelectReadinessTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: SelectReadinessTestCase
fixtureResults
	| mod |
	importlib @env1:modules removeKey: #'select_readiness' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/select_readiness.py')
		name: 'select_readiness'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - Fixture'
method: SelectReadinessTestCase
testSelectAndSelectorsSurface
	"Every check in the fixture, each named so a failure says which one."

	| results |
	results := self fixtureResults.
	#('idle_listener_not_ready' 'idle_listener_waited' 'poll_is_immediate'
	  'pending_conn_ready' 'data_makes_readable' 'data_roundtrip'
	  'quiet_socket_not_readable' 'writable_reported' 'mixed_lists'
	  'wrapper_resolves' 'raw_fd_refused' 'empty_forever_refused'
	  'empty_with_timeout_ok' 'selectors_read' 'selectors_timeout_empty'
	  'selectors_write' 'selectors_unregister' 'selectors_empty_returns_empty'
	  'selectorkey_unpacks' 'selector_aliases'
	  'wakes_on_late_connection' 'woke_before_timeout' 'waited_for_it') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Tests - Blocking'
method: SelectReadinessTestCase
testSelectBlocksRatherThanSpinning
	"The property the 50ms polling loop could not have: a select that finds
	nothing waits for the timeout inside ONE scheduler sleep."

	self assert: (self eval: 'import select, socket, time
s = socket.socket()
s.bind(("127.0.0.1", 0))
s.listen(1)
t0 = time.monotonic()
r, w, x = select.select([s], [], [], 0.4)
dt = time.monotonic() - t0
s.close()
r == [] and dt >= 0.3 and dt < 3.0') equals: true
%

category: 'Grail-Tests - Blocking'
method: SelectReadinessTestCase
testWritabilityIsTestedNotAssumed
	"wlist used to be echoed back verbatim.  A socket that is genuinely
	writable must be reported, and the answer must come from the socket."

	self assert: (self eval: 'import select, socket
srv = socket.socket()
srv.bind(("127.0.0.1", 0))
srv.listen(1)
cli = socket.socket()
cli.connect(srv.getsockname())
conn, _ = srv.accept()
r, w, x = select.select([], [conn], [], 1.0)
ok = (w == [conn])
conn.close(); cli.close(); srv.close()
ok') equals: true
%

category: 'Grail-Tests - Multiplexing'
method: SelectReadinessTestCase
testSecondSocketNoticedPromptly
	"The old loop only ever blocked on live[0], so a later socket in the list
	was found up to 50ms late.  Both are armed now, so the one that becomes
	ready wakes the wait regardless of position."

	self assert: (self eval: 'import select, socket
a = socket.socket(); a.bind(("127.0.0.1", 0)); a.listen(1)
b = socket.socket(); b.bind(("127.0.0.1", 0)); b.listen(1)
cli = socket.socket()
cli.connect(b.getsockname())          # the SECOND listener gets the traffic
r, w, x = select.select([a, b], [], [], 2.0)
ok = (r == [b])
cli.close(); a.close(); b.close()
ok') equals: true
%

category: 'Grail-Tests - TLS'
method: SelectReadinessTestCase
testTlsSocketHandsOverItsSocket
	"REGRESSION.  select resolves what to watch by protocol, and the backend
	then reaches the GsSocket underneath -- so a wrapper must hand over the
	SOCKET, not itself.  ssl.SSLSocket answering only ``_readableNow'' passed
	the wrapper down, the backend sent it the socket-only ``_sock'', and the
	resulting DNU took the whole HTTPS server down with a connection reset
	rather than any diagnosable error.  ``_selectSocket'' is that hand-off."

	self assert: (self eval: 'import ssl
hasattr(ssl.SSLSocket, "_selectSocket")') equals: true.
	self assert: (self eval: 'import select, socket, ssl

class FakeTls:
    def __init__(self, s):
        self._s = s
    def _selectSocket(self):
        return self._s

srv = socket.socket()
srv.bind(("127.0.0.1", 0))
srv.listen(1)
cli = socket.socket()
cli.connect(srv.getsockname())
w = FakeTls(srv)
r, wr, x = select.select([w], [], [], 2.0)
ok = (r == [w])
cli.close(); srv.close()
ok') equals: true
%

category: 'Grail-Tests - Errors'
method: SelectReadinessTestCase
testRawFileDescriptorIsRefused
	"Readiness events are keyed by GsSocket, so an int fd cannot be
	registered.  Refusing beats silently never reporting it ready."

	self should: [self eval: 'import select
select.select([3], [], [], 0)'] raise: TypeError
%
