Extension { #name : '_socket' }

{ #category : 'Grail-Queries' }
_socket >> _getaddrinfo: positional kw: kwargs [
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

]

{ #category : 'Grail-Queries' }
_socket >> _getnameinfo: positional kw: kwargs [
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

]

{ #category : 'Grail-Select' }
_socket >> _select: readSocks _: writeSocks _: timeoutMs [
	"Module-level entry point for select.py -- see PyRawSocket>>___select___.

	select.py imports _socket rather than socket for this: it is a primitive,
	and asking the PUBLIC facade for it was backwards even while the facade was
	the only socket module there was."

	^ PyRawSocket ___select___: readSocks _: writeSocks _: timeoutMs

]

{ #category : 'Grail-Select' }
_socket >> _select: readSocks _: writeSocks _: timeoutMs _: wakeLock [
	"select.py's _select_waking: as above, but releasing wakeLock (a
	_thread lock its owner holds) from another green thread ends the wait."

	^ PyRawSocket ___select___: readSocks _: writeSocks _: timeoutMs wake: wakeLock

]

{ #category : 'Grail-Unsupported' }
_socket >> _socketpair: positional kw: kwargs [
	"socketpair() is AF_UNIX, which GsSocket has no interface for."

	^ OSError ___signal___:
		'socketpair() is not supported: GemStone GsSocket has no Unix-domain sockets'

]

{ #category : 'Grail-TLS' }
_socket >> _sslLibraryVersionString [
	"``_socket._sslLibraryVersionString()'' -- the banner of the OpenSSL library
	this session has loaded (e.g. ``OpenSSL 3.0.19 27 Jan 2026''), or None if
	GemStone will not say.

	PRIVATE, not part of CPython's _socket.  It exists because Grail has no
	``_ssl'' extension to carry OPENSSL_VERSION: the library that actually
	performs every handshake is the one GemStone links, and
	``GsSecureSocket class >> sslLibraryVersionString'' is the only thing that
	knows which that is.  It is a primitive (_zeroArgSslPrim: 19) and the
	selector is absent from old images, so a failure answers None rather than
	signalling -- ssl.py then reports the version as unknown instead of
	guessing one."

	| banner |
	banner := [GsSecureSocket @env0:sslLibraryVersionString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	(banner @env0:isNil @env0:or: [banner @env0:isString @env0:not])
		ifTrue: [^ None].
	^ banner @env0:asString

]

{ #category : 'Grail-Queries' }
_socket >> close: fd [
	"``_socket.close(fd)'' -- close a bare descriptor this session owns."

	| sock |
	sock := PyRawSocket @env0:___gsSocketForFd___: fd.
	sock @env0:isNil ifTrue: [
		^ OSError ___signal___:
			('[Errno 9] Bad file descriptor: ' @env0:, fd @env0:printString)].
	[sock @env0:close] @env0:on: Error do: [:e | e @env0:return: nil].
	PyRawSocket @env0:___forgetFd___: fd.
	^ None

]

{ #category : 'Grail-Unsupported' }
_socket >> CMSG_LEN: length [
	^ OSError ___signal___:
		'CMSG_LEN() is not supported: GemStone GsSocket has no ancillary-data interface'

]

{ #category : 'Grail-Unsupported' }
_socket >> CMSG_SPACE: length [
	^ OSError ___signal___:
		'CMSG_SPACE() is not supported: GemStone GsSocket has no ancillary-data interface'

]

{ #category : 'Grail-Queries' }
_socket >> dup: fd [
	"``_socket.dup(fd)'' -- CPython duplicates the descriptor.  GsSocket has
	no dup(), and handing back the SAME fd would be a silent lie (closing
	either copy would close both), so this is refused outright."

	^ OSError ___signal___:
		'dup() is not supported: GemStone GsSocket cannot duplicate a descriptor'

]

{ #category : 'Grail-Built-in Functions' }
_socket >> getdefaulttimeout [
	^ PyRawSocket @env0:___defaultTimeout___ @env0:ifNil: [None]

]

{ #category : 'Grail-Queries' }
_socket >> gethostbyaddr: addr [
	"``(hostname, aliaslist, ipaddrlist)'' for an address."

	| name |
	name := [GsSocket @env0:getHostNameByAddress: addr @env0:asString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	name @env0:isNil ifTrue: [
		^ herror ___signal___:
			('[Errno 1] Unknown host: ' @env0:, addr @env0:asString)].
	^ { name @env0:asString . #() . { addr @env0:asString } }

]

{ #category : 'Grail-Queries' }
_socket >> gethostbyname_ex: aName [
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

]

{ #category : 'Grail-Queries' }
_socket >> gethostbyname: aName [
	| addr |
	addr := [GsSocket @env0:getHostAddressByName: aName @env0:asString]
		@env0:on: Error do: [:e | e @env0:return: nil].
	addr @env0:isNil ifTrue: [
		^ gaierror ___signal___:
			('[Errno -2] Name or service not known: ' @env0:, aName @env0:asString)].
	^ addr @env0:asString

]

{ #category : 'Grail-Built-in Functions' }
_socket >> gethostname [
	^ GsSocket @env0:getLocalHostName

]

{ #category : 'Grail-Queries' }
_socket >> getprotobyname: aName [
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

]

{ #category : 'Grail-Queries' }
_socket >> getservbyname: aName [
	^ self getservbyname: aName _: nil

]

{ #category : 'Grail-Queries' }
_socket >> getservbyname: aName _: proto [
	| port |
	port := [proto @env0:isNil
		ifTrue: [GsSocket @env0:getServicePortByName: aName @env0:asString]
		ifFalse: [GsSocket @env0:getServicePortByName: aName @env0:asString
					withProtocol: proto @env0:asString]]
		@env0:on: Error do: [:e | e @env0:return: nil].
	port @env0:isNil ifTrue: [
		^ OSError ___signal___: 'service/proto not found'].
	^ port

]

{ #category : 'Grail-Queries' }
_socket >> getservbyport: aPort [
	^ self getservbyport: aPort _: nil

]

{ #category : 'Grail-Queries' }
_socket >> getservbyport: aPort _: proto [
	| name |
	name := [proto @env0:isNil
		ifTrue: [GsSocket @env0:getServiceNameByPort: aPort]
		ifFalse: [GsSocket @env0:getServiceNameByPort: aPort
					withProtocol: proto @env0:asString]]
		@env0:on: Error do: [:e | e @env0:return: nil].
	name @env0:isNil ifTrue: [
		^ OSError ___signal___: 'port/proto not found'].
	^ name @env0:asString

]

{ #category : 'Grail-Conversions' }
_socket >> htonl: x [
	"Host-to-network long: a 32-bit byte swap."

	| v |
	x @env0:< 0 ifTrue: [^ OverflowError ___signal___: 'can''t convert negative number to unsigned long'].
	v := x @env0:bitAnd: 4294967295.
	^ (((v @env0:bitAnd: 255) @env0:bitShift: 24)
		@env0:bitOr: (((v @env0:bitShift: -8) @env0:bitAnd: 255) @env0:bitShift: 16))
		@env0:bitOr: ((((v @env0:bitShift: -16) @env0:bitAnd: 255) @env0:bitShift: 8)
			@env0:bitOr: ((v @env0:bitShift: -24) @env0:bitAnd: 255))

]

{ #category : 'Grail-Conversions' }
_socket >> htons: x [
	"Host-to-network short.  Network order is big-endian and GemStone
	integers are host-neutral, so this is a defined 16-bit byte swap
	rather than anything platform-dependent."

	| v |
	v := x @env0:bitAnd: 65535.
	x @env0:< 0 ifTrue: [^ OverflowError ___signal___: 'can''t convert negative number to unsigned long'].
	^ ((v @env0:bitAnd: 255) @env0:bitShift: 8) @env0:bitOr: (v @env0:bitShift: -8)

]

{ #category : 'Grail-Built-in Functions' }
_socket >> if_nameindex [
	^ OSError ___signal___:
		'if_nameindex() is not supported: GemStone GsSocket exposes no interface table'

]

{ #category : 'Grail-Conversions' }
_socket >> inet_aton: ipString [
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

]

{ #category : 'Grail-Conversions' }
_socket >> inet_ntoa: packed [
	"The 4 packed bytes -> a dotted quad."

	packed @env0:size @env0:= 4 ifFalse: [
		^ OSError ___signal___: 'packed IP wrong length for inet_ntoa'].
	^ ((packed @env0:at: 1) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 2) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 3) @env0:printString @env0:, '.'
		@env0:, (packed @env0:at: 4) @env0:printString)

]

{ #category : 'Grail-Conversions' }
_socket >> inet_ntop: family _: packed [
	family @env0:= 2 ifTrue: [^ self inet_ntoa: packed].
	family @env0:= 10 ifTrue: [
		^ OSError ___signal___:
			'inet_ntop: AF_INET6 is not supported by this build'].
	^ ValueError ___signal___:
		('unknown address family ' @env0:, family @env0:printString)

]

{ #category : 'Grail-Conversions' }
_socket >> inet_pton: family _: ipString [
	"Presentation -> packed.  IPv4 only: an IPv6 literal needs a parser
	GsSocket does not expose, and guessing would corrupt addresses."

	family @env0:= 2 ifTrue: [^ self inet_aton: ipString].
	family @env0:= 10 ifTrue: [
		^ OSError ___signal___:
			'inet_pton: AF_INET6 is not supported by this build'].
	^ OSError ___signal___:
		('unknown address family ' @env0:, family @env0:printString)

]

{ #category : 'Grail-Initialization' }
_socket >> initialize [
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

]

{ #category : 'Grail-Conversions' }
_socket >> ntohl: x [
	^ self htonl: x

]

{ #category : 'Grail-Conversions' }
_socket >> ntohs: x [
	^ self htons: x

]

{ #category : 'Grail-Queries' }
_socket >> setdefaulttimeout: secondsOrNone [
	(secondsOrNone @env0:isNil @env0:or: [secondsOrNone @env0:== None])
		ifTrue: [PyRawSocket @env0:___defaultTimeout___: nil]
		ifFalse: [
			secondsOrNone @env0:< 0 ifTrue: [
				^ ValueError ___signal___: 'Timeout value out of range'].
			PyRawSocket @env0:___defaultTimeout___: secondsOrNone].
	^ None

]
