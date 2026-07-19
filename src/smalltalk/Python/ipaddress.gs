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

set compile_env: 1

category: 'Grail-Accessors'
method: IPv4Address
packed
	"32-bit unsigned int representation."

	^ (self @env0:dynamicInstVarAt: #_packed)
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
	stream := WriteStream @env0:on: Unicode7 @env0:new.
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
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:= other packed
%

category: 'Grail-Equality'
method: IPv4Address
__hash__
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:hash
%

category: 'Grail-Equality'
method: IPv4Address
__lt__: other
	^ (self @env0:dynamicInstVarAt: #_packed) @env0:< other packed
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
	masked := addr @env1:packed bitAnd: mask.
	(strict and: [(masked = addr @env1:packed) not]) ifTrue: [
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
broadcast_address
	"Last address in the block."

	| hostBits |
	hostBits := 32 @env0:- (self @env0:dynamicInstVarAt: #_prefix).
	^ IPv4Address @env0:___fromPacked___:
		((self @env0:dynamicInstVarAt: #_network) packed @env0:bitOr: ((1 @env0:bitShift: hostBits) @env0:- 1))
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
	addrPacked := anAddress packed.
	mask := (self @env0:dynamicInstVarAt: #_prefix) @env0:= 0
		ifTrue: [0]
		ifFalse: [
			((1 @env0:bitShift: (self @env0:dynamicInstVarAt: #_prefix)) @env0:- 1) @env0:bitShift: 32 @env0:- (self @env0:dynamicInstVarAt: #_prefix)
		].
	^ (addrPacked @env0:bitAnd: mask) @env0:= (self @env0:dynamicInstVarAt: #_network) packed
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
'Python ipaddress module - IPv4 address / network classes.

Surface used by Werkzeug (trusted-proxy / X-Forwarded-For handling):
  ip_address(s)   -> IPv4Address
  ip_network(s)   -> IPv4Network
  IPv4Address.is_private / is_loopback / is_global / ...
  IPv4Network.__contains__(addr)

IPv6 is not implemented yet; ip_address with a colon raises
ValueError.  Werkzeug copes gracefully with ValueError so this
limitation surfaces as `request.remote_addr` falling back to the
raw string.'
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

set compile_env: 1

category: 'Grail-Initialization'
method: ipaddress
initialize
%

category: 'Grail-Public'
method: ipaddress
ip_address: s
	"ip_address(s) - parse a string into IPv4Address (or raise
	ValueError for IPv6 / malformed input)."

	| str |
	str := s @env0:asString.
	(str @env0:indexOf: $:) @env0:> 0 ifTrue: [
		ValueError ___signal___: 'IPv6 not supported in Grail ipaddress yet'
	].
	^ IPv4Address @env0:___fromString___: str
%

category: 'Grail-Public'
method: ipaddress
ip_network: s
	^ self ip_network: s _: true
%

category: 'Grail-Public'
method: ipaddress
ip_network: s _: strict
	| str |
	str := s @env0:asString.
	(str @env0:indexOf: $:) @env0:> 0 ifTrue: [
		ValueError ___signal___: 'IPv6 networks not supported in Grail ipaddress yet'
	].
	^ IPv4Network @env0:___fromString___: str strict: strict
%

category: 'Grail-Public'
method: ipaddress
IPv4Address: s
	"IPv4Address(s) constructor.  Accepts either a dotted-quad string
	or a 32-bit packed integer."

	(s isKindOf: Integer) ifTrue: [
		^ IPv4Address @env0:___fromPacked___: s
	].
	^ IPv4Address @env0:___fromString___: s @env0:asString
%

category: 'Grail-Public'
method: ipaddress
IPv4Network: s
	^ IPv4Network @env0:___fromString___: s @env0:asString strict: true
%

set compile_env: 0
