! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- struct.error
!
! CPython's struct.error subclasses Exception DIRECTLY -- it is NOT a
! ValueError, which is what Grail raised before.  That got the hierarchy wrong
! in both directions at once: ``except struct.error'' could not name it at all
! (the module had no such attribute, so the except clause itself raised
! AttributeError), while ``except ValueError'' caught it when CPython would let
! it propagate.
expectvalue /Class
doit
Exception subclass: 'StructError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StructError category: 'Grail-Exceptions'
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
  Byte-order/size: @ = < > ! (native, standard, little, big,
                              network=big)
  Integers:       b B h H i I l L q Q n N
  Floats:         e f d (16/32/64-bit IEEE half, single, double)
  Bytes:          s (counted bytes; 5s = 5-byte field)
                  p (Pascal string: leading length byte)
  Padding:        x (one zero byte, no value)
  Other:          c (single byte as length-1 bytes), ? (bool)

Unsupported (raises struct.error):
  F D (complex, new in 3.14), P (void pointer)

THERE ARE TWO LAYOUT MODES, and the default is the surprising one.

  NATIVE (``@'', or no prefix at all) uses the C compiler''s sizes AND
  INSERTS ALIGNMENT PADDING, exactly as the equivalent C struct would:

      calcsize(''ci'')  = 8    c, 3 pad bytes, then a 4-aligned i
      calcsize(''l'')   = 8    native long is 8 bytes on 64-bit

  STANDARD (``='' ``<'' ``>'' ``!'') uses fixed sizes and NO padding:

      calcsize(''=ci'') = 5
      calcsize(''=l'')  = 4

Grail previously implemented only the standard sizes, with no padding, and
applied them to native formats too -- so every unprefixed mixed-type format
silently produced the wrong layout and the wrong size.  Since the unprefixed
form is what most code writes, that was the common case rather than a corner.

There is NO trailing padding: calcsize(''@qc'') is 9, not 16.  A zero repeat
count still aligns, which is what ``0i'' is for.

n and N are native-only, and naming them under a standard prefix is an error
(``bad char in struct format''), not a silently different size.'
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

	self @env0:at: #Struct put: PyStruct.
	self @env0:at: #error put: StructError
%

! ===============================================================================
! Public API
! ===============================================================================

category: 'Grail-Public'
method: struct
calcsize: format
	"calcsize(format) - byte count needed for format string, INCLUDING
	native alignment padding."

	^ (self _layout: (self _parse: format)) @env0:at: 2
%

category: 'Grail-Public'
method: struct
_pack: positional kw: kwargs
	"pack(format, *values) - varargs entry."

	| format values |
	positional @env0:size @env0:< 1 ifTrue: [
		^ self _raiseError: 'pack requires a format string'
	].
	format := positional @env0:at: 1.
	values := positional @env0:copyFrom: 2 to: positional @env0:size.
	^ self _doPack: format args: values
%

category: 'Grail-Public'
method: struct
_unpack: positional kw: kwargs
	"unpack(format, buffer) - varargs entry, ignores kwargs."

	positional @env0:size @env0:= 2 ifFalse: [
		^ TypeError ___signal___: 'unpack() takes exactly 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'
	].
	^ self unpack: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-Public'
method: struct
unpack: format _: buffer
	"unpack(format, buffer) - return tuple of values.

	The buffer must be EXACTLY calcsize(format) bytes.  Grail used to
	accept any length and read whatever was there, so a short buffer
	either raised a raw Smalltalk index error or, worse, a long one
	silently unpacked and discarded the tail."

	| parsed bytes size |
	parsed := self _parse: format.
	bytes := self _asBytes: buffer.
	size := (self _layout: parsed) @env0:at: 2.
	bytes @env0:size @env0:= size ifFalse: [
		^ self _raiseError: 'unpack requires a buffer of ' @env0:, size @env0:printString @env0:, ' bytes'
	].
	^ self _unpackAll: parsed bytes: bytes offset: 0
%

category: 'Grail-Private'
method: struct
_unpackAll: parsed bytes: bytes offset: offset
	| results |
	results := OrderedCollection @env0:new.
	self _iterUnpack: parsed bytes: bytes offset: offset
		do: [:val | results @env0:add: val].
	^ tuple @env0:withAll: results @env0:asArray
%

category: 'Grail-Public'
method: struct
_unpack_from: positional kw: kwargs
	"unpack_from(format, buffer, offset=0) - offset is accepted by
	keyword as well as by position."

	| offset |
	positional @env0:size @env0:< 2 ifTrue: [
		^ TypeError ___signal___: 'unpack_from() missing required argument ''buffer'' (pos 2)'
	].
	offset := positional @env0:size @env0:>= 3
		ifTrue: [positional @env0:at: 3]
		ifFalse: [self _kwOffsetIn: kwargs].
	^ self unpack_from: (positional @env0:at: 1) _: (positional @env0:at: 2) _: offset
%

category: 'Grail-Private'
method: struct
_kwOffsetIn: kwargs
	"Pull an ``offset'' keyword out of kwargs, defaulting to 0."

	^ (self _kwAt: 'offset' in: kwargs) ifNil: [0]
%

category: 'Grail-Private'
method: struct
_kwAt: name in: kwargs
	"Read one keyword argument, or nil when absent."

	kwargs == nil ifTrue: [^ nil].
	^ [kwargs @env1:get: name _: nil] @env0:on: Error do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Public'
method: struct
unpack_from: format _: buffer
	^ self unpack_from: format _: buffer _: 0
%

category: 'Grail-Public'
method: struct
unpack_from: format _: buffer _: rawOffset
	"unpack_from(format, buffer, offset=0) - unpack at offset; the
	buffer only has to be long ENOUGH, not exact.

	A negative offset counts back from the end, as everywhere else in
	Python."

	| parsed bytes size offset |
	parsed := self _parse: format.
	bytes := self _asBytes: buffer.
	size := (self _layout: parsed) @env0:at: 2.
	offset := self _resolveOffset: rawOffset in: bytes @env0:size.
	offset @env0:+ size @env0:> bytes @env0:size ifTrue: [
		"CPython words this differently for a negative offset, which has
		already been resolved against the length by the time it fails."
		rawOffset @env0:< 0 ifTrue: [
			^ self _raiseError: 'not enough data to unpack ' @env0:, size @env0:printString
				@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
		].
		^ self _raiseError: 'unpack_from requires a buffer of at least '
			@env0:, (offset @env0:+ size) @env0:printString
			@env0:, ' bytes for unpacking ' @env0:, size @env0:printString
			@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
			@env0:, ' (actual buffer size is ' @env0:, bytes @env0:size @env0:printString @env0:, ')'
	].
	^ self _unpackAll: parsed bytes: bytes offset: offset
%

