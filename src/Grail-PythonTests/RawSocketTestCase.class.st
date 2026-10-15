Class {
	#name : 'RawSocketTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
RawSocketTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
RawSocketTestCase >> ___rawSocketModule___ [
	^ importlib @env1:lookupModule: '_socket'

]

{ #category : 'Grail-Private' }
RawSocketTestCase >> reprAt: aKey [
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
RawSocketTestCase >> setUp [
	probe := self ___loadProbe___: 'raw_socket'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testAcceptedFdRebuildsAWorkingSocket [
	"Design point 2.  socket.py rebuilds the accepted connection from a bare
	integer fd, so _accept's fd must find its way back to the live GsSocket
	and the rebuilt socket must carry data.  If the fd -> GsSocket map were
	dropped in favour of fromFileHandle:, this is the test that would catch
	it -- and only sometimes, which is why the map is not an optimisation."

	self assert: (self reprAt: 'accept_fd_roundtrip') equals: '[True, ''via-fd'']'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testAfUnixIsRefusedRatherThanSilentlyGivingIpv4 [
	"The older socket module ignored the family argument entirely, so
	AF_UNIX quietly produced a TCP/IPv4 socket.  Handing back the wrong kind
	of socket fails later and somewhere else; refusing fails here."

	| raised |
	raised := [PyRawSocket @env1:__new__: 1 _: 1. false]
		on: OSError do: [:e | true].
	self assert: raised.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testAncillaryDataIsRefused [
	"recvmsg/sendmsg need an interface GsSocket does not have."

	| sock raised |
	sock := PyRawSocket @env1:__new__: 2 _: 1.
	raised := [sock @env1:recvmsg: 16. false] on: OSError do: [:e | true].
	self assert: raised.
	raised := [sock @env1:sendmsg: #(). false] on: OSError do: [:e | true].
	self assert: raised.
	sock @env1:close.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testARefusedConnectRaisesConnectionRefusedError [
	"A blocking connect to a port nothing listens on is ConnectionRefusedError,
	carrying the errno connect_ex answers for the same address.  It was a bare
	``OSError: connect failed: getpeername(15) failed with Invalid argument'',
	which ``except ConnectionRefusedError'' could not catch -- and which, raised
	in a forked test client, stopped a whole test shard."

	self assert: (self reprAt: 'refused_connect_raises')
		equals: '[''ConnectionRefusedError'', True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testByteOrderConversions [
	"htons/htonl are a defined big-endian swap.  Nothing here consults the
	host's endianness -- GemStone integers are host-neutral -- so the answers
	are the same on every platform Grail runs on."

	self assert: (self reprAt: 'byte_order') equals: '[256, 16777216, True, True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testDefaultTimeoutIsInheritedByNewSockets [
	"setdefaulttimeout affects sockets made AFTERWARDS, and is session-local."

	self assert: (self reprAt: 'default_timeout') equals: '[None, 5.0, None]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testExceptionAliasesMatchCPython [
	"Since CPython 3.10 socket.error IS OSError and socket.timeout IS
	TimeoutError; gaierror and herror are OSError subclasses."

	self assert: (self reprAt: 'exception_hierarchy') equals: '[True, True, True, True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testFamilyTypeProtoAreDataAttributes [
	"``s.family'', not ``s.family()''.  socket.py reads all four directly, so
	without PyRawSocket class >> ___pythonValueAttrs___ they answer a
	BoundMethod and every comparison against AF_INET quietly fails.  fileno()
	is -1 after close, which is CPython's convention, not an error."

	self assert: (self reprAt: 'identity_attributes')
		equals: '[True, True, True, True, -1]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testIpv4AddressConversions [
	self assert: (self reprAt: 'inet_v4_conversions')
		equals: '[[127, 0, 0, 1], ''127.0.0.1'', [10, 1, 2, 3], ''10.1.2.3'']'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testIpv6LiteralConversionIsRefusedRatherThanGuessed [
	"inet_pton(AF_INET6, ...) needs a parser GsSocket does not expose.
	Guessing would corrupt addresses silently, which is worse than refusing."

	| mod raised |
	mod := self ___rawSocketModule___.
	raised := [mod @env1:inet_pton: 10 _: '::1'. false] on: OSError do: [:e | true].
	self assert: raised.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testLocalhostResolves [
	self assert: (self reprAt: 'localhost_resolves') equals: '''127.0.0.1'''.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testOperationOnAClosedSocketRaisesOSError [
	"And it must be a CATCHABLE Python OSError.  The internal guards live in
	env-0 helpers, where a bare ``OSError ___signal___:'' is a
	MessageNotUnderstood -- an uncatchable Smalltalk error raised exactly
	where Python code is waiting with ``except OSError''."

	self assert: (self reprAt: 'closed_socket_raises') equals: '''OSError'''.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testOsGetExportsListRepublishesTheModulesNames [
	"os._get_exports_list is obscure but load-bearing: CPython's socket.py
	calls it at import time (``__all__.extend(os._get_exports_list(_socket))'')
	to republish the primitive layer's names, so socket.py cannot even be
	IMPORTED without it.  Grail's os module was missing it entirely.

	_socket has no __all__, so this takes the ``every public name'' branch --
	which is also why the CPython source catches AttributeError explicitly:
	Python's AttributeError is not a Smalltalk Error, so an ``on: Error''
	guard does not catch it and the miss escapes as the very AttributeError
	the fallback exists to absorb."

	self assert: (self reprAt: 'exports_list') equals: '[True, True, True, True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testRecvIntoFillsACallerBuffer [
	"recv_into is what makefile()'s buffered reader uses, so it carries the
	throughput of every socket-backed file object."

	self assert: (self reprAt: 'recv_into_buffer') equals: '[6, ''abcdef'']'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testSetsockoptReachesTheOperatingSystem [
	"The older module documented setsockopt as ``accepted and ignored''.  Here
	SO_REUSEADDR maps onto GsSocket's 'REUSEADDR' and reads back set --
	getsockopt is the evidence that the write was not swallowed."

	self assert: (self reprAt: 'sockopt_roundtrip') equals: 'True'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testShutdownWriteShowsAsEofOnThePeer [
	"SHUT_WR must be distinguishable from SHUT_RDWR.  The older socket module
	collapsed all three directions onto GsSocket's combined
	shutdownReadingAndWriting; GsSocket has all three, so _socket maps them
	separately and a half-close reads as EOF rather than an error."

	self assert: (self reprAt: 'shutdown_gives_eof') equals: '['''', -1]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testTcpRoundTripOverLoopback [
	"bind/listen/connect/_accept/sendall/recv, both directions, plus the peer
	address.  This is the whole point: not that the methods exist, but that
	bytes cross a real socket."

	self assert: (self reprAt: 'tcp_roundtrip')
		equals: '[''hello grail'', ''pong'', ''127.0.0.1'', True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testTimeoutHasThreeStatesNotTwo [
	"CPython's model is None = blocking, 0 = non-blocking, n = blocking with a
	timeout -- and getblocking() is False ONLY in the middle state.  A socket
	with a 2.5s timeout is still blocking.  Reading that as a boolean pair
	loses the distinction and makes settimeout(n) behave as setblocking(False).

	``0.0'', not ``0'': CPython stores every timeout as a float, so the
	non-blocking state reads back as 0.0.  This expectation said 0 -- pinning
	what Grail happened to do rather than what CPython does."

	self assert: (self reprAt: 'timeout_states')
		equals: '[None, True, 2.5, True, 0.0, False, None, True]'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testUdpDatagramRoundTrip [
	"UDP was entirely out of scope for the older module.  GsSocket has had
	newUdp/recvfrom:/sendUdp:flags:toHost:port: all along.

	The payload is checked, not just the arrival: sendUdp: takes a String,
	and reaching it via ``asString'' on a ByteArray sends the literal text
	``aByteArray'' -- GemStone answers a DESCRIPTION there, not the bytes.
	That bug passes an ''it arrived'' assertion."

	self assert: (self reprAt: 'udp_roundtrip') equals: '[''datagram!'', ''127.0.0.1'']'.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testUnresolvableHostRaisesGaierror [
	"gaierror is a distinct OSError subclass, so ``except socket.gaierror''
	means ''the name would not resolve'' rather than ''some socket call
	failed''.  Aliasing it onto OSError would make that distinction vanish."

	self assert: (self reprAt: 'bad_host_raises_gaierror') equals: '''gaierror'''.

]

{ #category : 'Grail-Tests' }
RawSocketTestCase >> testUnsupportedSocketOptionIsAcceptedNotRaised [
	"An option with no GsSocket counterpart is accepted and ignored, which is
	deliberate: the stdlib sets tuning options opportunistically, and raising
	on them would break callers CPython does not break.  getsockopt of one,
	by contrast, DOES raise -- reading back a value we never stored would be
	the lie.  The option is TCP_KEEPIDLE (IPPROTO_TCP, 4).  It was SO_LINGER,
	until that one reached the descriptor: CPython, and now Grail, answer
	EINVAL for SO_LINGER given an int rather than a packed struct linger."

	| sock raised |
	sock := PyRawSocket @env1:__new__: 2 _: 1.
	sock @env1:setsockopt: 6 _: 4 _: 1.
	raised := [sock @env1:getsockopt: 6 _: 4. false] on: OSError do: [:e | true].
	self assert: raised.
	sock @env1:close.

]
