! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- IPv4Address: Smalltalk-backed wrapper holding 32-bit unsigned int
expectvalue /Class
doit
Object subclass: 'IPv4Address'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IPv4Address category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
IPv4Address removeAllMethods: 0.
IPv4Address removeAllMethods: 1.
IPv4Address class removeAllMethods: 0.
IPv4Address class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: IPv4Address
___pythonValueAttrs___
	"Selectors that ___pyAttrLoad___ should treat as *value* reads.
	The Python ipaddress API exposes these as @property, so addr.is_loopback
	must call the method and return the boolean rather than handing back
	a BoundMethod."

	^ IdentitySet new
		add: #packed;
		add: #version;
		add: #max_prefixlen;
		add: #compressed;
		add: #exploded;
		add: #is_loopback;
		add: #is_private;
		add: #is_global;
		add: #is_link_local;
		add: #is_multicast;
		add: #is_unspecified;
		add: #is_reserved;
		yourself
%

category: 'Grail-Private'
classmethod: IPv4Address
___fromPacked___: anInt
	"Build an IPv4Address from a 32-bit unsigned int."

	| inst |
	inst := self new.
	inst _packed: anInt.
	^ inst
%

category: 'Grail-Private'
classmethod: IPv4Address
___fromString___: aString
	"Parse a dotted-quad string into an IPv4Address.  Rejects empty
	octets, leading zeros, and values outside 0..255 the way CPython
	does."

	| parts packed |
	parts := aString substrings: '.'.
	parts size = 4 ifFalse: [
		ValueError @env1:___signal___: 'expected four octets in ' , aString
	].
	packed := 0.
	parts do: [:p |
		| octet |
		p isEmpty ifTrue: [
			ValueError @env1:___signal___: 'empty octet in ' , aString
		].
		(p size > 1 and: [(p at: 1) = $0]) ifTrue: [
			ValueError @env1:___signal___: 'leading-zero octet not permitted in ' , aString
		].
		octet := [p asNumber] on: Error do: [:ex |
			ValueError @env1:___signal___: 'bad octet in ' , aString
		].
		((octet isKindOf: Integer) and: [octet >= 0 and: [octet <= 255]]) ifFalse: [
			ValueError @env1:___signal___: 'octet out of range in ' , aString
		].
		packed := (packed bitShift: 8) bitOr: octet
	].
	^ self ___fromPacked___: packed
%

category: 'Grail-Private'
method: IPv4Address
_packed: anInt
	self dynamicInstVarAt: #_packed put: anInt.
	^ self
%

category: 'Grail-Private'
method: IPv4Address
___ipInt___
	"The 32-bit unsigned integer behind this address.

	This, not ``packed'', is what Smalltalk-internal arithmetic wants:
	CPython's ``IPv4Address.packed'' is a 4-BYTE bytes object, so the
	Python-visible accessor cannot double as the integer one."

	^ self dynamicInstVarAt: #_packed
%

set compile_env: 1

category: 'Grail-Accessors'
method: IPv4Address
packed
	"CPython: ``the binary representation of this address - a bytes
	object of the appropriate length (most significant octet first)''.
	Four bytes, big-endian.  urllib3's ssl_match_hostname compares two
	addresses by this attribute."

	| ip ba |
	ip := self @env0:dynamicInstVarAt: #_packed.
	ba := ByteArray @env0:new: 4.
	1 @env0:to: 4 do: [:i |
		ba @env0:at: i put: ((ip @env0:bitShift: 8 @env0:* (i @env0:- 4)) @env0:bitAnd: 16rFF)].
	^ ba
%

category: 'Grail-Accessors'
method: IPv4Address
compressed
	"CPython: the compressed form of the address; for IPv4 that is str()."

	^ self __str__
%

category: 'Grail-Accessors'
method: IPv4Address
exploded
	"CPython: the exploded form; for IPv4 that is str()."

	^ self __str__
%

category: 'Grail-Accessors'
method: IPv4Address
__int__
	^ (self @env0:dynamicInstVarAt: #_packed)
%

category: 'Grail-Accessors'
method: IPv4Address
__str__
	| stream |
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -24) @env0:bitAnd: 16rFF) @env0:printString.
	stream @env0:nextPut: $..
	stream @env0:nextPutAll: (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFF) @env0:printString.
	stream @env0:nextPut: $..
	stream @env0:nextPutAll: (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -8) @env0:bitAnd: 16rFF) @env0:printString.
	stream @env0:nextPut: $..
	stream @env0:nextPutAll: ((self @env0:dynamicInstVarAt: #_packed) @env0:bitAnd: 16rFF) @env0:printString.
	^ stream @env0:contents
%

category: 'Grail-Accessors'
method: IPv4Address
__repr__
	^ 'IPv4Address(''' @env0:, self __str__ @env0:, ''')'
%

category: 'Grail-Accessors'
method: IPv4Address
version
	^ 4
%

category: 'Grail-Accessors'
method: IPv4Address
max_prefixlen
	^ 32
%

category: 'Grail-Equality'
method: IPv4Address
__eq__: other
	(other isKindOf: IPv4Address) ifFalse: [^ false].
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:= other @env0:___ipInt___
%

category: 'Grail-Equality'
method: IPv4Address
__hash__
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:hash
%

category: 'Grail-Equality'
method: IPv4Address
__lt__: other
	"CPython refuses to order across address families."

	(other isKindOf: IPv4Address) ifFalse: [
		TypeError ___signal___:
			'''<'' not supported between instances of ''IPv4Address'' and ''' @env0:,
				other @env0:class @env0:name @env0:asString @env0:, ''''].
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:< other @env0:___ipInt___
%

category: 'Grail-Categories'
method: IPv4Address
is_loopback
	"127.0.0.0/8."

	^ (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -24) @env0:bitAnd: 16rFF) @env0:= 127
%

category: 'Grail-Categories'
method: IPv4Address
is_link_local
	"169.254.0.0/16."

	^ (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFFFF) @env0:= 16rA9FE
%

category: 'Grail-Categories'
method: IPv4Address
is_multicast
	"224.0.0.0/4."

	^ (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -28) @env0:bitAnd: 16rF) @env0:= 14
%

