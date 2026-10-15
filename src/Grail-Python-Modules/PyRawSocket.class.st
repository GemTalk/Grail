"Python ``_socket.socket' -- the primitive socket type, wrapping one
GemStone ``GsSocket' in the ``gsSocket' instVar.

CPython's socket.py subclasses this (``class socket(_socket.socket)') and
calls ``_socket.socket.__init__(self, family, type, proto, fileno)'
explicitly, so the constructor here is a real ``__init__' rather than a
class-side factory: the instance may already have been allocated by a
Python subclass before we ever see it.

``timeoutSecs' follows CPython's three-state convention exactly:
  nil      blocking (no timeout)
  0        non-blocking
  n > 0    blocking with an n-second timeout
which is what gettimeout()/getblocking() report and what settimeout()/
setblocking() write.  GsSocket has no single ""timeout"" notion, so the value
is applied per call site (connectTo:on:timeoutMs:, acceptTimeoutMs:,
read:into:startingAt:maxWait:)."
Class {
	#name : 'PyRawSocket',
	#superclass : 'Object',
	#instVars : [
		'gsSocket',
		'sockFamily',
		'sockType',
		'sockProto',
		'timeoutSecs',
		'sockClosed',
		'connectIssued',
		'hadPeer'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyRawSocket class >> ___cancelAll___: armed forWrite: forWrite on: sem [
	"Unregister.  A FIRED event cancels itself, but the ones that did not fire
	stay armed and would later signal a semaphore nobody is waiting on."

	armed do: [:sock |
		[forWrite
			ifTrue: [Processor cancelWhenWritable: sock signal: sem]
			ifFalse: [Processor cancelWhenReadable: sock signal: sem]]
			on: Error do: [:ex | ex return: nil]]

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___defaultTimeout___ [
	"socket.getdefaulttimeout() -- session-local, nil means blocking."

	^ SessionTemps current at: #GrailSocketDefaultTimeout ifAbsent: [nil]

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___defaultTimeout___: secondsOrNil [
	SessionTemps current at: #GrailSocketDefaultTimeout put: secondsOrNil.
	^ secondsOrNil

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___fdRegistry___ [
	"Session-local fd -> GsSocket map.  See design note 2 in the file header:
	it lets __init__(fileno=fd) reclaim a GsSocket this session created,
	rather than asking fromFileHandle: to re-adopt an fd it does not own."

	^ SessionTemps current
		at: #GrailRawSocketFds
		ifAbsentPut: [IdentityKeyValueDictionary new]

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___forgetFd___: fd [
	| gs |
	fd isNil ifTrue: [^ self].
	gs := self ___fdRegistry___ removeKey: fd ifAbsent: [nil].
	gs isNil ifFalse: [self ___peeredGsSockets___ remove: gs ifAbsent: [nil]].
	^ self

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___gsOptionFor: level opt: optname [
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

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___gsSocketForFd___: fd [
	"The live GsSocket for fd if this session made it, else nil."

	^ self ___fdRegistry___ at: fd ifAbsent: [nil]

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___peeredGsSockets___ [
	"The GsSockets that have had a peer (connect, accept, a getpeername that
	found one, a detach of a socket that knew it).  hadPeer is the
	only record of that once Linux has seen the peer's RESET -- getpeername
	then fails with ENOTCONN, as for a socket that never connected -- and
	ssl.py wraps a socket by detaching it and adopting its fd into a new
	object.  Without this the adopter judged afresh, after the reset, and
	read ENOTCONN where the bytes sent before it were waiting (test_ssl
	TestPreHandshakeClose, Linux only)."

	^ SessionTemps current
		at: #GrailRawSocketPeered
		ifAbsentPut: [IdentitySet new]

]

{ #category : 'Grail-Python Attribute Hook' }
PyRawSocket class >> ___pythonValueAttrs___ [
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

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___readyNow___: gsSocks forWrite: forWrite into: out [
	"Append the 1-based indices of the sockets that would not block."

	1 to: gsSocks size do: [:i | | sock ready |
		sock := gsSocks at: i.
		ready := sock == nil
			ifTrue: [false]
			ifFalse: [[forWrite
					ifTrue: [sock writeWillNotBlock]
					ifFalse: [sock readWillNotBlock]]
				on: Error do: [:ex | ex return: false]].
		ready == true ifTrue: [out add: i]].
	^ out

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___registerAll___: gsSocks forWrite: forWrite on: sem [
	"Arm a readiness event per socket; answer those actually armed so the same
	set can be cancelled afterwards."

	| armed |
	armed := OrderedCollection new.
	gsSocks do: [:sock |
		sock == nil ifFalse: [
			[forWrite
				ifTrue: [Processor whenWritable: sock signal: sem]
				ifFalse: [Processor whenReadable: sock signal: sem].
			armed add: sock]
				on: Error do: [:ex | ex return: nil]]].
	^ armed

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___registerFd___: aGsSocket [
	"Remember aGsSocket under its own fd and answer that fd."

	| fd |
	aGsSocket isNil ifTrue: [^ nil].
	fd := aGsSocket id.
	fd isNil ifTrue: [^ nil].
	self ___fdRegistry___ at: fd put: aGsSocket.
	^ fd

]

{ #category : 'Grail-Private' }
PyRawSocket class >> wrapping: aGsSocket family: fam type: typ proto: prot [
	"Adopt an existing GsSocket (the one accept returns)."

	| inst |
	inst := self new.
	inst ___setSock: aGsSocket family: fam type: typ proto: prot.
	^ inst

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___ensureOpen [
	"Answer the GsSocket, or raise CPython's error for a closed socket."

	"``___signal___:'' is an env-1 selector, so an env-0 helper must send it
	with the @env1: prefix -- a bare send is a MessageNotUnderstood, and an
	uncatchable Smalltalk one at that, exactly where Python code is waiting
	to catch OSError."
	(sockClosed == true or: [gsSocket isNil]) ifTrue: [
		^ OSError @env1:___signal___: '[Errno 9] Bad file descriptor'].
	^ gsSocket

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___fail: what [
	"Raise an OSError carrying whatever GsSocket last recorded.  GsSocket
	reports failure by answering nil and stashing the detail, so without
	this the Python side would see a bare ''operation failed''."

	| detail code |
	"A peer that RESET or went away is CPython's errno-carrying subclass --
	``except ConnectionResetError'' is how callers tell a dropped peer from a
	bug -- not a bare OSError with GemStone's ``recv(14,...) failed with'' text
	and no errno.  A reset is what an abortive close (SO_LINGER 0) sends."
	code := [gsSocket isNil ifTrue: [nil] ifFalse: [gsSocket lastErrorCode]]
		on: Error do: [:e | e return: nil].
	code isNil ifFalse: [
		code := self @env1:___normalizeConnectErrno___: code.
		"Named here rather than through OSError's errnomap, which leaves the
		network errnos out because Darwin and Linux number them differently;
		this code has already been normalized to Grail's numbering."
		code = 54 ifTrue: [
			^ ConnectionResetError @env1:___signalNew___:
				{ 54 . 'Connection reset by peer' } kw: nil].
		code = 53 ifTrue: [
			^ ConnectionAbortedError @env1:___signalNew___:
				{ 53 . 'Software caused connection abort' } kw: nil].
		code = 32 ifTrue: [
			^ BrokenPipeError @env1:___signalNew___: { 32 . 'Broken pipe' } kw: nil]].
	detail := [gsSocket isNil ifTrue: [nil] ifFalse: [gsSocket lastErrorString]]
		on: Error do: [:e | e return: nil].
	^ OSError @env1:___signal___:
		(detail isNil
			ifTrue: [what]
			ifFalse: [what , ': ' , detail asString])

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___gsSocket [
	^ gsSocket

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___setSock: aGsSocket family: fam type: typ proto: prot [
	gsSocket := aGsSocket.
	sockFamily := fam.
	sockType := typ.
	sockProto := prot.
	sockClosed := false.
	timeoutSecs := PyRawSocket ___defaultTimeout___.
	aGsSocket ifNotNil: [PyRawSocket ___registerFd___: aGsSocket].
	"An adopted socket -- the fd accept() hands back -- is connected already."
	hadPeer := aGsSocket notNil
		and: [(PyRawSocket ___peeredGsSockets___ includes: aGsSocket)
			or: [([aGsSocket peerAddress] on: Error do: [:e | e return: nil]) notNil]].
	"Watched for dying open: ___finalizeUnclosed___ is CPython's sock_finalize."
	aGsSocket ifNotNil: [
		FinalizerEphemeron
			on: self
			do: [:aSocket :unused | aSocket @env1:___finalizeUnclosed___]
			with: nil].
	^ self

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___timeoutMs [
	"timeoutSecs (seconds, CPython's three states) -> milliseconds for the
	GsSocket call sites that take one.  nil stays nil: blocking forever."

	timeoutSecs isNil ifTrue: [^ nil].
	^ (timeoutSecs * 1000) rounded max: 0

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___tlsReadError: aSocketError [
	"A TLS read failed.  GsSecureSocket reports that by SIGNALLING a
	SocketError (or its subclass SecureSocketError), not by answering nil as
	a plain GsSocket read does.  A Smalltalk exception is invisible to Python:
	it escaped every ``except'' and ended the whole process with OpenSSL's
	bare text.

	A peer that closes without a close_notify alert is a RAGGED EOF.
	http.server does exactly that after an HTTP/1.0 response with no
	Content-Length, which the client must read to EOF.  OpenSSL 3 reports it
	as ``unexpected eof while reading'', and every later read on the same
	connection as SSL_ERROR_SYSCALL.  CPython maps both to SSLEOFError (a
	syscall error with no errno is EOF), and SSLSocket.read answers b'' for
	that under suppress_ragged_eofs, which defaults to True.  So answer EOF
	for both.  The later SSL_ERROR_SYSCALL counts as EOF only once this socket
	has seen the ragged EOF: a reset in mid-stream reports the same code, and
	that must still raise.  Anything else raises as a catchable OSError."

	| text |
	text := aSocketError messageText.
	text := text isNil ifTrue: ['no details'] ifFalse: [text asString].
	(text includesString: 'unexpected eof') ifTrue: [
		self dynamicInstVarAt: #'___tlsRaggedEof' put: true.
		^ ByteArray new].
	((text includesString: 'SSL_ERROR_SYSCALL')
		and: [(self dynamicInstVarAt: #'___tlsRaggedEof') == true])
			ifTrue: [^ ByteArray new].
	^ OSError @env1:___signal___: 'recv failed: ' , text

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___toByteArray: data [
	"Python bytes (a ByteArray) or str -> a ByteArray GsSocket can write."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [^ data asByteArray].
	^ data asByteArray

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___toRawString: aByteArray [
	"ByteArray -> a String holding THE SAME BYTES, for GsSocket calls that
	take a String (sendUdp:flags:toHost:port:).  Not ``asString'': GemStone
	answers the receiver's DESCRIPTION for that, so a datagram sent through
	it arrives as the literal text ''aByteArray''."

	| s |
	s := String new: aByteArray size.
	1 to: aByteArray size do: [:i |
		s at: i put: (Character withValue: (aByteArray at: i))].
	^ s

]
