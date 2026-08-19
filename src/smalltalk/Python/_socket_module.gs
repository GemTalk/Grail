! ===============================================================================
! _socket -- the primitive socket layer, in Smalltalk over GemStone's GsSocket.
!
! CPython splits sockets in two: ``_socket'' (a C extension wrapping the raw
! syscalls) and ``socket.py'' (992 lines of pure Python building the friendly
! API on top).  ``socket.py'' couples to C through exactly two lines:
!
!     import _socket
!     from _socket import *
!
! so re-implementing ``_socket'' against GsSocket lets Grail run CPython's REAL
! socket.py unmodified, instead of maintaining a hand-written substitute of it.
! That is what this file is for.
!
! Relationship to socket_module.gs: that file implements the PUBLIC ``socket''
! module directly (PySocket), covering the TCP/IPv4 subset the werkzeug dev
! server needs.  This file is the layer BENEATH it.  Both ship side by side --
! nothing imports ``_socket'' yet -- so this can be exercised on its own before
! ``socket'' is switched over to the vendored facade.
!
! What GsSocket gives us, and what it does not:
!
!   available   TCP + UDP (newUdp), IPv4 + IPv6 (newIpv6/newUdpIpv6), real
!               socket options (option:/option:put:), name and service lookup,
!               scatter reads (read:into:startingAt:), directional shutdown,
!               blocking/non-blocking, connect/accept timeouts.
!   absent      AF_UNIX and socketpair(), ancillary data (recvmsg/sendmsg,
!               CMSG_*/SCM_RIGHTS), if_nameindex().  These raise a clear
!               OSError/NotImplementedError rather than pretending.
!
! Two design notes worth knowing before editing:
!
! 1. GsSocket options are NAMED STRINGS ('REUSEADDR', 'NODELAY', ...), not the
!    (level, optname) integer pairs CPython uses.  So the integer constants
!    below never reach the OS -- they only have to be self-consistent within
!    Grail, and ___gsOptionFor:opt: maps a pair onto a GsSocket name.  That is
!    why using Linux constant values on a macOS stone is harmless here.
!
! 2. CPython's socket.accept() is
!        fd, addr = self._accept()
!        sock = socket(self.family, self.type, self.proto, fileno=fd)
!    i.e. the accepted socket makes a round trip through a bare integer fd.
!    GsSocket class >> fromFileHandle: is documented for fds inherited from a
!    fork or made by non-GemStone C code, NOT for re-adopting one GemStone
!    itself created, so relying on it here would be building on undefined
!    behaviour.  Instead ___fdRegistry___ keeps a session-local fd -> GsSocket
!    map: __init__(fileno=fd) reclaims the live GsSocket when it is one of ours
!    and only falls back to fromFileHandle: for a genuinely foreign fd.
! ===============================================================================

set compile_env: 0

! ------------------- Superclass checks
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- gaierror / herror: the two OSError subclasses _socket contributes ----
expectvalue /Class
doit
OSError subclass: 'gaierror'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
gaierror comment:
'Python ``socket.gaierror'' -- an OSError subclass raised for address/name
resolution failures (the errors getaddrinfo/getnameinfo report through EAI_*
codes).  Distinct from the generic OSError so that ``except socket.gaierror''
means "the name would not resolve" rather than "some socket call failed".'
%

expectvalue /Class
doit
gaierror category: 'Grail-Modules'
%

expectvalue /Class
doit
OSError subclass: 'herror'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
herror comment:
'Python ``socket.herror'' -- an OSError subclass raised by the legacy
gethostby* lookups.  Kept separate from gaierror because CPython raises
herror from gethostbyaddr/gethostbyname_ex and gaierror from getaddrinfo,
and code in the wild does discriminate.'
%

expectvalue /Class
doit
herror category: 'Grail-Modules'
%

! ------- PyRawSocket: the _socket.socket type --------------------------------
expectvalue /Class
doit
Object subclass: 'PyRawSocket'
  instVarNames: #('gsSocket' 'sockFamily' 'sockType' 'sockProto'
                  'timeoutSecs' 'sockClosed')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyRawSocket comment:
'Python ``_socket.socket'' -- the primitive socket type, wrapping one
GemStone ``GsSocket'' in the ``gsSocket'' instVar.

CPython''s socket.py subclasses this (``class socket(_socket.socket)'') and
calls ``_socket.socket.__init__(self, family, type, proto, fileno)''
explicitly, so the constructor here is a real ``__init__'' rather than a
class-side factory: the instance may already have been allocated by a
Python subclass before we ever see it.

``timeoutSecs'' follows CPython''s three-state convention exactly:
  nil      blocking (no timeout)
  0        non-blocking
  n > 0    blocking with an n-second timeout
which is what gettimeout()/getblocking() report and what settimeout()/
setblocking() write.  GsSocket has no single "timeout" notion, so the value
is applied per call site (connectTo:on:timeoutMs:, acceptTimeoutMs:,
read:into:startingAt:maxWait:).'
%

expectvalue /Class
doit
PyRawSocket category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyRawSocket removeAllMethods: 0.
PyRawSocket removeAllMethods: 1.
PyRawSocket class removeAllMethods: 0.
PyRawSocket class removeAllMethods: 1.
%

! ---- env-0 internals --------------------------------------------------------
set compile_env: 0

category: 'Grail-Private'
classmethod: PyRawSocket
___fdRegistry___
	"Session-local fd -> GsSocket map.  See design note 2 in the file header:
	it lets __init__(fileno=fd) reclaim a GsSocket this session created,
	rather than asking fromFileHandle: to re-adopt an fd it does not own."

	^ SessionTemps current
		at: #GrailRawSocketFds
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Private'
classmethod: PyRawSocket
___registerFd___: aGsSocket
	"Remember aGsSocket under its own fd and answer that fd."

	| fd |
	aGsSocket isNil ifTrue: [^ nil].
	fd := aGsSocket id.
	fd isNil ifTrue: [^ nil].
	self ___fdRegistry___ at: fd put: aGsSocket.
	^ fd
%

category: 'Grail-Private'
classmethod: PyRawSocket
___gsSocketForFd___: fd
	"The live GsSocket for fd if this session made it, else nil."

	^ self ___fdRegistry___ at: fd ifAbsent: [nil]
%

category: 'Grail-Private'
classmethod: PyRawSocket
___forgetFd___: fd
	fd isNil ifTrue: [^ self].
	self ___fdRegistry___ removeKey: fd ifAbsent: [nil].
	^ self
%

