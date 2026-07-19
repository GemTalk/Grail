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
! getsockname() / gethostname() / makefile() (-> PySocketIO buffered file
! object).  UDP and the full option surface are still out of scope.
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
	"``s.bind((host, port))`` — perform the OS bind now (not deferred to
	``listen'') so ``getsockname'' returns the possibly-OS-assigned port
	before ``listen'' is called — socketserver reads ``server_address''
	between bind and activate.  Port 0 asks the OS for an ephemeral port;
	bind to any interface (toAddress: nil) so a client on 127.0.0.1 reaches
	it regardless of the requested host."

	| portArg |
	sockHost := address @env0:at: 1.
	sockPort := address @env0:at: 2.
	portArg := (sockPort @env0:isNil @env0:or: [sockPort @env0:= 0])
		@env0:ifTrue: [nil]
		@env0:ifFalse: [sockPort].
	(gsSocket @env0:bindTo: portArg toAddress: nil) @env0:isNil ifTrue: [
		^ OSError @env1:___signal___: 'socket.bind failed'
	].
	sockPort := gsSocket @env0:port.
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
	"Mark the (already-bound) socket as a listening server.  ``bind'' did the
	OS bind."

	(gsSocket @env0:makeListener: backlog) @env0:isNil ifTrue: [
		^ OSError @env1:___signal___: 'socket.listen failed'
	].
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
	ok == true ifFalse: [
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

category: 'Grail-Readiness'
method: PySocket
_readableNow
	"True if a read/accept would not block right now (data pending, or — on
	a listening socket — a connection waiting).  Used by ``select''."

	^ gsSocket @env0:readWillNotBlock
%

category: 'Grail-Readiness'
method: PySocket
_readableWithin: ms
	"Block up to ``ms'' milliseconds (negative = forever) waiting for the
	socket to become readable; answer whether it did.  Suspends the GsProcess
	while waiting, so other green threads run."

	^ gsSocket @env0:readWillNotBlockWithin: ms
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

category: 'Grail-Socket Protocol'
method: PySocket
makefile: mode
	"``s.makefile(mode)`` — a buffered binary file object over this socket.
	The dev server (``http.server``) uses ``'rb'`` / ``'wb'``; text modes are
	served the same bytes (decode at the caller)."

	^ PySocketIO @env0:on: self
%

category: 'Grail-Socket Protocol'
method: PySocket
makefile: mode _: buffering
	^ PySocketIO @env0:on: self
%

category: 'Grail-Socket Protocol'
method: PySocket
_makefile: positional kw: kwargs
	"``s.makefile(mode='r', buffering=-1, ...)`` — any signature returns a
	buffered file object over the socket."

	^ PySocketIO @env0:on: self
%

! ---- env-1 TLS upgrade hooks (used by the ``ssl'' module) -------------------
! GsSecureSocket IS-A GsSocket, so once ``gsSocket'' is swapped for a
! GsSecureSocket every recv/send/makefile/readiness method above transparently
! runs over TLS — no other change to PySocket is needed.

category: 'Grail-TLS'
method: PySocket
_sslWrapServerCert: certFile _: keyFile _: pw
	"Hand this socket's live TCP connection to a new TLS *server* endpoint and
	load the PEM certificate + private key (``pw'' empty = no passphrase).  The
	server does not request a client certificate (TLS server default).  Call
	``_sslSecureAccept'' next to run the handshake."

	| sec pwArg |
	sec := GsSecureSocket @env0:newServerFromGsSocket: gsSocket.
	gsSocket := sec.
	pwArg := pw @env0:asString.
	(pwArg @env0:isEmpty) @env0:ifTrue: [pwArg := nil].
	sec @env0:disableCertificateVerification.
	sec @env0:useCertificateFile: certFile @env0:asString
		withPrivateKeyFile: keyFile @env0:asString
		privateKeyPassphrase: pwArg.
	^ None
%

category: 'Grail-TLS'
method: PySocket
_sslSecureAccept
	"Run the server-side TLS handshake (suspends the GsProcess while waiting,
	so a peer in another green thread can drive its half of the handshake)."

	gsSocket @env0:secureAccept.
	^ None
%

category: 'Grail-TLS'
method: PySocket
_sslWrapClientSNI: host _: doVerify
	"Hand this socket's live TCP connection to a new TLS *client* endpoint.
	``host'' (empty = none) sets the SNI name and, when verifying, the expected
	peer name; ``doVerify'' toggles peer-certificate verification.  Call
	``_sslSecureConnect'' next to run the handshake."

	| sec hostStr hasHost |
	sec := GsSecureSocket @env0:newClientFromGsSocket: gsSocket.
	gsSocket := sec.
	hostStr := host @env0:asString.
	hasHost := hostStr @env0:isEmpty @env0:not.
	hasHost @env0:ifTrue: [sec @env0:setServerNameIndication: hostStr].
	doVerify @env0:ifTrue: [sec @env0:enableCertificateVerification] @env0:ifFalse: [sec @env0:disableCertificateVerification].
	(doVerify @env0:& hasHost) @env0:ifTrue: [sec @env0:addExpectedHost: hostStr].
	^ None
%

category: 'Grail-TLS'
method: PySocket
_sslSecureConnect
	"Run the client-side TLS handshake (suspends while waiting)."

	gsSocket @env0:secureConnect.
	^ None
%

category: 'Grail-TLS'
method: PySocket
_sslCipherName
	"The negotiated cipher description string (``''`` if not yet connected)."

	^ gsSocket @env0:fetchCipherDescription
%

category: 'Grail-TLS'
method: PySocket
_sslVersionName
	"The negotiated TLS protocol version (e.g. ``'TLSv1.3'``)."

	^ gsSocket @env0:tlsActualVersion @env0:asString
