! ===============================================================================
! socket — native Python ``socket'' module backed by GemStone ``GsSocket''.
!
! Grail has no libpython and no CPython ``_socket'' extension, so the socket
! object is a thin Smalltalk wrapper (``PySocket'') around a ``GsSocket''.  This
! is the foundation for M8 (``flask run'' serving a real HTTP request): a
! pure-Python ``werkzeug.serving.run_simple'' is built on top of these
! primitives.
!
! Only the TCP/IPv4 server + client subset the dev server needs is implemented:
! socket() / bind() / listen() / accept() / recv() / send() / sendall() /
! connect() / close() / shutdown() / setsockopt() (no-op) / settimeout() /
! getsockname() / gethostname().  UDP, makefile(), and the full option surface
! are out of scope for the thin path.
! ===============================================================================

! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- PySocket wrapper class (one GsSocket per instance) -------------------
expectvalue /Class
doit
Object subclass: 'PySocket'
  instVarNames: #('gsSocket' 'sockHost' 'sockPort' 'timeoutMs')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PySocket comment:
'A Python ``socket.socket'' object — wraps a single GemStone ``GsSocket''
in the ``gsSocket'' instVar.  ``sockHost''/``sockPort'' remember the
bind/connect address; ``timeoutMs'' holds the (currently advisory)
timeout.  Constructed by ``socket.socket()'' on the ``socket'' module, or
by ``accept'' (which wraps the GsSocket the accept primitive returns).'
%

expectvalue /Class
doit
PySocket category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PySocket removeAllMethods: 0.
PySocket removeAllMethods: 1.
PySocket class removeAllMethods: 0.
PySocket class removeAllMethods: 1.
%

! ---- env-0 internal construction / accessors -------------------------------
set compile_env: 0

category: 'Grail-Private'
classmethod: PySocket
wrapping: aGsSocket
	"Wrap an existing GsSocket (e.g. the one ``accept'' returns)."

	| inst |
	inst := self new.
	inst _setSock: aGsSocket.
	^ inst
%

category: 'Grail-Private'
classmethod: PySocket
fresh
	"A brand-new, unconnected TCP socket."

	^ self wrapping: GsSocket new
%

category: 'Grail-Private'
method: PySocket
_setSock: aGsSocket
	gsSocket := aGsSocket.
	^ self
%

category: 'Grail-Private'
method: PySocket
_sock
	^ gsSocket
%

category: 'Grail-Private'
method: PySocket
_toByteArray: data
	"Accept a Python ``bytes'' (already a ByteArray) or ``str'' and return
	a ByteArray suitable for ``GsSocket >> write:from:''."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [^ data asByteArray].
	^ data asByteArray
%

! ---- env-1 Python-callable socket API --------------------------------------
set compile_env: 1

category: 'Grail-Socket Protocol'
method: PySocket
bind: address
	"``s.bind((host, port))`` — remember the requested address.  The actual
	OS bind happens in ``listen'' (GsSocket binds + listens together via
	``makeServer:atPort:atAddress:'')."

	sockHost := address @env0:at: 1.
	sockPort := address @env0:at: 2.
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
listen
	^ self @env1:listen: 5
%

category: 'Grail-Socket Protocol'
method: PySocket
listen: backlog
	"Turn the socket into a listening server.  ``GsSocket'' binds + listens
	in one step; a 0 port asks the OS for an ephemeral one (read back via
	``getsockname'').  Bind to any interface (atAddress: nil) so a client
	on 127.0.0.1 reaches it regardless of the requested host."

	| portArg |
	portArg := (sockPort @env0:isNil @env0:or: [sockPort @env0:= 0])
		@env0:ifTrue: [nil]
		@env0:ifFalse: [sockPort].
	(gsSocket @env0:makeServer: backlog atPort: portArg atAddress: nil) @env0:isNil ifTrue: [
		^ OSError @env1:___signal___: 'socket.listen: bind/listen failed'
	].
	sockPort := gsSocket @env0:port.
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
accept
	"Block until a client connects; return ``(conn, (host, port))``.  ``conn``
	is a fresh PySocket wrapping the accepted GsSocket."

	| conn |
	conn := gsSocket @env0:accept.
	conn @env0:isNil ifTrue: [
		^ OSError @env1:___signal___: 'socket.accept failed'
	].
	^ { (PySocket @env0:wrapping: conn) .
		{ (conn @env0:peerAddress @env0:ifNil: ['']) . (conn @env0:peerPort @env0:ifNil: [0]) } }
