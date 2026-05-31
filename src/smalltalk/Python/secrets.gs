! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- secrets module class
expectvalue /Class
doit
module subclass: 'secrets'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
secrets comment:
'Python secrets module - cryptographically strong random suitable for
managing secrets like account authentication, tokens, and similar.

Backed by GemStone HostRandom, which sources from the OS CSPRNG.
Mirrors the CPython public surface itsdangerous and Werkzeug consume:
token_bytes / token_hex / token_urlsafe / choice / randbelow /
randbits / compare_digest.'
%

expectvalue /Class
doit
secrets category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
secrets removeAllMethods: 0.
secrets removeAllMethods: 1.
secrets class removeAllMethods: 0.
secrets class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: secrets
initialize
	"Lazy-init the underlying generator."
%

category: 'Grail-Private'
method: secrets
_generator
	"Return this session's underlying CSPRNG, creating it on first use.

	Backed by HostRandom, which draws from the OS CSPRNG — the correct
	source for the `secrets` module (cf. CPython's secrets, which is backed
	by os.urandom).  `Random` is a seedable Mersenne-Twister PRNG and is
	NOT cryptographically secure; it backs the `random` module instead.

	Stored in SessionTemps (not the committed module slot) so each Gem
	session gets its own generator and using `secrets` never commits RNG
	state — see the `random` module's `_generator`.  HostRandom also wraps a
	closable OS resource, so re-create it if a prior one was closed."

	| temps gen |
	temps := SessionTemps @env0:current.
	gen := temps @env0:at: #'___GrailSecretsGenerator___' ifAbsent: [nil].
	(gen @env0:== nil or: [(gen @env0:respondsTo: #isOpen) and: [(gen @env0:isOpen) not]]) ifTrue: [
		gen := HostRandom @env0:new.
		temps @env0:at: #'___GrailSecretsGenerator___' put: gen
	].
	^ gen
%

category: 'Grail-Private'
method: secrets
_defaultBytes: nbytes
	"Resolve the default byte count.  Python's secrets defaults to
	DEFAULT_ENTROPY (=32) when nbytes is None."

	(nbytes @env0:== nil or: [nbytes @env0:== None]) ifTrue: [^ 32].
	^ nbytes
%

! ===============================================================================
! Token producers
! ===============================================================================

category: 'Grail-Tokens'
method: secrets
token_bytes
	"token_bytes() - 32 cryptographically strong random bytes."

	^ self @env1:token_bytes: None
%

category: 'Grail-Tokens'
method: secrets
token_bytes: nbytes
	"token_bytes(nbytes=None) - random byte string of length nbytes
	(or DEFAULT_ENTROPY=32 if nbytes is None)."

	| n gen ba |
	n := self @env1:_defaultBytes: nbytes.
	gen := self @env1:_generator.
	ba := ByteArray @env0:new: n.
	1 @env0:to: n do: [:i | ba @env0:at: i put: (gen @env0:integerBetween: 0 and: 255)].
	^ ba
%

category: 'Grail-Tokens'
method: secrets
token_hex
	^ self @env1:token_hex: None
%

category: 'Grail-Tokens'
method: secrets
token_hex: nbytes
	"token_hex(nbytes=None) - lowercase hex string of nbytes random
	bytes (length 2*nbytes)."

	^ (self @env1:token_bytes: nbytes) @env0:asHexString @env0:asLowercase
%

category: 'Grail-Tokens'
method: secrets
token_urlsafe
	^ self @env1:token_urlsafe: None
%

category: 'Grail-Tokens'
method: secrets
token_urlsafe: nbytes
	"token_urlsafe(nbytes=None) - URL-safe base64-encoded random
	token (with `-` and `_` in place of `+` and `/`, and no `=`
	padding).  Each byte encodes to ~1.3 chars."

	^ self @env1:___b64UrlsafeEncode___: (self @env1:token_bytes: nbytes)
%

! ===============================================================================
! Random integer helpers
! ===============================================================================

category: 'Grail-Random ints'
method: secrets
choice: seq
	"choice(seq) - random element from a non-empty sequence."

	| len idx |
	len := [seq @env1:__len__]
		@env0:on: MessageNotUnderstood
		do: [:ex | seq @env0:size].
	len @env0:= 0 ifTrue: [
		IndexError @env1:___signal___: 'Cannot choose from an empty sequence'
	].
	idx := self @env1:_generator @env0:integerBetween: 0 and: len @env0:- 1.
	^ seq @env1:__getitem__: idx
%

category: 'Grail-Random ints'
method: secrets
randbelow: n
	"randbelow(n) - random int in [0, n).  Raises ValueError if n <= 0."

	n @env0:<= 0 ifTrue: [
		ValueError @env1:___signal___: 'Upper bound must be positive'
	].
	^ self @env1:_generator @env0:integerBetween: 0 and: n @env0:- 1
%

category: 'Grail-Random ints'
method: secrets
randbits: k
	"randbits(k) - non-negative int with exactly k random bits.
	Raises ValueError if k < 0."

	k @env0:< 0 ifTrue: [
		ValueError @env1:___signal___: 'k must be non-negative'
	].
	k @env0:= 0 ifTrue: [^ 0].
	"integerBetween:and: with a 2^k-bit range gives a uniform value
	in [0, 2^k)."
	^ self @env1:_generator @env0:integerBetween: 0 and: (1 @env0:bitShift: k) @env0:- 1
%

! ===============================================================================
! Constant-time comparison
! ===============================================================================

category: 'Grail-Constant time'
method: secrets
compare_digest: a _: b
	"compare_digest(a, b) - constant-time string-equal.  Accepts
	str (Unicode7) or bytes (ByteArray); mixing raises TypeError
	per the CPython contract."

	| aIsBytes bIsBytes aSize bSize result aByte bByte |
	aIsBytes := a @env0:isKindOf: ByteArray.
	bIsBytes := b @env0:isKindOf: ByteArray.
	aIsBytes @env0:= bIsBytes ifFalse: [
		TypeError @env1:___signal___: 'compare_digest operands must both be str or both bytes'
	].
	aSize := a @env0:size.
	bSize := b @env0:size.
	"XOR every position; mismatched length still iterates the longer
	side so timing is independent of where the mismatch falls."
	result := aSize @env0:bitXor: bSize.
	1 @env0:to: (aSize @env0:max: bSize) do: [:i |
		aByte := i @env0:<= aSize ifTrue: [(a @env0:at: i) @env0:asInteger] ifFalse: [0].
		bByte := i @env0:<= bSize ifTrue: [(b @env0:at: i) @env0:asInteger] ifFalse: [0].
		result := result @env0:bitOr: (aByte @env0:bitXor: bByte)
	].
	^ result @env0:= 0
%

set compile_env: 0

! ===============================================================================
! Private base64-urlsafe helper (env-1 so it can call other env-1 methods).
! Encoded without `=` padding, using `-` and `_` instead of `+` and `/`.
! ===============================================================================

set compile_env: 1

category: 'Grail-Private'
method: secrets
___b64UrlsafeEncode___: bytes
	| alpha out n i b1 b2 b3 triple stream |
	alpha := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.
	n := bytes @env0:size.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		b1 := (bytes @env0:at: i) @env0:asInteger.
		b2 := i @env0:+ 1 @env0:<= n
			ifTrue: [(bytes @env0:at: i @env0:+ 1) @env0:asInteger]
			ifFalse: [0].
		b3 := i @env0:+ 2 @env0:<= n
			ifTrue: [(bytes @env0:at: i @env0:+ 2) @env0:asInteger]
			ifFalse: [0].
		triple := (b1 @env0:bitShift: 16) @env0:bitOr: ((b2 @env0:bitShift: 8) @env0:bitOr: b3).
		stream @env0:nextPut: (alpha @env0:at: ((triple @env0:bitShift: -18) @env0:bitAnd: 16r3F) @env0:+ 1).
		stream @env0:nextPut: (alpha @env0:at: ((triple @env0:bitShift: -12) @env0:bitAnd: 16r3F) @env0:+ 1).
		i @env0:+ 1 @env0:<= n ifTrue: [
			stream @env0:nextPut: (alpha @env0:at: ((triple @env0:bitShift: -6) @env0:bitAnd: 16r3F) @env0:+ 1)
		].
		i @env0:+ 2 @env0:<= n ifTrue: [
			stream @env0:nextPut: (alpha @env0:at: (triple @env0:bitAnd: 16r3F) @env0:+ 1)
		].
		i := i @env0:+ 3
	].
	out := stream @env0:contents.
	^ out
%

set compile_env: 0