%

! ===============================================================================
! PySocketIO — buffered file object returned by ``socket.makefile()''
! ===============================================================================
set compile_env: 0

expectvalue /Class
doit
Object subclass: 'PySocketIO'
  instVarNames: #('sock' 'readBuffer' 'closed')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PySocketIO comment:
'Buffered binary file object over a ``PySocket'' — the result of
``socket.makefile()''.  Reads ahead into ``readBuffer'' so ``readline'' can
return one line at a time (what ``http.server.BaseHTTPRequestHandler'' needs
for the request line + headers); ``read'' returns N bytes or to EOF.  All
reads/writes are bytes (a ByteArray).'
%

expectvalue /Class
doit
PySocketIO category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PySocketIO removeAllMethods: 0.
PySocketIO removeAllMethods: 1.
PySocketIO class removeAllMethods: 0.
PySocketIO class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: PySocketIO
on: aPySocket

	| inst |
	inst := self new.
	inst _setSock: aPySocket.
	^ inst
%

category: 'Grail-Private'
method: PySocketIO
_setSock: aPySocket
	sock := aPySocket.
	readBuffer := ByteArray new.
	closed := false.
	^ self
%

category: 'Grail-Private'
method: PySocketIO
_takeBuffer: n
	"Remove and return the first n bytes of readBuffer.  Guards the empty
	(n = 0) and drain-all (n >= size) cases — GemStone's ``copyFrom:to:''
	rejects a startIndex past the collection size."
	| result |
	n <= 0 ifTrue: [^ ByteArray new].
	result := readBuffer copyFrom: 1 to: n.
	readBuffer := n >= readBuffer size
		ifTrue: [ByteArray new]
		ifFalse: [readBuffer copyFrom: n + 1 to: readBuffer size].
	^ result
%

set compile_env: 1

category: 'Grail-IO'
method: PySocketIO
readline
	^ self @env1:_readlineLimit: None
%

category: 'Grail-IO'
method: PySocketIO
readline: limit
	^ self @env1:_readlineLimit: limit
%

category: 'Grail-IO'
method: PySocketIO
_readlineLimit: limit
	"Return one line (through and including the ``\n'', byte 10), or up to
	``limit'' bytes, or whatever remains at EOF."

	| nlIdx chunk hasLimit |
	hasLimit := (limit == None or: [limit @env0:isNil]) @env0:not.
	[true] whileTrue: [
		"GemStone's ByteArray>>indexOf: raises OutOfRange on an empty
		collection rather than returning 0 — guard it."
		nlIdx := readBuffer @env0:isEmpty ifTrue: [0] ifFalse: [readBuffer @env0:indexOf: 10].
		nlIdx @env0:> 0 ifTrue: [^ self @env0:_takeBuffer: nlIdx].
		(hasLimit and: [readBuffer @env0:size @env0:>= limit]) ifTrue: [^ self @env0:_takeBuffer: limit].
		chunk := sock @env1:recv: 8192.
		chunk @env0:isEmpty ifTrue: [^ self @env0:_takeBuffer: readBuffer @env0:size].
		readBuffer := readBuffer @env0:, chunk.
	].
%

category: 'Grail-IO'
method: PySocketIO
read
	^ self @env1:_readAll
%

category: 'Grail-IO'
method: PySocketIO
read: n
	"Read exactly ``n'' bytes (or fewer at EOF); ``n'' None/negative reads to
	EOF."

	| chunk |
	(n == None or: [n @env0:isNil or: [n @env0:< 0]]) ifTrue: [^ self @env1:_readAll].
	[readBuffer @env0:size @env0:< n] whileTrue: [
		chunk := sock @env1:recv: 8192.
		chunk @env0:isEmpty ifTrue: [^ self @env0:_takeBuffer: readBuffer @env0:size].
		readBuffer := readBuffer @env0:, chunk.
	].
	^ self @env0:_takeBuffer: n
%

category: 'Grail-IO'
method: PySocketIO
_readAll
	| chunk |
	[chunk := sock @env1:recv: 8192. chunk @env0:isEmpty @env0:not] whileTrue: [
		readBuffer := readBuffer @env0:, chunk
	].
	^ self @env0:_takeBuffer: readBuffer @env0:size
%

category: 'Grail-IO'
method: PySocketIO
write: data
	"Write ``data'' (bytes) to the socket; return the number of bytes."

	sock @env1:sendall: data.
	^ data @env0:size
%

category: 'Grail-IO'
method: PySocketIO
flush
	"Socket writes go out immediately — nothing to flush."
	^ None
%

category: 'Grail-IO'
method: PySocketIO
close
	"Detach this file object.  Does NOT close the underlying socket — a
	socket can hand out separate read/write file objects, and the caller
	closes the socket itself."

	closed := true.
	^ None
%

category: 'Grail-IO'
method: PySocketIO
closed
	^ closed
%

category: 'Grail-IO'
method: PySocketIO
readable
	^ true
%

category: 'Grail-IO'
method: PySocketIO
writable
	^ true
%

category: 'Grail-IO'
method: PySocketIO
seekable
	^ false
%

category: 'Grail-Context Manager'
method: PySocketIO
__enter__
	^ self
%

category: 'Grail-Context Manager'
method: PySocketIO
__exit__: excType _: excValue _: tb
	self @env1:close.
	^ false
%

category: 'Grail-IO'
method: PySocketIO
__iter__
	^ self
%

category: 'Grail-IO'
method: PySocketIO
__next__
	"Iterate lines; raise StopIteration at EOF."

	| line |
	line := self @env1:readline.
	line @env0:isEmpty ifTrue: [^ StopIteration @env1:___signal___: ''].
	^ line
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