%

category: 'Grail-Socket Protocol'
method: PySocket
connect: address
	"``s.connect((host, port))`` — connect this socket to a server."

	| host port ok |
	host := address @env0:at: 1.
	port := address @env0:at: 2.
	ok := gsSocket @env0:connectTo: port on: host @env0:asString.
	ok @env0:== true ifFalse: [
		^ OSError @env1:___signal___: 'socket.connect failed'
	].
	sockHost := host.
	sockPort := port.
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
recv: bufsize
	"Read up to ``bufsize`` bytes; return a ``bytes`` (ByteArray).  An empty
	result means the peer closed the connection (EOF)."

	| ba n |
	ba := ByteArray @env0:new: bufsize.
	n := gsSocket @env0:read: bufsize into: ba startingAt: 1.
	n @env0:isNil ifTrue: [^ OSError @env1:___signal___: 'socket.recv failed'].
	n @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ ba @env0:copyFrom: 1 to: n
%

category: 'Grail-Socket Protocol'
method: PySocket
send: data
	"Write ``data`` (bytes/str); return the number of bytes written (may be
	fewer than ``len(data)`` — CPython semantics)."

	| ba n |
	ba := self @env0:_toByteArray: data.
	n := gsSocket @env0:write: ba @env0:size from: ba.
	n @env0:isNil ifTrue: [^ OSError @env1:___signal___: 'socket.send failed'].
	^ n
%