category: 'Grail-Categories'
method: IPv4Address
is_unspecified
	"0.0.0.0."

	^ (self @env0:dynamicInstVarAt: #_packed) @env0:= 0
%

category: 'Grail-Categories'
method: IPv4Address
is_reserved
	"240.0.0.0/4 (Class E and 255.255.255.255)."

	^ (((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -28) @env0:bitAnd: 16rF) @env0:= 15
%

category: 'Grail-Categories'
method: IPv4Address
is_private
	"RFC 1918 + RFC 6598: 10/8, 172.16/12, 192.168/16, 100.64/10,
	plus loopback / link-local / unspecified."

	| top |
	top := ((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -24) @env0:bitAnd: 16rFF.
	top @env0:= 10 ifTrue: [^ true].
	top @env0:= 127 ifTrue: [^ true].
	top @env0:= 0 ifTrue: [^ true].
	(top @env0:= 172 @env0:and: [((((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFF) @env0:bitAnd: 16rF0) @env0:= 16r10]) ifTrue: [^ true].
	(top @env0:= 192 @env0:and: [(((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFF) @env0:= 168]) ifTrue: [^ true].
	(top @env0:= 169 @env0:and: [(((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFF) @env0:= 254]) ifTrue: [^ true].
	(top @env0:= 100 @env0:and: [((((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -16) @env0:bitAnd: 16rFF) @env0:bitAnd: 16rC0) @env0:= 16r40]) ifTrue: [^ true].
	^ false
%

category: 'Grail-Categories'
method: IPv4Address
is_global
	^ self is_private @env0:not @env0:and: [
		self is_reserved @env0:not @env0:and: [
			self is_multicast @env0:not
		]
	]
%

category: 'Grail-Callable'
classmethod: IPv4Address
value: positional value: kwargs
	"``IPv4Address(x)'' -- the class itself is callable, so
	``ipaddress.IPv4Address'' can be the real class rather than a
	constructor method (which is what makes isinstance() discriminate)."

	| arg |
	arg := positional @env0:at: 1 ifAbsent: [nil].
	(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:size @env0:> 0]) ifTrue: [
		arg := kwargs @env0:at: 'address' ifAbsent: [arg]].
	arg @env0:isNil ifTrue: [
		TypeError ___signal___: 'IPv4Address() missing 1 required positional argument'].
	(arg @env0:isKindOf: Integer) ifTrue: [
		(arg @env0:< 0 @env0:or: [arg @env0:> 16rFFFFFFFF]) ifTrue: [
			ValueError ___signal___: arg @env0:printString @env0:,
				' (>= 2**32) is not permitted as an IPv4 address'].
		^ IPv4Address @env0:___fromPacked___: arg].
	(arg @env0:isKindOf: ByteArray) ifTrue: [
		arg @env0:size @env0:= 4 ifFalse: [
			ValueError ___signal___: 'Packed address must be 4 bytes'].
		^ IPv4Address @env0:___fromPacked___:
			((((arg @env0:at: 1) @env0:bitShift: 24)
				@env0:bitOr: ((arg @env0:at: 2) @env0:bitShift: 16))
				@env0:bitOr: (((arg @env0:at: 3) @env0:bitShift: 8) @env0:bitOr: (arg @env0:at: 4)))].
	(arg @env0:isKindOf: IPv4Address) ifTrue: [^ arg].
	^ IPv4Address @env0:___fromString___: arg @env0:asString
%

category: 'Grail-Introspection'
classmethod: IPv4Address
__name__
	^ 'IPv4Address'
%

category: 'Grail-Introspection'
classmethod: IPv4Address
__qualname__
	^ 'IPv4Address'
%

category: 'Grail-Introspection'
classmethod: IPv4Address
__module__
	^ 'ipaddress'
%

set compile_env: 0

! ------- IPv4Network: address + prefix length
expectvalue /Class
doit
Object subclass: 'IPv4Network'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IPv4Network category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
IPv4Network removeAllMethods: 0.
IPv4Network removeAllMethods: 1.
IPv4Network class removeAllMethods: 0.
IPv4Network class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: IPv4Network
___pythonValueAttrs___
	"Network properties exposed as @property in CPython's ipaddress."

	^ IdentitySet new
		add: #network_address;
		add: #broadcast_address;
		add: #prefixlen;
		add: #num_addresses;
		add: #version;
		add: #max_prefixlen;
		add: #compressed;
		add: #exploded;
		yourself
%

category: 'Grail-Private'
classmethod: IPv4Network
___fromString___: aString strict: strict
	"Parse `1.2.3.0/24` or `1.2.3.4` (host with implicit /32).  In
	strict mode (default), reject inputs with host bits set."

	| parts addr prefix mask masked |
	parts := aString substrings: '/'.
	parts size > 2 ifTrue: [
		ValueError @env1:___signal___: 'bad network spec: ' , aString
	].
	addr := IPv4Address ___fromString___: (parts at: 1).
	parts size = 2 ifTrue: [
		prefix := [(parts at: 2) asNumber] on: Error do: [:ex |
			ValueError @env1:___signal___: 'bad prefix in ' , aString
		].
		((prefix isKindOf: Integer) and: [prefix >= 0 and: [prefix <= 32]]) ifFalse: [
			ValueError @env1:___signal___: 'prefix out of range in ' , aString
		]
	] ifFalse: [prefix := 32].
	mask := prefix = 0
		ifTrue: [0]
		ifFalse: [
			((1 bitShift: prefix) - 1) bitShift: 32 - prefix
		].
	masked := addr ___ipInt___ bitAnd: mask.
	(strict and: [(masked = addr ___ipInt___) not]) ifTrue: [
		ValueError @env1:___signal___:
			'host bits set in ' , aString , ' (use strict=False to coerce)'
	].
	^ self ___fromAddr___: (IPv4Address ___fromPacked___: masked) prefix: prefix
%

category: 'Grail-Private'
classmethod: IPv4Network
___fromAddr___: addrInst prefix: prefixInt
	| inst |
	inst := self new.
	inst _network: addrInst _prefix: prefixInt.
	^ inst
%

category: 'Grail-Private'
method: IPv4Network
_network: addrInst _prefix: prefixInt
	self dynamicInstVarAt: #_network put: addrInst.
	self dynamicInstVarAt: #_prefix put: prefixInt.
	^ self
%

set compile_env: 1

category: 'Grail-Accessors'
method: IPv4Network
network_address
	^ (self @env0:dynamicInstVarAt: #_network)
%

category: 'Grail-Accessors'
method: IPv4Network
prefixlen
	^ (self @env0:dynamicInstVarAt: #_prefix)
%

category: 'Grail-Accessors'
method: IPv4Network
version
	^ 4
%

category: 'Grail-Accessors'
method: IPv4Network
max_prefixlen
	^ 32
%

category: 'Grail-Accessors'
method: IPv4Network
compressed
	^ self __str__
%

category: 'Grail-Accessors'
method: IPv4Network
exploded
	^ self __str__
%

category: 'Grail-Accessors'
method: IPv4Network
broadcast_address
	"Last address in the block."

	| hostBits |
	hostBits := 32 @env0:- (self @env0:dynamicInstVarAt: #_prefix).
	^ IPv4Address @env0:___fromPacked___:
		((self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___ @env0:bitOr: ((1 @env0:bitShift: hostBits) @env0:- 1))
%

category: 'Grail-Accessors'
method: IPv4Network
num_addresses
	^ 1 @env0:bitShift: 32 @env0:- (self @env0:dynamicInstVarAt: #_prefix)
%

category: 'Grail-Accessors'
method: IPv4Network
__str__
	^ (self @env0:dynamicInstVarAt: #_network) __str__ @env0:, '/' @env0:, (self @env0:dynamicInstVarAt: #_prefix) @env0:printString
%

category: 'Grail-Membership'
method: IPv4Network
__contains__: anAddress
	"True if anAddress falls inside this network."

	| addrPacked mask |
	(anAddress isKindOf: IPv4Address) ifFalse: [^ false].
	addrPacked := anAddress @env0:___ipInt___.
	mask := (self @env0:dynamicInstVarAt: #_prefix) @env0:= 0
		ifTrue: [0]
		ifFalse: [
			((1 @env0:bitShift: (self @env0:dynamicInstVarAt: #_prefix)) @env0:- 1) @env0:bitShift: 32 @env0:- (self @env0:dynamicInstVarAt: #_prefix)
		].
	^ (addrPacked @env0:bitAnd: mask) @env0:= (self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___
%

category: 'Grail-Accessors'
method: IPv4Network
__repr__
	^ 'IPv4Network(''' @env0:, self __str__ @env0:, ''')'
%

category: 'Grail-Equality'
method: IPv4Network
__eq__: other
	(other isKindOf: IPv4Network) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #_network) __eq__: other network_address)
		@env0:and: [(self @env0:dynamicInstVarAt: #_prefix) @env0:= other prefixlen]
%

category: 'Grail-Equality'
method: IPv4Network
__hash__
	^ ((self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___
		@env0:bitXor: (self @env0:dynamicInstVarAt: #_prefix)) @env0:hash
%

category: 'Grail-Callable'
classmethod: IPv4Network
value: positional value: kwargs
	"``IPv4Network(address, strict=True)''."

	| arg strict |
	arg := positional @env0:at: 1 ifAbsent: [nil].
	strict := positional @env0:at: 2 ifAbsent: [true].
	kwargs @env0:isNil ifFalse: [
		arg := kwargs @env0:at: 'address' ifAbsent: [arg].
		strict := kwargs @env0:at: 'strict' ifAbsent: [strict]].
	arg @env0:isNil ifTrue: [
		TypeError ___signal___: 'IPv4Network() missing 1 required positional argument'].
	(arg @env0:isKindOf: IPv4Network) ifTrue: [^ arg].
	^ IPv4Network @env0:___fromString___: arg @env0:asString strict: strict @env0:== true
%

category: 'Grail-Introspection'
classmethod: IPv4Network
__name__
	^ 'IPv4Network'
%

category: 'Grail-Introspection'
classmethod: IPv4Network
__qualname__
	^ 'IPv4Network'
%

category: 'Grail-Introspection'
classmethod: IPv4Network
__module__
	^ 'ipaddress'
%

set compile_env: 0

! ------- IPv6Address: Smalltalk-backed wrapper holding a 128-bit unsigned int
expectvalue /Class
doit
Object subclass: 'IPv6Address'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IPv6Address category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
IPv6Address removeAllMethods: 0.
IPv6Address removeAllMethods: 1.
IPv6Address class removeAllMethods: 0.
IPv6Address class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: IPv6Address
___pythonValueAttrs___
	"Selectors ___pyAttrLoad___ must treat as *value* reads because
	CPython's ipaddress exposes them as @property."

	^ IdentitySet new
		add: #packed;
		add: #version;
		add: #max_prefixlen;
		add: #compressed;
		add: #exploded;
		add: #scope_id;
		add: #ipv4_mapped;
		add: #sixtofour;
		add: #is_loopback;
		add: #is_private;
		add: #is_global;
		add: #is_link_local;
		add: #is_site_local;
		add: #is_multicast;
		add: #is_unspecified;
		add: #is_reserved;
		yourself
%

category: 'Grail-Private'
classmethod: IPv6Address
___fromPacked___: anInt
	"Build an IPv6Address from a 128-bit unsigned int (no scope id)."

	^ self ___fromPacked___: anInt scope: nil
%

category: 'Grail-Private'
classmethod: IPv6Address
___fromPacked___: anInt scope: aScopeOrNil
	| inst |
	(anInt < 0 or: [anInt > self ___allOnes___]) ifTrue: [
		ValueError @env1:___signal___:
			anInt printString , ' (>= 2**128) is not permitted as an IPv6 address'
	].
	inst := self new.
	inst _packed: anInt scope: aScopeOrNil.
	^ inst
%

category: 'Grail-Private'
classmethod: IPv6Address
___allOnes___
	^ (1 bitShift: 128) - 1
%

category: 'Grail-Private'
classmethod: IPv6Address
___splitOn___: aChar in: aString
	"Split KEEPING empty fields -- ``::1'' must come back as
	#('' '' '1'), which String>>subStrings: cannot express."

	| parts start |
	parts := OrderedCollection new.
	start := 1.
	1 to: aString size do: [:i |
		(aString at: i) = aChar ifTrue: [
			parts add: (aString copyFrom: start to: i - 1).
			start := i + 1
		]
	].
	parts add: (aString copyFrom: start to: aString size).
	^ parts
%

category: 'Grail-Private'
classmethod: IPv6Address
___hexDigitValue___: aChar
	"0..15 for a hex digit, nil otherwise."

	| c |
	"GemStone's Character>>value answers the Character, not the code
	point -- asInteger is the one that gives a number."
	c := aChar asInteger.
	(c >= 48 and: [c <= 57]) ifTrue: [^ c - 48].
	(c >= 97 and: [c <= 102]) ifTrue: [^ c - 87].
	(c >= 65 and: [c <= 70]) ifTrue: [^ c - 55].
	^ nil
%

category: 'Grail-Private'
classmethod: IPv6Address
___hexString___: anInt
	"Lowercase hex digits, no leading zeros, no radix prefix.
	GemStone's printString: 16 answers ``16rFF'', which is not what
	an RFC 5952 hextet looks like."

	| digits n s |
	anInt = 0 ifTrue: [^ '0'].
	digits := '0123456789abcdef'.
	s := ''.
	n := anInt.
	[n > 0] whileTrue: [
		s := (String with: (digits at: (n bitAnd: 15) + 1)) , s.
		n := n bitShift: -4
	].
	^ s
%

category: 'Grail-Private'
classmethod: IPv6Address
___hexString___: anInt width: w
	"Zero-padded lowercase hex -- the ``exploded'' form's hextets."

	| s |
	s := self ___hexString___: anInt.
	[s size < w] whileTrue: [s := '0' , s].
	^ s
%

category: 'Grail-Private'
classmethod: IPv6Address
___parseHextet___: aString in: whole
	"CPython's _parse_hextet: hex-digit check first (the more
	informative error), then the 4-character limit, then the value."

	| v |
	aString do: [:c |
		(self ___hexDigitValue___: c) isNil ifTrue: [
			ValueError @env1:___signal___:
				'Only hex digits permitted in ''' , aString , ''' in ''' , whole , ''''
		]
	].
	aString size > 4 ifTrue: [
		ValueError @env1:___signal___:
			'At most 4 characters permitted in ''' , aString , ''''
	].
	aString isEmpty ifTrue: [
		ValueError @env1:___signal___:
			'Only hex digits permitted in '''' in ''' , whole , ''''
	].
	v := 0.
	aString do: [:c | v := (v bitShift: 4) bitOr: (self ___hexDigitValue___: c)].
	^ v
%

category: 'Grail-Private'
classmethod: IPv6Address
___intFromString___: aString
	"CPython's IPv6Address._ip_int_from_string, minus the scope id
	(___fromString___: has already stripped that)."

	| parts hi lo skipIndex skipped ipInt last v4 |
	aString isEmpty ifTrue: [
		ValueError @env1:___signal___: 'Address cannot be empty'
	].
	parts := self ___splitOn___: $: in: aString.
	parts size < 3 ifTrue: [
		ValueError @env1:___signal___: 'At least 3 parts expected in ''' , aString , ''''
	].
	last := parts last.
	(last includesValue: $.) ifTrue: [
		"``::ffff:1.2.3.4'' -- an embedded dotted quad becomes two hextets."
		parts removeLast.
		v4 := (IPv4Address ___fromString___: last) ___ipInt___.
		parts add: (self ___hexString___: ((v4 bitShift: -16) bitAnd: 16rFFFF)).
		parts add: (self ___hexString___: (v4 bitAnd: 16rFFFF))
	].
	parts size > 9 ifTrue: [
		ValueError @env1:___signal___: 'At most 9 parts expected in ''' , aString , ''''
	].
	skipIndex := nil.
	2 to: parts size - 1 do: [:i |
		(parts at: i) isEmpty ifTrue: [
			skipIndex notNil ifTrue: [
				ValueError @env1:___signal___:
					'At most one ''::'' permitted in ''' , aString , ''''
			].
			skipIndex := i
		]
	].
	skipIndex notNil
		ifTrue: [
			hi := skipIndex - 1.
			lo := parts size - skipIndex.
			(parts at: 1) isEmpty ifTrue: [
				hi := hi - 1.
				hi > 0 ifTrue: [
					ValueError @env1:___signal___:
						'Leading '':'' only permitted as part of ''::'' in ''' , aString , ''''
				]
			].
			parts last isEmpty ifTrue: [
				lo := lo - 1.
				lo > 0 ifTrue: [
					ValueError @env1:___signal___:
						'Trailing '':'' only permitted as part of ''::'' in ''' , aString , ''''
				]
			].
			skipped := 8 - (hi + lo).
			skipped < 1 ifTrue: [
				ValueError @env1:___signal___:
					'Expected at most 7 other parts with ''::'' in ''' , aString , ''''
			]
		]
		ifFalse: [
			parts size = 8 ifFalse: [
				ValueError @env1:___signal___:
					'Exactly 8 parts expected without ''::'' in ''' , aString , ''''
			].
			(parts at: 1) isEmpty ifTrue: [
				ValueError @env1:___signal___:
					'Leading '':'' only permitted as part of ''::'' in ''' , aString , ''''
			].
			parts last isEmpty ifTrue: [
				ValueError @env1:___signal___:
					'Trailing '':'' only permitted as part of ''::'' in ''' , aString , ''''
			].
			hi := 8.
			lo := 0.
			skipped := 0
		].
	ipInt := 0.
	1 to: hi do: [:i |
		ipInt := (ipInt bitShift: 16) bitOr: (self ___parseHextet___: (parts at: i) in: aString)
	].
	ipInt := ipInt bitShift: 16 * skipped.
	lo > 0 ifTrue: [
		parts size - lo + 1 to: parts size do: [:i |
			ipInt := (ipInt bitShift: 16) bitOr: (self ___parseHextet___: (parts at: i) in: aString)
		]
	].
	^ ipInt
%

category: 'Grail-Private'
classmethod: IPv6Address
___fromString___: aString
	"Parse an RFC 4291 textual address, with optional RFC 4007 scope id."

	| body scope idx |
	aString isEmpty ifTrue: [
		ValueError @env1:___signal___: 'Address cannot be empty'
	].
	(aString includesValue: $/) ifTrue: [
		ValueError @env1:___signal___: 'Unexpected ''/'' in ''' , aString , ''''
	].
	idx := aString indexOf: $%.
	idx = 0
		ifTrue: [body := aString. scope := nil]
		ifFalse: [
			body := aString copyFrom: 1 to: idx - 1.
			scope := aString copyFrom: idx + 1 to: aString size.
			(scope isEmpty or: [scope includesValue: $%]) ifTrue: [
				ValueError @env1:___signal___: 'Invalid IPv6 address: ''' , aString , ''''
			]
		].
	^ self ___fromPacked___: (self ___intFromString___: body) scope: scope
%

category: 'Grail-Private'
classmethod: IPv6Address
___stringFromInt___: anInt
	"RFC 5952 compressed form: lowercase, leading zeros dropped, the
	LONGEST run of two or more zero hextets replaced by ``::''."

	| hextets bestStart bestLen curStart curLen res stream |
	hextets := Array new: 8.
	1 to: 8 do: [:i |
		hextets at: i put:
			(self ___hexString___: ((anInt bitShift: 16 * (i - 8)) bitAnd: 16rFFFF))
	].
	bestStart := 0.
	bestLen := 0.
	curStart := 0.
	curLen := 0.
	1 to: 8 do: [:i |
		(hextets at: i) = '0'
			ifTrue: [
				curLen := curLen + 1.
				curStart = 0 ifTrue: [curStart := i].
				curLen > bestLen ifTrue: [bestLen := curLen. bestStart := curStart]
			]
			ifFalse: [curLen := 0. curStart := 0]
	].
	res := OrderedCollection new.
	bestLen > 1
		ifTrue: [
			1 to: bestStart - 1 do: [:i | res add: (hextets at: i)].
			res add: ''.
			bestStart + bestLen to: 8 do: [:i | res add: (hextets at: i)].
			bestStart + bestLen - 1 = 8 ifTrue: [res add: ''].
			bestStart = 1 ifTrue: [res addFirst: '']
		]
		ifFalse: [1 to: 8 do: [:i | res add: (hextets at: i)]].
	stream := WriteStream on: String new.
	1 to: res size do: [:i |
		i > 1 ifTrue: [stream nextPut: $:].
		stream nextPutAll: (res at: i)
	].
	^ stream contents
%

category: 'Grail-Private'
classmethod: IPv6Address
___explodedFromInt___: anInt
	"Eight zero-padded four-digit hextets, nothing compressed."

	| stream |
	stream := WriteStream on: String new.
	1 to: 8 do: [:i |
		i > 1 ifTrue: [stream nextPut: $:].
		stream nextPutAll:
			(self ___hexString___: ((anInt bitShift: 16 * (i - 8)) bitAnd: 16rFFFF) width: 4)
	].
	^ stream contents
%

category: 'Grail-Private'
classmethod: IPv6Address
___inAnyOf___: aTable ip: anInt
	"Membership in a table of {networkInt. prefixLen} pairs."

	aTable do: [:pair |
		| prefix mask |
		prefix := pair at: 2.
		mask := prefix = 0
			ifTrue: [0]
			ifFalse: [((1 bitShift: prefix) - 1) bitShift: 128 - prefix].
		(anInt bitAnd: mask) = (pair at: 1) ifTrue: [^ true]
	].
	^ false
%

category: 'Grail-Private'
classmethod: IPv6Address
___privateNetworks___
	"iana-ipv6-special-registry, as CPython 3.14's
	_IPv6Constants._private_networks -- {network int. prefix len}."

	^ {{16r1. 128}.
		{16r0. 128}.
		{16rFFFF00000000. 96}.
		{16r64FF9B000100000000000000000000. 48}.
		{16r1000000000000000000000000000000. 64}.
		{16r20010000000000000000000000000000. 23}.
		{16r20010DB8000000000000000000000000. 32}.
		{16r20020000000000000000000000000000. 16}.
		{16r3FFF0000000000000000000000000000. 20}.
		{16rFC000000000000000000000000000000. 7}.
		{16rFE800000000000000000000000000000. 10}}
%

category: 'Grail-Private'
classmethod: IPv6Address
___privateNetworkExceptions___
	"CPython 3.14 _IPv6Constants._private_networks_exceptions."

	^ {{16r20010001000000000000000000000001. 128}.
		{16r20010001000000000000000000000002. 128}.
		{16r20010003000000000000000000000000. 32}.
		{16r20010004011200000000000000000000. 48}.
		{16r20010020000000000000000000000000. 28}.
		{16r20010030000000000000000000000000. 28}}
%

category: 'Grail-Private'
classmethod: IPv6Address
___reservedNetworks___
	"CPython 3.14 _IPv6Constants._reserved_networks."

	^ {{16r0. 8}.
		{16r1000000000000000000000000000000. 8}.
		{16r2000000000000000000000000000000. 7}.
		{16r4000000000000000000000000000000. 6}.
		{16r8000000000000000000000000000000. 5}.
		{16r10000000000000000000000000000000. 4}.
		{16r40000000000000000000000000000000. 3}.
		{16r60000000000000000000000000000000. 3}.
		{16r80000000000000000000000000000000. 3}.
		{16rA0000000000000000000000000000000. 3}.
		{16rC0000000000000000000000000000000. 3}.
		{16rE0000000000000000000000000000000. 4}.
		{16rF0000000000000000000000000000000. 5}.
		{16rF8000000000000000000000000000000. 6}.
		{16rFE000000000000000000000000000000. 9}}
%

category: 'Grail-Private'
method: IPv6Address
_packed: anInt scope: aScopeOrNil
	self dynamicInstVarAt: #_packed put: anInt.
	self dynamicInstVarAt: #_scope put: aScopeOrNil.
	^ self
%

category: 'Grail-Private'
method: IPv6Address
___ipInt___
	"The 128-bit unsigned integer behind this address -- see
	IPv4Address>>___ipInt___ for why ``packed'' cannot serve."

	^ self dynamicInstVarAt: #_packed
%

category: 'Grail-Private'
method: IPv6Address
___scopeOrNil___
	^ self dynamicInstVarAt: #_scope
%

set compile_env: 1

category: 'Grail-Accessors'
method: IPv6Address
packed
	"CPython: a 16-byte bytes object, most significant octet first."

	| ip ba |
	ip := self @env0:dynamicInstVarAt: #_packed.
	ba := ByteArray @env0:new: 16.
	1 @env0:to: 16 do: [:i |
		ba @env0:at: i put: ((ip @env0:bitShift: 8 @env0:* (i @env0:- 16)) @env0:bitAnd: 16rFF)].
	^ ba
%

category: 'Grail-Accessors'
method: IPv6Address
__int__
	^ (self @env0:dynamicInstVarAt: #_packed)
%

category: 'Grail-Accessors'
method: IPv6Address
__str__
	"RFC 5952 compressed form.  An IPv4-mapped address (::ffff:0:0/96)
	renders its low 32 bits as a dotted quad -- CPython compresses only
	the high-order 96 bits and appends str(ipv4_mapped) (RFC 4291
	2.5.5.2), so ``::ffff:1.2.3.4'' round-trips instead of coming back
	as ``::ffff:102:304''."

	| s scope ip mapped |
	ip := self @env0:dynamicInstVarAt: #_packed.
	mapped := self ipv4_mapped.
	s := mapped @env0:== None
		ifTrue: [IPv6Address @env0:___stringFromInt___: ip]
		ifFalse: [
			(IPv6Address @env0:___stringFromInt___: (ip @env0:bitShift: -32))
				@env0:, ':' @env0:, mapped __str__].
	scope := self @env0:___scopeOrNil___.
	scope @env0:isNil ifTrue: [^ s].
	^ s @env0:, '%' @env0:, scope
%

category: 'Grail-Accessors'
method: IPv6Address
__repr__
	^ 'IPv6Address(''' @env0:, self __str__ @env0:, ''')'
%

category: 'Grail-Accessors'
method: IPv6Address
compressed
	^ self __str__
%

category: 'Grail-Accessors'
method: IPv6Address
exploded
	"Eight four-digit hextets -- except for an IPv4-mapped address,
	where CPython keeps the last 32 bits in dotted-quad form
	(``0000:0000:0000:0000:0000:ffff:1.2.3.4'').

	The scope id is appended here.  CPython 3.14 cannot do that: its
	_explode_shorthand_ip_string re-parses str(self), which for a
	scoped address still carries the ``%zone'' and raises
	AddressValueError.  Answering the exploded form is the useful
	behaviour, so this is a deliberate divergence."

	| s scope mapped |
	s := IPv6Address @env0:___explodedFromInt___: (self @env0:dynamicInstVarAt: #_packed).
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [
		s := (s @env0:copyFrom: 1 to: 30) @env0:, mapped __str__].
	scope := self @env0:___scopeOrNil___.
	scope @env0:isNil ifTrue: [^ s].
	^ s @env0:, '%' @env0:, scope
%

category: 'Grail-Accessors'
method: IPv6Address
scope_id
	"CPython answers None when there is no RFC 4007 zone."

	| scope |
	scope := self @env0:___scopeOrNil___.
	scope @env0:isNil ifTrue: [^ None].
	^ scope
%

category: 'Grail-Accessors'
method: IPv6Address
version
	^ 6
%

category: 'Grail-Accessors'
method: IPv6Address
max_prefixlen
	^ 128
%

category: 'Grail-Accessors'
method: IPv6Address
ipv4_mapped
	"::ffff:0:0/96 -- the embedded IPv4Address, else None."

	| ip |
	ip := self @env0:dynamicInstVarAt: #_packed.
	(ip @env0:bitShift: -32) @env0:= 16rFFFF ifFalse: [^ None].
	^ IPv4Address @env0:___fromPacked___: (ip @env0:bitAnd: 16rFFFFFFFF)
%

category: 'Grail-Accessors'
method: IPv6Address
sixtofour
	"2002::/16 -- the embedded 6to4 IPv4Address, else None."

	| ip |
	ip := self @env0:dynamicInstVarAt: #_packed.
	(ip @env0:bitShift: -112) @env0:= 16r2002 ifFalse: [^ None].
	^ IPv4Address @env0:___fromPacked___: ((ip @env0:bitShift: -80) @env0:bitAnd: 16rFFFFFFFF)
%

category: 'Grail-Equality'
method: IPv6Address
__eq__: other
	(other isKindOf: IPv6Address) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #_packed) @env0:= other @env0:___ipInt___)
		@env0:and: [self @env0:___scopeOrNil___ @env0:= other @env0:___scopeOrNil___]
%

category: 'Grail-Equality'
method: IPv6Address
__hash__
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:hash
%

category: 'Grail-Equality'
method: IPv6Address
__lt__: other
	"CPython refuses to order across address families."

	(other isKindOf: IPv6Address) ifFalse: [
		TypeError ___signal___:
			'''<'' not supported between instances of ''IPv6Address'' and ''' @env0:,
				other @env0:class @env0:name @env0:asString @env0:, ''''].
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:< other @env0:___ipInt___
%

category: 'Grail-Categories'
method: IPv6Address
is_unspecified
	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_unspecified].
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:= 0
%

category: 'Grail-Categories'
method: IPv6Address
is_loopback
	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_loopback].
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:= 1
%

category: 'Grail-Categories'
method: IPv6Address
is_multicast
	"ff00::/8."

	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_multicast].
	^ ((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -120) @env0:= 16rFF
%

category: 'Grail-Categories'
method: IPv6Address
is_link_local
	"fe80::/10."

	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_link_local].
	^ ((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -118) @env0:= 16r3FA
%

category: 'Grail-Categories'
method: IPv6Address
is_site_local
	"fec0::/10 (deprecated by RFC 3879, still reported by CPython).
	Unlike the others this one does NOT delegate to ipv4_mapped."

	^ ((self @env0:dynamicInstVarAt: #_packed) @env0:bitShift: -118) @env0:= 16r3FB
%

category: 'Grail-Categories'
method: IPv6Address
is_reserved
	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_reserved].
	^ IPv6Address
		@env0:___inAnyOf___: IPv6Address @env0:___reservedNetworks___
		ip: (self @env0:dynamicInstVarAt: #_packed)
%

category: 'Grail-Categories'
method: IPv6Address
is_private
	"iana-ipv6-special-registry membership, minus the carve-outs."

	| mapped ip |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_private].
	ip := self @env0:dynamicInstVarAt: #_packed.
	^ (IPv6Address @env0:___inAnyOf___: IPv6Address @env0:___privateNetworks___ ip: ip)
		@env0:and: [
			(IPv6Address
				@env0:___inAnyOf___: IPv6Address @env0:___privateNetworkExceptions___
				ip: ip) @env0:not]
%

category: 'Grail-Categories'
method: IPv6Address
is_global
	| mapped |
	mapped := self ipv4_mapped.
	mapped @env0:== None ifFalse: [^ mapped is_global].
	^ self is_private @env0:not
%

category: 'Grail-Callable'
classmethod: IPv6Address
value: positional value: kwargs
	"``IPv6Address(x)'' -- string, int, 16-byte bytes, or another
	IPv6Address."

	| arg |
	arg := positional @env0:at: 1 ifAbsent: [nil].
	(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:size @env0:> 0]) ifTrue: [
		arg := kwargs @env0:at: 'address' ifAbsent: [arg]].
	arg @env0:isNil ifTrue: [
		TypeError ___signal___: 'IPv6Address() missing 1 required positional argument'].
	(arg @env0:isKindOf: Integer) ifTrue: [
		^ IPv6Address @env0:___fromPacked___: arg].
	(arg @env0:isKindOf: ByteArray) ifTrue: [
		| n |
		arg @env0:size @env0:= 16 ifFalse: [
			ValueError ___signal___: 'Packed address must be 16 bytes'].
		n := 0.
		1 @env0:to: 16 do: [:i | n := (n @env0:bitShift: 8) @env0:bitOr: (arg @env0:at: i)].
		^ IPv6Address @env0:___fromPacked___: n].
	(arg @env0:isKindOf: IPv6Address) ifTrue: [^ arg].
	^ IPv6Address @env0:___fromString___: arg @env0:asString
%

category: 'Grail-Introspection'
classmethod: IPv6Address
__name__
	^ 'IPv6Address'
%

category: 'Grail-Introspection'
classmethod: IPv6Address
__qualname__
	^ 'IPv6Address'
%

category: 'Grail-Introspection'
classmethod: IPv6Address
__module__
	^ 'ipaddress'
%

set compile_env: 0

! ------- IPv6Network: address + prefix length
expectvalue /Class
doit
Object subclass: 'IPv6Network'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IPv6Network category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
IPv6Network removeAllMethods: 0.
IPv6Network removeAllMethods: 1.
IPv6Network class removeAllMethods: 0.
IPv6Network class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: IPv6Network
___pythonValueAttrs___
	^ IdentitySet new
		add: #network_address;
		add: #broadcast_address;
		add: #prefixlen;
		add: #num_addresses;
		add: #version;
		add: #max_prefixlen;
		add: #compressed;
		add: #exploded;
		yourself
%

category: 'Grail-Private'
classmethod: IPv6Network
___fromString___: aString strict: strict
	"Parse ``2001:db8::/32'' or a bare address (implicit /128).  In
	strict mode (the default) an input with host bits set is rejected."

	| slash addrPart prefix mask masked addr |
	slash := aString indexOf: $/.
	slash = 0
		ifTrue: [addrPart := aString. prefix := 128]
		ifFalse: [
			addrPart := aString copyFrom: 1 to: slash - 1.
			prefix := aString copyFrom: slash + 1 to: aString size.
			(prefix indexOf: $/) = 0 ifFalse: [
				ValueError @env1:___signal___: 'bad network spec: ' , aString
			].
			prefix := [prefix asNumber] on: Error do: [:ex |
				ValueError @env1:___signal___: 'bad prefix in ' , aString
			].
			((prefix isKindOf: Integer) and: [prefix >= 0 and: [prefix <= 128]]) ifFalse: [
				ValueError @env1:___signal___: 'prefix out of range in ' , aString
			]
		].
	addr := IPv6Address ___fromString___: addrPart.
	addr ___scopeOrNil___ notNil ifTrue: [
		ValueError @env1:___signal___:
			'' , aString , ' has a scope id, but scope ids are not supported for networks'
	].
	mask := prefix = 0
		ifTrue: [0]
		ifFalse: [((1 bitShift: prefix) - 1) bitShift: 128 - prefix].
	masked := addr ___ipInt___ bitAnd: mask.
	(strict and: [(masked = addr ___ipInt___) not]) ifTrue: [
		ValueError @env1:___signal___:
			'host bits set in ' , aString , ' (use strict=False to coerce)'
	].
	^ self ___fromAddr___: (IPv6Address ___fromPacked___: masked) prefix: prefix
%

category: 'Grail-Private'
classmethod: IPv6Network
___fromAddr___: addrInst prefix: prefixInt
	| inst |
	inst := self new.
	inst _network: addrInst _prefix: prefixInt.
	^ inst
%

category: 'Grail-Private'
method: IPv6Network
_network: addrInst _prefix: prefixInt
	self dynamicInstVarAt: #_network put: addrInst.
	self dynamicInstVarAt: #_prefix put: prefixInt.
	^ self
%

set compile_env: 1

category: 'Grail-Accessors'
method: IPv6Network
network_address
	^ (self @env0:dynamicInstVarAt: #_network)
%

category: 'Grail-Accessors'
method: IPv6Network
prefixlen
	^ (self @env0:dynamicInstVarAt: #_prefix)
%

category: 'Grail-Accessors'
method: IPv6Network
version
	^ 6
%

category: 'Grail-Accessors'
method: IPv6Network
max_prefixlen
	^ 128
%

category: 'Grail-Accessors'
method: IPv6Network
broadcast_address
	"Last address in the block."

	| hostBits |
	hostBits := 128 @env0:- (self @env0:dynamicInstVarAt: #_prefix).
	^ IPv6Address @env0:___fromPacked___:
		((self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___
			@env0:bitOr: ((1 @env0:bitShift: hostBits) @env0:- 1))
%

category: 'Grail-Accessors'
method: IPv6Network
num_addresses
	^ 1 @env0:bitShift: 128 @env0:- (self @env0:dynamicInstVarAt: #_prefix)
%

category: 'Grail-Accessors'
method: IPv6Network
__str__
	^ (self @env0:dynamicInstVarAt: #_network) __str__
		@env0:, '/' @env0:, (self @env0:dynamicInstVarAt: #_prefix) @env0:printString
%

category: 'Grail-Accessors'
method: IPv6Network
__repr__
	^ 'IPv6Network(''' @env0:, self __str__ @env0:, ''')'
%

category: 'Grail-Accessors'
method: IPv6Network
compressed
	^ self __str__
%

category: 'Grail-Accessors'
method: IPv6Network
exploded
	^ (self @env0:dynamicInstVarAt: #_network) exploded
		@env0:, '/' @env0:, (self @env0:dynamicInstVarAt: #_prefix) @env0:printString
%

category: 'Grail-Equality'
method: IPv6Network
__eq__: other
	(other isKindOf: IPv6Network) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #_network) __eq__: other network_address)
		@env0:and: [(self @env0:dynamicInstVarAt: #_prefix) @env0:= other prefixlen]
%

category: 'Grail-Equality'
method: IPv6Network
__hash__
	^ ((self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___
		@env0:bitXor: (self @env0:dynamicInstVarAt: #_prefix)) @env0:hash
%

category: 'Grail-Membership'
method: IPv6Network
__contains__: anAddress
	"True if anAddress falls inside this network."

	| addrPacked mask prefix |
	(anAddress isKindOf: IPv6Address) ifFalse: [^ false].
	addrPacked := anAddress @env0:___ipInt___.
	prefix := self @env0:dynamicInstVarAt: #_prefix.
	mask := prefix @env0:= 0
		ifTrue: [0]
		ifFalse: [
			((1 @env0:bitShift: prefix) @env0:- 1) @env0:bitShift: 128 @env0:- prefix
		].
	^ (addrPacked @env0:bitAnd: mask)
		@env0:= (self @env0:dynamicInstVarAt: #_network) @env0:___ipInt___
%

category: 'Grail-Callable'
classmethod: IPv6Network
value: positional value: kwargs
	"``IPv6Network(address, strict=True)''."

	| arg strict |
	arg := positional @env0:at: 1 ifAbsent: [nil].
	strict := positional @env0:at: 2 ifAbsent: [true].
	kwargs @env0:isNil ifFalse: [
		arg := kwargs @env0:at: 'address' ifAbsent: [arg].
		strict := kwargs @env0:at: 'strict' ifAbsent: [strict]].
	arg @env0:isNil ifTrue: [
		TypeError ___signal___: 'IPv6Network() missing 1 required positional argument'].
	(arg @env0:isKindOf: IPv6Network) ifTrue: [^ arg].
	^ IPv6Network @env0:___fromString___: arg @env0:asString strict: strict @env0:== true
%

category: 'Grail-Introspection'
classmethod: IPv6Network
__name__
	^ 'IPv6Network'
%

category: 'Grail-Introspection'
classmethod: IPv6Network
__qualname__
	^ 'IPv6Network'
%

category: 'Grail-Introspection'
classmethod: IPv6Network
__module__
	^ 'ipaddress'
%

set compile_env: 0

! ------- ipaddress module class
expectvalue /Class
doit
module subclass: 'ipaddress'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ipaddress comment:
'Python ipaddress module - IPv4 and IPv6 address / network classes.

  ip_address(s)   -> IPv4Address | IPv6Address
  ip_network(s)   -> IPv4Network | IPv6Network
  IPv4Address / IPv6Address / IPv4Network / IPv6Network are the real
  classes (not constructor methods), so isinstance() discriminates.

Address surface: str/repr, int(), packed (bytes, as CPython),
compressed, exploded, version, max_prefixlen, ==, hash, <, and the
is_* category properties.  IPv6Address adds scope_id, ipv4_mapped,
sixtofour and is_site_local, and delegates every category property
to ipv4_mapped when the address is in ::ffff:0:0/96, as CPython does.

Network surface: network_address, broadcast_address, prefixlen,
num_addresses, version, max_prefixlen, str/repr, ==, hash, and
``addr in net''.

DELIBERATELY NOT IMPLEMENTED (a faithful subset beats a half-working
full port -- see the module PR):
  * IPv4Interface / IPv6Interface and ip_interface()
  * network iteration and algebra: hosts(), subnets(), supernet(),
    __iter__, subnet_of/supernet_of, address_exclude, collapse_addresses,
    summarize_address_range, get_mixed_type_key
  * netmask / hostmask / with_prefixlen / with_netmask / with_hostmask
  * reverse_pointer
  * AddressValueError / NetmaskValueError -- Grail raises plain
    ValueError, which those CPython classes subclass, so ``except
    ValueError'' code (urllib3) is unaffected; ``except
    ipaddress.AddressValueError'' is not available
  * teredo
  * v4/v6 arithmetic (__add__ / __sub__) and __le__/__gt__/__ge__'
%

expectvalue /Class
doit
ipaddress category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
ipaddress removeAllMethods: 0.
ipaddress removeAllMethods: 1.
ipaddress class removeAllMethods: 0.
ipaddress class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: ipaddress
___pythonValueAttrs___
	"``ipaddress.IPv4Address'' must resolve to the CLASS, not to a bound
	method -- that is what makes ``from ipaddress import IPv4Address''
	bind something isinstance() can test against."

	^ IdentitySet new
		add: #IPv4Address;
		add: #IPv6Address;
		add: #IPv4Network;
		add: #IPv6Network;
		add: #'__all__';
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
method: ipaddress
initialize
%

category: 'Grail-Accessors'
method: ipaddress
IPv4Address
	^ IPv4Address
%

category: 'Grail-Accessors'
method: ipaddress
IPv6Address
	^ IPv6Address
%

category: 'Grail-Accessors'
method: ipaddress
IPv4Network
	^ IPv4Network
%

category: 'Grail-Accessors'
method: ipaddress
IPv6Network
	^ IPv6Network
%

category: 'Grail-Accessors'
method: ipaddress
__all__
	^ { 'ip_address'. 'ip_network'.
		'IPv4Address'. 'IPv4Network'. 'IPv6Address'. 'IPv6Network' } @env0:asArray
%

category: 'Grail-Public'
method: ipaddress
ip_address: s
	"ip_address(s) -> IPv4Address or IPv6Address.

	CPython tries IPv4Address first, then IPv6Address, and reports a
	single generic ValueError if neither parse succeeds -- the
	per-family message is deliberately discarded at this level."

	| str |
	(s isKindOf: Integer) ifTrue: [
		(s @env0:>= 0 @env0:and: [s @env0:<= 16rFFFFFFFF]) ifTrue: [
			^ IPv4Address @env0:___fromPacked___: s].
		(s @env0:> 16rFFFFFFFF @env0:and: [s @env0:<= IPv6Address @env0:___allOnes___]) ifTrue: [
			^ IPv6Address @env0:___fromPacked___: s].
		ValueError ___signal___: s @env0:printString @env0:,
			' does not appear to be an IPv4 or IPv6 address'].
	str := s @env0:asString.
	^ [IPv4Address @env0:___fromString___: str]
		@env0:on: ValueError
		do: [:ex |
			[IPv6Address @env0:___fromString___: str]
				@env0:on: ValueError
				do: [:ex2 |
					ValueError ___signal___: '''' @env0:, str @env0:,
						''' does not appear to be an IPv4 or IPv6 address']]
%

category: 'Grail-Public'
method: ipaddress
ip_network: s
	^ self ip_network: s _: true
%

category: 'Grail-Public'
method: ipaddress
_ip_network: positional kw: kwargs
	"Varargs form, so ``ip_network(s, strict=False)'' can name its
	keyword.  BoundMethod>>value:value: prefers the fixed-arity
	selectors above for a purely positional call."

	| addr strict |
	addr := positional @env0:at: 1 ifAbsent: [nil].
	strict := positional @env0:at: 2 ifAbsent: [true].
	kwargs @env0:isNil ifFalse: [
		addr := kwargs @env0:at: 'address' ifAbsent: [addr].
		strict := kwargs @env0:at: 'strict' ifAbsent: [strict]].
	addr @env0:isNil ifTrue: [
		TypeError ___signal___: 'ip_network() missing 1 required positional argument'].
	^ self ip_network: addr _: strict
%

category: 'Grail-Public'
method: ipaddress
ip_network: s _: strict
	"ip_network(s, strict=True) -> IPv4Network or IPv6Network."

	| str |
	str := s @env0:asString.
	^ [IPv4Network @env0:___fromString___: str strict: strict @env0:== true]
		@env0:on: ValueError
		do: [:ex |
			[IPv6Network @env0:___fromString___: str strict: strict @env0:== true]
				@env0:on: ValueError
				do: [:ex2 |
					ValueError ___signal___: '''' @env0:, str @env0:,
						''' does not appear to be an IPv4 or IPv6 network']]
%

set compile_env: 0