category: 'Grail-Private'
method: struct
_resolveOffset: rawOffset in: bufSize
	"Normalise a possibly-negative offset against the buffer length."

	| offset |
	"An OFFSET is not a packed value: a bad one is a TypeError, not a
	struct.error, and one too large for a machine word is an
	OverflowError.  Routing it through _asPackInteger: gave both the
	wrong exception class."
	(rawOffset @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: 'struct.error: argument must be an int, not '
			@env0:, (bytes ___pyTypeNameOf___: rawOffset)
	].
	rawOffset @env0:abs @env0:> 16r7FFFFFFFFFFFFFFF ifTrue: [
		^ OverflowError ___signal___: 'Python int too large to convert to C ssize_t'
	].
	offset := rawOffset.
	offset @env0:>= 0 ifTrue: [^ offset].
	offset := bufSize @env0:+ offset.
	offset @env0:< 0 ifTrue: [
		^ self _raiseError: 'offset ' @env0:, rawOffset @env0:printString
			@env0:, ' out of range for ' @env0:, bufSize @env0:printString @env0:, '-byte buffer'
	].
	^ offset
%

category: 'Grail-Public'
method: struct
_iter_unpack: positional kw: kwargs
	"iter_unpack(format, buffer) - varargs entry."

	positional @env0:size @env0:= 2 ifFalse: [
		^ TypeError ___signal___: 'iter_unpack() takes exactly 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'
	].
	^ self iter_unpack: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-Public'
method: struct
iter_unpack: format _: buffer
	"iter_unpack(format, buffer) - iterate fixed-size records.

	CPython answers a lazy ``unpack_iterator''.  This builds the tuples
	up front and answers an iterator over them: the observable
	behaviour matches for a buffer that is validated here anyway, and it
	avoids a second stateful iterator class.  The two checks below are
	what make the eager form safe -- a length that is not a multiple of
	the record size, and a zero-length record, are BOTH errors, and the
	zero case would otherwise loop forever."

	| parsed bytes size results |
	parsed := self _parse: format.
	bytes := self _asBytes: buffer.
	size := (self _layout: parsed) @env0:at: 2.
	size @env0:= 0 ifTrue: [
		^ self _raiseError: 'cannot iteratively unpack with a struct of length 0'
	].
	bytes @env0:size @env0:\\ size @env0:= 0 ifFalse: [
		^ self _raiseError: 'iterative unpacking requires a buffer of a multiple of '
			@env0:, size @env0:printString @env0:, ' bytes'
	].
	results := OrderedCollection @env0:new.
	0 @env0:to: bytes @env0:size @env0:- size by: size do: [:off |
		results @env0:add: (self _unpackAll: parsed bytes: bytes offset: off)
	].
	^ (list @env0:withAll: results @env0:asArray) @env1:__iter__
%

category: 'Grail-Public'
method: struct
_pack_into: positional kw: kwargs
	"pack_into(format, buffer, offset, *values) - write into a writable
	buffer in place."

	| format buffer offset values |
	positional @env0:size @env0:< 3 ifTrue: [
		^ TypeError ___signal___: 'pack_into() takes at least 3 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'
	].
	format := positional @env0:at: 1.
	buffer := positional @env0:at: 2.
	offset := positional @env0:at: 3.
	values := positional @env0:copyFrom: 4 to: positional @env0:size.
	^ self pack_into: format _: buffer _: offset args: values
%

