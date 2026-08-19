! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RawSocketTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RawSocketTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RawSocketTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RawSocketTestCase
!
! THE ``_socket'' PRIMITIVE LAYER, over GemStone's GsSocket.
!
! CPython splits sockets in two: ``_socket'' (a C extension wrapping the raw
! syscalls) and ``socket.py'' (992 lines of pure Python on top).  socket.py's
! whole coupling to C is two lines --
!
!     import _socket
!     from _socket import *
!
! -- so implementing ``_socket'' against GsSocket is what lets Grail eventually
! run CPython's own socket.py rather than maintaining a substitute for it.
!
! Grail's existing ``socket'' module (socket_module.gs) is the collapsed form:
! one Smalltalk module covering the TCP/IPv4 subset the werkzeug dev server
! needs, with UDP, IPv6 and the option surface out of scope.  ``_socket'' is the
! layer beneath it, and deliberately ships ALONGSIDE it -- nothing imports
! _socket yet -- so it can be proven before ``socket'' is switched over.
!
! WHAT GsSocket TURNED OUT TO SUPPORT is most of it, and more than the older
! module used: UDP (newUdp/recvfrom:/sendUdp:...), IPv6 (newIpv6/newUdpIpv6),
! REAL socket options (option:/option:put:, so SO_REUSEADDR now reaches the OS
! instead of being accepted and ignored), name and service lookup, scatter reads
! (read:into:startingAt:), all three shutdown directions separately, and
! connect/accept timeouts.
!
! TWO DESIGN POINTS worth knowing before editing _socket_module.gs:
!
! 1. GsSocket options are NAMED STRINGS ('REUSEADDR', 'NODELAY', ...), not the
!    (level, optname) integer pairs CPython uses.  So _socket's integer
!    constants never reach the operating system -- they only have to agree with
!    each other -- and PyRawSocket class >> ___gsOptionFor:opt: is the whole
!    mapping.  That is why Linux constant values on a macOS stone are harmless.
!
! 2. CPython's socket.accept() is
!        fd, addr = self._accept()
!        sock = socket(self.family, self.type, self.proto, fileno=fd)
!    so an accepted connection round-trips through a bare integer fd.  GsSocket
!    class >> fromFileHandle: is documented for descriptors inherited from a
!    fork or created by non-GemStone C code -- NOT for re-adopting one GemStone
!    itself made -- so leaning on it there would be building on undefined
!    behaviour.  _socket keeps a session-local fd -> GsSocket map instead, and
!    testAcceptedFdRebuildsAWorkingSocket is what proves that path.
!
! WHAT IS HONESTLY ABSENT, and refused rather than faked: AF_UNIX and
! socketpair() (GsSocket has no Unix-domain sockets), recvmsg/sendmsg and the
! CMSG_*/SCM_RIGHTS ancillary-data surface, if_nameindex(), dup(), and
! inet_pton/inet_ntop for AF_INET6.  Each raises a clear OSError naming the
! reason.  The refusals are pinned HERE rather than in the fixture because the
! fixture also runs under real CPython, where several of them succeed.
!
! Fixture: tests/python/raw_socket.py (self-verifying under CPython 3.14.6 --
! all 15 checks pass there unchanged, which is what makes them evidence).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: RawSocketTestCase
setUp
	probe := self ___loadProbe___: 'raw_socket'.
%

category: 'Grail-Private'
method: RawSocketTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: RawSocketTestCase
reprAt: aKey
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: RawSocketTestCase
___rawSocketModule___
	^ importlib @env1:lookupModule: '_socket'
%

! ---- the transport actually works -------------------------------------------