category: 'Grail-Private'
classmethod: PyRawSocket
wrapping: aGsSocket family: fam type: typ proto: prot
	"Adopt an existing GsSocket (the one accept returns)."

	| inst |
	inst := self new.
	inst ___setSock: aGsSocket family: fam type: typ proto: prot.
	^ inst
%

category: 'Grail-Private'
method: PyRawSocket
___setSock: aGsSocket family: fam type: typ proto: prot
	gsSocket := aGsSocket.
	sockFamily := fam.
	sockType := typ.
	sockProto := prot.
	sockClosed := false.
	timeoutSecs := PyRawSocket ___defaultTimeout___.
	aGsSocket ifNotNil: [PyRawSocket ___registerFd___: aGsSocket].
	^ self
%

category: 'Grail-Private'
method: PyRawSocket
___gsSocket
	^ gsSocket
%

category: 'Grail-Private'
classmethod: PyRawSocket
___defaultTimeout___
	"socket.getdefaulttimeout() -- session-local, nil means blocking."

	^ SessionTemps current at: #GrailSocketDefaultTimeout ifAbsent: [nil]
%

category: 'Grail-Private'
classmethod: PyRawSocket
___defaultTimeout___: secondsOrNil
	SessionTemps current at: #GrailSocketDefaultTimeout put: secondsOrNil.
	^ secondsOrNil
%

category: 'Grail-Private'
method: PyRawSocket
___ensureOpen
	"Answer the GsSocket, or raise CPython's error for a closed socket."

	"``___signal___:'' is an env-1 selector, so an env-0 helper must send it
	with the @env1: prefix -- a bare send is a MessageNotUnderstood, and an
	uncatchable Smalltalk one at that, exactly where Python code is waiting
	to catch OSError."
	(sockClosed == true or: [gsSocket isNil]) ifTrue: [
		^ OSError @env1:___signal___: '[Errno 9] Bad file descriptor'].
	^ gsSocket
%

category: 'Grail-Private'
method: PyRawSocket
___fail: what
	"Raise an OSError carrying whatever GsSocket last recorded.  GsSocket
	reports failure by answering nil and stashing the detail, so without
	this the Python side would see a bare ''operation failed''."

	| detail |
	detail := [gsSocket isNil ifTrue: [nil] ifFalse: [gsSocket lastErrorString]]
		on: Error do: [:e | e return: nil].
	^ OSError @env1:___signal___:
		(detail isNil
			ifTrue: [what]
			ifFalse: [what , ': ' , detail asString])
%

category: 'Grail-Private'
method: PyRawSocket
___toByteArray: data
	"Python bytes (a ByteArray) or str -> a ByteArray GsSocket can write."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [^ data asByteArray].
	^ data asByteArray
%

category: 'Grail-Private'
method: PyRawSocket
___toRawString: aByteArray
	"ByteArray -> a String holding THE SAME BYTES, for GsSocket calls that
	take a String (sendUdp:flags:toHost:port:).  Not ``asString'': GemStone
	answers the receiver's DESCRIPTION for that, so a datagram sent through
	it arrives as the literal text ''aByteArray''."

	| s |
	s := String new: aByteArray size.
	1 to: aByteArray size do: [:i |
		s at: i put: (Character withValue: (aByteArray at: i))].
	^ s
%

category: 'Grail-Private'
method: PyRawSocket
___timeoutMs
	"timeoutSecs (seconds, CPython's three states) -> milliseconds for the
	GsSocket call sites that take one.  nil stays nil: blocking forever."

	timeoutSecs isNil ifTrue: [^ nil].
	^ (timeoutSecs * 1000) rounded max: 0
%

