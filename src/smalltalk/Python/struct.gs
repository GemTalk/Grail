! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- struct module class
expectvalue /Class
doit
module subclass: 'struct'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
struct comment:
'Python struct module - binary pack/unpack between Python values
and bytes per a format string.

Supported format characters:
  Byte-order/size: @ = < > ! (native, native-standard, little, big,
                              network=big)
  Integers:       b B h H i I l L q Q (1/2/4/4/8-byte signed/unsigned)
  Floats:         f d (32-bit IEEE single, 64-bit IEEE double)
  Bytes:          s (counted bytes; 5s = 5-byte field)
  Padding:        x (one zero byte, no value)
  Other:          c (single byte as length-1 bytes), ? (bool)

Unsupported (raises NotImplementedError):
  e (half), n N (native ssize_t), p (Pascal string)

Repeat counts (`4s`, `2I`, ...) work for every format character.
Default byte order is `@` (native = little on Darwin/x86/arm).'
%

expectvalue /Class
doit
struct category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
struct removeAllMethods: 0.
struct removeAllMethods: 1.
struct class removeAllMethods: 0.
struct class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: struct
initialize
	"Store the precompiled Struct class as a module attribute so
	`struct.Struct(fmt)` reaches a class.  Following the io module
	pattern: a unary method accessor would get collapsed by the
	attribute-call fast path; a dict entry forces routing through
	___pyAttrLoad___ + value:value:."

	self @env0:at: #Struct put: PyStruct
%

! ===============================================================================
! Public API
! ===============================================================================

category: 'Grail-Public'
method: struct
calcsize: format
	"calcsize(format) - byte count needed for format string."

	| parsed total |
	parsed := self @env1:_parse: format.
	total := 0.
	(parsed @env0:at: 2) @env0:do: [:spec |
		total := total @env0:+ (self @env1:_unitSize: (spec @env0:at: 1)) @env0:* (spec @env0:at: 2)
	].
	^ total
%

category: 'Grail-Public'
method: struct
_pack: positional kw: kwargs
	"pack(format, *values) - varargs entry."

	| format values |
	positional @env0:size @env0:< 1 ifTrue: [
		^ self @env1:_raiseError: 'pack requires a format string'
	].
	format := positional @env0:at: 1.
	values := positional @env0:copyFrom: 2 to: positional @env0:size.
	^ self @env1:_doPack: format args: values
%

category: 'Grail-Public'
method: struct
_unpack: positional kw: kwargs
	"unpack(format, buffer) - varargs entry, ignores kwargs."

	^ self @env1:unpack: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-Public'
method: struct
unpack: format _: buffer
	"unpack(format, buffer) - return tuple of values."

	| parsed bytes order results |
	bytes := (buffer @env0:isKindOf: ByteArray)
		ifTrue: [buffer]
		ifFalse: [buffer @env0:asByteArray].
	parsed := self @env1:_parse: format.
	order := parsed @env0:at: 1.
	results := OrderedCollection @env0:new.
	self @env1:_iterUnpack: parsed bytes: bytes offset: 0
		do: [:val | results @env0:add: val].
	^ tuple @env0:withAll: results @env0:asArray
%

category: 'Grail-Public'
method: struct
unpack_from: format _: buffer
	^ self @env1:unpack_from: format _: buffer _: 0
%

category: 'Grail-Public'
method: struct
unpack_from: format _: buffer _: offset
	"unpack_from(format, buffer, offset=0) - same as unpack starting
	at offset; doesn't require buffer to be exactly calcsize(format)."

	| parsed bytes results |
	bytes := (buffer @env0:isKindOf: ByteArray)
		ifTrue: [buffer]
		ifFalse: [buffer @env0:asByteArray].
	parsed := self @env1:_parse: format.
	results := OrderedCollection @env0:new.
	self @env1:_iterUnpack: parsed bytes: bytes offset: offset
		do: [:val | results @env0:add: val].
	^ tuple @env0:withAll: results @env0:asArray
%

! ===============================================================================
! Format parsing
! ===============================================================================