category: 'Grail-Socket Protocol'
method: PySocket
sendall: data
	"Write all of ``data``, looping over partial writes.  Returns None."

	| ba total size n |
	ba := self @env0:_toByteArray: data.
	size := ba @env0:size.
	total := 0.
	[total @env0:< size] @env0:whileTrue: [
		n := gsSocket @env0:write: (size @env0:- total) from: ba startingAt: total @env0:+ 1.
		n @env0:isNil ifTrue: [^ OSError @env1:___signal___: 'socket.sendall failed'].
		total := total @env0:+ n.
	].
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
close
	"Close the underlying GsSocket (idempotent)."

	gsSocket @env0:notNil ifTrue: [
		[gsSocket @env0:close] @env0:on: Error @env0:do: [:e | nil].
		gsSocket := nil.
	].
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
shutdown: how
	"``s.shutdown(how)`` — stop reading and/or writing.  GsSocket only offers
	the combined form for SHUT_RDWR; map the directional cases too."

	gsSocket @env0:notNil ifTrue: [gsSocket @env0:shutdownReadingAndWriting].
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
setsockopt: level _: optname _: value
	"Accepted and ignored — GsSocket manages buffer/reuse options itself.
	(SO_REUSEADDR etc. don't need to be honoured for the dev server.)"

	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
settimeout: seconds
	"Store an advisory timeout (seconds → ms).  None clears it."

	timeoutMs := seconds @env0:isNil
		@env0:ifTrue: [nil]
		@env0:ifFalse: [(seconds @env0:* 1000) @env0:truncated].
	^ None
%

category: 'Grail-Socket Protocol'
method: PySocket
gettimeout
	^ timeoutMs @env0:isNil
		@env0:ifTrue: [None]
		@env0:ifFalse: [timeoutMs @env0:/ 1000.0]
%

category: 'Grail-Socket Protocol'
method: PySocket
getsockname
	"``(host, port)`` of the local end."

	^ { (sockHost @env0:ifNil: ['0.0.0.0']) . (sockPort @env0:ifNil: [0]) }
%

category: 'Grail-Socket Protocol'
method: PySocket
getpeername
	^ { (gsSocket @env0:peerAddress @env0:ifNil: ['']) . (gsSocket @env0:peerPort @env0:ifNil: [0]) }
%

category: 'Grail-Socket Protocol'
method: PySocket
fileno
	^ gsSocket @env0:isNil @env0:ifTrue: [-1] @env0:ifFalse: [gsSocket @env0:id]
%

category: 'Grail-Socket Protocol'
method: PySocket
setblocking: aBool
	aBool @env0:ifTrue: [gsSocket @env0:makeBlocking] ifFalse: [gsSocket @env0:makeNonBlocking].
	^ None
%

category: 'Grail-Context Manager'
method: PySocket
__enter__
	^ self
%

category: 'Grail-Context Manager'
method: PySocket
__exit__: excType _: excValue _: tb
	self @env1:close.
	^ false
%

! ===============================================================================
! socket module
! ===============================================================================
set compile_env: 0

expectvalue /Class
doit
module subclass: 'socket'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
socket comment:
'Python ``socket'' module backed by GemStone ``GsSocket''.  Implements the
TCP/IPv4 server + client subset needed by the werkzeug dev server.  Each
``socket.socket()'' call returns a fresh ``PySocket''.'
%

expectvalue /Class
doit
socket category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
socket removeAllMethods: 0.
socket removeAllMethods: 1.
socket class removeAllMethods: 0.
socket class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: socket
initialize
	"Module constants.  Values mirror CPython/Linux where it's cheap; GsSocket
	doesn't consult most of them (it's TCP/IPv4 by default), so the exact
	integers only matter for code that compares against the names."

	self @env0:at: #AF_INET put: 2.
	self @env0:at: #AF_INET6 put: 10.
	self @env0:at: #AF_UNSPEC put: 0.
	self @env0:at: #SOCK_STREAM put: 1.
	self @env0:at: #SOCK_DGRAM put: 2.
	self @env0:at: #SOL_SOCKET put: 1.
	self @env0:at: #SO_REUSEADDR put: 2.
	self @env0:at: #SO_KEEPALIVE put: 9.
	self @env0:at: #IPPROTO_TCP put: 6.
	self @env0:at: #TCP_NODELAY put: 1.
	self @env0:at: #SHUT_RD put: 0.
	self @env0:at: #SHUT_WR put: 1.
	self @env0:at: #SHUT_RDWR put: 2.
%

category: 'Grail-Constructors'
method: socket
socket
	"``socket.socket()`` — default AF_INET / SOCK_STREAM TCP socket."

	^ PySocket @env0:fresh
%

category: 'Grail-Constructors'
method: socket
socket: family
	^ PySocket @env0:fresh
%

category: 'Grail-Constructors'
method: socket
socket: family _: type
	^ PySocket @env0:fresh
%

category: 'Grail-Constructors'
method: socket
socket: family _: type _: proto
	^ PySocket @env0:fresh
%

category: 'Grail-Constructors'
method: socket
_socket: positional kw: kwargs
	"Varargs ``socket.socket(*args, **kwargs)`` — family/type/proto are all
	ignored (TCP/IPv4 only), so any arity returns a fresh socket."

	^ PySocket @env0:fresh
%

category: 'Grail-Queries'
method: socket
gethostname
	"Local host name (``socket.gethostname()``)."

	^ GsSocket @env0:getLocalHostName
%

category: 'Grail-Queries'
method: socket
gethostbyname: aName
	"Resolve a host name to an IPv4 address string."

	^ GsSocket @env0:getHostAddressByName: aName @env0:asString
%

set compile_env: 0