category: 'Grail-Private'
classmethod: PyRawSocket
___gsOptionFor: level opt: optname
	"Map a CPython (level, optname) pair onto the GsSocket option NAME and
	its value kind.  Answers { nameString . #bool|#int } or nil when the
	option has no GsSocket counterpart.  See design note 1: the integers
	are Grail's own, so this table is the whole story."

	| sol tcp |
	sol := 1.        "SOL_SOCKET"
	tcp := 6.        "IPPROTO_TCP"
	level = sol ifTrue: [
		optname = 1  ifTrue: [^ { 'DEBUG' . #bool }].
		optname = 2  ifTrue: [^ { 'REUSEADDR' . #bool }].
		optname = 3  ifTrue: [^ { 'TYPE' . #int }].
		optname = 4  ifTrue: [^ { 'ERROR' . #int }].
		optname = 5  ifTrue: [^ { 'DONTROUTE' . #bool }].
		optname = 6  ifTrue: [^ { 'BROADCAST' . #bool }].
		optname = 7  ifTrue: [^ { 'SNDBUF' . #int }].
		optname = 8  ifTrue: [^ { 'RCVBUF' . #int }].
		optname = 9  ifTrue: [^ { 'KEEPALIVE' . #bool }].
		optname = 10 ifTrue: [^ { 'OOBINLINE' . #bool }].
		optname = 15 ifTrue: [^ { 'REUSEPORT' . #bool }].
		^ nil].
	level = tcp ifTrue: [
		optname = 1 ifTrue: [^ { 'NODELAY' . #bool }].
		^ nil].
	^ nil
%

! ---- Python-visible attribute hook ------------------------------------------
category: 'Grail-Python Attribute Hook'
classmethod: PyRawSocket
___pythonValueAttrs___
	"``family''/``type''/``proto''/``timeout'' are DATA attributes in CPython
	(``s.family'', not ``s.family()''), so they must answer their value
	rather than a BoundMethod wrapping the accessor.  socket.py reads all
	four directly -- ``self._sock.family'' and friends -- so without this
	hook the vendored facade gets a callable where it expects an int."

	^ IdentitySet new
		add: #'family';
		add: #'type';
		add: #'proto';
		add: #'timeout';
		yourself
%

! ---- construction -----------------------------------------------------------
set compile_env: 1

! A Smalltalk-defined class becomes CALLABLE from Python through class-side
! ``__new__'' (object class >> value:value: dispatches on arity to __new__,
! __new__:, __new__:_:, ... and to _new:kw: when keywords are present).  The
! older socket module never needed these -- nothing ever wrote ``PySocket()''
! in Python, only ``socket.socket()'', which is a module METHOD.  _socket.socket
! is a real type that CPython's socket.py both calls AND subclasses, so it needs
! the full constructor protocol.  Every arity funnels through _new:kw: so there
! is exactly one place where allocation meets __init__.

category: 'Grail-Constructors'
classmethod: PyRawSocket
_new: positional kw: kwargs
	| inst |
	inst := self @env0:new.
	inst ___init__: (positional @env0:ifNil: [#()]) kw: kwargs.
	^ inst
%

category: 'Grail-Constructors'
classmethod: PyRawSocket
__new__
	^ self _new: #() kw: nil
%

category: 'Grail-Constructors'
classmethod: PyRawSocket
__new__: family
	^ self _new: { family } kw: nil
%

category: 'Grail-Constructors'
classmethod: PyRawSocket
__new__: family _: type
	^ self _new: { family . type } kw: nil
%

category: 'Grail-Constructors'
classmethod: PyRawSocket
__new__: family _: type _: proto
	^ self _new: { family . type . proto } kw: nil
%

category: 'Grail-Constructors'
classmethod: PyRawSocket
__new__: family _: type _: proto _: fileno
	^ self _new: { family . type . proto . fileno } kw: nil
%

category: 'Grail-Constructors'
method: PyRawSocket
__init__
	^ self __init__: 2 _: 1 _: 0
%

category: 'Grail-Constructors'
method: PyRawSocket
__init__: family
	^ self __init__: family _: 1 _: 0
%

category: 'Grail-Constructors'
method: PyRawSocket
__init__: family _: type
	^ self __init__: family _: type _: 0
%

category: 'Grail-Constructors'
method: PyRawSocket
__init__: family _: type _: proto
	"``_socket.socket(family, type, proto)'' -- make the underlying GsSocket.
	Family and type actually steer the choice here (TCP/UDP x IPv4/IPv6),
	unlike the older socket module, which was TCP/IPv4 only and ignored both."

	| fam typ sock |
	fam := family @env0:isNil ifTrue: [2] ifFalse: [family].
	typ := type @env0:isNil ifTrue: [1] ifFalse: [type].
	(fam @env0:= 2 @env0:or: [fam @env0:= 10]) ifFalse: [
		fam @env0:= 1 ifTrue: [
			^ OSError ___signal___:
				'AF_UNIX is not supported: GemStone GsSocket has no Unix-domain sockets'].
		^ OSError ___signal___:
			('[Errno 97] Address family not supported by protocol: ' @env0:, fam @env0:printString)].
	(typ @env0:= 1 @env0:or: [typ @env0:= 2]) ifFalse: [
		^ OSError ___signal___:
			('[Errno 93] Protocol not supported: type ' @env0:, typ @env0:printString)].
	sock := typ @env0:= 2
		ifTrue: [fam @env0:= 10
			ifTrue: [GsSocket @env0:newUdpIpv6]
			ifFalse: [GsSocket @env0:newUdp]]
		ifFalse: [fam @env0:= 10
			ifTrue: [GsSocket @env0:newIpv6]
			ifFalse: [GsSocket @env0:new]].
	sock @env0:isNil ifTrue: [^ OSError ___signal___: 'socket() failed'].
	self @env0:___setSock: sock family: fam type: typ proto:
		(proto @env0:isNil ifTrue: [0] ifFalse: [proto]).
	^ None
%

category: 'Grail-Constructors'
method: PyRawSocket
___init__: positional kw: kwargs
	"``_socket.socket(*args, **kwargs)'' -- the varargs form, which is how
	CPython's socket.py actually calls up:
	    _socket.socket.__init__(self, family, type, proto, fileno)
	``fileno'' is the interesting one: it adopts an EXISTING descriptor
	instead of creating a socket, and it is the mechanism accept() uses."

	| args n family type proto fileno adopted |
	args := positional @env0:ifNil: [#()].
	n := args @env0:size.
	family := n @env0:>= 1 ifTrue: [args @env0:at: 1] ifFalse: [nil].
	type := n @env0:>= 2 ifTrue: [args @env0:at: 2] ifFalse: [nil].
	proto := n @env0:>= 3 ifTrue: [args @env0:at: 3] ifFalse: [nil].
	fileno := n @env0:>= 4 ifTrue: [args @env0:at: 4] ifFalse: [nil].
	kwargs @env0:ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'family' ifTrue: [family := v]
			ifFalse: [key @env0:= 'type' ifTrue: [type := v]
			ifFalse: [key @env0:= 'proto' ifTrue: [proto := v]
			ifFalse: [key @env0:= 'fileno' ifTrue: [fileno := v]
			ifFalse: [^ TypeError ___signal___:
				('socket() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]]]]].

	"CPython treats family/type/proto as -1 = 'take it from the fd'."
	(family @env0:notNil @env0:and: [family @env0:= -1]) ifTrue: [family := nil].
	(type @env0:notNil @env0:and: [type @env0:= -1]) ifTrue: [type := nil].
	(proto @env0:notNil @env0:and: [proto @env0:= -1]) ifTrue: [proto := nil].

	(fileno @env0:isNil @env0:or: [fileno @env0:== None]) ifTrue: [
		^ self __init__: (family @env0:ifNil: [2])
			_: (type @env0:ifNil: [1])
			_: (proto @env0:ifNil: [0])].

	adopted := PyRawSocket @env0:___gsSocketForFd___: fileno.
	adopted @env0:isNil ifTrue: [
		"Not one of ours -- a genuinely foreign descriptor."
		adopted := [GsSocket @env0:fromFileHandle: fileno]
			@env0:on: Error do: [:e | e @env0:return: nil].
		adopted @env0:isNil ifTrue: [
			^ OSError ___signal___:
				('[Errno 9] Bad file descriptor: ' @env0:, fileno @env0:printString)]].
	self @env0:___setSock: adopted
		family: (family @env0:ifNil: [2])
		type: (type @env0:ifNil: [1])
		proto: (proto @env0:ifNil: [0]).
	^ None
%

! ---- identity attributes ----------------------------------------------------
category: 'Grail-Queries'
method: PyRawSocket
family
	^ sockFamily @env0:ifNil: [2]
%

category: 'Grail-Queries'
method: PyRawSocket
type
	^ sockType @env0:ifNil: [1]
%

category: 'Grail-Queries'
method: PyRawSocket
proto
	^ sockProto @env0:ifNil: [0]
%

category: 'Grail-Queries'
method: PyRawSocket
timeout
	"The ``timeout'' DATA attribute (CPython 3.7+).  None means blocking."

	^ timeoutSecs @env0:ifNil: [None]
%

category: 'Grail-Queries'
method: PyRawSocket
fileno
	"The file descriptor, or -1 once closed -- CPython's convention."

	(sockClosed == true @env0:or: [gsSocket @env0:isNil]) ifTrue: [^ -1].
	^ gsSocket @env0:id @env0:ifNil: [-1]
%

! ---- lifecycle --------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
close
	"Release the descriptor.  Idempotent, like CPython's."

	| fd |
	gsSocket @env0:notNil ifTrue: [
		fd := gsSocket @env0:id.
		[gsSocket @env0:close] @env0:on: Error do: [:e | e @env0:return: nil].
		PyRawSocket @env0:___forgetFd___: fd.
		gsSocket := nil].
	sockClosed := true.
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
detach
	"Give up ownership of the descriptor WITHOUT closing it, answering the
	fd (CPython's socket.detach()).  The GsSocket stays in the registry so
	whoever adopts the fd through socket(fileno=...) still finds it."

	| fd |
	fd := self fileno.
	gsSocket @env0:notNil ifTrue: [
		[gsSocket @env0:setCloseOnGc: false]
			@env0:on: Error do: [:e | e @env0:return: nil]].
	gsSocket := nil.
	sockClosed := true.
	^ fd
%

! ---- addressing -------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
bind: address
	"``s.bind((host, port))''.  An empty host means INADDR_ANY."

	| sock host port ok |
	sock := self @env0:___ensureOpen.
	host := address @env0:at: 1.
	port := address @env0:at: 2.
	ok := ((host @env0:isNil @env0:or: [host @env0:== None])
			@env0:or: [host @env0:asString @env0:isEmpty])
		ifTrue: [sock @env0:bindTo: port]
		ifFalse: [sock @env0:bindTo: port toAddress:
			(GsSocket @env0:getHostAddressByName: host @env0:asString)].
	ok @env0:isNil ifTrue: [^ self @env0:___fail: 'bind failed'].
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
listen
	^ self listen: 128
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
listen: backlog
	| sock |
	sock := self @env0:___ensureOpen.
	(sock @env0:makeListener: backlog) @env0:isNil ifTrue: [
		^ self @env0:___fail: 'listen failed'].
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
_accept
	"CPython's ``_socket.socket._accept()'' -- answers ``(fd, addr)'', NOT a
	socket object.  socket.py then rebuilds a socket from the fd, which is
	why the accepted GsSocket has to be findable again by descriptor; see
	design note 2."

	| sock conn ms fd |
	sock := self @env0:___ensureOpen.
	ms := self @env0:___timeoutMs.
	ms @env0:notNil ifTrue: [
		(sock @env0:readWillNotBlockWithin: ms) == true ifFalse: [
			^ TimeoutError ___signal___: 'timed out']].
	conn := sock @env0:accept.
	conn @env0:isNil ifTrue: [^ self @env0:___fail: 'accept failed'].
	"Keep the fd alive past this GsSocket's own GC: socket.py will adopt it."
	[conn @env0:setCloseOnGc: false] @env0:on: Error do: [:e | e @env0:return: nil].
	fd := PyRawSocket @env0:___registerFd___: conn.
	^ { fd . { (conn @env0:peerAddress @env0:ifNil: ['']) .
			(conn @env0:peerPort @env0:ifNil: [0]) } }
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
connect: address
	| sock host port ms ok |
	sock := self @env0:___ensureOpen.
	host := (address @env0:at: 1) @env0:asString.
	port := address @env0:at: 2.
	ms := self @env0:___timeoutMs.
	ok := ms @env0:isNil
		ifTrue: [sock @env0:connectTo: port on: host]
		ifFalse: [sock @env0:connectTo: port on: host timeoutMs: ms].
	ok == true ifFalse: [
		(ms @env0:notNil @env0:and: [ok @env0:isNil]) ifTrue: [
			^ TimeoutError ___signal___: 'timed out'].
		^ self @env0:___fail: 'connect failed'].
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
connect_ex: address
	"Like connect(), but answer the errno instead of raising -- 0 on success.
	This is the form socketserver and port scanners use."

	^ [self connect: address. 0]
		@env0:on: Error
		do: [:e | | code |
			code := [gsSocket @env0:isNil ifTrue: [nil] ifFalse: [gsSocket @env0:lastErrorCode]]
				@env0:on: Error do: [:e2 | e2 @env0:return: nil].
			e @env0:return: (code @env0:ifNil: [111])]
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
getsockname
	| sock |
	sock := self @env0:___ensureOpen.
	^ { (sock @env0:address @env0:ifNil: ['0.0.0.0']) @env0:asString .
		(sock @env0:port @env0:ifNil: [0]) }
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
getpeername
	| sock |
	sock := self @env0:___ensureOpen.
	^ { (sock @env0:peerAddress @env0:ifNil: ['']) @env0:asString .
		(sock @env0:peerPort @env0:ifNil: [0]) }
%

! ---- options ----------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
setsockopt: level _: optname _: value
	"Real setsockopt, mapped onto GsSocket's named options.  An option with
	no GsSocket counterpart is accepted and ignored rather than raised: the
	stdlib sets plenty of tuning options opportunistically, and failing them
	would break callers that CPython does not."

	| sock entry |
	sock := self @env0:___ensureOpen.
	entry := PyRawSocket @env0:___gsOptionFor: level opt: optname.
	entry @env0:isNil ifTrue: [^ None].
	(entry @env0:at: 2) @env0:= #bool
		ifTrue: [sock @env0:option: (entry @env0:at: 1)
					put: (value @env0:= 0) @env0:not]
		ifFalse: [sock @env0:option: (entry @env0:at: 1) put: value].
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
getsockopt: level _: optname
	| sock entry raw |
	sock := self @env0:___ensureOpen.
	entry := PyRawSocket @env0:___gsOptionFor: level opt: optname.
	entry @env0:isNil ifTrue: [
		^ OSError ___signal___: '[Errno 92] Protocol not available'].
	raw := sock @env0:option: (entry @env0:at: 1).
	raw @env0:isNil ifTrue: [^ 0].
	(entry @env0:at: 2) @env0:= #bool ifTrue: [
		^ raw == true ifTrue: [1] ifFalse: [0]].
	^ raw
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
getsockopt: level _: optname _: buflen
	"The buffer form returns bytes; only the int options are meaningful here."

	| v ba |
	v := self getsockopt: level _: optname.
	ba := ByteArray @env0:new: buflen.
	1 @env0:to: (buflen @env0:min: 4) do: [:i |
		ba @env0:at: i put: ((v @env0:bitShift: (i @env0:- 1) @env0:* -8) @env0:bitAnd: 255)].
	^ ba
%

! ---- blocking / timeouts ----------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
settimeout: seconds
	"CPython's three states: None = blocking, 0 = non-blocking, n = timeout."

	| sock |
	sock := self @env0:___ensureOpen.
	(seconds @env0:isNil @env0:or: [seconds @env0:== None]) ifTrue: [
		timeoutSecs := nil.
		sock @env0:makeBlocking.
		^ None].
	seconds @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'Timeout value out of range'].
	timeoutSecs := seconds.
	seconds @env0:= 0
		ifTrue: [sock @env0:makeNonBlocking]
		ifFalse: [sock @env0:makeBlocking].
	^ None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
gettimeout
	^ timeoutSecs @env0:ifNil: [None]
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
setblocking: flag
	"setblocking(False) is settimeout(0); setblocking(True) is settimeout(None)."

	(flag @env0:= false @env0:or: [flag @env0:= 0])
		ifTrue: [^ self settimeout: 0].
	^ self settimeout: None
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
getblocking
	"True unless the socket is in the non-blocking (timeout == 0) state."

	^ (timeoutSecs @env0:notNil @env0:and: [timeoutSecs @env0:= 0]) @env0:not
%

! ---- transfer ---------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
recv: bufsize
	^ self recv: bufsize _: 0
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
recv: bufsize _: flags
	"Read up to bufsize bytes.  An empty result is EOF, as in CPython."

	| sock ba n ms |
	sock := self @env0:___ensureOpen.
	bufsize @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'negative buffersize in recv'].
	bufsize @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	ms := self @env0:___timeoutMs.
	ms @env0:notNil ifTrue: [
		(sock @env0:readWillNotBlockWithin: ms) == true ifFalse: [
			^ TimeoutError ___signal___: 'timed out']].
	ba := ByteArray @env0:new: bufsize.
	n := sock @env0:read: bufsize into: ba startingAt: 1.
	n @env0:isNil ifTrue: [^ self @env0:___fail: 'recv failed'].
	n @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ ba @env0:copyFrom: 1 to: n
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
recv_into: buffer
	^ self recv_into: buffer _: 0
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
recv_into: buffer _: nbytes
	"Read straight into a bytearray/memoryview, answering the count.  This
	is what makefile()'s buffered reader uses, so it matters for throughput."

	| sock want n data |
	sock := self @env0:___ensureOpen.
	want := ((nbytes @env0:isNil @env0:or: [nbytes @env0:= 0])
		ifTrue: [buffer @env0:size]
		ifFalse: [nbytes @env0:min: buffer @env0:size]).
	want @env0:= 0 ifTrue: [^ 0].
	data := self recv: want.
	n := data @env0:size.
	1 @env0:to: n do: [:i | buffer @env0:at: i put: (data @env0:at: i)].
	^ n
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
send: data
	^ self send: data _: 0
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
send: data _: flags
	"Write what fits, answering the count -- a short write is legal here."

	| sock ba n |
	sock := self @env0:___ensureOpen.
	ba := self @env0:___toByteArray: data.
	n := sock @env0:write: ba @env0:size from: ba.
	n @env0:isNil ifTrue: [^ self @env0:___fail: 'send failed'].
	^ n
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
sendall: data
	^ self sendall: data _: 0
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
sendall: data _: flags
	"Loop until everything is written; answer None."

	| sock ba size total n |
	sock := self @env0:___ensureOpen.
	ba := self @env0:___toByteArray: data.
	size := ba @env0:size.
	total := 0.
	[total @env0:< size] @env0:whileTrue: [
		n := sock @env0:write: (size @env0:- total) from: ba startingAt: total @env0:+ 1.
		n @env0:isNil ifTrue: [^ self @env0:___fail: 'sendall failed'].
		total := total @env0:+ n].
	^ None
%

! ---- datagrams --------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
recvfrom: bufsize
	^ self recvfrom: bufsize _: 0
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
recvfrom: bufsize _: flags
	"``(data, address)'' from a UDP socket.  GsSocket >> recvfrom: answers
	{ data . { af . port . nil . ip } }, so the address tuple is rebuilt
	here in CPython's (host, port) order."

	| sock res data info |
	sock := self @env0:___ensureOpen.
	res := sock @env0:recvfrom: bufsize.
	res @env0:isNil ifTrue: [^ self @env0:___fail: 'recvfrom failed'].
	data := res @env0:at: 1.
	info := res @env0:at: 2.
	^ { (self @env0:___toByteArray: data) .
		{ ((info @env0:at: 4) @env0:ifNil: ['']) @env0:asString .
		  ((info @env0:at: 2) @env0:ifNil: [0]) } }
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
sendto: data _: address
	^ self sendto: data _: 0 _: address
%

category: 'Grail-Socket Protocol'
method: PyRawSocket
sendto: data _: flags _: address
	"Send one datagram to (host, port), answering the byte count."

	| sock ba host port |
	sock := self @env0:___ensureOpen.
	ba := self @env0:___toByteArray: data.
	host := (address @env0:at: 1) @env0:asString.
	port := address @env0:at: 2.
	(sock @env0:sendUdp: (self @env0:___toRawString: ba)
		flags: (flags @env0:ifNil: [0])
		toHost: host
		port: port) @env0:isNil ifTrue: [
			^ self @env0:___fail: 'sendto failed'].
	^ ba @env0:size
%

! ---- shutdown ---------------------------------------------------------------
category: 'Grail-Socket Protocol'
method: PyRawSocket
shutdown: how
	"SHUT_RD / SHUT_WR / SHUT_RDWR.  GsSocket has all three directions, so
	unlike the older socket module this does not collapse them into one."

	| sock |
	sock := self @env0:___ensureOpen.
	how @env0:= 0 ifTrue: [sock @env0:shutdownReading. ^ None].
	how @env0:= 1 ifTrue: [sock @env0:shutdownWriting. ^ None].
	sock @env0:shutdownReadingAndWriting.
	^ None
%

! ---- unsupported, said plainly ----------------------------------------------
category: 'Grail-Unsupported'
method: PyRawSocket
recvmsg: bufsize
	^ OSError ___signal___:
		'recvmsg() is not supported: GemStone GsSocket has no ancillary-data interface'
%

category: 'Grail-Unsupported'
method: PyRawSocket
sendmsg: buffers
	^ OSError ___signal___:
		'sendmsg() is not supported: GemStone GsSocket has no ancillary-data interface'
%

set compile_env: 0

! ------- the _socket module itself -------------------------------------------
expectvalue /Class
doit
module subclass: '_socket'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_socket comment:
'Python ``_socket'' -- the low-level socket module CPython implements in C
and Grail implements over GemStone ``GsSocket''.

Exists so that CPython''s own ``socket.py'' can run unmodified on top: its
whole coupling to C is ``import _socket'' plus ``from _socket import *''.

The integer constants here never reach the operating system -- GsSocket
takes NAMED options -- so they only have to agree with each other.  Linux
values are used because they are the ones people recognise.'
%

expectvalue /Class
doit
_socket category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_socket removeAllMethods: 0.
_socket removeAllMethods: 1.
_socket class removeAllMethods: 0.
_socket class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: _socket
initialize
	"Module constants.  See the class comment: these are Grail-internal
	integers, mapped onto GsSocket's named options by PyRawSocket."

	"--- address families.  AF_UNIX is named so code can TEST for it; a
	socket() call with it raises, rather than quietly giving back IPv4."
	self @env0:at: #AF_UNSPEC put: 0.
	self @env0:at: #AF_UNIX put: 1.
	self @env0:at: #AF_INET put: 2.
	self @env0:at: #AF_INET6 put: 10.

	"--- socket types"
	self @env0:at: #SOCK_STREAM put: 1.
	self @env0:at: #SOCK_DGRAM put: 2.
	self @env0:at: #SOCK_RAW put: 3.
	self @env0:at: #SOCK_RDM put: 4.
	self @env0:at: #SOCK_SEQPACKET put: 5.

	"--- option levels and names"
	self @env0:at: #SOL_SOCKET put: 1.
	self @env0:at: #SO_DEBUG put: 1.
	self @env0:at: #SO_REUSEADDR put: 2.
	self @env0:at: #SO_TYPE put: 3.
	self @env0:at: #SO_ERROR put: 4.
	self @env0:at: #SO_DONTROUTE put: 5.
	self @env0:at: #SO_BROADCAST put: 6.
	self @env0:at: #SO_SNDBUF put: 7.
	self @env0:at: #SO_RCVBUF put: 8.
	self @env0:at: #SO_KEEPALIVE put: 9.
	self @env0:at: #SO_OOBINLINE put: 10.
	self @env0:at: #SO_LINGER put: 13.
	self @env0:at: #SO_REUSEPORT put: 15.
	self @env0:at: #SO_RCVTIMEO put: 20.
	self @env0:at: #SO_SNDTIMEO put: 21.
	self @env0:at: #SO_ACCEPTCONN put: 30.

	"--- protocols"
	self @env0:at: #IPPROTO_IP put: 0.
	self @env0:at: #IPPROTO_ICMP put: 1.
	self @env0:at: #IPPROTO_TCP put: 6.
	self @env0:at: #IPPROTO_UDP put: 17.
	self @env0:at: #IPPROTO_IPV6 put: 41.
	self @env0:at: #IPPROTO_RAW put: 255.
	self @env0:at: #TCP_NODELAY put: 1.
	self @env0:at: #TCP_KEEPIDLE put: 4.
	self @env0:at: #TCP_KEEPINTVL put: 5.
	self @env0:at: #TCP_KEEPCNT put: 6.
	self @env0:at: #IPV6_V6ONLY put: 26.

	"--- shutdown directions"
	self @env0:at: #SHUT_RD put: 0.
	self @env0:at: #SHUT_WR put: 1.
	self @env0:at: #SHUT_RDWR put: 2.

	"--- message flags"
	self @env0:at: #MSG_OOB put: 1.
	self @env0:at: #MSG_PEEK put: 2.
	self @env0:at: #MSG_DONTROUTE put: 4.
	self @env0:at: #MSG_DONTWAIT put: 64.
	self @env0:at: #MSG_WAITALL put: 256.

	"--- getaddrinfo / getnameinfo flags and errors"
	self @env0:at: #AI_PASSIVE put: 1.
	self @env0:at: #AI_CANONNAME put: 2.
	self @env0:at: #AI_NUMERICHOST put: 4.
	self @env0:at: #AI_V4MAPPED put: 8.
	self @env0:at: #AI_ALL put: 16.
	self @env0:at: #AI_ADDRCONFIG put: 32.
	self @env0:at: #AI_NUMERICSERV put: 1024.
	self @env0:at: #NI_NUMERICHOST put: 1.
	self @env0:at: #NI_NUMERICSERV put: 2.
	self @env0:at: #NI_NOFQDN put: 4.
	self @env0:at: #NI_NAMEREQD put: 8.
	self @env0:at: #NI_DGRAM put: 16.
	self @env0:at: #NI_MAXHOST put: 1025.
	self @env0:at: #NI_MAXSERV put: 32.
	self @env0:at: #EAI_BADFLAGS put: -1.
	self @env0:at: #EAI_NONAME put: -2.
	self @env0:at: #EAI_AGAIN put: -3.
	self @env0:at: #EAI_FAIL put: -4.
	self @env0:at: #EAI_NODATA put: -5.
	self @env0:at: #EAI_FAMILY put: -6.
	self @env0:at: #EAI_SOCKTYPE put: -7.
	self @env0:at: #EAI_SERVICE put: -8.
	self @env0:at: #EAI_ADDRFAMILY put: -9.
	self @env0:at: #EAI_MEMORY put: -10.
	self @env0:at: #EAI_SYSTEM put: -11.

	"--- well-known addresses"
	self @env0:at: #INADDR_ANY put: 0.
	self @env0:at: #INADDR_LOOPBACK put: 2130706433.
	self @env0:at: #INADDR_BROADCAST put: 4294967295.
	self @env0:at: #INADDR_NONE put: 4294967295.
	self @env0:at: #SOMAXCONN put: 4096.

	"IPv6 is real here, unlike in the older socket module: GsSocket has
	newIpv6/newUdpIpv6 and PyRawSocket routes AF_INET6 to them."
	self @env0:at: #has_ipv6 put: true.

	"--- the socket type, and the exception aliases.  Since CPython 3.10
	socket.error IS OSError and socket.timeout IS TimeoutError."
	self @env0:at: #socket put: PyRawSocket.
	self @env0:at: #SocketType put: PyRawSocket.
	self @env0:at: #error put: OSError.
	self @env0:at: #timeout put: TimeoutError.
	self @env0:at: #gaierror put: gaierror.
	self @env0:at: #herror put: herror.
%

! ---- name and address lookup ------------------------------------------------
category: 'Grail-Queries'
method: _socket
gethostname
	^ GsSocket @env0:getLocalHostName
%

category: 'Grail-Queries'
method: _socket
gethostbyname: aName
	| addr |
	addr := [GsSocket @env0:getHostAddressByName: aName @env0:asString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	addr @env0:isNil ifTrue: [
		^ gaierror ___signal___:
			('[Errno -2] Name or service not known: ' @env0:, aName @env0:asString)].
	^ addr @env0:asString
%

category: 'Grail-Queries'
method: _socket
gethostbyname_ex: aName
	"``(hostname, aliaslist, ipaddrlist)''.  GsSocket resolves to addresses
	but reports no aliases, so the alias list is honestly empty."

	| addrs |
	addrs := [GsSocket @env0:getHostAddressesByName: aName @env0:asString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	(addrs @env0:isNil @env0:or: [addrs @env0:isEmpty]) ifTrue: [
		^ gaierror ___signal___:
			('[Errno -2] Name or service not known: ' @env0:, aName @env0:asString)].
	^ { aName @env0:asString . #() .
		(addrs @env0:collect: [:a | a @env0:asString]) @env0:asArray }
%

category: 'Grail-Queries'
method: _socket
gethostbyaddr: addr
	"``(hostname, aliaslist, ipaddrlist)'' for an address."

	| name |
	name := [GsSocket @env0:getHostNameByAddress: addr @env0:asString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	name @env0:isNil ifTrue: [
		^ herror ___signal___:
			('[Errno 1] Unknown host: ' @env0:, addr @env0:asString)].
	^ { name @env0:asString . #() . { addr @env0:asString } }
%

category: 'Grail-Queries'
method: _socket
getservbyname: aName
	^ self getservbyname: aName _: nil
%

category: 'Grail-Queries'
method: _socket
getservbyname: aName _: proto
	| port |
	port := [proto @env0:isNil
		ifTrue: [GsSocket @env0:getServicePortByName: aName @env0:asString]
		ifFalse: [GsSocket @env0:getServicePortByName: aName @env0:asString
					withProtocol: proto @env0:asString]]
		@env0:on: Error do: [:e | e @env0:return: nil].
	port @env0:isNil ifTrue: [
		^ OSError ___signal___: 'service/proto not found'].
	^ port
%

category: 'Grail-Queries'
method: _socket
getservbyport: aPort
	^ self getservbyport: aPort _: nil
%

category: 'Grail-Queries'
method: _socket
getservbyport: aPort _: proto
	| name |
	name := [proto @env0:isNil
		ifTrue: [GsSocket @env0:getServiceNameByPort: aPort]
		ifFalse: [GsSocket @env0:getServiceNameByPort: aPort
					withProtocol: proto @env0:asString]]
		@env0:on: Error do: [:e | e @env0:return: nil].
	name @env0:isNil ifTrue: [
		^ OSError ___signal___: 'port/proto not found'].
	^ name @env0:asString
%

category: 'Grail-Queries'
method: _socket
getprotobyname: aName
	"The handful of protocol numbers GsSocket's own _protocolToInt: knows."

	| n |
	n := aName @env0:asString @env0:asLowercase.
	n @env0:= 'ip' ifTrue: [^ 0].
	n @env0:= 'icmp' ifTrue: [^ 1].
	n @env0:= 'tcp' ifTrue: [^ 6].
	n @env0:= 'udp' ifTrue: [^ 17].
	n @env0:= 'ipv6' ifTrue: [^ 41].
	n @env0:= 'raw' ifTrue: [^ 255].
	^ OSError ___signal___: ('protocol not found: ' @env0:, n)
%

category: 'Grail-Queries'
method: _socket
_getaddrinfo: positional kw: kwargs
	"``getaddrinfo(host, port, family=0, type=0, proto=0, flags=0)'' ->
	a list of ``(family, type, proto, canonname, sockaddr)'' 5-tuples.

	Resolution goes through GsSocket getHostAddressesByName:, which answers
	IPv4 literals, so the results are AF_INET.  A numeric port is used as
	given; a service NAME is resolved through getservbyname."

	| args n host port family type proto addrs out fam typ |
	args := positional @env0:ifNil: [#()].
	n := args @env0:size.
	host := n @env0:>= 1 ifTrue: [args @env0:at: 1] ifFalse: [None].
	port := n @env0:>= 2 ifTrue: [args @env0:at: 2] ifFalse: [None].
	family := n @env0:>= 3 ifTrue: [args @env0:at: 3] ifFalse: [0].
	type := n @env0:>= 4 ifTrue: [args @env0:at: 4] ifFalse: [0].
	proto := n @env0:>= 5 ifTrue: [args @env0:at: 5] ifFalse: [0].
	kwargs @env0:ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'family' ifTrue: [family := v]
			ifFalse: [key @env0:= 'type' ifTrue: [type := v]
			ifFalse: [key @env0:= 'proto' ifTrue: [proto := v]]]]].
	fam := (family @env0:isNil @env0:or: [family @env0:= 0])
		ifTrue: [2] ifFalse: [family].
	typ := (type @env0:isNil @env0:or: [type @env0:= 0])
		ifTrue: [1] ifFalse: [type].

	"A port given as a service name resolves; None means 0."
	(port @env0:isNil @env0:or: [port @env0:== None]) ifTrue: [port := 0].
	(port @env0:isKindOf: CharacterCollection) ifTrue: [
		port := self getservbyname: port _:
			(typ @env0:= 2 ifTrue: ['udp'] ifFalse: ['tcp'])].

	"An empty/None host means the loopback interface, as AI_PASSIVE implies."
	((host @env0:isNil @env0:or: [host @env0:== None])
		@env0:or: [host @env0:asString @env0:isEmpty])
			ifTrue: [addrs := { '127.0.0.1' }]
			ifFalse: [
				addrs := [GsSocket @env0:getHostAddressesByName: host @env0:asString]
					@env0:on: Error do: [:e | e @env0:return: nil].
				(addrs @env0:isNil @env0:or: [addrs @env0:isEmpty]) ifTrue: [
					^ gaierror ___signal___:
						('[Errno -2] Name or service not known: '
							@env0:, host @env0:asString)]].

	out := OrderedCollection @env0:new.
	addrs @env0:do: [:a |
		out @env0:add: { fam . typ . (proto @env0:ifNil: [0]) . '' .
			{ a @env0:asString . port } }].
	^ out @env0:asArray
%

category: 'Grail-Queries'
method: _socket
_getnameinfo: positional kw: kwargs
	"``getnameinfo((host, port), flags)'' -> ``(host, port-as-string)''."

	| args addr flags host port name |
	args := positional @env0:ifNil: [#()].
	addr := args @env0:size @env0:>= 1 ifTrue: [args @env0:at: 1] ifFalse: [nil].
	flags := args @env0:size @env0:>= 2 ifTrue: [args @env0:at: 2] ifFalse: [0].
	addr @env0:isNil ifTrue: [
		^ TypeError ___signal___: 'getnameinfo() argument 1 must be a tuple'].
	host := (addr @env0:at: 1) @env0:asString.
	port := addr @env0:at: 2.
	"NI_NUMERICHOST (1) asks us NOT to reverse-resolve."
	((flags @env0:bitAnd: 1) @env0:= 0)
		ifTrue: [name := [GsSocket @env0:getHostNameByAddress: host]
					@env0:on: Error do: [:e | e @env0:return: nil]]
		ifFalse: [name := nil].
	^ { (name @env0:ifNil: [host]) @env0:asString . port @env0:printString }
%

! ---- byte order and address packing (pure computation) ----------------------
category: 'Grail-Conversions'
method: _socket
htons: x
	"Host-to-network short.  Network order is big-endian and GemStone
	integers are host-neutral, so this is a defined 16-bit byte swap
	rather than anything platform-dependent."

	| v |
	v := x @env0:bitAnd: 65535.
	x @env0:< 0 ifTrue: [^ OverflowError ___signal___: 'can''t convert negative number to unsigned long'].
	^ ((v @env0:bitAnd: 255) @env0:bitShift: 8) @env0:bitOr: (v @env0:bitShift: -8)
%

category: 'Grail-Conversions'
method: _socket
ntohs: x
	^ self htons: x
%

category: 'Grail-Conversions'
method: _socket
htonl: x
	"Host-to-network long: a 32-bit byte swap."

	| v |
	x @env0:< 0 ifTrue: [^ OverflowError ___signal___: 'can''t convert negative number to unsigned long'].
	v := x @env0:bitAnd: 4294967295.
	^ (((v @env0:bitAnd: 255) @env0:bitShift: 24)
		@env0:bitOr: (((v @env0:bitShift: -8) @env0:bitAnd: 255) @env0:bitShift: 16))
		@env0:bitOr: ((((v @env0:bitShift: -16) @env0:bitAnd: 255) @env0:bitShift: 8)
			@env0:bitOr: ((v @env0:bitShift: -24) @env0:bitAnd: 255))
%

category: 'Grail-Conversions'
method: _socket
ntohl: x
	^ self htonl: x
%

category: 'Grail-Conversions'
method: _socket
inet_aton: ipString
	"Dotted-quad -> the 4 packed bytes."

	| parts ba |
	parts := ipString @env0:asString @env0:subStrings: '.'.
	parts @env0:size @env0:= 4 ifFalse: [
		^ OSError ___signal___: 'illegal IP address string passed to inet_aton'].
	ba := ByteArray @env0:new: 4.
	1 @env0:to: 4 do: [:i | | v |
		v := [(parts @env0:at: i) @env0:asString @env0:asNumber]
			@env0:on: Error do: [:e | e @env0:return: nil].
		(v @env0:isNil @env0:or: [v @env0:< 0 @env0:or: [v @env0:> 255]]) ifTrue: [
			^ OSError ___signal___: 'illegal IP address string passed to inet_aton'].
		ba @env0:at: i put: v].
	^ ba
%

category: 'Grail-Conversions'
method: _socket
inet_ntoa: packed
	"The 4 packed bytes -> a dotted quad."

	packed @env0:size @env0:= 4 ifFalse: [
		^ OSError ___signal___: 'packed IP wrong length for inet_ntoa'].
	^ ((packed @env0:at: 1) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 2) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 3) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 4) @env0:printString)
%

category: 'Grail-Conversions'
method: _socket
inet_pton: family _: ipString
	"Presentation -> packed.  IPv4 only: an IPv6 literal needs a parser
	GsSocket does not expose, and guessing would corrupt addresses."

	family @env0:= 2 ifTrue: [^ self inet_aton: ipString].
	family @env0:= 10 ifTrue: [
		^ OSError ___signal___:
			'inet_pton: AF_INET6 is not supported by this build'].
	^ OSError ___signal___:
		('unknown address family ' @env0:, family @env0:printString)
%

category: 'Grail-Conversions'
method: _socket
inet_ntop: family _: packed
	family @env0:= 2 ifTrue: [^ self inet_ntoa: packed].
	family @env0:= 10 ifTrue: [
		^ OSError ___signal___:
			'inet_ntop: AF_INET6 is not supported by this build'].
	^ ValueError ___signal___:
		('unknown address family ' @env0:, family @env0:printString)
%

! ---- module-level socket bookkeeping ----------------------------------------
category: 'Grail-Queries'
method: _socket
getdefaulttimeout
	^ PyRawSocket @env0:___defaultTimeout___ @env0:ifNil: [None]
%

category: 'Grail-Queries'
method: _socket
setdefaulttimeout: secondsOrNone
	(secondsOrNone @env0:isNil @env0:or: [secondsOrNone @env0:== None])
		ifTrue: [PyRawSocket @env0:___defaultTimeout___: nil]
		ifFalse: [
			secondsOrNone @env0:< 0 ifTrue: [
				^ ValueError ___signal___: 'Timeout value out of range'].
			PyRawSocket @env0:___defaultTimeout___: secondsOrNone].
	^ None
%

category: 'Grail-Queries'
method: _socket
dup: fd
	"``_socket.dup(fd)'' -- CPython duplicates the descriptor.  GsSocket has
	no dup(), and handing back the SAME fd would be a silent lie (closing
	either copy would close both), so this is refused outright."

	^ OSError ___signal___:
		'dup() is not supported: GemStone GsSocket cannot duplicate a descriptor'
%

category: 'Grail-Queries'
method: _socket
close: fd
	"``_socket.close(fd)'' -- close a bare descriptor this session owns."

	| sock |
	sock := PyRawSocket @env0:___gsSocketForFd___: fd.
	sock @env0:isNil ifTrue: [
		^ OSError ___signal___:
			('[Errno 9] Bad file descriptor: ' @env0:, fd @env0:printString)].
	[sock @env0:close] @env0:on: Error do: [:e | e @env0:return: nil].
	PyRawSocket @env0:___forgetFd___: fd.
	^ None
%

! ---- honestly unsupported ---------------------------------------------------
category: 'Grail-Unsupported'
method: _socket
_socketpair: positional kw: kwargs
	"socketpair() is AF_UNIX, which GsSocket has no interface for."

	^ OSError ___signal___:
		'socketpair() is not supported: GemStone GsSocket has no Unix-domain sockets'
%

category: 'Grail-Unsupported'
method: _socket
if_nameindex
	^ OSError ___signal___:
		'if_nameindex() is not supported: GemStone GsSocket exposes no interface table'
%

category: 'Grail-Unsupported'
method: _socket
CMSG_LEN: length
	^ OSError ___signal___:
		'CMSG_LEN() is not supported: GemStone GsSocket has no ancillary-data interface'
%

category: 'Grail-Unsupported'
method: _socket
CMSG_SPACE: length
	^ OSError ___signal___:
		'CMSG_SPACE() is not supported: GemStone GsSocket has no ancillary-data interface'
%

set compile_env: 0