category: 'Grail-Private'
method: struct
_parse: format
	"Parse a format string into { byteOrder. specs }
	where specs is an Array of { typeChar. count }.  byteOrder is a
	Symbol: #little, #big, #native."

	| src order specs i ch count digit |
	src := format @env0:asString.
	src @env0:isEmpty ifTrue: [^ Array @env0:with: #native with: #() @env0:asArray].
	order := #native.
	i := 1.
	ch := src @env0:at: 1.
	(ch @env0:= $< @env0:or: [ch @env0:= $> @env0:or: [ch @env0:= $! @env0:or: [ch @env0:= $= @env0:or: [ch @env0:= $@]]]]) ifTrue: [
		ch @env0:= $< ifTrue: [order := #little].
		(ch @env0:= $> @env0:or: [ch @env0:= $!]) ifTrue: [order := #big].
		"= and @ keep #native"
		i := 2
	].
	specs := OrderedCollection @env0:new.
	[i @env0:<= src @env0:size] @env0:whileTrue: [
		count := 0.
		"Optional decimal repeat count."
		[(i @env0:<= src @env0:size) @env0:and: [
			digit := (src @env0:at: i) @env0:asInteger @env0:- $0 @env0:asInteger.
			(digit @env0:>= 0) @env0:and: [digit @env0:<= 9]
		]] @env0:whileTrue: [
			count := count @env0:* 10 @env0:+ digit.
			i := i @env0:+ 1
		].
		count @env0:= 0 ifTrue: [count := 1].
		i @env0:> src @env0:size ifTrue: [
			"Trailing digits with no type char - error."
			^ self @env1:_raiseError: 'incomplete format'
		].
		ch := src @env0:at: i.
		"`s` consumes the repeat count as a single field length; other
		types use it as 'repeat this many times'."
		specs @env0:add: (Array @env0:with: ch with: count).
		i := i @env0:+ 1
	].
	^ Array @env0:with: order with: specs @env0:asArray
%

! ===============================================================================
! Pack
! ===============================================================================

category: 'Grail-Private'
method: struct
_doPack: format args: values
	| parsed order specs out valIdx |
	parsed := self @env1:_parse: format.
	order := parsed @env0:at: 1.
	specs := parsed @env0:at: 2.
	out := WriteStream @env0:on: ByteArray @env0:new.
	valIdx := 1.
	specs @env0:do: [:spec |
		| ch count size |
		ch := spec @env0:at: 1.
		count := spec @env0:at: 2.
		size := self @env1:_unitSize: ch.
		ch @env0:= $x ifTrue: [
			"Padding - write `count` zero bytes, no value consumed."
			1 @env0:to: count do: [:k | out @env0:nextPut: 0]
		] ifFalse: [
			ch @env0:= $s ifTrue: [
				"`s` packs a single value of length `count`."
				self @env1:_packBytes: (values @env0:at: valIdx) onto: out length: count.
				valIdx := valIdx @env0:+ 1
			] ifFalse: [
				"Other types: pack `count` consecutive values."
				1 @env0:to: count do: [:k |
					self @env1:_packOne: ch order: order value: (values @env0:at: valIdx) onto: out.
					valIdx := valIdx @env0:+ 1
				]
			]
		]
	].
	^ out @env0:contents
%

category: 'Grail-Private'
method: struct
_packBytes: bytesVal onto: stream length: n
	| bytes |
	bytes := (bytesVal @env0:isKindOf: ByteArray)
		ifTrue: [bytesVal]
		ifFalse: [bytesVal @env0:asByteArray].
	1 @env0:to: n do: [:i |
		stream @env0:nextPut: (i @env0:<= bytes @env0:size
			ifTrue: [bytes @env0:at: i]
			ifFalse: [0])
	]
%

category: 'Grail-Private'
method: struct
_packOne: typeChar order: order value: value onto: stream
	"Dispatch single-value pack by format character."

	typeChar @env0:= $b ifTrue: [^ self @env1:_packIntSigned: value bytes: 1 order: order onto: stream].
	typeChar @env0:= $B ifTrue: [^ self @env1:_packIntUnsigned: value bytes: 1 order: order onto: stream].
	typeChar @env0:= $h ifTrue: [^ self @env1:_packIntSigned: value bytes: 2 order: order onto: stream].
	typeChar @env0:= $H ifTrue: [^ self @env1:_packIntUnsigned: value bytes: 2 order: order onto: stream].
	(typeChar @env0:= $i @env0:or: [typeChar @env0:= $l]) ifTrue: [^ self @env1:_packIntSigned: value bytes: 4 order: order onto: stream].
	(typeChar @env0:= $I @env0:or: [typeChar @env0:= $L]) ifTrue: [^ self @env1:_packIntUnsigned: value bytes: 4 order: order onto: stream].
	typeChar @env0:= $q ifTrue: [^ self @env1:_packIntSigned: value bytes: 8 order: order onto: stream].
	typeChar @env0:= $Q ifTrue: [^ self @env1:_packIntUnsigned: value bytes: 8 order: order onto: stream].
	typeChar @env0:= $c ifTrue: [^ self @env1:_packBytes: value onto: stream length: 1].
	typeChar @env0:= $? ifTrue: [
		stream @env0:nextPut: (value @env0:== true ifTrue: [1] ifFalse: [0]).
		^ self
	].
	typeChar @env0:= $f ifTrue: [^ self @env1:_packDouble: value bytes: 4 order: order onto: stream].
	typeChar @env0:= $d ifTrue: [^ self @env1:_packDouble: value bytes: 8 order: order onto: stream].
	^ self @env1:_raiseError: 'bad format char: ' @env0:, typeChar @env0:asString
%

category: 'Grail-Private'
method: struct
_packIntSigned: value bytes: n order: order onto: stream
	"Pack signed integer in two's complement."

	| v |
	v := value.
	v @env0:< 0 ifTrue: [
		v := v @env0:+ (1 @env0:bitShift: n @env0:* 8)
	].
	^ self @env1:_packIntUnsigned: v bytes: n order: order onto: stream
%

category: 'Grail-Private'
method: struct
_packIntUnsigned: value bytes: n order: order onto: stream
	"Pack non-negative integer big-endian by default; flip for little."

	| bytes |
	bytes := Array @env0:new: n.
	1 @env0:to: n do: [:i |
		bytes @env0:at: n @env0:- i @env0:+ 1
			put: ((value @env0:bitShift: 0 @env0:- (i @env0:- 1) @env0:* 8) @env0:bitAnd: 16rFF)
	].
	(order @env0:= #little @env0:or: [order @env0:= #native]) ifTrue: [
		"Native on Darwin/x86/arm = little.  Flip the big-endian buffer."
		bytes := bytes @env0:reverse
	].
	bytes @env0:do: [:b | stream @env0:nextPut: b]
%

category: 'Grail-Private'
method: struct
_packDouble: value bytes: n order: order onto: stream
	"Pack IEEE 754 single (n=4) or double (n=8)."

	| asFloat raw |
	asFloat := value @env0:asFloat.
	n @env0:= 8
		ifTrue: [raw := self @env1:_doubleToBits: asFloat]
		ifFalse: [raw := self @env1:_singleToBits: asFloat].
	^ self @env1:_packIntUnsigned: raw bytes: n order: order onto: stream
%

! ===============================================================================
! Unpack
! ===============================================================================

category: 'Grail-Private'
method: struct
_iterUnpack: parsed bytes: bytes offset: offset0 do: aBlock
	"Walk the specs reading from `bytes` and yielding each unpacked
	value through aBlock.  Padding ($x) consumes bytes without yield."

	| order specs offset size value |
	order := parsed @env0:at: 1.
	specs := parsed @env0:at: 2.
	offset := offset0.
	specs @env0:do: [:spec |
		| ch count |
		ch := spec @env0:at: 1.
		count := spec @env0:at: 2.
		size := self @env1:_unitSize: ch.
		ch @env0:= $x ifTrue: [offset := offset @env0:+ count]
		ifFalse: [ch @env0:= $s
			ifTrue: [
				value := bytes @env0:copyFrom: offset @env0:+ 1 to: offset @env0:+ count.
				aBlock @env0:value: value.
				offset := offset @env0:+ count
			] ifFalse: [
				1 @env0:to: count do: [:k |
					value := self @env1:_unpackOne: ch order: order bytes: bytes offset: offset.
					aBlock @env0:value: value.
					offset := offset @env0:+ size
				]
			]
		]
	]
%

category: 'Grail-Private'
method: struct
_unpackOne: typeChar order: order bytes: bytes offset: offset
	"Decode one value of typeChar starting at offset (0-based)."

	| size raw |
	size := self @env1:_unitSize: typeChar.
	typeChar @env0:= $c ifTrue: [^ bytes @env0:copyFrom: offset @env0:+ 1 to: offset @env0:+ 1].
	typeChar @env0:= $? ifTrue: [^ (bytes @env0:at: offset @env0:+ 1) @env0:= 0 @env0:not].
	raw := self @env1:_readUnsigned: bytes offset: offset bytes: size order: order.
	(typeChar @env0:= $f @env0:or: [typeChar @env0:= $d]) ifTrue: [
		^ size @env0:= 8
			ifTrue: [self @env1:_bitsToDouble: raw]
			ifFalse: [self @env1:_bitsToSingle: raw]
	].
	(typeChar @env0:= $b
		@env0:or: [typeChar @env0:= $h
			@env0:or: [typeChar @env0:= $i
				@env0:or: [typeChar @env0:= $l
					@env0:or: [typeChar @env0:= $q]]]]) ifTrue: [
		^ self @env1:_signed: raw bytes: size
	].
	^ raw
%

category: 'Grail-Private'
method: struct
_readUnsigned: bytes offset: offset bytes: n order: order
	"Read n bytes as an unsigned int, respecting byte order."

	| value byte i |
	value := 0.
	(order @env0:= #little @env0:or: [order @env0:= #native]) ifTrue: [
		1 @env0:to: n do: [:k |
			byte := bytes @env0:at: offset @env0:+ k.
			value := value @env0:bitOr: (byte @env0:bitShift: k @env0:- 1 @env0:* 8)
		]
	] ifFalse: [
		1 @env0:to: n do: [:k |
			byte := bytes @env0:at: offset @env0:+ k.
			value := (value @env0:bitShift: 8) @env0:bitOr: byte
		]
	].
	^ value
%

category: 'Grail-Private'
method: struct
_signed: rawUnsigned bytes: n
	"Convert an n-byte unsigned int to signed two's complement."

	| highBit |
	highBit := 1 @env0:bitShift: n @env0:* 8 @env0:- 1.
	rawUnsigned @env0:>= highBit ifTrue: [
		^ rawUnsigned @env0:- (1 @env0:bitShift: n @env0:* 8)
	].
	^ rawUnsigned
%

! ===============================================================================
! IEEE 754 conversion
! ===============================================================================

category: 'Grail-Private'
method: struct
_doubleToBits: aFloat
	"Encode a Float as 64-bit IEEE 754 (raw integer)."

	| sign exponent mantissa abs frac biased |
	aFloat @env0:= 0.0 ifTrue: [^ 0].
	sign := aFloat @env0:< 0 ifTrue: [1] ifFalse: [0].
	abs := aFloat @env0:abs.
	"GemStone Float has 11-bit biased exponent and 52-bit mantissa
	(plus implicit leading 1 for normalized values)."
	biased := abs @env0:_exponentBits.
	mantissa := abs @env0:_mantissaBits.
	"_mantissaBits returns the full 52-bit fraction; bias already
	applied to _exponentBits.  Combine:
	  bit63 = sign, bits62..52 = exponent, bits51..0 = mantissa."
	^ (sign @env0:bitShift: 63)
		@env0:bitOr: ((biased @env0:bitShift: 52) @env0:bitOr: mantissa)
%

category: 'Grail-Private'
method: struct
_bitsToDouble: bits
	"Decode a 64-bit IEEE 754 raw integer back to Float."

	| sign exponent mantissa magnitude |
	bits @env0:= 0 ifTrue: [^ 0.0].
	sign := (bits @env0:bitShift: -63) @env0:bitAnd: 1.
	exponent := (bits @env0:bitShift: -52) @env0:bitAnd: 16r7FF.
	mantissa := bits @env0:bitAnd: 16rFFFFFFFFFFFFF.
	exponent @env0:= 0 ifTrue: [
		"Subnormal: 2^(-1074) * mantissa"
		magnitude := mantissa @env0:asFloat @env0:* (2.0 @env0:raisedTo: -1074)
	] ifFalse: [
		exponent @env0:= 16r7FF ifTrue: [
			"Inf / NaN - return Inf for either since GemStone Float
			doesn't have a portable NaN literal."
			^ sign @env0:= 0 ifTrue: [Float fmax @env0:* 2.0] ifFalse: [Float fmax @env0:* -2.0]
		].
		magnitude := (1.0 @env0:+ (mantissa @env0:asFloat @env0:/ 4503599627370496.0))
			@env0:* (2.0 @env0:raisedTo: exponent @env0:- 1023)
	].
	^ sign @env0:= 0 ifTrue: [magnitude] ifFalse: [magnitude @env0:negated]
%

category: 'Grail-Private'
method: struct
_singleToBits: aFloat
	"Encode a Float as 32-bit IEEE 754 (lossy from double).  Used by
	format chars `f`."

	| sign exponent mantissa abs biased |
	aFloat @env0:= 0.0 ifTrue: [^ 0].
	sign := aFloat @env0:< 0 ifTrue: [1] ifFalse: [0].
	abs := aFloat @env0:abs.
	biased := abs @env0:_exponentBits @env0:- 1023 @env0:+ 127.
	"Truncate 52-bit mantissa to 23 bits."
	mantissa := abs @env0:_mantissaBits @env0:bitShift: -29.
	^ (sign @env0:bitShift: 31)
		@env0:bitOr: ((biased @env0:bitShift: 23) @env0:bitOr: mantissa)
%

category: 'Grail-Private'
method: struct
_bitsToSingle: bits
	"Decode a 32-bit IEEE 754 raw integer back to Float."

	| sign exponent mantissa magnitude |
	bits @env0:= 0 ifTrue: [^ 0.0].
	sign := (bits @env0:bitShift: -31) @env0:bitAnd: 1.
	exponent := (bits @env0:bitShift: -23) @env0:bitAnd: 16rFF.
	mantissa := bits @env0:bitAnd: 16r7FFFFF.
	magnitude := (1.0 @env0:+ (mantissa @env0:asFloat @env0:/ 8388608.0))
		@env0:* (2.0 @env0:raisedTo: exponent @env0:- 127).
	^ sign @env0:= 0 ifTrue: [magnitude] ifFalse: [magnitude @env0:negated]
%

! ===============================================================================
! Sizing
! ===============================================================================

category: 'Grail-Private'
method: struct
_unitSize: typeChar
	"Byte size for one unit of typeChar (count multiplies this except
	for `s` and `p` where count is the field length itself)."

	typeChar @env0:= $x ifTrue: [^ 1].
	typeChar @env0:= $c ifTrue: [^ 1].
	typeChar @env0:= $? ifTrue: [^ 1].
	(typeChar @env0:= $b @env0:or: [typeChar @env0:= $B]) ifTrue: [^ 1].
	(typeChar @env0:= $h @env0:or: [typeChar @env0:= $H]) ifTrue: [^ 2].
	(typeChar @env0:= $i @env0:or: [typeChar @env0:= $I
		@env0:or: [typeChar @env0:= $l @env0:or: [typeChar @env0:= $L]]]) ifTrue: [^ 4].
	(typeChar @env0:= $q @env0:or: [typeChar @env0:= $Q]) ifTrue: [^ 8].
	typeChar @env0:= $f ifTrue: [^ 4].
	typeChar @env0:= $d ifTrue: [^ 8].
	typeChar @env0:= $s ifTrue: [^ 1].
	^ self @env1:_raiseError: 'bad format char: ' @env0:, typeChar @env0:asString
%

category: 'Grail-Private'
method: struct
_raiseError: msg
	^ ValueError @env1:___signal___: msg
%

set compile_env: 0

! ===============================================================================
! PyStruct - precompiled struct format
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyStruct'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyStruct category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyStruct removeAllMethods: 0.
PyStruct removeAllMethods: 1.
PyStruct class removeAllMethods: 0.
PyStruct class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyStruct
___pythonValueAttrs___
	^ IdentitySet new
		add: #format;
		add: #size;
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: PyStruct
__new__: fmt
	"Struct(format) - precompile a struct format string.  Phase B+1:
	stores the format into dynamic-instVar storage."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_format put: fmt @env0:asString.
	^ inst
%

category: 'Grail-Accessors'
method: PyStruct
format
	"Phase B+1: read from dynamic-instVar storage."

	^ self @env0:dynamicInstVarAt: #_format
%

category: 'Grail-Accessors'
method: PyStruct
size
	^ struct @env1:instance @env1:calcsize: self format
%

category: 'Grail-Public'
method: PyStruct
_pack: positional kw: kwargs
	"Struct.pack(*values) - forward to struct.pack with our format."

	| args |
	args := { self format }.
	positional @env0:do: [:v | args := args @env0:, (Array @env0:with: v)].
	^ struct @env1:instance @env1:_pack: args kw: kwargs
%

category: 'Grail-Public'
method: PyStruct
unpack: buffer
	^ struct @env1:instance @env1:unpack: self format _: buffer
%

category: 'Grail-Public'
method: PyStruct
unpack_from: buffer
	^ struct @env1:instance @env1:unpack_from: self format _: buffer _: 0
%

category: 'Grail-Public'
method: PyStruct
unpack_from: buffer _: offset
	^ struct @env1:instance @env1:unpack_from: self format _: buffer _: offset
%

set compile_env: 0