category: 'Grail-Tests'
method: RawSocketTestCase
testTcpRoundTripOverLoopback
	"bind/listen/connect/_accept/sendall/recv, both directions, plus the peer
	address.  This is the whole point: not that the methods exist, but that
	bytes cross a real socket."

	self assert: (self reprAt: 'tcp_roundtrip')
		equals: '[''hello grail'', ''pong'', ''127.0.0.1'', True]'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testAcceptedFdRebuildsAWorkingSocket
	"Design point 2.  socket.py rebuilds the accepted connection from a bare
	integer fd, so _accept's fd must find its way back to the live GsSocket
	and the rebuilt socket must carry data.  If the fd -> GsSocket map were
	dropped in favour of fromFileHandle:, this is the test that would catch
	it -- and only sometimes, which is why the map is not an optimisation."

	self assert: (self reprAt: 'accept_fd_roundtrip') equals: '[True, ''via-fd'']'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testRecvIntoFillsACallerBuffer
	"recv_into is what makefile()'s buffered reader uses, so it carries the
	throughput of every socket-backed file object."

	self assert: (self reprAt: 'recv_into_buffer') equals: '[6, ''abcdef'']'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testShutdownWriteShowsAsEofOnThePeer
	"SHUT_WR must be distinguishable from SHUT_RDWR.  The older socket module
	collapsed all three directions onto GsSocket's combined
	shutdownReadingAndWriting; GsSocket has all three, so _socket maps them
	separately and a half-close reads as EOF rather than an error."

	self assert: (self reprAt: 'shutdown_gives_eof') equals: '['''', -1]'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testUdpDatagramRoundTrip
	"UDP was entirely out of scope for the older module.  GsSocket has had
	newUdp/recvfrom:/sendUdp:flags:toHost:port: all along.

	The payload is checked, not just the arrival: sendUdp: takes a String,
	and reaching it via ``asString'' on a ByteArray sends the literal text
	``aByteArray'' -- GemStone answers a DESCRIPTION there, not the bytes.
	That bug passes an ''it arrived'' assertion."

	self assert: (self reprAt: 'udp_roundtrip') equals: '[''datagram!'', ''127.0.0.1'']'.
%

! ---- pure computation --------------------------------------------------------

category: 'Grail-Tests'
method: RawSocketTestCase
testByteOrderConversions
	"htons/htonl are a defined big-endian swap.  Nothing here consults the
	host's endianness -- GemStone integers are host-neutral -- so the answers
	are the same on every platform Grail runs on."

	self assert: (self reprAt: 'byte_order') equals: '[256, 16777216, True, True]'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testIpv4AddressConversions
	self assert: (self reprAt: 'inet_v4_conversions')
		equals: '[[127, 0, 0, 1], ''127.0.0.1'', [10, 1, 2, 3], ''10.1.2.3'']'.
%

! ---- CPython's timeout model -------------------------------------------------

category: 'Grail-Tests'
method: RawSocketTestCase
testTimeoutHasThreeStatesNotTwo
	"CPython's model is None = blocking, 0 = non-blocking, n = blocking with a
	timeout -- and getblocking() is False ONLY in the middle state.  A socket
	with a 2.5s timeout is still blocking.  Reading that as a boolean pair
	loses the distinction and makes settimeout(n) behave as setblocking(False)."

	self assert: (self reprAt: 'timeout_states')
		equals: '[None, True, 2.5, True, 0, False, None, True]'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testDefaultTimeoutIsInheritedByNewSockets
	"setdefaulttimeout affects sockets made AFTERWARDS, and is session-local."

	self assert: (self reprAt: 'default_timeout') equals: '[None, 5.0, None]'.
%

! ---- options and identity ----------------------------------------------------

category: 'Grail-Tests'
method: RawSocketTestCase
testSetsockoptReachesTheOperatingSystem
	"The older module documented setsockopt as ``accepted and ignored''.  Here
	SO_REUSEADDR maps onto GsSocket's 'REUSEADDR' and reads back set --
	getsockopt is the evidence that the write was not swallowed."

	self assert: (self reprAt: 'sockopt_roundtrip') equals: 'True'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testFamilyTypeProtoAreDataAttributes
	"``s.family'', not ``s.family()''.  socket.py reads all four directly, so
	without PyRawSocket class >> ___pythonValueAttrs___ they answer a
	BoundMethod and every comparison against AF_INET quietly fails.  fileno()
	is -1 after close, which is CPython's convention, not an error."

	self assert: (self reprAt: 'identity_attributes')
		equals: '[True, True, True, True, -1]'.
%

! ---- errors are Python errors ------------------------------------------------

category: 'Grail-Tests'
method: RawSocketTestCase
testOperationOnAClosedSocketRaisesOSError
	"And it must be a CATCHABLE Python OSError.  The internal guards live in
	env-0 helpers, where a bare ``OSError ___signal___:'' is a
	MessageNotUnderstood -- an uncatchable Smalltalk error raised exactly
	where Python code is waiting with ``except OSError''."

	self assert: (self reprAt: 'closed_socket_raises') equals: '''OSError'''.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testUnresolvableHostRaisesGaierror
	"gaierror is a distinct OSError subclass, so ``except socket.gaierror''
	means ''the name would not resolve'' rather than ''some socket call
	failed''.  Aliasing it onto OSError would make that distinction vanish."

	self assert: (self reprAt: 'bad_host_raises_gaierror') equals: '''gaierror'''.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testExceptionAliasesMatchCPython
	"Since CPython 3.10 socket.error IS OSError and socket.timeout IS
	TimeoutError; gaierror and herror are OSError subclasses."

	self assert: (self reprAt: 'exception_hierarchy') equals: '[True, True, True, True]'.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testLocalhostResolves
	self assert: (self reprAt: 'localhost_resolves') equals: '''127.0.0.1'''.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testOsGetExportsListRepublishesTheModulesNames
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
%

! ---- what is absent is REFUSED, not faked ------------------------------------
! These live here rather than in the fixture because the fixture also runs under
! real CPython, where AF_UNIX and socketpair() succeed.

category: 'Grail-Tests'
method: RawSocketTestCase
testAfUnixIsRefusedRatherThanSilentlyGivingIpv4
	"The older socket module ignored the family argument entirely, so
	AF_UNIX quietly produced a TCP/IPv4 socket.  Handing back the wrong kind
	of socket fails later and somewhere else; refusing fails here."

	| raised |
	raised := [PyRawSocket @env1:__new__: 1 _: 1. false]
		on: OSError do: [:e | true].
	self assert: raised.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testAncillaryDataIsRefused
	"recvmsg/sendmsg need an interface GsSocket does not have."

	| sock raised |
	sock := PyRawSocket @env1:__new__: 2 _: 1.
	raised := [sock @env1:recvmsg: 16. false] on: OSError do: [:e | true].
	self assert: raised.
	raised := [sock @env1:sendmsg: #(). false] on: OSError do: [:e | true].
	self assert: raised.
	sock @env1:close.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testIpv6LiteralConversionIsRefusedRatherThanGuessed
	"inet_pton(AF_INET6, ...) needs a parser GsSocket does not expose.
	Guessing would corrupt addresses silently, which is worse than refusing."

	| mod raised |
	mod := self ___rawSocketModule___.
	raised := [mod @env1:inet_pton: 10 _: '::1'. false] on: OSError do: [:e | true].
	self assert: raised.
%

category: 'Grail-Tests'
method: RawSocketTestCase
testUnsupportedSocketOptionIsAcceptedNotRaised
	"An option with no GsSocket counterpart is accepted and ignored, which is
	deliberate: the stdlib sets tuning options opportunistically, and raising
	on them would break callers CPython does not break.  getsockopt of one,
	by contrast, DOES raise -- reading back a value we never stored would be
	the lie."

	| sock raised |
	sock := PyRawSocket @env1:__new__: 2 _: 1.
	sock @env1:setsockopt: 1 _: 13 _: 1.
	raised := [sock @env1:getsockopt: 1 _: 13. false] on: OSError do: [:e | true].
	self assert: raised.
	sock @env1:close.
%

set compile_env: 0