category: 'Grail-Public'
method: struct
pack_into: format _: buffer _: rawOffset args: values
	"Pack into an EXISTING mutable buffer rather than a fresh one.

	The target must be read-write: CPython rejects immutable bytes with
	a TypeError, which is a different error class from the size
	complaints below and so is checked first."

	| packed offset |
	"NB: no temp named ``bytes'' here -- it would shadow the bytes CLASS
	that ___pyTypeNameOf___: is sent to, turning a clean TypeError into
	an UnboundLocalError on nil."
	"Two kinds of writable target.  bytearray is a SUBCLASS of bytes
	here, so for the built-in case the kind test IS the mutability test:
	immutable bytes fails it, mutable bytearray passes.  Anything else
	(array.array, and memoryview -- which Grail answers as the underlying
	array) is writable if it exposes __setitem__, which is how the buffer
	protocol reaches it."
	(buffer @env0:isKindOf: bytearray) ifFalse: [
		"NB the SMALLTALK selector: a two-argument Python method compiles
		to ``__setitem__:_:'', so probing the bare ``__setitem__'' answers
		false for every object that actually has one.

		The ByteArray guard matters: immutable bytes IS a ByteArray and
		must stay a TypeError here, so only NON-byte objects (array.array,
		and the memoryview Grail answers as one) take the indexable path."
		((buffer @env0:isKindOf: ByteArray) @env0:not
			@env0:and: [buffer ___respondsTo___: #'__setitem__:_:'])
			ifTrue: [^ self _packIntoIndexable: format _: buffer _: rawOffset args: values].
		^ TypeError ___signal___: 'argument must be read-write bytes-like object, not '
			@env0:, (bytes ___pyTypeNameOf___: buffer)
	].
	packed := self _doPack: format args: values.
	offset := self _resolveOffset: rawOffset in: buffer @env0:size.
	offset @env0:+ packed @env0:size @env0:> buffer @env0:size ifTrue: [
		rawOffset @env0:< 0 ifTrue: [
			^ self _raiseError: 'no space to pack ' @env0:, packed @env0:size @env0:printString
				@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
		].
		^ self _raiseError: 'pack_into requires a buffer of at least '
			@env0:, (offset @env0:+ packed @env0:size) @env0:printString
			@env0:, ' bytes for packing ' @env0:, packed @env0:size @env0:printString
			@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
			@env0:, ' (actual buffer size is ' @env0:, buffer @env0:size @env0:printString @env0:, ')'
	].
	self _copyBytes: packed into: buffer at: offset.
	^ nil
%

! ===============================================================================
! Format parsing
! ===============================================================================

category: 'Grail-Private'
method: struct
_parse: format
	"Parse a format string into { mode. byteOrder. specs }
	where specs is an Array of { typeChar. count }.  mode is #native or
	#standard (it selects the size table AND whether padding is
	inserted); byteOrder is #little, #big or #native.

	An EXPLICIT zero count is kept as 0 rather than folded to 1: ``0s''
	is a genuine empty field, and ``0i'' exists precisely to align
	without storing anything.  Only an ABSENT count means 1."

	| src mode order specs i ch count digit sawDigit |
	src := self _formatString: format.
	"CPython rejects a NUL anywhere in the format with its own message,
	before any per-character check -- so it is not ``bad char''."
	(src @env0:includes: (Character @env0:codePoint: 0)) ifTrue: [
		^ self _raiseError: 'embedded null character'
	].
	mode := #native.
	order := #native.
	i := 1.
	src @env0:isEmpty ifFalse: [
		ch := src @env0:at: 1.
		(ch @env0:= $< @env0:or: [ch @env0:= $> @env0:or: [ch @env0:= $! @env0:or: [ch @env0:= $= @env0:or: [ch @env0:= $@]]]]) ifTrue: [
			ch @env0:= $< ifTrue: [mode := #standard. order := #little].
			ch @env0:= $= ifTrue: [mode := #standard].
			(ch @env0:= $> @env0:or: [ch @env0:= $!]) ifTrue: [mode := #standard. order := #big].
			"@ keeps #native/#native"
			i := 2
		]
	].
	specs := OrderedCollection @env0:new.
	[i @env0:<= src @env0:size] @env0:whileTrue: [
		count := 0.
		sawDigit := false.
		"Optional decimal repeat count."
		[(i @env0:<= src @env0:size) @env0:and: [
			digit := (src @env0:at: i) @env0:asInteger @env0:- $0 @env0:asInteger.
			(digit @env0:>= 0) @env0:and: [digit @env0:<= 9]
		]] @env0:whileTrue: [
			count := count @env0:* 10 @env0:+ digit.
			sawDigit := true.
			i := i @env0:+ 1
		].
		sawDigit ifFalse: [count := 1].
		i @env0:> src @env0:size ifTrue: [
			"Trailing digits with no type char - error."
			^ self _raiseError: 'repeat count given without format specifier'
		].
		ch := src @env0:at: i.
		"Reject unknown chars HERE, at parse time, so calcsize/pack/unpack
		all agree on what is legal -- and so n/N under a standard prefix
		fail even though they are fine natively."
		self _checkFormatChar: ch mode: mode.
		"`s`/`p` consume the repeat count as a single field length; other
		types use it as 'repeat this many times'."
		specs @env0:add: (Array @env0:with: ch with: count).
		i := i @env0:+ 1
	].
	^ Array @env0:with: mode with: order with: specs @env0:asArray
%

category: 'Grail-Private'
method: struct
_formatString: format
	"Normalise a format to a Smalltalk String, accepting str OR bytes.

	CPython takes either -- struct.Struct(b'=i2H') is legal, and
	Struct.format always reports back a STR regardless.  Sending
	#asString to a ByteArray answers its PRINT string ('aByteArray'),
	so a bytes format used to be parsed as that literal text: every
	character bad, and Struct.format reporting 'aByteArray'."

	| str |
	(format @env0:isKindOf: ByteArray) ifTrue: [
		str := String @env0:new: format @env0:size.
		1 @env0:to: format @env0:size do: [:i |
			str @env0:at: i put: (Character @env0:codePoint: (format @env0:at: i))
		].
		^ str
	].
	"A str format is ASCII-ENCODED first, so ANY code point above 127 is a
	UnicodeEncodeError naming its position -- surrogates are not a special
	case, they are just the ones Grail cannot put in a Smalltalk String.
	Checking the code points BEFORE coercing is what keeps a lone
	surrogate from escaping as Grail's internal NotImplementedError
	instead of the UnicodeEncodeError CPython raises."
	(format @env0:isKindOf: PyStrSurrogate) ifTrue: [
		| cps |
		cps := format @env0:___codePoints___.
		1 @env0:to: cps @env0:size do: [:i |
			self _checkAsciiCodePoint: (cps @env0:at: i) at: i @env0:- 1
		].
		"Every code point is ASCII, so this cannot be a surrogate string."
		^ format @env0:asString
	].
	str := format @env0:asString.
	1 @env0:to: str @env0:size do: [:i |
		self _checkAsciiCodePoint: (str @env0:at: i) @env0:codePoint at: i @env0:- 1
	].
	^ str
%

category: 'Grail-Private'
method: struct
_checkAsciiCodePoint: cp at: zeroBasedPos
	"Raise CPython's UnicodeEncodeError for a non-ASCII format character."

	cp @env0:<= 127 ifTrue: [^ self].
	^ UnicodeEncodeError ___signal___: '''ascii'' codec can''t encode character '''
		@env0:, (self _charEscape: cp) @env0:, ''' in position '
		@env0:, zeroBasedPos @env0:printString
		@env0:, ': ordinal not in range(128)'
%

category: 'Grail-Private'
method: struct
_charEscape: cp
	"Python's repr escape for one non-printable/non-ASCII code point:
	\xHH below 256, \uHHHH below 65536, else \UHHHHHHHH.

	Single backslashes: a Smalltalk string literal has NO escape
	sequences, so '\x' is already the two characters Python prints."

	| hex width prefix |
	cp @env0:< 256 ifTrue: [prefix := '\x'. width := 2]
	ifFalse: [cp @env0:< 65536
		ifTrue: [prefix := '\u'. width := 4]
		ifFalse: [prefix := '\U'. width := 8]].
	"Built a nibble at a time rather than via a radix printer: GemStone's
	#printStringRadix: prefixes the radix ('16rFF') and #printString: is
	not a SmallInteger selector at all."
	hex := String @env0:new.
	width @env0:- 1 @env0:to: 0 by: -1 do: [:shift |
		| nib |
		nib := (cp @env0:bitShift: 0 @env0:- (shift @env0:* 4)) @env0:bitAnd: 15.
		hex := hex @env0:, (String @env0:with: ('0123456789abcdef' @env0:at: nib @env0:+ 1))
	].
	^ prefix @env0:, hex
%

category: 'Grail-Private'
method: struct
_validatedFormat: format
	"Normalise a format to a Smalltalk String AND check that it parses.

	Struct precompiles, so a bad format must be rejected at construction
	rather than at the first pack."

	| normalized |
	normalized := self _formatString: format.
	self _parse: normalized.
	^ normalized
%

category: 'Grail-Private'
method: struct
_checkFormatChar: ch mode: mode
	"Raise unless ch is a format character legal in this mode.

	CPython's wording is ``bad char in struct format'', which
	test_struct's test_nN_code asserts on by substring."

	('xcbB?hHiIlLqQfdse' @env0:includes: ch) ifTrue: [^ self].
	ch @env0:= $p ifTrue: [^ self].
	"COMPLEX, new in CPython 3.14: F is two floats, D two doubles.  Legal
	in every mode, like f and d."
	(ch @env0:= $F @env0:or: [ch @env0:= $D]) ifTrue: [^ self].
	"n, N and P are NATIVE ONLY.  Their width is the platform's, so a
	byte-order prefix asks a question they cannot answer, and CPython
	refuses the combination rather than picking one."
	(ch @env0:= $n @env0:or: [ch @env0:= $N @env0:or: [ch @env0:= $P]]) ifTrue: [
		mode @env0:= #native ifTrue: [^ self].
		^ self _raiseError: 'bad char in struct format'
	].
	^ self _raiseError: 'bad char in struct format'
%

! ===============================================================================
! Pack
! ===============================================================================

category: 'Grail-Private'
method: struct
_doPack: format args: values
	"Pack values into a ByteArray of exactly calcsize(format) bytes.

	The buffer is pre-filled with zeros and each field written AT ITS
	LAID-OUT OFFSET, so native alignment gaps stay zero without the
	writer having to track them."

	| parsed mode order layout items total buf valIdx expected |
	parsed := self _parse: format.
	mode := parsed @env0:at: 1.
	order := parsed @env0:at: 2.
	layout := self _layout: parsed.
	items := layout @env0:at: 1.
	total := layout @env0:at: 2.
	expected := self _valueCountFor: items.
	values @env0:size @env0:= expected ifFalse: [
		^ self _raiseError: 'pack expected ' @env0:, expected @env0:printString
			@env0:, ' items for packing (got ' @env0:, values @env0:size @env0:printString @env0:, ')'
	].
	buf := ByteArray @env0:new: total.
	valIdx := 1.
	items @env0:do: [:item |
		| ch count offset out |
		ch := item @env0:at: 1.
		count := item @env0:at: 2.
		offset := item @env0:at: 3.
		ch @env0:= $x ifTrue: [
			"Padding - the zero fill already covers it, no value consumed."
			nil
		] ifFalse: [
			out := WriteStream @env0:on: ByteArray @env0:new.
			(ch @env0:= $s @env0:or: [ch @env0:= $p]) ifTrue: [
				"`s`/`p` pack a SINGLE value occupying `count` bytes."
				ch @env0:= $s
					ifTrue: [self _packBytes: (values @env0:at: valIdx) onto: out length: count]
					ifFalse: [self _packPascal: (values @env0:at: valIdx) onto: out length: count].
				valIdx := valIdx @env0:+ 1
			] ifFalse: [
				"Other types: pack `count` consecutive values."
				1 @env0:to: count do: [:k |
					self _packOne: ch order: order mode: mode value: (values @env0:at: valIdx) onto: out.
					valIdx := valIdx @env0:+ 1
				]
			].
			self _copyBytes: out @env0:contents into: buf at: offset
		]
	].
	^ buf
%

category: 'Grail-Private'
method: struct
_valueCountFor: items
	"How many Python values this layout consumes.  Padding takes none;
	s/p take exactly one regardless of field width; everything else
	takes its repeat count."

	| n |
	n := 0.
	items @env0:do: [:item |
		| ch |
		ch := item @env0:at: 1.
		ch @env0:= $x ifTrue: [nil] ifFalse: [
			(ch @env0:= $s @env0:or: [ch @env0:= $p])
				ifTrue: [n := n @env0:+ 1]
				ifFalse: [n := n @env0:+ (item @env0:at: 2)]
		]
	].
	^ n
%

category: 'Grail-Private'
method: struct
_copyBytes: src into: buf at: offset
	"Blit src into buf starting at 0-based offset."

	1 @env0:to: src @env0:size do: [:k |
		buf @env0:at: offset @env0:+ k put: (src @env0:at: k)
	]
%

category: 'Grail-Private'
method: struct
_packPascal: bytesVal onto: stream length: n
	"Pascal string: a LENGTH BYTE followed by the data, the whole field
	occupying n bytes.

	CPython TRUNCATES rather than raising when the value does not fit --
	pack('3p', b'abcdef') is b'\\x02ab', storing the truncated length --
	and the stored length is capped at 255."

	| bytes avail stored |
	bytes := self _asBytes: bytesVal.
	n @env0:= 0 ifTrue: [^ self].
	avail := n @env0:- 1.
	stored := bytes @env0:size @env0:min: avail.
	stream @env0:nextPut: (stored @env0:min: 255).
	1 @env0:to: avail do: [:i |
		stream @env0:nextPut: (i @env0:<= stored ifTrue: [bytes @env0:at: i] ifFalse: [0])
	]
%

category: 'Grail-Private'
method: struct
_asBytes: buffer
	"Coerce a Python bytes-like object to a Smalltalk ByteArray.

	The old code sent #asByteArray to whatever it was handed, so an int
	or an array.array raised a raw Smalltalk MessageNotUnderstood --
	which no Python ``except'' can catch, and which killed the whole
	module run rather than the one call.  CPython raises TypeError here,
	and array.array reaches the buffer protocol via tobytes()."

	(buffer @env0:isKindOf: ByteArray) ifTrue: [^ buffer].
	(buffer ___respondsTo___: #tobytes) ifTrue: [
		| got |
		got := buffer @env1:tobytes.
		(got @env0:isKindOf: ByteArray) ifTrue: [^ got]
	].
	^ TypeError ___signal___: ('a bytes-like object is required, not '''
		@env0:, (bytes ___pyTypeNameOf___: buffer) @env0:, '''')
%

category: 'Grail-Private'
method: struct
_packBytes: bytesVal onto: stream length: n
	| src |
	src := self _asBytes: bytesVal.
	1 @env0:to: n do: [:i |
		stream @env0:nextPut: (i @env0:<= src @env0:size
			ifTrue: [src @env0:at: i]
			ifFalse: [0])
	]
%

category: 'Grail-Private'
method: struct
_asComplex: value
	"``value'' as a complex, the way CPython coerces an argument to the F
	and D codes: a complex passes through, and anything with __complex__
	or a plain number is converted.  Anything else is the TypeError
	CPython raises -- ``required argument is not a complex''."

	| cls |
	cls := Python @env0:at: #'complex' otherwise: nil.
	(cls @env0:notNil and: [value @env0:isKindOf: cls]) ifTrue: [^ value].
	^ [cls @env1:__new__: value]
		@env0:on: AbstractException
		do: [:ex |
			ex @env0:return: (TypeError ___signal___:
				'required argument is not a complex')]
%

category: 'Grail-Private'
method: struct
_packOne: typeChar order: order mode: mode value: value onto: stream
	"Dispatch single-value pack by format character.

	l/L take their width from the mode (native long is 8 bytes), so the
	size comes from _unitSize:mode: rather than a literal."

	| w |
	typeChar @env0:= $c ifTrue: [^ self _packBytes: value onto: stream length: 1].
	typeChar @env0:= $? ifTrue: [
		"CPython packs the TRUTHINESS of the object, not an identity test
		against True: pack('?', []) is b'\\x00' and pack('?', 3) is
		b'\\x01'.  An == true test answers 0 for every one of those."
		stream @env0:nextPut: (value ___isTruthy___ ifTrue: [1] ifFalse: [0]).
		^ self
	].
	typeChar @env0:= $e ifTrue: [^ self _packDouble: value bytes: 2 order: order onto: stream].
	typeChar @env0:= $f ifTrue: [^ self _packDouble: value bytes: 4 order: order onto: stream].
	typeChar @env0:= $d ifTrue: [^ self _packDouble: value bytes: 8 order: order onto: stream].
	"COMPLEX: the real part then the imaginary, each packed as the float
	the code names.  ``__complex__'' is the coercion CPython accepts, so
	an int or a float packs as a complex with a zero imaginary part."
	(typeChar @env0:= $F @env0:or: [typeChar @env0:= $D]) ifTrue: [
		| c half |
		c := self _asComplex: value.
		half := typeChar @env0:= $F ifTrue: [4] ifFalse: [8].
		self _packDouble: (c @env1:___pyAttrLoad___: #real) bytes: half
			order: order onto: stream.
		^ self _packDouble: (c @env1:___pyAttrLoad___: #imag) bytes: half
			order: order onto: stream
	].

	w := self _unitSize: typeChar mode: mode.
	('bhilqn' @env0:includes: typeChar) ifTrue: [
		| v |
		v := self _asPackInteger: value.
		self _checkRange: v signed: true bytes: w char: typeChar.
		^ self _packIntSigned: v bytes: w order: order onto: stream
	].
	"P joins the unsigned family: a pointer-sized unsigned integer."
	('BHILQNP' @env0:includes: typeChar) ifTrue: [
		| v |
		v := self _asPackInteger: value.
		self _checkRange: v signed: false bytes: w char: typeChar.
		^ self _packIntUnsigned: v bytes: w order: order onto: stream
	].
	^ self _raiseError: 'bad char in struct format'
%

category: 'Grail-Private'
method: struct
_checkRange: v signed: isSigned bytes: w char: typeChar
	"Reject out-of-range integers the way CPython does, naming the bound.

	Without this the value was silently TRUNCATED to the field width --
	pack('B', 256) answered b'\\x00' rather than raising -- which is the
	quiet kind of wrong: the round trip returns a different number than
	it was given, with nothing to notice."

	| lo hi |
	isSigned
		ifTrue: [
			hi := (1 @env0:bitShift: w @env0:* 8 @env0:- 1) @env0:- 1.
			lo := 0 @env0:- hi @env0:- 1
		]
		ifFalse: [
			lo := 0.
			hi := (1 @env0:bitShift: w @env0:* 8) @env0:- 1
		].
	((v @env0:>= lo) @env0:and: [v @env0:<= hi]) ifTrue: [^ self].
	^ self _raiseError: '''' @env0:, typeChar @env0:asString
		@env0:, ''' format requires ' @env0:, lo @env0:printString
		@env0:, ' <= number <= ' @env0:, hi @env0:printString
%

category: 'Grail-Private'
method: struct
_asPackInteger: value
	"Require an integer for an integer format code.

	CPython accepts anything with __index__ and rejects everything else
	with ``required argument is not an integer'' -- notably it rejects
	FLOATS, which test_struct checks directly (pack('i', 1.0) raises).
	Without this the float fell through to bit operations and raised an
	uncatchable Smalltalk error instead."

	(value @env0:isKindOf: Integer) ifTrue: [^ value].
	(value @env0:isKindOf: Float) ifTrue: [
		^ self _raiseError: 'required argument is not an integer'
	].
	(value ___respondsTo___: #'__index__') ifTrue: [
		| idx |
		idx := value @env1:__index__.
		(idx @env0:isKindOf: Integer) ifTrue: [^ idx]
	].
	^ self _raiseError: 'required argument is not an integer'
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
	^ self _packIntUnsigned: v bytes: n order: order onto: stream
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
	n @env0:= 8 ifTrue: [raw := self _doubleToBits: asFloat].
	n @env0:= 4 ifTrue: [raw := self _singleToBits: asFloat].
	n @env0:= 2 ifTrue: [raw := self _halfToBits: asFloat].
	^ self _packIntUnsigned: raw bytes: n order: order onto: stream
%

! ===============================================================================
! Unpack
! ===============================================================================

category: 'Grail-Private'
method: struct
_iterUnpack: parsed bytes: bytes offset: offset0 do: aBlock
	"Read each field at its LAID-OUT offset and yield it through aBlock.
	Padding ($x) consumes bytes without yielding."

	| mode order layout items base |
	mode := parsed @env0:at: 1.
	order := parsed @env0:at: 2.
	layout := self _layout: parsed.
	items := layout @env0:at: 1.
	base := offset0.
	items @env0:do: [:item |
		| ch count offset size |
		ch := item @env0:at: 1.
		count := item @env0:at: 2.
		offset := base @env0:+ (item @env0:at: 3).
		ch @env0:= $x ifTrue: [nil]
		ifFalse: [ch @env0:= $s
			ifTrue: [
				aBlock @env0:value: (bytes @env0:copyFrom: offset @env0:+ 1 to: offset @env0:+ count)
			] ifFalse: [ch @env0:= $p
			ifTrue: [
				"Pascal string: the leading byte is the stored length,
				clamped to what the field can actually hold."
				| n |
				n := count @env0:= 0 ifTrue: [0] ifFalse: [
					(bytes @env0:at: offset @env0:+ 1) @env0:min: count @env0:- 1
				].
				aBlock @env0:value: (bytes @env0:copyFrom: offset @env0:+ 2 to: offset @env0:+ 1 @env0:+ n)
			] ifFalse: [
				size := self _unitSize: ch mode: mode.
				1 @env0:to: count do: [:k |
					aBlock @env0:value: (self _unpackOne: ch order: order mode: mode
						bytes: bytes offset: offset @env0:+ (k @env0:- 1 @env0:* size))
				]
			]]
		]
	]
%

category: 'Grail-Private'
method: struct
_unpackOne: typeChar order: order mode: mode bytes: bytes offset: offset
	"Decode one value of typeChar starting at offset (0-based)."

	| size raw |
	size := self _unitSize: typeChar mode: mode.
	typeChar @env0:= $c ifTrue: [^ bytes @env0:copyFrom: offset @env0:+ 1 to: offset @env0:+ 1].
	typeChar @env0:= $? ifTrue: [
		"NOT ``= 0 not'': unary binds tighter than binary in Smalltalk, so
		that parsed as ``= (0 not)'' and sent #not to the SmallInteger 0 --
		an uncatchable MessageNotUnderstood on EVERY bool unpack.  Any
		non-zero byte is True, matching CPython."
		^ (bytes @env0:at: offset @env0:+ 1) @env0:~= 0
	].
	"COMPLEX is read as its two halves and reassembled -- before the
	single unsigned read below, which would take all 8 or 16 bytes as one
	integer."
	(typeChar @env0:= $F @env0:or: [typeChar @env0:= $D]) ifTrue: [
		| half re im |
		half := size @env0:// 2.
		re := self _unpackFloatOfSize: half bytes: bytes offset: offset order: order.
		im := self _unpackFloatOfSize: half bytes: bytes
			offset: offset @env0:+ half order: order.
		^ (Python @env0:at: #'complex') @env1:__new__: re _: im
	].
	raw := self _readUnsigned: bytes offset: offset bytes: size order: order.
	(typeChar @env0:= $e @env0:or: [typeChar @env0:= $f @env0:or: [typeChar @env0:= $d]]) ifTrue: [
		size @env0:= 8 ifTrue: [^ self _bitsToDouble: raw].
		size @env0:= 4 ifTrue: [^ self _bitsToSingle: raw].
		^ self _bitsToHalf: raw
	].
	('bhilqn' @env0:includes: typeChar) ifTrue: [
		^ self _signed: raw bytes: size
	].
	^ raw
%

category: 'Grail-Private'
method: struct
_unpackFloatOfSize: n bytes: bytes offset: offset order: order
	"One IEEE float of n bytes, read from ``bytes'' at ``offset''.  Split
	out of _unpackOne: so the complex codes can read their two halves
	through the same path the scalar codes use."

	| raw |
	raw := self _readUnsigned: bytes offset: offset bytes: n order: order.
	n @env0:= 8 ifTrue: [^ self _bitsToDouble: raw].
	n @env0:= 4 ifTrue: [^ self _bitsToSingle: raw].
	^ self _bitsToHalf: raw
%

category: 'Grail-Private'
method: struct
_readUnsigned: bytes offset: offset bytes: n order: order
	"Read n bytes as an unsigned int, respecting byte order."

	| value byte |
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

	| sign mantissa abs biased |
	"NEGATIVE ZERO carries its sign bit, and this dropped it: ``-0.0 = 0.0''
	is true, so the early return answered all-zero bits and
	``struct.pack('<d', -0.0)'' lost the 0x80 CPython writes.  The 4-byte
	and 2-byte paths share _floatToBits:, which has always tested for it
	the same way -- 1.0 divided by a negative zero is MinusInfinity -- so
	only the 8-byte path was wrong, and only for this one value."
	sign := (aFloat @env0:< 0
		@env0:or: [(aFloat @env0:= 0.0) @env0:and: [(1.0 @env0:/ aFloat) @env0:< 0]])
		ifTrue: [1] ifFalse: [0].
	aFloat @env0:= 0.0 ifTrue: [^ sign @env0:bitShift: 63].
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
			mantissa @env0:= 0 ifFalse: [^ self _nan].
			^ sign @env0:= 0 ifTrue: [Float @env0:fmax @env0:* 2.0] ifFalse: [Float @env0:fmax @env0:* -2.0]
		].
		magnitude := (1.0 @env0:+ (mantissa @env0:asFloat @env0:/ 4503599627370496.0))
			@env0:* (2.0 @env0:raisedTo: exponent @env0:- 1023)
	].
	^ sign @env0:= 0 ifTrue: [magnitude] ifFalse: [magnitude @env0:negated]
%

category: 'Grail-Private'
method: struct
_singleToBits: aFloat
	"Encode a Float as 32-bit IEEE 754.  Used by format char `f`."

	^ self _floatToBits: aFloat expBits: 8 mantBits: 23 code: 'f'
%

category: 'Grail-Private'
method: struct
_halfToBits: aFloat
	"Encode a Float as 16-bit IEEE 754.  Used by format char `e`."

	^ self _floatToBits: aFloat expBits: 5 mantBits: 10 code: 'e'
%

category: 'Grail-Private'
method: struct
_nan
	"A quiet NaN.  GemStone has no NaN literal and 0.0/0.0 raises
	ZeroDivide, so it is built as inf - inf."

	| inf |
	inf := Float @env0:fmax @env0:* 2.0.
	^ inf @env0:- inf
%

category: 'Grail-Private'
method: struct
_roundShift: value by: n
	"value >> n, ROUNDED TO NEAREST with ties to even.

	This is the whole point of the rewrite below.  The old encoder
	truncated the discarded mantissa bits, so pack('f', x) rounded
	toward zero: a value just under 2 came back as exactly 2 minus an
	ulp, and CPython's test_705836 -- which exists for precisely this
	bug, where a carry out of the mantissa must propagate into the
	exponent -- failed.  Truncation is the silent kind of wrong: the
	round trip returns a plausible neighbouring float."

	| keep half dropped |
	n @env0:<= 0 ifTrue: [^ value @env0:bitShift: n @env0:negated].
	keep := value @env0:bitShift: 0 @env0:- n.
	half := 1 @env0:bitShift: n @env0:- 1.
	dropped := value @env0:bitAnd: (1 @env0:bitShift: n) @env0:- 1.
	dropped @env0:> half ifTrue: [^ keep @env0:+ 1].
	dropped @env0:< half ifTrue: [^ keep].
	"Exact halfway: round to even."
	^ (keep @env0:bitAnd: 1) @env0:= 0 ifTrue: [keep] ifFalse: [keep @env0:+ 1]
%

category: 'Grail-Private'
method: struct
_floatToBits: aFloat expBits: eb mantBits: mb code: codeString
	"Encode a Float into an IEEE 754 field of 1+eb+mb bits.

	Shared by e/f (and d, via the 11/52 case) so the rounding, the
	subnormal path and the overflow check exist once.  Overflow RAISES
	rather than saturating to infinity, which is what CPython does:
	pack('e', 1e5) is an OverflowError, not inf."

	| bias maxBiased sign abs dbits dexp dmant unbiased newBiased full mant shift |
	bias := (1 @env0:bitShift: eb @env0:- 1) @env0:- 1.
	maxBiased := (1 @env0:bitShift: eb) @env0:- 1.
	sign := (aFloat @env0:< 0 @env0:or: [(aFloat @env0:= 0.0) @env0:and: [(1.0 @env0:/ aFloat) @env0:< 0]])
		ifTrue: [1] ifFalse: [0].
	aFloat @env0:= 0.0 ifTrue: [^ sign @env0:bitShift: eb @env0:+ mb].
	abs := aFloat @env0:abs.
	dbits := self _doubleToBits: abs.
	dexp := (dbits @env0:bitShift: -52) @env0:bitAnd: 16r7FF.
	dmant := dbits @env0:bitAnd: 16rFFFFFFFFFFFFF.
	"Inf and NaN are BOTH the all-ones exponent, and they must be told
	apart by the mantissa rather than by comparison: every comparison
	involving NaN is false, so an ``abs > fmax'' test misses NaN and
	drops it into the finite path, where its exponent of 1024 looks like
	an overflow.  That is why pack('f', nan) raised OverflowError."
	dexp @env0:= 16r7FF ifTrue: [
		| payload |
		payload := dmant @env0:= 0 ifTrue: [0] ifFalse: [1 @env0:bitShift: mb @env0:- 1].
		^ (sign @env0:bitShift: eb @env0:+ mb)
			@env0:bitOr: ((maxBiased @env0:bitShift: mb) @env0:bitOr: payload)
	].
	dexp @env0:= 0 ifTrue: [
		"Double subnormal - far below anything e/f can hold."
		^ sign @env0:bitShift: eb @env0:+ mb
	].
	unbiased := dexp @env0:- 1023.
	newBiased := unbiased @env0:+ bias.
	"53 significant bits: the implicit leading 1 plus the stored fraction."
	full := (1 @env0:bitShift: 52) @env0:bitOr: dmant.
	newBiased @env0:>= 1 ifTrue: [
		mant := self _roundShift: full by: 52 @env0:- mb.
		"Rounding can carry out of the mantissa and bump the exponent --
		the exact case test_705836 was written for."
		mant @env0:>= (1 @env0:bitShift: mb @env0:+ 1) ifTrue: [
			mant := mant @env0:bitShift: -1.
			newBiased := newBiased @env0:+ 1
		].
		newBiased @env0:>= maxBiased ifTrue: [
			^ OverflowError ___signal___: 'float too large to pack with '
				@env0:, codeString @env0:, ' format'
		].
		mant := mant @env0:bitAnd: (1 @env0:bitShift: mb) @env0:- 1.
		^ (sign @env0:bitShift: eb @env0:+ mb)
			@env0:bitOr: ((newBiased @env0:bitShift: mb) @env0:bitOr: mant)
	].
	"Subnormal in the target format: shift further right by how far the
	exponent fell below 1.  If rounding carries up to 2^mb the value
	becomes the smallest NORMAL, and writing the bits out plainly
	produces exactly that (exponent field 1, mantissa 0)."
	shift := 52 @env0:- mb @env0:+ 1 @env0:- newBiased.
	shift @env0:> 53 ifTrue: [^ sign @env0:bitShift: eb @env0:+ mb].
	mant := self _roundShift: full by: shift.
	^ (sign @env0:bitShift: eb @env0:+ mb) @env0:bitOr: mant
%

category: 'Grail-Private'
method: struct
_bitsToHalf: bits
	"Decode a 16-bit IEEE 754 raw integer back to Float."

	^ self _bitsToFloat: bits expBits: 5 mantBits: 10
%

category: 'Grail-Private'
method: struct
_bitsToFloat: bits expBits: eb mantBits: mb
	"Decode an IEEE 754 field of 1+eb+mb bits back to a Float."

	| bias maxBiased sign exponent mantissa magnitude |
	bias := (1 @env0:bitShift: eb @env0:- 1) @env0:- 1.
	maxBiased := (1 @env0:bitShift: eb) @env0:- 1.
	sign := (bits @env0:bitShift: 0 @env0:- (eb @env0:+ mb)) @env0:bitAnd: 1.
	exponent := (bits @env0:bitShift: 0 @env0:- mb) @env0:bitAnd: maxBiased.
	mantissa := bits @env0:bitAnd: (1 @env0:bitShift: mb) @env0:- 1.
	exponent @env0:= maxBiased ifTrue: [
		"A non-zero mantissa here is NaN, not infinity.  Collapsing both
		to Inf made unpack(pack(nan)) answer inf -- a finite-looking
		round trip that silently changed the value."
		mantissa @env0:= 0 ifFalse: [^ self _nan].
		^ sign @env0:= 0 ifTrue: [Float @env0:fmax @env0:* 2.0] ifFalse: [Float @env0:fmax @env0:* -2.0]
	].
	exponent @env0:= 0
		ifTrue: [
			mantissa @env0:= 0 ifTrue: [magnitude := 0.0] ifFalse: [
				magnitude := mantissa @env0:asFloat
					@env0:* (2.0 @env0:raisedTo: 1 @env0:- bias @env0:- mb)
			]
		]
		ifFalse: [
			magnitude := (1.0 @env0:+ (mantissa @env0:asFloat @env0:/ (1 @env0:bitShift: mb) @env0:asFloat))
				@env0:* (2.0 @env0:raisedTo: exponent @env0:- bias)
		].
	^ sign @env0:= 0 ifTrue: [magnitude] ifFalse: [magnitude @env0:negated]
%

category: 'Grail-Private'
method: struct
_bitsToSingle: bits
	"Decode a 32-bit IEEE 754 raw integer back to Float.

	The old version had no subnormal and no inf branch, so it decoded
	exponent 0 as 1.0*2^-127 -- a wrong ANSWER rather than an error."

	^ self _bitsToFloat: bits expBits: 8 mantBits: 23
%

! ===============================================================================
! Sizing
! ===============================================================================

category: 'Grail-Private'
method: struct
_unitSize: typeChar mode: mode
	"Byte size for one unit of typeChar (count multiplies this except
	for `s` and `p`, where count is the field length itself).

	l/L are the whole reason this takes a mode: native long is 8 bytes
	on every 64-bit platform Grail runs on, standard long is fixed at 4."

	typeChar @env0:= $x ifTrue: [^ 1].
	typeChar @env0:= $c ifTrue: [^ 1].
	typeChar @env0:= $? ifTrue: [^ 1].
	(typeChar @env0:= $b @env0:or: [typeChar @env0:= $B]) ifTrue: [^ 1].
	(typeChar @env0:= $h @env0:or: [typeChar @env0:= $H]) ifTrue: [^ 2].
	(typeChar @env0:= $i @env0:or: [typeChar @env0:= $I]) ifTrue: [^ 4].
	(typeChar @env0:= $l @env0:or: [typeChar @env0:= $L]) ifTrue: [
		^ mode @env0:= #native ifTrue: [8] ifFalse: [4]
	].
	(typeChar @env0:= $q @env0:or: [typeChar @env0:= $Q]) ifTrue: [^ 8].
	(typeChar @env0:= $n @env0:or: [typeChar @env0:= $N]) ifTrue: [^ 8].
	typeChar @env0:= $P ifTrue: [^ 8].
	typeChar @env0:= $e ifTrue: [^ 2].
	typeChar @env0:= $f ifTrue: [^ 4].
	typeChar @env0:= $d ifTrue: [^ 8].
	"A complex is its two halves laid end to end -- real then imaginary --
	so F is two floats and D two doubles.  Its ALIGNMENT is that of one
	half, not of the pair, which is why _alignOf: asks separately."
	typeChar @env0:= $F ifTrue: [^ 8].
	typeChar @env0:= $D ifTrue: [^ 16].
	(typeChar @env0:= $s @env0:or: [typeChar @env0:= $p]) ifTrue: [^ 1].
	^ self _raiseError: 'bad char in struct format'
%

category: 'Grail-Private'
method: struct
_alignOf: typeChar mode: mode
	"Natural alignment of typeChar, or 1 when no padding applies.

	Standard mode never pads, so everything aligns to 1.  Padding bytes
	($x) and byte strings ($s/$p) align to 1 even natively."

	mode @env0:= #native ifFalse: [^ 1].
	(typeChar @env0:= $x @env0:or: [typeChar @env0:= $s @env0:or: [typeChar @env0:= $p]]) ifTrue: [^ 1].
	"A complex aligns like ONE HALF: a float complex to 4, a double
	complex to 8.  Aligning to the pair's 8 or 16 would pad where CPython
	does not."
	typeChar @env0:= $F ifTrue: [^ 4].
	typeChar @env0:= $D ifTrue: [^ 8].
	^ self _unitSize: typeChar mode: mode
%

category: 'Grail-Private'
method: struct
_layout: parsed
	"Resolve specs into { items. totalSize }, where each item is
	{ typeChar. count. byteOffset }.

	Alignment lives HERE and only here, so calcsize, pack and unpack
	cannot disagree about where a field starts -- computing it
	separately in three walkers is how a layout bug becomes a silent
	data corruption rather than an error.

	No trailing padding: CPython's calcsize('@qc') is 9, not 16, so the
	total is wherever the last field ended."

	| mode specs items offset |
	mode := parsed @env0:at: 1.
	specs := parsed @env0:at: 3.
	items := OrderedCollection @env0:new.
	offset := 0.
	specs @env0:do: [:spec |
		| ch count align size |
		ch := spec @env0:at: 1.
		count := spec @env0:at: 2.
		align := self _alignOf: ch mode: mode.
		"Round the start up to the field's alignment.  A zero repeat
		count still aligns -- that is exactly what ``0i'' is written for."
		align @env0:> 1 ifTrue: [
			| rem |
			rem := offset @env0:\\ align.
			rem @env0:= 0 ifFalse: [offset := offset @env0:+ (align @env0:- rem)]
		].
		items @env0:add: (Array @env0:with: ch with: count with: offset).
		(ch @env0:= $s @env0:or: [ch @env0:= $p @env0:or: [ch @env0:= $x]])
			ifTrue: [size := count]
			ifFalse: [size := (self _unitSize: ch mode: mode) @env0:* count].
		offset := offset @env0:+ size.
		"A repeat count is unbounded text, so the running total can exceed
		what any buffer could address.  CPython caps it rather than
		letting the number grow without limit."
		offset @env0:> self _maxStructSize ifTrue: [
			^ self _raiseError: 'total struct size too long'
		]
	].
	^ Array @env0:with: items @env0:asArray with: offset
%

category: 'Grail-Private'
method: struct
_maxStructSize
	"The largest total a format may describe: CPython's PY_SSIZE_T_MAX,
	which is exactly ``sys.maxsize''.

	It was hardcoded to 2^63-1, the value on CPython's platforms.  Grail's
	sys.maxsize is 2^60-1 -- a GemStone SmallInteger -- so a format built
	from ``sys.maxsize + 1'', which is how test_struct writes the
	overflow case, computed a total the cap never noticed.  Reading the
	same number the caller reads is what makes the test mean what it
	says."

	| sysMod |
	sysMod := Python @env0:at: #'sys' otherwise: nil.
	sysMod @env0:isNil ifTrue: [^ 16r7FFFFFFFFFFFFFFF].
	^ [sysMod @env0:___instance___ @env1:___pyAttrLoad___: #'maxsize']
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: 16r7FFFFFFFFFFFFFFF]
%

category: 'Grail-Private'
method: struct
_packIntoIndexable: format _: buffer _: rawOffset args: values
	"pack_into into an object reached through __setitem__/__len__
	rather than raw bytes -- array.array and memoryview.

	Elements are written as SIGNED bytes where the target holds signed
	items, because array('b') stores -1 rather than 255 and its own
	tobytes() would reject an out-of-range element."

	| packed offset len signed |
	packed := self _doPack: format args: values.
	len := buffer @env1:__len__.
	offset := self _resolveOffset: rawOffset in: len.
	offset @env0:+ packed @env0:size @env0:> len ifTrue: [
		rawOffset @env0:< 0 ifTrue: [
			^ self _raiseError: 'no space to pack ' @env0:, packed @env0:size @env0:printString
				@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
		].
		^ self _raiseError: 'pack_into requires a buffer of at least '
			@env0:, (offset @env0:+ packed @env0:size) @env0:printString
			@env0:, ' bytes for packing ' @env0:, packed @env0:size @env0:printString
			@env0:, ' bytes at offset ' @env0:, rawOffset @env0:printString
			@env0:, ' (actual buffer size is ' @env0:, len @env0:printString @env0:, ')'
	].
	"Probe for the attribute rather than catching a failed load: a Python
	AttributeError is not a Smalltalk Error, so an on:do: around it does
	not catch and the raise escapes."
	signed := (buffer ___respondsTo___: #typecode)
		@env0:and: [(buffer @env1:typecode) @env0:asString @env0:= 'b'].
	1 @env0:to: packed @env0:size do: [:k |
		| byte |
		byte := packed @env0:at: k.
		(signed @env0:and: [byte @env0:> 127]) ifTrue: [byte := byte @env0:- 256].
		buffer @env1:__setitem__: offset @env0:+ k @env0:- 1 _: byte
	].
	^ nil
%

category: 'Grail-Private'
method: struct
_raiseError: msg
	"struct.error, NOT ValueError -- see the StructError comment at the
	top of this file for why the difference is observable both ways."

	^ StructError ___signal___: msg
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
	inst @env0:dynamicInstVarAt: #_format put: (struct instance _validatedFormat: fmt).
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
	^ struct instance calcsize: self format
%

category: 'Grail-Public'
method: PyStruct
_pack: positional kw: kwargs
	"Struct.pack(*values) - forward to struct.pack with our format."

	| args |
	args := { self format }.
	positional @env0:do: [:v | args := args @env0:, (Array @env0:with: v)].
	^ struct instance _pack: args kw: kwargs
%

category: 'Grail-Public'
method: PyStruct
unpack: buffer
	^ struct instance unpack: self format _: buffer
%

category: 'Grail-Public'
method: PyStruct
unpack_from: buffer
	^ struct instance unpack_from: self format _: buffer _: 0
%

category: 'Grail-Public'
method: PyStruct
unpack_from: buffer _: offset
	^ struct instance unpack_from: self format _: buffer _: offset
%

category: 'Grail-Initialization'
method: PyStruct
__init__: fmt
	"Struct.__init__ is RE-CALLABLE: CPython lets ``s.__init__('>hh')''
	repoint an existing Struct at a new format, which
	test_Struct_reinitialization exercises directly.  Without it the
	instance kept the format __new__ gave it and silently ignored the
	second call.

	The format is VALIDATED before it is stored, so a rejected
	re-initialization leaves the previous format in place -- CPython's
	test_Struct_reinitialization packs with the OLD format after
	``s.__init__('$')'' raises.  Storing first would leave the instance
	holding a format it can neither pack nor unpack with."

	| normalized |
	normalized := struct instance _validatedFormat: fmt.
	self @env0:dynamicInstVarAt: #_format put: normalized.
	^ nil
%

category: 'Grail-Public'
method: PyStruct
_unpack_from: positional kw: kwargs
	"Struct.unpack_from(buffer, offset=0) - offset by position or keyword."

	| offset buf |
	buf := positional @env0:size @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [struct instance _kwAt: 'buffer' in: kwargs].
	buf == nil ifTrue: [
		^ TypeError ___signal___: 'unpack_from() missing required argument ''buffer'' (pos 1)'
	].
	offset := positional @env0:size @env0:>= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [struct instance _kwOffsetIn: kwargs].
	^ struct instance unpack_from: self format _: buf _: offset
%

category: 'Grail-Public'
method: PyStruct
iter_unpack: buffer
	^ struct instance iter_unpack: self format _: buffer
%

category: 'Grail-Public'
method: PyStruct
_pack_into: positional kw: kwargs
	"Struct.pack_into(buffer, offset, *values)."

	| values |
	positional @env0:size @env0:< 2 ifTrue: [
		^ TypeError ___signal___: 'pack_into() takes at least 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'
	].
	values := positional @env0:copyFrom: 3 to: positional @env0:size.
	^ struct instance
		pack_into: self format
		_: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		args: values
%

category: 'Grail-String Representation'
method: PyStruct
__repr__
	"CPython prints Struct('=i2H') -- the format REPR, quotes included."

	^ 'Struct(' @env0:, (builtins instance repr: self format) @env0:asString @env0:, ')'
%

set compile_env: 0
