Extension { #name : 'PyRawSocket' }

{ #category : 'Grail-Select' }
PyRawSocket class >> ___indexResult___: rIdx _: wIdx [
	"Two OrderedCollections of 1-based indices as a Python list of two lists."

	| out a b |
	a := list ___new___.
	rIdx @env0:do: [:i | a append: i].
	b := list ___new___.
	wIdx @env0:do: [:i | b append: i].
	out := list ___new___.
	out append: a.
	out append: b.
	^ out

]

{ #category : 'Grail-Select' }
PyRawSocket class >> ___select___: readSocks _: writeSocks _: timeoutMs [
	"Plain select: a private semaphore nobody else can signal."

	^ self ___select___: readSocks _: writeSocks _: timeoutMs on: Semaphore @env0:new

]

{ #category : 'Grail-Select' }
PyRawSocket class >> ___select___: readSocks _: writeSocks _: timeoutMs on: sem [
	"N-way readiness wait.  Answers a list of two lists holding the 1-based
	INDICES of the ready sockets in readSocks and writeSocks respectively.

	timeoutMs: nil/None waits forever, 0 polls, otherwise milliseconds.

	Indices rather than the sockets themselves because the Python caller has to
	map back to the ORIGINAL objects it was handed -- which may be socketserver
	instances wrapping a socket, not sockets.

	Every element must be a PyRawSocket (or a subclass -- socket.socket and
	ssl.SSLSocket are) or an int descriptor one of them owns; select.py
	resolves wrappers first."

	| rGs wGs rReady wReady armedR armedW waitForever ms |
	rGs := OrderedCollection @env0:new.
	readSocks @env0:do: [:s | rGs @env0:add: (self ___selectGsSocketFor___: s)].
	wGs := OrderedCollection @env0:new.
	writeSocks @env0:do: [:s | wGs @env0:add: (self ___selectGsSocketFor___: s)].

	"1. Cheap pass first: if anything is already ready, no event machinery."
	rReady := PyRawSocket @env0:___readyNow___: rGs forWrite: false into: (OrderedCollection @env0:new).
	wReady := PyRawSocket @env0:___readyNow___: wGs forWrite: true into: (OrderedCollection @env0:new).
	waitForever := (timeoutMs == None) @env0:or: [timeoutMs == nil].
	ms := waitForever ifTrue: [0] ifFalse: [timeoutMs].
	(rReady @env0:notEmpty @env0:or: [wReady @env0:notEmpty])
		ifTrue: [^ PyRawSocket ___indexResult___: rReady _: wReady].
	(waitForever @env0:not and: [ms @env0:<= 0])
		ifTrue: [^ PyRawSocket ___indexResult___: rReady _: wReady].

	"2. Nothing ready: arm one semaphore for every socket and sleep on it.

	 ARM FIRST, THEN RE-CHECK, and only then wait.  A socket that became ready
	 between the cheap pass above and the arming would otherwise never fire its
	 event -- the registry signals on a TRANSITION -- and the wait would run to
	 the full timeout with the data already sitting there.  That lost wakeup is
	 not theoretical: it broke the Flask HTTPS test, where the client connects
	 while the server is between the two steps, and the handshake then failed
	 with a connection reset."
	armedR := PyRawSocket @env0:___registerAll___: rGs forWrite: false on: sem.
	armedW := PyRawSocket @env0:___registerAll___: wGs forWrite: true on: sem.
	rReady := PyRawSocket @env0:___readyNow___: rGs forWrite: false into: (OrderedCollection @env0:new).
	wReady := PyRawSocket @env0:___readyNow___: wGs forWrite: true into: (OrderedCollection @env0:new).
	(rReady @env0:notEmpty @env0:or: [wReady @env0:notEmpty]) ifTrue: [
		PyRawSocket @env0:___cancelAll___: armedR forWrite: false on: sem.
		PyRawSocket @env0:___cancelAll___: armedW forWrite: true on: sem.
		^ PyRawSocket ___indexResult___: rReady _: wReady].
	[
		waitForever
			ifTrue: [sem @env0:wait]
			ifFalse: [sem @env0:waitForMilliseconds: ms]
	] @env0:ensure: [
		PyRawSocket @env0:___cancelAll___: armedR forWrite: false on: sem.
		PyRawSocket @env0:___cancelAll___: armedW forWrite: true on: sem
	].

	"3. Re-test everything: several sockets may have become ready at once, and
	 select() must report all of them, not just whichever woke us."
	rReady := PyRawSocket @env0:___readyNow___: rGs forWrite: false into: (OrderedCollection @env0:new).
	wReady := PyRawSocket @env0:___readyNow___: wGs forWrite: true into: (OrderedCollection @env0:new).
	^ PyRawSocket ___indexResult___: rReady _: wReady

]

{ #category : 'Grail-Select' }
PyRawSocket class >> ___select___: readSocks _: writeSocks _: timeoutMs wake: aLock [
	"select that a SECOND green thread can cut short by releasing aLock --
	the asyncio loop's call_soon_threadsafe wake-up (asyncio/events.py).

	The wait happens on aLock's own semaphore, so a release() that lands while
	the loop is waiting wakes it, and one that lands BEFORE the wait leaves a
	signal behind that makes the wait return at once: no lost wake-up, which a
	flag checked before the wait could not promise.  aLock is held (signal
	count 0) by its owner while nothing is pending.

	Readiness events signal that semaphore too, so after the wait it may hold
	stray signals; draining them puts the lock back to held.  Draining also
	eats a wake-up that raced in, which is safe: the waker queued its callback
	BEFORE releasing, and the loop reads its ready queue after this returns."

	| sem result |
	sem := aLock @env0:_sem.
	result := self ___select___: readSocks _: writeSocks _: timeoutMs on: sem.
	[sem @env0:tryLock] @env0:whileTrue.
	^ result

]

{ #category : 'Grail-Select' }
PyRawSocket class >> ___selectGsSocketFor___: anEntry [
	"The GsSocket select() watches for one entry: a socket, or an int file
	descriptor.  asyncore (test.support.asyncore, and test_ssl's
	AsyncoreEchoServer on it) selects on fds, so an fd this session's sockets
	own is resolved through the registry; any other fd is EBADF, CPython's
	answer for a descriptor that is not open."

	| gs |
	anEntry == None ifTrue: [^ nil].
	(anEntry @env0:isKindOf: SmallInteger) ifFalse: [^ anEntry @env0:___gsSocket].
	gs := self @env0:___gsSocketForFd___: anEntry.
	gs @env0:isNil ifTrue: [
		^ OSError ___signalNew___: { 9 . 'Bad file descriptor' } kw: nil].
	^ gs

]

{ #category : 'Grail-Private' }
PyRawSocket class >> ___setsockoptCallout___ [
	"libc's setsockopt, for the options GsSocket has no name for.  A CCallout
	wraps per-process C state, so it is cached in SessionTemps, as os's are."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_socket_setsockopt_callout'
		ifAbsentPut: [
			CCallout
				@env0:library: (CLibrary @env0:named: os ___libcName)
				name: 'setsockopt'
				result: #'int32'
				args: #(#'int32' #'int32' #'int32' #'ptr' #'uint32')]

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> __new__ [
	^ self _new: #() kw: nil

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> __new__: family [
	^ self _new: { family } kw: nil

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> __new__: family _: type [
	^ self _new: { family . type } kw: nil

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> __new__: family _: type _: proto [
	^ self _new: { family . type . proto } kw: nil

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> __new__: family _: type _: proto _: fileno [
	^ self _new: { family . type . proto . fileno } kw: nil

]

{ #category : 'Grail-Constructors' }
PyRawSocket class >> _new: positional kw: kwargs [
	| inst |
	inst := self @env0:new.
	inst ___init__: (positional @env0:ifNil: [#()]) kw: kwargs.
	^ inst

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___connectCode___: sock on: host port: port [
	"Start (or ask after) a non-blocking connect and answer CPython's ERRNO for
	this call.  Shared by connect and connect_ex, which differ only in whether
	they raise it.

	GEMSTONE ALREADY DOES THE RIGHT THING HERE, and it is easy to miss.  Every
	socket the image creates is non-blocking at the OS level; the connect
	primitive is ALWAYS issued non-blocking; and it answers three things -- the
	socket itself once connected, false while the connect is still going, and the
	real errno once it has resolved and failed.  Re-sending it POLLS; it does not
	restart the connect.  So the primitive is both the issuer and the oracle, and
	it must be BOTH: it delivers a pending error once and answers EINVAL
	afterwards, so a connect issued by the public connectTo: and re-polled here
	reports EINVAL instead of the real error, intermittently.

	THREE ORACLES WERE MEASURED for the failure verdict.  Recording which lost,
	because two of them look better than they are:

	  * READINESS (``writable answers nil, therefore refused'').  True on macOS,
	    and it HUNG CI ON LINUX: whether an errored socket reports ready at all is
	    platform-dependent, and the inference failed open to ``still in progress'',
	    which on the asyncio path means wait forever.  Kept only as the fallback,
	    where a heuristic that terminates beats none at all.
	  * SO_ERROR, which is what CPython's own asyncio reads, and which GsSocket
	    does expose.  It is UNRELIABLE here: the read is destructive, GemStone's
	    own connect machinery reads it too, and whoever reads first wins -- so
	    measured across successive sockets it answers 61, 0, 61, 0 for identical
	    refusals.  A single clean probe made it look dependable; four did not.
	  * THE PRIMITIVE, which is deterministic -- 4 of 4 sockets answered
	    ``false, 61, 22, 22'' for a refused connect and ``false, SELF, SELF,
	    SELF'' for an accepted one.  It wins on evidence, not on preference.

	``connectIssued'' is the one bit of state that turns that into CPython's
	sequence, by separating the first call from every poll after it.  Both
	sequences measured against CPython 3.14.6:
	    open port:  36 (EINPROGRESS), then 56 (EISCONN), 56, 56 ...
	    refused:    36 (EINPROGRESS), then 61 (ECONNREFUSED), then 22 (EINVAL) ...

	The answer is deliberately a code rather than an exception so connect and
	connect_ex cannot disagree about what happened -- they did."

	| addrs status verdict |
	addrs := [sock @env0:_twoArgPrim: 25 with: host with: port]
		@env0:on: Error do: [:e | e @env0:return: nil].
	(addrs @env0:isNil @env0:or: [addrs @env0:size @env0:< 2]) ifTrue: [
		^ self ___connectCodeFallback___: sock on: host port: port].

	"The FIRST address only.  CPython's connect() does not iterate either --
	create_connection is what walks getaddrinfo -- and polling a different address
	than the connect was issued on would ask about the wrong connect."
	status := [sock @env0:_twoArgPrim: 2 with: (addrs @env0:at: 2) with: nil]
		@env0:on: Error do: [:e | e @env0:return: #'unknown'].

	connectIssued == true ifFalse: [
		connectIssued := true.
		status @env0:== sock ifTrue: [^ 0].
		status @env0:== false ifTrue: [^ self ___errno: 'EINPROGRESS'].
		(status @env0:isKindOf: Integer)
			ifTrue: [^ status]
			ifFalse: [^ self ___connectCodeFallback___: sock on: host port: port]].

	"A poll of a connect already started.  CPython answers EISCONN once it has
	completed and EALREADY while it is still going -- and EISCONN is NOT a
	BlockingIOError, so a retry loop terminates instead of silently succeeding.

	READINESS IS CONSULTED FIRST, AND ONLY WHEN IT IS UNAMBIGUOUS.  The primitive
	above is the oracle this method was built on, and on macOS 27 it stopped being
	one -- measured, 5 sockets each:

	    open port   prim: false false false false | write=true read=false
	    refused     prim: false false SELF SELF   | write=nil  read=true

	It never reports success for a connect that SUCCEEDED, and it reports SELF --
	which this method reads as EISCONN -- for one that was REFUSED.  That is how a
	refused connect came back from asyncio as ``connected?!''.  Readiness, by
	contrast, separated the two 5 times out of 5, and the split is the ordinary
	one: a connected socket is writable, a socket whose connect resolved and
	FAILED is readable.

	So this defers to readiness only when exactly ONE of the two is true, and
	falls through to the primitive otherwise.  That is what keeps the older
	platforms unchanged: on macOS 26.6 a refused connect is readable and not
	writable, so readiness answers 61 where the primitive also answered 61; on
	Linux an errored socket tends to report BOTH, which is not unambiguous, so the
	primitive keeps deciding exactly as before.  The clause that hung CI on Linux
	inferred refusal from ``not writable'' and failed open to in-progress; this one
	requires a POSITIVE readable, and anything it cannot call still ends up at the
	primitive rather than at a guess."
	verdict := self ___connectVerdictFromReadiness___: sock.
	verdict @env0:isNil ifFalse: [^ verdict].
	status @env0:== sock ifTrue: [^ self ___errno: 'EISCONN'].
	status @env0:== false ifTrue: [^ self ___errno: 'EALREADY'].
	(status @env0:isKindOf: Integer) ifTrue: [^ status].
	^ self ___connectCodeFallback___: sock on: host port: port

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___connectCodeFallback___: sock on: host port: port [
	"FALLBACK for an image that cannot answer SO_ERROR.  Measured on macOS: after
	connectTo: has answered false, a connect still going leaves the socket neither
	readable nor writable, while one that resolved and FAILED answers nil to
	writeWillNotBlock.

	This is a heuristic, and it is the one that hung CI on Linux when it was the
	primary path -- so it is only reached when there is nothing better, and the
	caller polls on a timer rather than waiting on readiness alone, which is what
	turns being wrong here into a slow connect instead of a hang.

	Read for nil SPECIFICALLY, not for ``not true'': if the probe cannot answer,
	say in progress, because a caller that polls recovers from that."

	| probe |
	(sock @env0:connectTo: port on: host timeoutMs: 0) == true ifTrue: [^ 0].
	probe := [sock @env0:writeWillNotBlock]
		@env0:on: Error do: [:e | e @env0:return: #'unknown'].
	^ probe @env0:isNil
		ifTrue: [self ___errno: 'ECONNREFUSED']
		ifFalse: [self ___errno: 'EINPROGRESS']

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___connectVerdictFromReadiness___: sock [
	"Answer 56 (EISCONN) for a connect that completed, 61 (ECONNREFUSED) for one
	that resolved and FAILED, or nil for ``cannot tell'' -- and nil is the common
	case while a connect is still in flight.

	ONLY AN UNAMBIGUOUS SPLIT COUNTS.  A connected socket is writable and has
	nothing to read; a failed one is readable (the pending error is what there is
	to read) and not writable.  When BOTH are true the socket is telling us
	nothing useful -- a connected socket with data already waiting looks exactly
	like that, and so does an errored socket on Linux -- so the caller falls back
	to the primitive rather than guessing here.  Guessing from ``not writable''
	alone is precisely what once hung CI on Linux.

	nil from either probe means the probe itself failed, which GsSocket reports
	the same way GsFile does.  It is treated as ``not true'' rather than as an
	answer, and it is the READABLE half that is load-bearing: measured on macOS
	27, writeWillNotBlock answered nil on only 1 of 3 sockets at one sampling and
	5 of 5 at another, while readWillNotBlock answered true every time -- so a
	rule resting on the nil would be timing-dependent.

	The errno is ECONNREFUSED rather than the real one because there is none to be
	had: measured on macOS 27, lastErrorCode answers 0, lastErrorSymbol nil, and
	option: cannot read SO_ERROR.  A connect that TIMED OUT is therefore reported
	as refused -- the same trade ___connectCodeFallback___ already makes."

	| w r |
	w := [sock @env0:writeWillNotBlock] @env0:on: Error do: [:e | e @env0:return: nil].
	r := [sock @env0:readWillNotBlock] @env0:on: Error do: [:e | e @env0:return: nil].
	(w @env0:== true @env0:and: [r @env0:~~ true]) ifTrue: [^ self ___errno: 'EISCONN'].
	(r @env0:== true @env0:and: [w @env0:~~ true]) ifTrue: [^ self ___errno: 'ECONNREFUSED'].
	^ nil

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___errno: aName [
	"The running platform's errno called aName -- ECONNREFUSED is 61 on Darwin
	and 111 on Linux.  Every errno this class reports is the platform's own,
	which is what errno.py publishes now too (OSError >> ___errnoPairsFor___:).
	It used to translate Linux numbers onto Darwin's, because errno.py was the
	Darwin table everywhere; os never did, so the two disagreed on Linux."

	^ OSError ___errnoNamed: aName

]

{ #category : 'Grail-Finalization' }
PyRawSocket >> ___finalizeUnclosed___ [
	"CPython's sock_finalize: a socket that dies still holding its descriptor
	warns ``ResourceWarning: unclosed <socket ...>'' and then closes it --
	warning FIRST, so the repr still shows the address it leaked.  Run at the
	next safe point after the socket dies (FinalizerEphemeron), and never by
	way of a Python close() override, which CPython's destructor does not
	call either.  A closed or detached socket is quiet.  Nothing raised here
	may escape into whatever code reached the safe point (test_ssl
	test_dealloc_warn)."

	| fd |
	(sockClosed == true or: [gsSocket @env0:isNil]) ifTrue: [^ self].
	[ | wmClass |
		wmClass := Python @env0:at: #warnings otherwise: nil.
		wmClass == nil ifFalse: [
			wmClass instance
				___warn___: 'unclosed ' @env0:, (self __repr__) @env0:asString
				category: ResourceWarning
				stacklevel: 1]]
		@env0:on: AbstractException
		do: [:ex |
			((ex @env0:isKindOf: AlmostOutOfStack)
				or: [ex @env0:isKindOf: AlmostOutOfStackError])
					ifTrue: [ex @env0:pass].
			ex @env0:return: nil].
	gsSocket @env0:isNil ifTrue: [^ self].
	fd := gsSocket @env0:id.
	[gsSocket @env0:close] @env0:on: Error do: [:e | e @env0:return: nil].
	PyRawSocket @env0:___forgetFd___: fd.
	gsSocket := nil.
	sockClosed := true

]

{ #category : 'Grail-Constructors' }
PyRawSocket >> ___init__: positional kw: kwargs [
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

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> ___intoCount___: nbytes for: buffer what: aName [
	"How many bytes a recv_into / recvfrom_into may read: the whole buffer
	for nbytes 0 or None, else nbytes, which CPython refuses when it is
	negative or larger than the buffer."

	(nbytes @env0:isNil or: [nbytes == None or: [nbytes @env0:= 0]])
		ifTrue: [^ buffer @env0:size].
	nbytes @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'negative buffersize in ' @env0:, aName].
	nbytes @env0:> buffer @env0:size ifTrue: [
		^ ValueError ___signal___: 'buffer too small for requested bytes'].
	^ nbytes

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___isNonBlocking___ [
	"The middle of CPython's three timeout states: timeout 0, which is
	``do not wait at all''.  Same test as getblocking, negated."

	^ timeoutSecs @env0:notNil @env0:and: [timeoutSecs @env0:= 0]

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___neverConnected___: sock [
	"Whether sock is a stream socket that NEVER had a peer, the case recv(),
	recvfrom() and sendto() answer ENOTCONN for without touching the socket.

	getpeername cannot say so by itself.  After a peer's RESET it fails with
	EINVAL on Darwin but with ENOTCONN on Linux -- the same errno as a socket
	that never connected -- so on Linux the reset socket of test_ssl's
	test_wrong_cert_tls12 was answered ENOTCONN where CPython reads the TLS
	alert that arrived before the reset.  So a peer, once seen (connect,
	accept, any getpeername that found one), is remembered in hadPeer."

	hadPeer == true ifTrue: [^ false].
	^ (self ___noPeerErrno___: sock) @env0:= (self ___errno: 'ENOTCONN')

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___noPeerErrno___: sock [
	"nil when sock has a peer, else the errno its getpeername() failed with.
	The two errnos mean different things and only one is ``not connected'':
	57 (ENOTCONN) is a socket that never had a peer; 22 (EINVAL) is Darwin's
	answer once the peer RESET the connection.  Treating the second as the
	first made recv() on a reset socket raise ENOTCONN, where CPython reads
	what arrived or gets ECONNRESET (test_ssl test_wrong_cert_tls12)."

	sock @env0:peerAddress @env0:notNil ifTrue: [self ___notePeer___. ^ nil].
	"lastErrorCode is the PLATFORM's errno -- ENOTCONN is 107 on Linux -- so it
	is mapped onto Grail's errno module, which ssl.py compares it against
	(``e.errno != errno.ENOTCONN'' in SSLSocket._create).  Unmapped, every TLS
	wrap on Linux re-raised OSError 107.  EINVAL is 22 on both."
	^ ([sock @env0:lastErrorCode] @env0:on: Error do: [:e | e @env0:return: nil])
		@env0:ifNil: [self ___errno: 'ENOTCONN']

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___notConnected___ [
	"OSError(ENOTCONN), CPython's answer for getpeername() or recv() on a
	stream socket that has no peer.  The errno is Grail's errno module's
	(57), for the reason ___notReadyNow___ gives for EAGAIN."

	^ self ___raiseErrno: 'ENOTCONN' as: OSError

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___notePeer___ [
	"This socket has a peer: remember it here (hadPeer) and on the GsSocket
	(___peeredGsSockets___), for the object that adopts its fd.  ssl.py adopts
	BEFORE it detaches, so a client socket's connect is the only place the
	fact can be recorded in time."

	hadPeer := true.
	gsSocket @env0:isNil ifFalse: [
		PyRawSocket @env0:___peeredGsSockets___ @env0:add: gsSocket]

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___notReadyNow___ [
	"What a socket that is NOT ready raises -- which depends on which of
	CPython's three timeout states it is in, and Grail conflated two of them.

	``settimeout(0)'' is not ``a zero timeout'', it is NON-BLOCKING mode, and the
	answer there is BlockingIOError(EAGAIN): the call did not fail and did not
	time out, it declined to wait.  TimeoutError is for a POSITIVE timeout that
	expired.  Grail raised TimeoutError for both, which breaks the one idiom
	every non-blocking reader is written in --

	    try: data = sock.recv(n)
	    except (BlockingIOError, InterruptedError): <wait for readiness, retry>

	-- because in CPython (and here) TimeoutError is a SIBLING of
	BlockingIOError under OSError, not a subclass, so the except clause does not
	catch it.  Grail's own VENDORED socket.py contains exactly that clause twice
	(makefile's raw reader, and the sendfile fallback), so those paths could
	never reach their retry branch: the error escaped as a timeout instead.
	asyncio's sock_recv / sock_accept are written the same way, which is where
	this surfaced.

	The errno must agree with Grail's errno module -- Python code compares
	``e.errno'' against ``errno.EAGAIN'', so the two drifting apart is worse than
	either value being wrong; a test pins the agreement rather than the number.
	35 is what errno.py says today.  The strerror is CPython's for EAGAIN.

	The state is read from timeoutSecs, NOT from ___timeoutMs: a timeout small
	enough to round to zero milliseconds (settimeout(0.0001)) is still the
	blocking-with-a-timeout state, and answering BlockingIOError there would
	reintroduce the same confusion in the other direction."

	self ___isNonBlocking___ ifTrue: [
		^ self ___raiseErrno: 'EAGAIN' as: BlockingIOError].
	^ TimeoutError ___signal___: 'timed out'

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___raiseConnectCode___: code [
	"Turn ___connectCode___'s answer into what connect() raises.

	EINPROGRESS and EALREADY are both BlockingIOError, as in CPython -- which is
	what lets a caller write ``except BlockingIOError'' once and cover both the
	first call and every poll after it.  EISCONN is NOT: it is an ordinary
	OSError, so a retry loop written against CPython terminates rather than
	silently succeeding, which is the behaviour this class of bug hides in."

	code @env0:= 0 ifTrue: [^ None].
	code @env0:= (self ___errno: 'EINPROGRESS') ifTrue: [
		^ self ___raiseErrno: 'EINPROGRESS' as: BlockingIOError].
	code @env0:= (self ___errno: 'EALREADY') ifTrue: [
		^ self ___raiseErrno: 'EALREADY' as: BlockingIOError].
	code @env0:= (self ___errno: 'EISCONN') ifTrue: [
		^ self ___raiseErrno: 'EISCONN' as: OSError].
	code @env0:= (self ___errno: 'ECONNREFUSED') ifTrue: [
		^ self ___raiseErrno: 'ECONNREFUSED' as: ConnectionRefusedError].
	code @env0:= (self ___errno: 'ETIMEDOUT') ifTrue: [
		^ self ___raiseErrno: 'ETIMEDOUT' as: TimeoutError].
	(code @env0:= 22) ifTrue: [
		^ OSError ___signalNew___: { 22 . 'Invalid argument' } kw: nil].
	^ OSError ___signalNew___: { code . 'Connect call failed' } kw: nil

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___raiseErrno: aName as: aClass [
	"aClass(errno, strerror) for the errno called aName, with libc's strerror,
	so the text is the platform's: Linux says ``Transport endpoint is not
	connected'' where Darwin says ``Socket is not connected''."

	| n |
	n := self ___errno: aName.
	^ aClass ___signalNew___:
		{ n . (os ___strerrorCallout @env0:callWith: { n }) } kw: nil

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> ___recvBytes___: bufsize [
	"The read behind every recv arity and recv_into.  A Grail-internal name so
	that no Python subclass can override it: ssl.SSLSocket overrides recv and
	recv_into, and a base recv_into that self-sent ``recv:'' ran the SSL
	override -- which asks the base again, and recursed."

	| sock ba n ms |
	sock := self @env0:___ensureOpen.
	bufsize @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'negative buffersize in recv'].
	bufsize @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	"A stream socket with no peer: ENOTCONN, as in CPython -- not the EAGAIN
	(or the wait) the readiness check below would answer.  ssl.py's
	SSLSocket._create probes an unconnected socket with exactly this call and
	accepts only ENOTCONN or EINVAL."
	(self type @env0:= 1 and: [self ___neverConnected___: sock]) ifTrue: [
		^ self ___notConnected___].
	ms := self @env0:___timeoutMs.
	ba := ByteArray @env0:new: bufsize.
	"Both the readiness probe (GsSecureSocket>>_peek) and the read itself
	SIGNAL a SocketError on a TLS failure; see ___tlsReadError:."
	n := [ms @env0:notNil ifTrue: [
			(sock @env0:readWillNotBlockWithin: ms) == true ifFalse: [
				^ self ___notReadyNow___]].
		sock @env0:read: bufsize into: ba startingAt: 1]
			@env0:on: SocketError
			do: [:e | ^ self @env0:___tlsReadError: e].
	n @env0:isNil ifTrue: [^ self @env0:___fail: 'recv failed'].
	n @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ ba @env0:copyFrom: 1 to: n

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> ___recvfromBytes___: bufsize [
	"``(data, address)'' from a UDP socket.  GsSocket >> recvfrom: answers
	{ data . { af . port . nil . ip } }, so the address tuple is rebuilt
	here in CPython's (host, port) order.  A stream socket with no peer is
	ENOTCONN, as for recv.  Grail-internal for the reason ___recvBytes___:
	is."

	| sock res data info |
	sock := self @env0:___ensureOpen.
	(self type @env0:= 1 and: [self ___neverConnected___: sock]) ifTrue: [
		^ self ___notConnected___].
	res := sock @env0:recvfrom: bufsize.
	res @env0:isNil ifTrue: [^ self @env0:___fail: 'recvfrom failed'].
	data := res @env0:at: 1.
	info := res @env0:at: 2.
	^ tuple @env0:withAll: { (self @env0:___toByteArray: data) .
		tuple @env0:withAll: { ((info @env0:at: 4) @env0:ifNil: ['']) @env0:asString .
		  ((info @env0:at: 2) @env0:ifNil: [0]) } }

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___resolvedConnectCode___: sock on: host port: port timeoutMs: ms [
	"CPython's errno for a blocking connect that was WAITED for and did not
	succeed.  Shared by connect, which raises it, and connect_ex, which answers it.

	The fallback's EINPROGRESS cannot stand here: this connect was waited for.
	With a TIMEOUT that expired it is CPython's SOCK_TIMEOUT_ERR, EWOULDBLOCK
	(test_ssl test_timeout_connect_ex; 35 is Grail's errno.EWOULDBLOCK, as for
	___notReadyNow___).  With no timeout the wait ran until the connect
	resolved, so it FAILED: Linux reports a refused socket writable, which the
	fallback reads as still going (test_ssl test_connect_ex_error)."

	| code |
	code := self ___connectCodeFallback___: sock on: host port: port.
	^ code @env0:= (self ___errno: 'EINPROGRESS')
		ifTrue: [self ___errno: (ms @env0:notNil ifTrue: ['EWOULDBLOCK'] ifFalse: ['ECONNREFUSED'])]
		ifFalse: [code]

]

{ #category : 'Grail-Private' }
PyRawSocket >> ___setLinger___: value on: sock [
	"SO_LINGER, which GsSocket has no named option for (``option: 'LINGER'''
	is ArgumentError 2291), so it goes to libc's setsockopt on the socket's
	own fd, with THIS platform's constants rather than Grail's Linux ones
	(design note 1).  Ignoring it, as an unknown option is ignored, made
	``struct.pack('ii', 1, 0)'' -- the abortive close -- a no-op: close()
	sent a FIN instead of a RST, and test_ssl's TestPreHandshakeClose then
	saw a peer that still read as connected and handshook with plaintext.
	The value is the packed ``struct linger'' (or an int, which the kernel
	judges, as CPython passes it through)."

	| bytes buf errno result |
	bytes := (value @env0:isKindOf: Integer)
		ifTrue: [ | ba |
			ba := ByteArray @env0:new: 4.
			1 @env0:to: 4 do: [:i |
				ba @env0:at: i put: ((value @env0:bitShift: (i @env0:- 1) @env0:* -8) @env0:bitAnd: 255)].
			ba]
		ifFalse: [
			(value @env0:isKindOf: ByteArray) ifFalse: [
				^ TypeError ___signal___: 'a bytes-like object is required, not '''
					@env0:, value ___pyDnuTypeName___ @env0:, ''''].
			value].
	buf := CByteArray @env0:withAll: bytes nullTerminate: false.
	errno := Array @env0:new: 1.
	result := PyRawSocket ___setsockoptCallout___
		@env0:callWith: {
			sock @env0:id.
			os ___isDarwin ifTrue: [16rFFFF] ifFalse: [1].
			os ___isDarwin ifTrue: [16r80] ifFalse: [13].
			buf.
			bytes @env0:size }
		errno: errno.
	result @env0:= -1 ifTrue: [
		^ OSError ___signalNew___: {
			errno @env0:at: 1.
			os ___strerrorCallout @env0:callWith: { errno @env0:at: 1 } } kw: nil].
	^ None

]

{ #category : 'Grail-Constructors' }
PyRawSocket >> __init__ [
	^ self __init__: 2 _: 1 _: 0

]

{ #category : 'Grail-Constructors' }
PyRawSocket >> __init__: family [
	^ self __init__: family _: 1 _: 0

]

{ #category : 'Grail-Constructors' }
PyRawSocket >> __init__: family _: type [
	^ self __init__: family _: type _: 0

]

{ #category : 'Grail-Constructors' }
PyRawSocket >> __init__: family _: type _: proto [
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

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> _accept [
	"CPython's ``_socket.socket._accept()'' -- answers ``(fd, addr)'', NOT a
	socket object.  socket.py then rebuilds a socket from the fd, which is
	why the accepted GsSocket has to be findable again by descriptor; see
	design note 2."

	| sock conn ms fd |
	sock := self @env0:___ensureOpen.
	ms := self @env0:___timeoutMs.
	ms @env0:notNil ifTrue: [
		(sock @env0:readWillNotBlockWithin: ms) == true ifFalse: [
			^ self ___notReadyNow___]].
	conn := sock @env0:accept.
	conn @env0:isNil ifTrue: [^ self @env0:___fail: 'accept failed'].
	"Keep the fd alive past this GsSocket's own GC: socket.py will adopt it."
	[conn @env0:setCloseOnGc: false] @env0:on: Error do: [:e | e @env0:return: nil].
	fd := PyRawSocket @env0:___registerFd___: conn.
	"An accepted connection HAD a peer, even if it resets before socket.py
	adopts the fd (see ___peeredGsSockets___)."
	PyRawSocket @env0:___peeredGsSockets___ @env0:add: conn.
	^ tuple @env0:withAll: { fd . tuple @env0:withAll: { (conn @env0:peerAddress @env0:ifNil: ['']) .
			(conn @env0:peerPort @env0:ifNil: [0]) } }

]

{ #category : 'Grail-Readiness' }
PyRawSocket >> _readableNow [
	"True if a read or accept would not block right now -- data pending, or on
	a listening socket a connection waiting.  select.py uses the presence of
	this method as the marker for ``this object IS a socket''."

	^ (self @env0:___ensureOpen) @env0:readWillNotBlock

]

{ #category : 'Grail-Readiness' }
PyRawSocket >> _readableWithin: ms [
	"Block up to ``ms'' milliseconds (negative = forever) waiting for the
	socket to become readable; answer whether it did.  Suspends the GsProcess
	while waiting, so other green threads run."

	^ (self @env0:___ensureOpen) @env0:readWillNotBlockWithin: ms

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslCipherName [
	"The negotiated cipher description string, empty if not yet connected."

	^ (self @env0:___ensureOpen) @env0:fetchCipherDescription

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslLastVerifyError [
	"OpenSSL's last client-side certificate verification error, or an empty
	string when there is none.  Turns a failed handshake into
	ssl.SSLCertVerificationError."

	| err |
	err := [GsSecureSocket @env0:fetchLastCertificateVerificationErrorForClient]
		@env0:on: Error do: [:e | e @env0:return: nil].
	^ err @env0:isNil ifTrue: [''] ifFalse: [err @env0:asString]

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslSecureAccept [
	"Run the server-side TLS handshake (suspends the GsProcess while waiting,
	so a peer in another green thread can drive its half)."

	(self @env0:___ensureOpen) @env0:secureAccept.
	^ None

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslSecureConnect [
	"Run the client-side TLS handshake (suspends while waiting).

	GsSecureSocket signals a Smalltalk Error on a failed handshake -- an
	untrusted, expired or mismatched peer certificate being the common case.
	A raw Smalltalk Error is not catchable from Python, so it would abort the
	program instead of raising; convert it to OSError, which ssl.py re-raises
	as SSLCertVerificationError / SSLError."

	[(self @env0:___ensureOpen) @env0:secureConnect]
		@env0:on: Error
		do: [:e |
			OSError @env1:___signal___:
				(e @env0:messageText @env0:ifNil: ['TLS handshake failed']) @env0:asString].
	^ None

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslServerName [
	"The server name (SNI) the handshake carried: on a SERVER endpoint, the
	name the client asked for; None when it sent none.  ssl.py hands it to
	SSLContext.sni_callback, as CPython does (test_urllib2_localnet
	test_https_sni)."

	| name |
	name := [(self @env0:___ensureOpen) @env0:getServerNameIndication]
		@env0:on: Error do: [:e | e @env0:return: nil].
	(name == nil @env0:or: [name @env0:isEmpty]) ifTrue: [^ None].
	^ name @env0:asString

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslUseCADirectory: path [
	"Verify peer certificates against the OpenSSL hash directory ``path''."

	GsSecureSocket @env0:useCACertificateDirectoryForClients: path @env0:asString.
	^ None

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslUseCAFile: path [
	"Verify peer certificates against the PEM bundle at ``path''."

	GsSecureSocket @env0:useCACertificateFileForClients: path @env0:asString.
	^ None

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslVersionName [
	"The negotiated TLS protocol version (e.g. ``TLSv1.3'')."

	^ (self @env0:___ensureOpen) @env0:tlsActualVersion @env0:asString

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslWrapClientSNI: host _: doVerify [
	"Hand this socket's live TCP connection to a new TLS *client* endpoint.
	``host'' (empty = none) sets the SNI name and, when verifying, the expected
	peer name.  Call ``_sslSecureConnect'' next."

	| sock sec hostStr hasHost |
	sock := self @env0:___ensureOpen.
	sec := GsSecureSocket @env0:newClientFromGsSocket: sock.
	gsSocket := sec.
	PyRawSocket @env0:___registerFd___: sec.
	hostStr := host @env0:asString.
	hasHost := hostStr @env0:isEmpty @env0:not.
	hasHost ifTrue: [sec @env0:setServerNameIndication: hostStr].
	"@env1: on the truthiness send, NOT @env0:.  ``___isTruthy___'' is an env-1
	method, and ssl.py hands a Python bool here -- which in Grail IS a plain
	Smalltalk Boolean, a class with no env-0 ___isTruthy___ at all.  So the
	env-0 spelling raised an uncatchable ``a Boolean does not understand
	#___isTruthy___'' the moment any client wrapped a socket, and the visible
	symptom was on the OTHER side of the connection: the server sat in
	secureAccept until it reported ``secure accept timed out'', because the
	client died before sending a ClientHello.  Kept as a truthiness test rather
	than the plain ifTrue:ifFalse: this replaced, so a caller passing something
	other than a bool still gets Python semantics."
	(doVerify @env1:___isTruthy___)
		ifTrue: [sec @env0:enableCertificateVerification]
		ifFalse: [sec @env0:disableCertificateVerification].
	((doVerify @env1:___isTruthy___) @env0:and: [hasHost])
		ifTrue: [sec @env0:addExpectedHost: hostStr].
	^ None

]

{ #category : 'Grail-TLS' }
PyRawSocket >> _sslWrapServerCert: certFile _: keyFile _: pw [
	"Hand this socket's live TCP connection to a new TLS *server* endpoint and
	load the PEM certificate + private key (``pw'' empty = no passphrase).
	Call ``_sslSecureAccept'' next to run the handshake."

	| sock sec pwArg |
	sock := self @env0:___ensureOpen.
	sec := GsSecureSocket @env0:newServerFromGsSocket: sock.
	gsSocket := sec.
	"The fd map keys on the descriptor and the secure socket carries the same
	one, so re-register: the entry must point at the object that now owns the
	descriptor, not at the plain GsSocket we just handed over."
	PyRawSocket @env0:___registerFd___: sec.
	pwArg := pw @env0:asString.
	pwArg @env0:isEmpty ifTrue: [pwArg := nil].
	sec @env0:disableCertificateVerification.
	sec @env0:useCertificateFile: certFile @env0:asString
		withPrivateKeyFile: keyFile @env0:asString
		privateKeyPassphrase: pwArg.
	^ None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> bind: address [
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

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> close [
	"Release the descriptor.  Idempotent, like CPython's."

	| fd |
	gsSocket @env0:notNil ifTrue: [
		fd := gsSocket @env0:id.
		[gsSocket @env0:close] @env0:on: Error do: [:e | e @env0:return: nil].
		PyRawSocket @env0:___forgetFd___: fd.
		gsSocket := nil].
	sockClosed := true.
	^ None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> connect_ex: address [
	"Like connect(), but ANSWER the errno instead of raising -- 0 on success.
	This is the form socketserver and port scanners use.

	It is built on the same classifier as connect rather than on catching what
	connect raises.  The catching version did not work: measured, a blocking
	connect_ex to a closed port RAISED ``OSError: connect failed'' instead of
	answering 61, so the one contract this method has -- never raise -- was not
	being kept.  Reading the errno from the classifier keeps connect and
	connect_ex from disagreeing about what happened, which is the other thing
	that went wrong.

	The outer handler stays as a backstop for the errors the classifier does not
	speak for at all (a bad address, a closed socket), where CPython also raises
	rather than answering a code."

	| sock host port |
	sock := self @env0:___ensureOpen.
	host := (address @env0:at: 1) @env0:asString.
	port := address @env0:at: 2.
	self ___isNonBlocking___ ifTrue: [
		^ self ___connectCode___: sock on: host port: port].

	"Blocking: connectTo: has already done the waiting, so a false answer means
	the connect RESOLVED -- and then the readiness probe says how.  NOT
	___connectCode___ here: that re-issues the connect, and re-issuing one on a
	socket whose connect has already failed answers EINVAL rather than the
	original error (measured: 22 instead of 61)."
	^ [ | ms ok |
		ms := self @env0:___timeoutMs.
		ok := ms @env0:isNil
			ifTrue: [sock @env0:connectTo: port on: host]
			ifFalse: [sock @env0:connectTo: port on: host timeoutMs: ms].
		ok == true
			ifTrue: [self ___notePeer___. 0]
			ifFalse: [self ___resolvedConnectCode___: sock on: host port: port timeoutMs: ms] ]
		@env0:on: Error
		do: [:e | | code |
			code := [gsSocket @env0:isNil ifTrue: [nil] ifFalse: [gsSocket @env0:lastErrorCode]]
				@env0:on: Error do: [:e2 | e2 @env0:return: nil].
			e @env0:return: (code @env0:ifNil: [111])]

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> connect: address [
	| sock host port ms ok |
	sock := self @env0:___ensureOpen.
	host := (address @env0:at: 1) @env0:asString.
	port := address @env0:at: 2.
	self ___isNonBlocking___ ifTrue: [
		^ self ___raiseConnectCode___:
			(self ___connectCode___: sock on: host port: port)].
	ms := self @env0:___timeoutMs.
	ok := ms @env0:isNil
		ifTrue: [sock @env0:connectTo: port on: host]
		ifFalse: [sock @env0:connectTo: port on: host timeoutMs: ms].
	ok == true ifFalse: [
		(ms @env0:notNil @env0:and: [ok @env0:isNil]) ifTrue: [
			^ TimeoutError ___signal___: 'timed out'].
		"Raised as the errno connect_ex answers for the same failure, so the two
		cannot disagree: a refused connect is ConnectionRefusedError [Errno 61],
		as in CPython.  It was a bare ``OSError: connect failed: getpeername(15)
		failed with Invalid argument'', GemStone's own wording for how it found
		out -- which no ``except ConnectionRefusedError'' could catch."
		^ self ___raiseConnectCode___:
			(self ___resolvedConnectCode___: sock on: host port: port timeoutMs: ms)].
	self ___notePeer___.
	^ None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> detach [
	"Give up ownership of the descriptor WITHOUT closing it, answering the
	fd (CPython's socket.detach()).  The GsSocket stays in the registry so
	whoever adopts the fd through socket(fileno=...) still finds it."

	| fd |
	fd := self fileno.
	gsSocket @env0:notNil ifTrue: [
		[gsSocket @env0:setCloseOnGc: false]
			@env0:on: Error do: [:e | e @env0:return: nil].
		hadPeer == true ifTrue: [
			PyRawSocket @env0:___peeredGsSockets___ @env0:add: gsSocket]].
	gsSocket := nil.
	sockClosed := true.
	^ fd

]

{ #category : 'Grail-Queries' }
PyRawSocket >> family [
	^ sockFamily @env0:ifNil: [2]

]

{ #category : 'Grail-Queries' }
PyRawSocket >> fileno [
	"The file descriptor, or -1 once closed -- CPython's convention."

	(sockClosed == true @env0:or: [gsSocket @env0:isNil]) ifTrue: [^ -1].
	^ gsSocket @env0:id @env0:ifNil: [-1]

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> getblocking [
	"True unless the socket is in the non-blocking (timeout == 0) state."

	^ (timeoutSecs @env0:notNil @env0:and: [timeoutSecs @env0:= 0]) @env0:not

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> getpeername [
	"The peer's address, or CPython's ENOTCONN when there is none.  It
	answered ``('', 0)'' for an unconnected socket, which is how ssl.py tells
	a LISTENER from a connection: SSLSocket._create asks getpeername() and
	only an OSError(ENOTCONN) means ``not connected, do not handshake''."

	| sock code |
	sock := self @env0:___ensureOpen.
	code := self ___noPeerErrno___: sock.
	code @env0:notNil ifTrue: [
		code @env0:= (self ___errno: 'ENOTCONN') ifTrue: [^ self ___notConnected___].
		^ OSError ___signalNew___: { code . (sock @env0:lastErrorString) @env0:asString } kw: nil].
	^ tuple @env0:withAll: { (sock @env0:peerAddress @env0:ifNil: ['']) @env0:asString .
		(sock @env0:peerPort @env0:ifNil: [0]) }

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> getsockname [
	| sock |
	sock := self @env0:___ensureOpen.
	"A TUPLE, as in CPython: ``s.getsockname() == ('127.0.0.1', port)''."
	^ tuple @env0:withAll: { (sock @env0:address @env0:ifNil: ['0.0.0.0']) @env0:asString .
		(sock @env0:port @env0:ifNil: [0]) }

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> getsockopt: level _: optname [
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

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> getsockopt: level _: optname _: buflen [
	"The buffer form returns bytes; only the int options are meaningful here."

	| v ba |
	v := self getsockopt: level _: optname.
	ba := ByteArray @env0:new: buflen.
	1 @env0:to: (buflen @env0:min: 4) do: [:i |
		ba @env0:at: i put: ((v @env0:bitShift: (i @env0:- 1) @env0:* -8) @env0:bitAnd: 255)].
	^ ba

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> gettimeout [
	^ timeoutSecs @env0:ifNil: [None]

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> listen [
	^ self listen: 128

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> listen: backlog [
	| sock |
	sock := self @env0:___ensureOpen.
	(sock @env0:makeListener: backlog) @env0:isNil ifTrue: [
		^ self @env0:___fail: 'listen failed'].
	^ None

]

{ #category : 'Grail-Queries' }
PyRawSocket >> proto [
	^ sockProto @env0:ifNil: [0]

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recv_into: buffer [
	^ self recv_into: buffer _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recv_into: buffer _: nbytes [
	^ self recv_into: buffer _: nbytes _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recv_into: buffer _: nbytes _: flags [
	"Read straight into a bytearray/memoryview, answering the count.  This
	is what makefile()'s buffered reader uses, so it matters for throughput.
	The three-argument form is the one ssl.SSLSocket reaches through
	``super().recv_into(buffer, nbytes, flags)''."

	| want n data |
	self @env0:___ensureOpen.
	want := self ___intoCount___: nbytes for: buffer what: 'recv_into'.
	want @env0:= 0 ifTrue: [^ 0].
	data := self ___recvBytes___: want.
	n := data @env0:size.
	1 @env0:to: n do: [:i | buffer @env0:at: i put: (data @env0:at: i)].
	^ n

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recv: bufsize [
	^ self recv: bufsize _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recv: bufsize _: flags [
	"Read up to bufsize bytes.  An empty result is EOF, as in CPython."

	^ self ___recvBytes___: bufsize

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recvfrom_into: buffer [
	^ self recvfrom_into: buffer _: 0 _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recvfrom_into: buffer _: nbytes [
	^ self recvfrom_into: buffer _: nbytes _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recvfrom_into: buffer _: nbytes _: flags [
	"``(nbytes, address)'', the datagram read into buffer."

	| want res data n |
	self @env0:___ensureOpen.
	want := self ___intoCount___: nbytes for: buffer what: 'recvfrom_into'.
	res := self ___recvfromBytes___: want.
	data := res @env0:at: 1.
	n := data @env0:size.
	1 @env0:to: n do: [:i | buffer @env0:at: i put: (data @env0:at: i)].
	^ tuple @env0:withAll: { n . res @env0:at: 2 }

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recvfrom: bufsize [
	^ self recvfrom: bufsize _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> recvfrom: bufsize _: flags [
	^ self ___recvfromBytes___: bufsize

]

{ #category : 'Grail-Unsupported' }
PyRawSocket >> recvmsg: bufsize [
	^ OSError ___signal___:
		'recvmsg() is not supported: GemStone GsSocket has no ancillary-data interface'

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> send: data [
	^ self send: data _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> send: data _: flags [
	"Write what fits, answering the count -- a short write is legal here.

	A NON-BLOCKING socket whose send buffer is full raises BlockingIOError
	rather than writing nothing: ``send'' returning 0 is indistinguishable from
	a socket that took no bytes for some other reason, and asyncio's sock_sendall
	decides whether to wait for writability from that exception.  The readiness
	probe FAILS OPEN -- if GsSocket cannot answer writeWillNotBlock the write is
	attempted as before -- because refusing a send that would have worked is the
	worse error of the two.

	``sendall'' is deliberately not given the same guard: its loop reports a
	full buffer through GsSocket's own failure path, and a partial ``sendall''
	has no way to report how much it wrote anyway (which is why asyncio uses
	``send'')."

	| sock ba n |
	sock := self @env0:___ensureOpen.
	self ___isNonBlocking___ ifTrue: [
		([sock @env0:writeWillNotBlock] @env0:on: Error
			do: [:e | e @env0:return: true]) == false ifTrue: [
				^ self ___notReadyNow___].
		"ONE write, of what fits.  GsSocket >> write:from: loops until every byte
		is out and suspends the green thread between tries, so a non-blocking
		send of 8K into a buffer with 1K of room blocked -- and with a peer that
		was not reading, it blocked for good (test_ssl test_nonblocking_send).
		The primitive answers the count written, true for EINTR (retry), nil for
		an error, and anything else for EAGAIN."
		ba := self @env0:___toByteArray: data.
		ba @env0:isEmpty ifTrue: [^ 0].
		[n := sock @env0:_write: ba startingAt: 1 ofSize: ba @env0:size.
		 n == true] @env0:whileTrue.
		n @env0:isNil ifTrue: [^ self @env0:___fail: 'send failed'].
		(n @env0:isKindOf: SmallInteger) ifFalse: [^ self ___notReadyNow___].
		^ n].
	ba := self @env0:___toByteArray: data.
	n := sock @env0:write: ba @env0:size from: ba.
	n @env0:isNil ifTrue: [^ self @env0:___fail: 'send failed'].
	^ n

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> sendall: data [
	^ self sendall: data _: 0

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> sendall: data _: flags [
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

]

{ #category : 'Grail-Unsupported' }
PyRawSocket >> sendmsg: buffers [
	^ OSError ___signal___:
		'sendmsg() is not supported: GemStone GsSocket has no ancillary-data interface'

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> sendto: data _: address [
	^ self sendto: data _: 0 _: address

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> sendto: data _: flags _: address [
	"Send one datagram to (host, port), answering the byte count.  On a stream
	socket with no peer it is ENOTCONN, which Darwin answers too -- GsSocket
	instead signals its own error, which no Python handler sees as OSError."

	| sock ba host port |
	sock := self @env0:___ensureOpen.
	(self type @env0:= 1 and: [self ___neverConnected___: sock]) ifTrue: [
		^ self ___notConnected___].
	ba := self @env0:___toByteArray: data.
	host := (address @env0:at: 1) @env0:asString.
	port := address @env0:at: 2.
	(sock @env0:sendUdp: (self @env0:___toRawString: ba)
		flags: (flags @env0:ifNil: [0])
		toHost: host
		port: port) @env0:isNil ifTrue: [
			^ self @env0:___fail: 'sendto failed'].
	^ ba @env0:size

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> setblocking: flag [
	"setblocking(False) is settimeout(0); setblocking(True) is settimeout(None)."

	(flag @env0:= false @env0:or: [flag @env0:= 0])
		ifTrue: [^ self settimeout: 0].
	^ self settimeout: None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> setsockopt: level _: optname _: value [
	"Real setsockopt, mapped onto GsSocket's named options.  An option with
	no GsSocket counterpart is accepted and ignored rather than raised: the
	stdlib sets plenty of tuning options opportunistically, and failing them
	would break callers that CPython does not."

	| sock entry |
	sock := self @env0:___ensureOpen.
	(level @env0:= 1 @env0:and: [optname @env0:= 13]) ifTrue: [
		^ self ___setLinger___: value on: sock].
	entry := PyRawSocket @env0:___gsOptionFor: level opt: optname.
	entry @env0:isNil ifTrue: [^ None].
	(entry @env0:at: 2) @env0:= #bool
		ifTrue: [sock @env0:option: (entry @env0:at: 1)
					put: (value @env0:= 0) @env0:not]
		ifFalse: [sock @env0:option: (entry @env0:at: 1) put: value].
	^ None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> settimeout: seconds [
	"CPython's three states: None = blocking, 0 = non-blocking, n = timeout.

	THE GsSocket STAYS NON-BLOCKING IN ALL THREE.  Python's ``blocking'' is a
	promise about the CALLER -- recv() does not return until there is data --
	and a non-blocking GsSocket already keeps it: read:into:startingAt:,
	write:from:startingAt: and accept suspend just the calling GsProcess
	(_waitForReadReady / _waitForWriteReady) until the socket is ready.
	``makeBlocking'', which this used to send for None and for a timeout,
	blocks the OS THREAD instead, and every Grail thread is a green thread on
	that one OS thread -- so a blocking recv() stopped the whole gem, and a
	server on another Grail thread could never answer it.  That deadlocked
	any in-process client/server pair on blocking sockets: TwilioClientTestCase
	(PR #741, worked around there) and every TLS handshake through CPython's
	ssl.py, whose SSLSocket calls settimeout(None) on the socket it wraps.
	The timeout state still bounds each wait with readWillNotBlockWithin:."

	| sock |
	sock := self @env0:___ensureOpen.
	(seconds @env0:isNil @env0:or: [seconds @env0:== None]) ifTrue: [
		timeoutSecs := nil.
		sock @env0:makeNonBlocking.
		^ None].
	seconds @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'Timeout value out of range'].
	"CPython stores the timeout as a FLOAT whatever it was given, so
	``settimeout(0); gettimeout()'' answers 0.0 and ``settimeout(1)'' answers
	1.0.  Grail kept the integer, which reads back as a different type than
	CPython reports -- and tests/python/raw_socket.py had pinned the integer as
	though it were the expectation."
	timeoutSecs := seconds @env0:asFloat.
	sock @env0:makeNonBlocking.
	^ None

]

{ #category : 'Grail-Socket Protocol' }
PyRawSocket >> shutdown: how [
	"SHUT_RD / SHUT_WR / SHUT_RDWR.  GsSocket has all three directions, so
	unlike the older socket module this does not collapse them into one."

	| sock |
	sock := self @env0:___ensureOpen.
	how @env0:= 0 ifTrue: [sock @env0:shutdownReading. ^ None].
	how @env0:= 1 ifTrue: [sock @env0:shutdownWriting. ^ None].
	sock @env0:shutdownReadingAndWriting.
	^ None

]

{ #category : 'Grail-Queries' }
PyRawSocket >> timeout [
	"The ``timeout'' DATA attribute (CPython 3.7+).  None means blocking."

	^ timeoutSecs @env0:ifNil: [None]

]

{ #category : 'Grail-Queries' }
PyRawSocket >> type [
	^ sockType @env0:ifNil: [1]

]
