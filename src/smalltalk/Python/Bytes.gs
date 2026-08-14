! ===============================================================================
! ByteArray Methods (Python 'bytes' type)
! ===============================================================================
! This file contains Python method implementations for ByteArray
! to make it behave like Python's bytes type.
!
! Python's bytes is an immutable sequence of bytes (integers 0-255).
! ByteArray in GemStone is mutable, but we enforce immutability through Python methods.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytes
expectvalue /Metaclass3
doit
bytes removeAllMethods: 1.
bytes class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Constructors'
classmethod: bytes
__new__
	"bytes() — create empty bytes. Receiver is the class."

	^ self ___new___
%

category: 'Grail-Constructors'
classmethod: bytes
__new__: source
	"bytes(source) — create bytes from various sources. Receiver is
	the class (so subclasses like bytearray instantiate themselves)."

	| sourceClass materialized ba size hook |
	sourceClass := source @env0:class.

	"Fast paths: the kernel classes that can never carry a __bytes__ hook
	(a Python subclass of int / bytes / bytearray has its own class, so it
	falls through to the general path below and IS hook-checked)."

	"If source is an integer, create bytes of that size filled with zeros"
	sourceClass == SmallInteger ifTrue: [
		^ self ___newZeroed___: source
	].
	(sourceClass == ByteArray or: [sourceClass == bytearray]) ifTrue: [
		^ self ___copyBytesOf___: source
	].

	"CPython's bytes_new_impl consults __bytes__ BEFORE the
	str / buffer / int / iterable fallbacks.  A class may also set
	``__bytes__ = None'' to BLOCK the conversion (gh-24731 /
	test_bytes_blocking), which is a TypeError even for a bytes subclass."
	hook := [source @env1:___pyAttrLoad___: #'__bytes__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	hook @env0:== None ifTrue: [
		TypeError ___signal___: ('cannot convert '''
			@env0:, (bytes ___pyTypeNameOf___: source)
			@env0:, ''' object to bytes')].
	"Consult __bytes__ for a non-bytes-like source, OR for a bytes-like source
	whose class OVERRIDES __bytes__ (gh-24731: a bytes subclass with a custom
	__bytes__ -- e.g. test_bytes' BytesWithBytes -- must use the override, not
	copy its raw content).  A plain bytes/bytearray, or a subclass that only
	inherits the gh-100242 default (owner == ByteArray), still routes to the
	byte-copy path below so ``bytes(bytearray)'' re-types rather than aliasing."
	(hook @env0:notNil and: [(source isKindOf: bytes) @env0:not
		or: [(source @env0:class @env0:whichClassIncludesSelector: #'__bytes__' environmentId: 1)
			@env0:~~ ByteArray]]) ifTrue: [
		| converted |
		converted := source @env1:__bytes__.
		(converted isKindOf: bytes) ifFalse: [
			TypeError ___signal___: ('__bytes__ returned non-bytes (type '
				@env0:, (bytes ___pyTypeNameOf___: converted) @env0:, ')')].
		"CPython returns the hook's object as-is for a plain bytes() call and
		re-types it for a subclass constructor."
		^ (self == ByteArray)
			ifTrue: [converted]
			ifFalse: [self ___copyBytesOf___: converted]].

	"Any other integer (LargePositiveInteger, a bool, ...) is still a count."
	(source isKindOf: Integer) ifTrue: [
		^ self ___newZeroed___: source
	].

	"If source is a string, raise TypeError (need encoding)"
	(source isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'string argument without an encoding'
	].

	"If source is any bytes-like object (bytes / bytearray / subclasses --
	all ByteArray, same byte-storage layout), make a copy.  Previously the
	bytearray path fell through to the default empty-bytes branch, which
	silently produced ``bytes(0)`` from any bytearray and broke
	re._compiler._optimize_charset's BIGCHARSET path (``charmap =
	bytes(charmap)`` lost all 256 bytes of the bitmap)."
	(source isKindOf: bytes) ifTrue: [
		^ self ___copyBytesOf___: source
	].

	"If source is a list, tuple, or array, convert elements to bytes.
	The length is re-read on every step (as CPython's _PyBytes_FromList does):
	an element's __index__ may mutate the very list being consumed (gh-34973 --
	bytes([X(), X()]) where X.__index__ clears the list yields b'*', and a
	self-appending Y grows it to 1000), and indexing a stale length crashed
	with an uncatchable OffsetError."
	(sourceClass == list or: [
		sourceClass == tuple or: [
			sourceClass == Array
		]
	]) ifTrue: [
		| collected i |
		collected := AppendStream @env0:on: ByteArray @env0:new.
		i := 1.
		[i @env0:<= source @env0:size] @env0:whileTrue: [
			collected @env0:nextPut: (self ___coerceByteValue___: (source @env0:at: i)).
			i := i @env0:+ 1
		].
		^ self ___copyBytesOf___: collected @env0:contents
	].

	"If source is a range, convert to bytes"
	(sourceClass == Interval) ifTrue: [
		| aSize aBa |
		aSize := source @env0:size.
		aBa := self ___new___: aSize.
		1 @env0:to: aSize do: [:i |
			| val |
			val := self ___coerceByteValue___: (source @env0:at: i).
			aBa @env0:at: i put: val
		].
		^ aBa
	].

	"A non-integer source with __index__ (and not a sequence handled above)
	is treated as a count, like bytes(n) -- so bytes(Indexable(5)) is five
	zero bytes and bytes(BadInt()) propagates BadInt.__index__'s exception."
	((source isKindOf: Integer) @env0:not
		and: [source ___respondsTo___: #'__index__']) ifTrue: [
		^ self __new__: (source __index__)
	].

	"Any other iterable (generators, reversed_iterator, __iter__/__next__
	or __getitem__-protocol objects, ...) -- materialize via list()'s
	general iterable handling, then validate/convert elements the same
	way as the list/tuple/Array branch above (test_float.py:
	bytes(reversed(b'...')) -- previously fell through to 'empty bytes'
	below, silently losing the whole byte string)."
	materialized := list __new__: source.
	size := materialized @env0:size.
	ba := self ___new___: size.
	1 @env0:to: size do: [:i |
		| val |
		val := self ___coerceByteValue___: (materialized @env0:at: i).
		ba @env0:at: i put: val].
	^ ba
%

category: 'Grail-Introspection'
classmethod: bytes
__doc__
	"``bytes.__doc__'' -- CPython's constructor docstring.  Without this the
	class-side lookup reached object>>__doc__ and reported object's docstring
	(classes are objects, so the instance-side method is on the metaclass
	chain).  bytearray overrides it with its own text."

	^ 'bytes(iterable_of_ints) -> bytes
bytes(string, encoding[, errors]) -> bytes
bytes(bytes_or_buffer) -> immutable copy of bytes_or_buffer
bytes(int) -> bytes object of size given by the parameter initialized with null bytes
bytes() -> empty bytes object

Construct an immutable array of bytes from:
  - an iterable yielding integers in range(256)
  - a text string encoded using the specified encoding
  - any object implementing the buffer API.
  - an integer
'
%

category: 'Grail-Constructors'
classmethod: bytes
___newZeroed___: count
	"bytes(n) / bytearray(n) -- n zero bytes, self-typed.  CPython raises
	ValueError for a negative count, OverflowError for a count that does not
	fit a Py_ssize_t, and MemoryError for one that does fit but cannot be
	allocated; without these guards GemStone's ``new:'' signalled an
	uncatchable OutOfRange."

	(count @env0:< 0) ifTrue: [
		ValueError ___signal___: 'negative count'].
	"Beyond sys.maxsize (which Grail defines as SmallInteger maximumValue)
	the count does not fit an index at all -- CPython's OverflowError."
	(count @env0:> (SmallInteger @env0:maximumValue)) ifTrue: [
		OverflowError ___signal___:
			'cannot fit ''int'' into an index-sized integer'].
	"A GemStone byte object cannot approach Py_ssize_t max; anything at that
	scale is the MemoryError CPython raises for the same request."
	(count @env0:> 1073741823) ifTrue: [
		MemoryError ___signal___: 'cannot allocate bytes object'].
	^ self ___new___: count
%

category: 'Grail-Constructors'
classmethod: bytes
___copyBytesOf___: source
	"A fresh instance of the RECEIVER class holding source's bytes."

	| size result |
	size := source @env0:size.
	result := self ___new___: size.
	1 @env0:to: size do: [:i | result @env0:at: i put: (source @env0:at: i)].
	^ result
%

category: 'Grail-Constructors'
classmethod: bytes
_new: positional kw: kwargs
	"bytes(...) / bytearray(...) called with KEYWORD arguments.  CPython's
	signature is ``bytes(source=b'', encoding=None, errors=None)'': encoding
	or errors given without a str source is a TypeError, and so is a non-str
	encoding / errors.  Without this entry point any keyword call died with an
	uncatchable ``#_new:kw: not understood'' on the metaclass."

	| args source encoding errors n |
	args := positional ifNil: [#()].
	n := args @env0:size.
	source := n @env0:>= 1 ifTrue: [args @env0:at: 1] ifFalse: [nil].
	encoding := n @env0:>= 2 ifTrue: [args @env0:at: 2] ifFalse: [nil].
	errors := n @env0:>= 3 ifTrue: [args @env0:at: 3] ifFalse: [nil].
	n @env0:> 3 ifTrue: [
		TypeError ___signal___: 'bytes() takes at most 3 arguments'].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'source' ifTrue: [
				source ifNotNil: [TypeError ___signal___:
					'argument for bytes() given by name (''source'') and position (1)'].
				source := v]
			ifFalse: [key @env0:= 'encoding' ifTrue: [
				encoding ifNotNil: [TypeError ___signal___:
					'argument for bytes() given by name (''encoding'') and position (2)'].
				encoding := v]
			ifFalse: [key @env0:= 'errors' ifTrue: [
				errors ifNotNil: [TypeError ___signal___:
					'argument for bytes() given by name (''errors'') and position (3)'].
				errors := v]
			ifFalse: [
				TypeError ___signal___: ('bytes() got an unexpected keyword argument '''
					@env0:, key @env0:, '''')]]]]].

	"encoding / errors are only meaningful for a str source."
	(encoding @env0:notNil or: [errors @env0:notNil]) ifTrue: [
		(source isKindOf: CharacterCollection) ifFalse: [
			TypeError ___signal___: (encoding @env0:notNil
				ifTrue: ['encoding without a string argument']
				ifFalse: ['errors without a string argument'])].
		(encoding @env0:notNil and: [(encoding isKindOf: CharacterCollection) @env0:not])
			ifTrue: [TypeError ___signal___: 'bytes() argument ''encoding'' must be str'].
		(errors @env0:notNil and: [(errors isKindOf: CharacterCollection) @env0:not])
			ifTrue: [TypeError ___signal___: 'bytes() argument ''errors'' must be str'].
		encoding ifNil: [
			TypeError ___signal___: 'string argument without an encoding'].
		^ self ___encodeSourceToSelf___: source _: encoding _: (errors ifNil: ['strict'])].

	source ifNil: [^ self __new__].
	^ self __new__: source
%

category: 'Grail-Constructors'
classmethod: bytes
___coerceByteValue___: obj
	"Coerce obj to an int in [0, 255] for use as a byte, honoring __index__
	(CPython): an int is used directly; a non-int with __index__ is converted
	(and its exception, e.g. from a raising __index__, propagates unchanged);
	anything else is a TypeError; an out-of-range result is a ValueError."

	| v |
	v := (obj isKindOf: Integer)
		ifTrue: [obj]
		ifFalse: [
			(obj ___respondsTo___: #'__index__')
				ifTrue: [obj __index__]
				ifFalse: [TypeError ___signal___:
					('''' @env0:, obj @env0:class @env0:name @env0:,
					''' object cannot be interpreted as an integer')]].
	(v isKindOf: Integer) ifFalse: [
		TypeError ___signal___: '__index__ returned non-int'].
	((v @env0:< 0) or: [v @env0:> 255]) ifTrue: [
		ValueError ___signal___: 'bytes must be in range(0, 256)'].
	^ v
%

category: 'Grail-Constructors'
classmethod: bytes
___coerceIndex___: obj
	"Coerce obj to an integer index, honoring __index__ (which may run Python
	code that mutates the receiver -- callers must re-read the size after).

	Delegates to object>>___asIndex___, the single implementation shared with
	every sequence type; kept as an alias because bytes / bytearray / slice
	call it by this name in a dozen places."

	^ obj ___asIndex___
%

category: 'Grail-Constructors'
classmethod: bytes
___encodeSourceToSelf___: source _: enc _: errs
	"Encode a string ``source'' to bytes via str>>encode:_: (the single codec
	authority -- utf-8 multi-byte, utf-16, ascii, latin-1, idna,
	unicode_escape, with 'strict'/'ignore' errors), then copy into a fresh
	instance of the RECEIVER class so a bytearray subclass ctor is self-typed."
	| encoded r |
	(source isKindOf: CharacterCollection) ifFalse: [
		"A non-str source with a __bytes__ hook still converts through it
		(gh-25766: bytes(StrWithBytes(b'abc'), 'iso8859-15'))."
		TypeError ___signal___: 'encoding without a string argument'].
	(enc isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: ('bytes() argument ''encoding'' must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: enc))].
	(errs isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: ('bytes() argument ''errors'' must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: errs))].
	encoded := source encode: enc _: errs.
	r := self ___new___: encoded @env0:size.
	1 @env0:to: encoded @env0:size do: [:i | r @env0:at: i put: (encoded @env0:at: i)].
	^ r
%

category: 'Grail-Constructors'
classmethod: bytes
__new__: source _: encoding
	"bytes(str, encoding) -- encode the string to bytes, self-typed (so a
	bytearray subclass instantiates itself), default 'strict' error policy.

	Also accepts CPython's EXPLICIT-cls spelling ``bytes.__new__(cls, x)'':
	Grail models __new__ as a classmethod whose receiver is already the
	class, so a hand-written subclass __new__ that forwards to the base
	arrives here with the class as the first positional.  A class is never a
	valid bytes() source, so the two forms are unambiguous."
	((source @env0:isKindOf: Behavior)
		@env0:and: [(source == ByteArray) @env0:or: [source @env0:inheritsFrom: ByteArray]])
			ifTrue: [^ source __new__: encoding].
	^ self ___encodeSourceToSelf___: source _: encoding _: 'strict'
%

category: 'Grail-Constructors'
classmethod: bytes
__new__: source _: encoding _: errors
	"bytes(str, encoding, errors) -- 3-arg form with an explicit error policy
	('strict' raises, 'ignore' drops un-encodable characters).  Also the
	explicit-cls spelling ``bytes.__new__(cls, str, encoding)'' -- see
	__new__:_:."
	((source @env0:isKindOf: Behavior)
		@env0:and: [(source == ByteArray) @env0:or: [source @env0:inheritsFrom: ByteArray]])
			ifTrue: [^ source __new__: encoding _: errors].
	^ self ___encodeSourceToSelf___: source _: encoding _: errors
%

category: 'Grail-Constructors'
classmethod: bytes
fromhex: source
	"bytes.fromhex(s) -- parse pairs of hex digits, ignoring ASCII whitespace
	BETWEEN pairs (not within one), matching CPython.  ``source'' may be a str
	or a bytes-like buffer (bytes / bytearray / memoryview / array); anything
	else is a TypeError.  Errors report the 0-based position of the offending
	character.  Self-typed, so a subclass fromhex builds that subclass."

	| src size out i contents |
	src := self ___hexSourceCodes___: source.
	size := src @env0:size.
	out := AppendStream @env0:on: (ByteArray @env0:new).
	i := 1.
	[i @env0:<= size] @env0:whileTrue: [
		| c hi |
		c := src @env0:at: i.
		(self ___isHexWhitespace___: c)
			ifTrue: [i := i @env0:+ 1]
			ifFalse: [
				hi := self ___hexDigitValue___: c.
				(hi @env0:== nil) ifTrue: [
					ValueError ___signal___: ('non-hexadecimal number found in fromhex() arg at position '
						@env0:, (i @env0:- 1) @env0:printString)].
				(i @env0:>= size) ifTrue: [
					ValueError ___signal___:
						'fromhex() arg must contain an even number of hexadecimal digits'].
				[ | lo |
					lo := self ___hexDigitValue___: (src @env0:at: (i @env0:+ 1)).
					(lo @env0:== nil) ifTrue: [
						ValueError ___signal___: ('non-hexadecimal number found in fromhex() arg at position '
							@env0:, i @env0:printString)].
					out @env0:nextPut: ((hi @env0:* 16) @env0:+ lo) ] value.
				i := i @env0:+ 2]].
	contents := out @env0:contents.
	"On a SUBCLASS, run the subclass CONSTRUCTOR rather than allocating raw
	storage: CPython's bytes.fromhex calls the type, so a user __new__ /
	__init__ that sets instance attributes still fires (test_bytes'
	SubclassTest.test_fromhex checks b.foo)."
	((self == ByteArray) @env0:or: [self == bytearray]) ifTrue: [
		^ self ___copyBytesOf___: contents].
	^ self value: { contents } value: nil
%

category: 'Grail-Encoding/Decoding'
classmethod: bytes
___hexSourceCodes___: source
	"The fromhex() argument as an indexable of codepoints: a str yields its
	characters' code points; a bytes-like buffer yields its byte values.
	Anything else is a TypeError (CPython names the offending type)."

	(source isKindOf: CharacterCollection) ifTrue: [
		^ (1 @env0:to: source @env0:size) @env0:collect: [:i | (source @env0:at: i) @env0:asInteger]].
	(source isKindOf: bytes) ifTrue: [^ source].
	"A non-str bytes-like buffer (array.array, ...): materialize its bytes via
	the bytes CONSTRUCTOR (__new__:, not the size allocator ___new___:)."
	(source ___respondsTo___: #'tobytes') ifTrue: [^ bytes __new__: source].
	TypeError ___signal___: ('fromhex() argument must be str or bytes-like, not '
		@env0:, (source @env1:__class__ @env1:__name__))
%

category: 'Grail-Encoding/Decoding'
classmethod: bytes
___isHexWhitespace___: code
	"ASCII whitespace CPython's fromhex() skips between pairs: TAB, LF, VT, FF,
	CR, and space -- NOT other Unicode whitespace (which is rejected)."
	^ #(9 10 11 12 13 32) @env0:includes: code
%

category: 'Grail-Encoding/Decoding'
classmethod: bytes
___hexDigitValue___: code
	"0..15 for an ASCII hex digit code point (0-9, A-F, a-f), else nil."
	((code @env0:>= 48) and: [code @env0:<= 57]) ifTrue: [^ code @env0:- 48].
	((code @env0:>= 65) and: [code @env0:<= 70]) ifTrue: [^ code @env0:- 55].
	((code @env0:>= 97) and: [code @env0:<= 102]) ifTrue: [^ code @env0:- 87].
	^ nil
%

category: 'Grail-Translation Methods'
classmethod: bytes
maketrans: frm _: to
	"Create translation table (identity table with replacements)
	Note: This is actually a staticmethod in Python (doesn't receive cls),
	but Grail doesn't have a staticmethod: directive for hand-written methods."
	| frmSize toSize table |
	"Both arguments must be bytes-like: CPython rejects str with a TypeError
	(without the check, ``frm at: i'' handed a Character to arithmetic below
	and died with an uncatchable env-0 DNU)."
	(frm isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (bytes ___pyTypeNameOf___: frm) @env0:, '''')].
	(to isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (bytes ___pyTypeNameOf___: to) @env0:, '''')].
	frmSize := frm @env0:size.
	toSize := to @env0:size.

	"frm and to must be same size"
	(frmSize @env0:= toSize) ifFalse: [
		ValueError ___signal___: 'maketrans arguments must have same length'
	].

	"Create identity table (0-255)"
	table := bytes ___new___: 256.
	0 @env0:to: 255 do: [:i |
		table @env0:at: (i @env0:+ 1) put: i
	].

	"Apply replacements"
	1 @env0:to: frmSize do: [:i |
		| frmByte toByte |
		frmByte := frm @env0:at: i.
		toByte := to @env0:at: i.
		table @env0:at: (frmByte @env0:+ 1) put: toByte
	].

	^ table
%

category: 'Grail-String Operations'
method: bytes
__rmod__: other
	"``other % bytes'' -- CPython's bytes.__rmod__ always returns
	NotImplemented (it exists only so the binary-op protocol can fall through
	to the left operand's error), so ``object() % b'abc''' is a TypeError."

	^ #'___NotImplemented___'
%

category: 'Grail-Type'
method: bytes
__bytes__
	"bytes(obj) protocol hook.  CPython defines bytes.__bytes__ (gh-100242)
	returning a plain ``bytes'' -- for a bytes SUBCLASS instance it returns a
	base-class copy, not the subclass."

	| size result |
	(self @env0:class == ByteArray) ifTrue: [^ self].
	size := self @env0:size.
	result := ByteArray @env0:new: size.
	1 @env0:to: size do: [:i | result @env0:at: i put: (self @env0:at: i)].
	^ result
%

category: 'Grail-String Operations'
method: bytes
__mod__: args
	"``bytes % args'' printf-style formatting (PEP 461).  Byte-native engine:
	%b/%s take a bytes-like (or __bytes__) object; %a is ascii(obj); %c is an
	int in range(256) or a single byte; %d %i %u %o %x %X %e %E %f %F %g %G are
	numeric (rendered ASCII via the shared str %-converter); %% is a literal %.
	Mapping form %(key)conv indexes a dict by the (bytes) key (balanced parens).
	Flags, width and precision (including '*' args) are honored.  The result is
	the receiver's own type (bytes -> bytes, bytearray -> bytearray)."

	| n out i isMap argSeq argIdx nextArg content result fmt checkStable |
	n := self @env0:size.
	"Drive the scan off a SNAPSHOT of the format bytes.  A conversion can run
	arbitrary Python (%a calls repr, %s calls str, a '*' width calls __index__)
	and that code may clear or shrink a bytearray receiver -- indexing the live
	object with the captured length then died with an uncatchable GemStone
	OffsetError (CPython's gh-142557 crash, same cause)."
	fmt := ByteArray @env0:new: n.
	1 @env0:to: n do: [:z | fmt @env0:at: z put: (self @env0:at: z)].
	"CPython holds a buffer export over the format string for the duration, so
	a mid-format mutation is a BufferError.  Grail has no export machinery;
	compare the length instead, which catches every case the tests describe."
	checkStable := [
		self @env0:size @env0:= n ifFalse: [
			BufferError ___signal___:
				'Existing exports of data: object cannot be re-sized']].
	out := AppendStream @env0:on: ByteArray @env0:new.
	isMap := args isKindOf: KeyValueDictionary.
	"Only a TUPLE unpacks into positional arguments; a list is a single value
	(tuple is an Array subclass, so one test covers both).  See the fuller note
	in CharacterCollection>>__mod__: -- unpacking OrderedCollection too meant a
	list operand formatted only its first element."
	(isMap @env0:not @env0:and: [args isKindOf: Array]) ifTrue: [argSeq := args]
		ifFalse: [isMap ifTrue: [argSeq := nil] ifFalse: [argSeq := Array @env0:with: args]].
	argIdx := 1.
	nextArg := [ | v |
		argSeq @env0:isNil ifTrue: [TypeError ___signal___: 'format requires a mapping'].
		argIdx @env0:> argSeq @env0:size ifTrue: [
			TypeError ___signal___: 'not enough arguments for format string'].
		v := argSeq @env0:at: argIdx. argIdx := argIdx @env0:+ 1. v ].
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		| byte |
		byte := fmt @env0:at: i.
		byte @env0:= 37 ifFalse: [ out @env0:nextPut: byte. i := i @env0:+ 1 ]
		ifTrue: [
			| key flags width precision conv value |
			i := i @env0:+ 1.
			i @env0:> n ifTrue: [ValueError ___signal___: 'incomplete format'].
			"mapping key: %(...) matching balanced parens"
			key := nil.
			(fmt @env0:at: i) @env0:= 40 ifTrue: [
				| depth start kk klen |
				i := i @env0:+ 1. start := i. depth := 1.
				[depth @env0:> 0] @env0:whileTrue: [
					i @env0:> n ifTrue: [ValueError ___signal___: 'incomplete format key'].
					(fmt @env0:at: i) @env0:= 40 ifTrue: [depth := depth @env0:+ 1].
					(fmt @env0:at: i) @env0:= 41 ifTrue: [depth := depth @env0:- 1].
					depth @env0:> 0 ifTrue: [i := i @env0:+ 1]].
				"Key is always a plain (hashable) bytes -- a slice of a bytearray
				receiver would be an unhashable bytearray, unusable as a dict key."
				klen := i @env0:- start.
				kk := bytes @env0:___new___: klen.
				1 @env0:to: klen do: [:z | kk @env0:at: z put: (fmt @env0:at: start @env0:+ z @env0:- 1)].
				key := kk.
				i := i @env0:+ 1].
			"flags: - + space # 0  (45 43 32 35 48)"
			flags := OrderedCollection @env0:new.
			[i @env0:<= n @env0:and: [ | c | c := fmt @env0:at: i.
				(c @env0:= 45) @env0:or: [(c @env0:= 43) @env0:or: [(c @env0:= 32) @env0:or: [
					(c @env0:= 35) @env0:or: [c @env0:= 48]]]] ]]
				@env0:whileTrue: [
					flags @env0:add: (Character @env0:codePoint: (fmt @env0:at: i)). i := i @env0:+ 1 ].
			"width: digits or '*' (consumes an arg; negative -> '-' flag)"
			width := 0.
			(i @env0:<= n @env0:and: [(fmt @env0:at: i) @env0:= 42]) ifTrue: [
				width := (nextArg @env0:value) @env0:asInteger.
				checkStable @env0:value.
				width @env0:< 0 ifTrue: [ flags @env0:add: $-. width := width @env0:abs ].
				i := i @env0:+ 1
			] ifFalse: [
				[i @env0:<= n @env0:and: [ | c | c := fmt @env0:at: i. (c @env0:>= 48) @env0:and: [c @env0:<= 57]]]
					@env0:whileTrue: [
						width := (width @env0:* 10) @env0:+ ((fmt @env0:at: i) @env0:- 48). i := i @env0:+ 1 ]].
			"precision: '.' then digits or '*'  ('.' alone means 0)"
			precision := nil.
			(i @env0:<= n @env0:and: [(fmt @env0:at: i) @env0:= 46]) ifTrue: [
				i := i @env0:+ 1.
				(i @env0:<= n @env0:and: [(fmt @env0:at: i) @env0:= 42]) ifTrue: [
					precision := (nextArg @env0:value) @env0:asInteger.
					checkStable @env0:value.
					precision @env0:< 0 ifTrue: [precision := nil].
					i := i @env0:+ 1
				] ifFalse: [
					precision := 0.
					[i @env0:<= n @env0:and: [ | c | c := fmt @env0:at: i. (c @env0:>= 48) @env0:and: [c @env0:<= 57]]]
						@env0:whileTrue: [
							precision := (precision @env0:* 10) @env0:+ ((fmt @env0:at: i) @env0:- 48). i := i @env0:+ 1 ]].
				"Same cap as str's %-format: an arbitrary-precision Integer here made
				``b'%.*d' % (sys.maxsize, 1)'' try to build a sys.maxsize-digit result
				and HANG the session.  bytes has its own %-engine, so capping str's
				alone just moved the hang -- test_format's testcommon exercises str,
				bytes AND bytearray with the same format string."
				(precision @env0:notNil @env0:and: [precision @env0:> 2147483647])
					ifTrue: [OverflowError ___signal___: 'precision too large']].
			"skip C length modifiers h l L (104 108 76)"
			[i @env0:<= n @env0:and: [ | c | c := fmt @env0:at: i.
				(c @env0:= 104) @env0:or: [(c @env0:= 108) @env0:or: [c @env0:= 76]] ]]
				@env0:whileTrue: [i := i @env0:+ 1].
			i @env0:> n ifTrue: [ValueError ___signal___: 'incomplete format'].
			conv := fmt @env0:at: i. i := i @env0:+ 1.
			conv @env0:= 37 ifTrue: [ out @env0:nextPut: 37 ]
			ifFalse: [
				"Unknown conversion: CPython names the character, its hex code and
				its 0-based index in the format string, and only this loop knows
				the index.  conv is at ``i - 1'' now that i has advanced."
				(bytes ___isBytesConversion___: conv) ifFalse: [
					ValueError ___signal___: ('unsupported format character '''
						@env0:, (String @env0:with: (Character @env0:codePoint: conv))
						@env0:, ''' (0x' @env0:, (conv @env0:printStringRadix: 16
							showRadix: false) @env0:asLowercase
						@env0:, ') at index ' @env0:, (i @env0:- 2) @env0:printString)].
				key @env0:notNil
					ifTrue: [value := args @env1:__getitem__: key]
					ifFalse: [value := nextArg @env0:value].
				self ___modEmit___: value conv: conv flags: flags width: width
					precision: precision into: out.
				checkStable @env0:value ]
		]
	].
	"Every positional argument must be consumed: ``b'no format' % 7'' is a
	TypeError, where Grail silently returned the format string.  Note the
	wording -- ``bytes formatting'', not str's ``string formatting'' -- and that
	a MAPPING right-hand side (argSeq nil) may leave keys unreferenced."
	(argSeq @env0:notNil @env0:and: [argIdx @env0:<= argSeq @env0:size]) ifTrue: [
		TypeError ___signal___:
			'not all arguments converted during bytes formatting'].
	content := out @env0:contents.
	result := (self @env0:class) ___new___: content @env0:size.
	1 @env0:to: content @env0:size do: [:k | result @env0:at: k put: (content @env0:at: k)].
	^ result
%

category: 'Grail-String Operations'
method: bytes
___modEmit___: value conv: conv flags: flags width: width precision: precision into: out
	"Emit one formatted %-field (conv is the conversion byte) into the ByteArray
	stream ``out''.  b/s/a produce a byte sequence (precision truncates, width
	pads with spaces); c is a single byte; the numeric conversions render ASCII
	via the shared str %-converter."

	| content leftAlign num res |
	leftAlign := flags @env0:includes: $-.
	"b (98) / s (115) / a (97) / r (114): byte-sequence conversions.  %r is an
	ALIAS for %a here (PEP 461) and was missing, so b'%r' % b'ghi' fell through
	to the NUMERIC branch and raised ``%r format: a real number is required,
	not bytes'' (test_format test_bytes_and_bytearray_format)."
	((conv @env0:= 98) @env0:or: [(conv @env0:= 115) @env0:or: [
		(conv @env0:= 97) @env0:or: [conv @env0:= 114]]]) ifTrue: [
		((conv @env0:= 97) @env0:or: [conv @env0:= 114])
			ifTrue: [ | s |
				s := (builtins instance ascii: value) @env0:asString.
				content := ByteArray @env0:new: s @env0:size.
				1 @env0:to: s @env0:size do: [:k | content @env0:at: k put: (s @env0:at: k) @env0:codePoint] ]
			ifFalse: [ content := self ___modBytesArg___: value ].
		(precision ~~ nil @env0:and: [content @env0:size @env0:> precision]) ifTrue: [
			content := content @env0:copyFrom: 1 to: precision].
		^ self ___modPad___: content width: width leftAlign: leftAlign into: out ].
	"c (99): a single byte, width-padded (no precision)."
	conv @env0:= 99 ifTrue: [
		content := ByteArray @env0:with: (self ___modCharByte___: value).
		^ self ___modPad___: content width: width leftAlign: leftAlign into: out ].
	"numeric: d i u o x X e E f F g G -- render ASCII, emit as bytes."
	num := self ___modNumeric___: value conv: (Character @env0:codePoint: conv).
	res := builtins instance ___printfConvert___: num conv: (Character @env0:codePoint: conv)
		flags: flags width: width precision: precision.
	1 @env0:to: res @env0:size do: [:k | out @env0:nextPut: (res @env0:at: k) @env0:codePoint]
%

category: 'Grail-Type'
classmethod: bytes
___isBytesConversion___: convByte
	"Is ``convByte'' a conversion character bytes %-formatting accepts?  b and
	r are bytes-only (str has no %b; %r here is an alias for %a), and ``%'' is
	excluded because the caller consumes a literal ``%%'' before asking."

	^ #(98 115 97 114 99 100 105 117 111 120 88 101 69 102 70 103 71)
		@env0:includes: convByte
%

category: 'Grail-String Operations'
method: bytes
___modPad___: content width: width leftAlign: leftAlign into: out
	"Emit ``content'' (a ByteArray) into ``out'', space-padded to ``width''."

	| pad |
	pad := width @env0:- content @env0:size.
	(pad @env0:> 0 @env0:and: [leftAlign @env0:not]) ifTrue: [
		pad @env0:timesRepeat: [out @env0:nextPut: 32]].
	1 @env0:to: content @env0:size do: [:k | out @env0:nextPut: (content @env0:at: k)].
	(pad @env0:> 0 @env0:and: [leftAlign]) ifTrue: [
		pad @env0:timesRepeat: [out @env0:nextPut: 32]]
%

category: 'Grail-String Operations'
method: bytes
___modBytesArg___: value
	"%b/%s operand: a bytes-like object, or one implementing __bytes__."

	(value isKindOf: ByteArray) ifTrue: [^ value].
	(value ___respondsTo___: #'__bytes__') ifTrue: [^ value __bytes__].
	TypeError ___signal___: ('%b requires a bytes-like object, or an object that implements __bytes__, not '''
		@env0:, (self ___modTypeName___: value) @env0:, '''')
%

category: 'Grail-String Operations'
method: bytes
___modTypeName___: value
	"CPython-facing type name for %-format error messages."

	^ bytes ___pyTypeNameOf___: value
%

category: 'Grail-Type'
classmethod: bytes
___pyTypeNameOf___: value
	"CPython-facing type name for error messages: a few kernel-backed
	builtins carry a Smalltalk class name (Float, Integer, Unicode7, ...) that
	does not match their Python name, so map those; everything else (complex,
	tuple, user classes) already reports the right __name__."

	(value @env0:== None) ifTrue: [^ 'NoneType'].
	(value isKindOf: Float) ifTrue: [^ 'float'].
	(value isKindOf: Boolean) ifTrue: [^ 'bool'].
	(value isKindOf: Integer) ifTrue: [^ 'int'].
	(value isKindOf: bytearray) ifTrue: [^ 'bytearray'].
	(value isKindOf: ByteArray) ifTrue: [^ 'bytes'].
	(value isKindOf: CharacterCollection) ifTrue: [^ 'str'].
	^ [(value @env1:__class__ @env1:__name__) @env0:asString]
		@env0:on: Error do: [:ex | ex @env0:return: value @env0:class @env0:name @env0:asString]
%

category: 'Grail-Introspection'
method: bytes
__dict__
	"``obj.__dict__'' for a bytes / bytearray SUBCLASS instance -- a live view
	of its dynamic-instVar storage, the same one PythonInstance publishes.
	Subclassing bytes is how user code attaches attributes (``a.x = 10''), and
	copy / pickle round-trips need to enumerate them.  An EXACT bytes or
	bytearray has no instance dict, exactly as in CPython."

	((self @env0:class == ByteArray) @env0:or: [self @env0:class == bytearray])
		ifTrue: [
			^ AttributeError ___signal___: ('''' @env0:, (bytes ___pyTypeNameOf___: self)
				@env0:, ''' object has no attribute ''__dict__''')].
	^ PyInstanceDict @env0:on: self
%

category: 'Grail-Type'
method: bytes
___indexTypeName___
	"The type name CPython puts in ``<T> indices must be integers or slices'':
	``byte'' for bytes (and its subclasses), ``bytearray'' for bytearray."

	^ (self isKindOf: bytearray) ifTrue: ['bytearray'] ifFalse: ['byte']
%

category: 'Grail-String Operations'
method: bytes
___modCharByte___: value
	"%c operand: an int in range(256) or a single byte."

	(value isKindOf: Integer) ifTrue: [
		((value @env0:>= 0) @env0:and: [value @env0:<= 255]) ifTrue: [^ value].
		OverflowError ___signal___: '%c arg not in range(256)'].
	((value isKindOf: ByteArray) @env0:and: [value @env0:size @env0:= 1]) ifTrue: [^ value @env0:at: 1].
	"A bytes-like of the WRONG LENGTH reports that length rather than just its
	type -- ``not a bytes object of length 2'' (test_format
	test_bytes_and_bytearray_format), which the generic message below cannot
	say."
	(value isKindOf: ByteArray) ifTrue: [
		TypeError ___signal___:
			('%c requires an integer in range(256) or a single byte, not a '
				@env0:, (bytes ___pyTypeNameOf___: value)
				@env0:, ' object of length ' @env0:, value @env0:size @env0:printString)].
	"CPython's byte_converter formats the type with %T, i.e. the FULLY
	QUALIFIED module.qualname -- unlike the %x/%o/%d converters next door,
	which print the bare tp_name.  test_mod pins both spellings."
	TypeError ___signal___: ('%c requires an integer in range(256) or a single byte, not '
		@env0:, (bytes ___pyQualifiedTypeNameOf___: value))
%

category: 'Grail-String Operations'
classmethod: bytes
___pyQualifiedTypeNameOf___: value
	"``module.qualname'' for a user-defined class, matching CPython's %T
	format code; built-ins keep their bare name (CPython's %T prints
	``float'', not ``builtins.float'')."

	"``name'' is an instance variable of Class, so a class-side temp cannot
	use that identifier -- hence shortName."
	| shortName cls modName |
	shortName := bytes ___pyTypeNameOf___: value.
	(#('NoneType' 'float' 'bool' 'int' 'bytearray' 'bytes' 'str')
		@env0:includes: shortName) ifTrue: [^ shortName].
	cls := [value @env1:__class__] @env0:on: Error do: [:ex | ex @env0:return: nil].
	cls @env0:isNil ifTrue: [^ shortName].
	"ClassDefAst emits a ``__module__'' class-side accessor on every Python
	class, holding the defining module's dotted name string."
	modName := [ | m | m := cls @env1:__module__.
		m @env0:isNil ifTrue: [nil] ifFalse: [m @env0:asString] ]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(modName @env0:isNil or: [modName @env0:isEmpty or: [modName @env0:= 'builtins']])
		ifTrue: [^ shortName].
	^ modName @env0:, '.' @env0:, shortName
%

category: 'Grail-String Operations'
method: bytes
___modNumeric___: value conv: conv
	"Resolve a numeric %-arg to a Smalltalk Integer/Float per the conversion,
	raising CPython's message on a type mismatch.  o/x/X require a strict
	integer (via __index__); e/E/f/F/g/G a float; d/i/u a real number."

	| tn |
	tn := self ___modTypeName___: value.
	((conv @env0:= $o) @env0:or: [(conv @env0:= $x) @env0:or: [conv @env0:= $X]]) ifTrue: [
		(value isKindOf: Integer) ifTrue: [^ value].
		(value ___respondsTo___: #'__index__') ifTrue: [^ value __index__].
		TypeError ___signal___: ('%' @env0:, (String @env0:with: conv)
			@env0:, ' format: an integer is required, not ' @env0:, tn)].
	(#($e $E $f $F $g $G) @env0:includes: conv) ifTrue: [
		(value isKindOf: Integer) ifTrue: [^ value @env0:asFloat].
		(value isKindOf: Float) ifTrue: [^ value].
		(value ___respondsTo___: #'__float__') ifTrue: [^ value __float__].
		"bytes formatting has its OWN wording for a bad float operand -- plain
		``float argument required, not str'', where the d/i/u converters below
		use the ``%i format: ...'' shape.  test_format pins both spellings."
		TypeError ___signal___: ('float argument required, not ' @env0:, tn)].
	"d i u: a real number (int or float or __index__/__int__)."
	(value isKindOf: Integer) ifTrue: [^ value].
	(value isKindOf: Float) ifTrue: [^ value].
	(value ___respondsTo___: #'__index__') ifTrue: [^ value __index__].
	(value ___respondsTo___: #'__int__') ifTrue: [^ value __int__].
	TypeError ___signal___: ('%' @env0:, (String @env0:with: conv)
		@env0:, ' format: a real number is required, not ' @env0:, tn)
%

category: 'Grail-Concatenation'
method: bytes
__add__: other
	"Concatenate bytes"
	| size1 size2 result |

	"Concatenate with any bytes-like object (bytes / bytearray / subclasses).
	A non-bytes-like operand is a TypeError -- built from the Python type NAMES
	(``can't concat str to bytes''); appending the class OBJECT to the message
	string used to blow up with an uncatchable MNU (Unicode7 class do:)."
	(other isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('can''t concat '
			@env0:, (other @env1:__class__ @env1:__name__)
			@env0:, ' to '
			@env0:, (self @env1:__class__ @env1:__name__))
	].

	size1 := self @env0:size.
	size2 := other @env0:size.
	result := (self @env0:class) ___new___: (size1 @env0:+ size2).

	"Copy self"
	1 @env0:to: size1 do: [:i |
		result @env0:at: i put: (self @env0:at: i)
	].

	"Copy other"
	1 @env0:to: size2 do: [:i |
		result @env0:at: (size1 @env0:+ i) put: (other @env0:at: i)
	].

	^ result
%

category: 'Grail-Type'
method: bytes
__class__
	"Return the Python type -- the receiver's ACTUAL class, so a
	``class MyBytes(bytes)'' instance reports MyBytes while a plain
	bytes literal still reports bytes (a bytes literal's class IS the
	ByteArray kernel, which is the ``bytes'' type object)."
	^ self @env0:class
%

category: 'Grail-Sequence Protocol'
method: bytes
__contains__: rawItem
	"Python membership: ``int in bytes'' tests for that byte value (which must
	be in range(0, 256), else ValueError); ``bytes/bytearray in bytes'' does a
	subsequence search (itsdangerous's ``self.sep not in signed_value'' with a
	bytes sep relies on it).  Any other type -- None, float, str -- is a
	TypeError (``'a' in b'abc''' raises, matching CPython)."

	| item |
	item := self ___searchOperand___: rawItem.
	(item isKindOf: Integer) ifTrue: [
		self ___checkByteValue___: item.
		^ self @env0:includes: item
	].
	(item isKindOf: ByteArray) ifTrue: [
		"An empty subsequence is always contained (CPython); GemStone's
		indexOfSubCollection: reports 0 (not found) for it."
		item @env0:isEmpty ifTrue: [^ true].
		^ (self @env0:indexOfSubCollection: item) @env0:> 0
	].
	^ TypeError ___signal___: ('a bytes-like object is required, not '''
		@env0:, (bytes ___pyTypeNameOf___: item) @env0:, '''')
%

category: 'Grail-Comparison'
method: bytes
__eq__: other
	"Compare bytes for equality"
	| otherClass size |
	otherClass := other @env0:class.

	"Equal only to a bytes-like object (bytes / bytearray / subclasses); CPython
	compares bytes and bytearray by value across the two types."
	(other isKindOf: bytes) ifFalse: [
		^ false
	].

	"Check sizes"
	size := self @env0:size.
	(size @env0:= other @env0:size) ifFalse: [
		^ false
	].

	"Compare each byte"
	1 @env0:to: size do: [:i |
		| myByte otherByte |
		myByte := self @env0:at: i.
		otherByte := other @env0:at: i.
		(myByte @env0:= otherByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Grail-Sequence Protocol'
method: bytes
__getitem__: index
	"Get byte at index (0-based, supports negative indices) or a slice."
	| idx size |
	(index isKindOf: slice) ifTrue: [
		^ self ___getslice___: index start
			_: index stop
			_: index step
	].
	"Non-integer, non-slice index: catchable TypeError instead of an
	uncatchable env-0 comparison DNU on the index."
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		TypeError ___signal___: (self ___indexTypeName___
			@env0:, ' indices must be integers or slices, not '
			@env0:, (bytes ___pyTypeNameOf___: index))].
	"__index__ may run Python code that mutates the receiver, so coerce the
	index BEFORE reading the size."
	idx := bytes ___coerceIndex___: index.
	size := self @env0:size.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'index out of range'
	].

	"Return byte value (convert to 1-based index)"
	^ self @env0:at: (idx @env0:+ 1)
%

category: 'Grail-Hashing'
method: bytes
__hash__
	"Return hash of bytes"
	^ self @env0:hash
%

category: 'Grail-Sequence Protocol'
method: bytes
__len__
	"Return the number of bytes"
	^ self @env0:size
%

category: 'Grail-Concatenation'
method: bytes
__mul__: count
	"Repeat bytes count times"
	| n size result offset |
	n := count.

	"Validate count is an integer (an __index__ object counts, as in CPython;
	a float does not)."
	(n isKindOf: Integer) ifFalse: [
		(n ___respondsTo___: #'__index__')
			ifTrue: [n := bytes ___coerceIndex___: n]
			ifFalse: [TypeError ___signal___: 'can''t multiply sequence by non-int']
	].

	"If count <= 0, return an empty object of the receiver's base type"
	(n @env0:<= 0) ifTrue: [
		^ self ___translateResultClass___ ___new___
	].

	"b * 1 hands back the identical object when b is an EXACT bytes (CPython
	short-circuits the no-op repeat); a SUBCLASS instance (and any bytearray,
	which must stay mutable and distinct) still gets a fresh base-type object
	-- test_repeat_id_preserving checks both directions."
	(n @env0:= 1 and: [self @env0:class == ByteArray]) ifTrue: [^ self].

	size := self @env0:size.
	"A repeat count that would overflow the allocatable size is CPython's
	OverflowError / MemoryError, not an uncatchable GemStone OutOfRange."
	(size @env0:* n) @env0:> 1073741823 ifTrue: [
		OverflowError ___signal___: 'repeated bytes are too long'
	].
	result := self ___translateResultClass___ ___new___: (size @env0:* n).
	offset := 0.

	1 @env0:to: n do: [:rep |
		1 @env0:to: size do: [:i |
			result @env0:at: (offset @env0:+ i) put: (self @env0:at: i)
		].
		offset := offset @env0:+ size
	].

	^ result
%

category: 'Grail-Comparison'
method: bytes
__ne__: other
	"Compare bytes for inequality"
	| result |
	result := self __eq__: other.
	^ result @env0:not
%

category: 'Grail-String Representation'
method: bytes
___reprBody___
	"The ``b'...'''-style representation used by bytes repr."
	^ self ___reprBody___: false
%

category: 'Grail-String Representation'
method: bytes
___reprBody___: alwaysEscapeSingle
	"The ``b'...'''-style representation shared by bytes and bytearray repr.
	Matches CPython: single quotes, unless the data holds a single quote and
	no double quote (then double quotes); escape backslash, \t, \n, \r and the
	active quote; other non-printable bytes as LOWERCASE \xNN; printable ASCII
	(32-126) literally.

	``alwaysEscapeSingle'' reproduces bytearray_repr, which backslash-escapes
	an apostrophe even when the chosen quote is a double quote -- so a
	bytearray holding one apostrophe reprs with a backslash before it, while
	the corresponding bytes object does not."
	| size hasSingle hasDouble quote out bs |
	size := self @env0:size.
	hasSingle := false. hasDouble := false.
	1 @env0:to: size do: [:i | | b |
		b := self @env0:at: i.
		(b @env0:= 39) ifTrue: [hasSingle := true].
		(b @env0:= 34) ifTrue: [hasDouble := true]].
	quote := (hasSingle @env0:and: [hasDouble @env0:not]) ifTrue: [34] ifFalse: [39].
	bs := Character @env0:codePoint: 92.
	out := AppendStream @env0:on: Unicode7 @env0:new.
	out @env0:nextPut: $b; @env0:nextPut: (Character @env0:codePoint: quote).
	1 @env0:to: size do: [:i | | b |
		b := self @env0:at: i.
		((b @env0:= 92) @env0:or: [(b @env0:= quote)
			@env0:or: [alwaysEscapeSingle @env0:and: [b @env0:= 39]]])
				ifTrue: [out @env0:nextPut: bs; @env0:nextPut: (Character @env0:codePoint: b)] ifFalse: [
		(b @env0:= 9)  ifTrue: [out @env0:nextPut: bs; @env0:nextPut: $t] ifFalse: [
		(b @env0:= 10) ifTrue: [out @env0:nextPut: bs; @env0:nextPut: $n] ifFalse: [
		(b @env0:= 13) ifTrue: [out @env0:nextPut: bs; @env0:nextPut: $r] ifFalse: [
		((b @env0:>= 32) @env0:and: [b @env0:<= 126]) ifTrue: [out @env0:nextPut: (Character @env0:codePoint: b)] ifFalse: [
		| hx | hx := (b @env0:printStringRadix: 16) @env0:asLowercase.
		(hx @env0:size @env0:= 1) ifTrue: [hx := '0' @env0:, hx].
		out @env0:nextPut: bs; @env0:nextPut: $x; @env0:nextPutAll: hx ]]]]]].
	out @env0:nextPut: (Character @env0:codePoint: quote).
	^ out @env0:contents
%

category: 'Grail-String Representation'
method: bytes
__repr__
	"Return the bytes representation, e.g. b'hello'."
	^ self ___reprBody___
%

category: 'Grail-Sequence Protocol'
method: bytes
__setitem__: index _: value
	"bytes is immutable - raise TypeError"
	TypeError ___signal___: '''bytes'' object does not support item assignment'
%

category: 'Grail-String-like Methods'
method: bytes
capitalize
	"Return capitalized version (first byte uppercase, rest lowercase)"

	| result size firstByte |
	size := self @env0:size.
	(size == 0) ifTrue: [
		^ bytes ___new___
	].

	result := self lower.

	"Capitalize first byte if it's a lowercase letter"
	firstByte := result @env0:at: 1.
	((firstByte @env0:>= 97) and: [
		firstByte @env0:<= 122
	]) ifTrue: [
		result @env0:at: 1 put: (firstByte @env0:- (32))
	].

	^ result
%

category: 'Grail-Padding Methods'
method: bytes
center: width
	"bytes.center(width) -- centered in a field of the given width, padded
	with spaces.  center(width, fillbyte) supplies a different fill."
	^ self center: width _: self ___spaceByteString___
%

category: 'Grail-Search Methods'
method: bytes
count: sub _: start
	"bytes.count(sub, start) -- bounded from start (0-based)."

	^ self count: sub _: start _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytes
count: sub _: start _: end
	"bytes.count(sub, start, end) -- count within the [start, end)
	slice, CPython clamping rules.  re._constants.PatternError builds
	error line numbers with the 3-arg form on byte patterns."

	| size s e |
	size := self @env0:size.
	s := start. e := end.
	"CPython accepts None for start/end (== the default bound)."
	(s @env0:== None) ifTrue: [s := 0].
	(e @env0:== None) ifTrue: [e := size].
	s @env0:< 0 ifTrue: [s := (size @env0:+ s) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (size @env0:+ e) @env0:max: 0].
	e := e @env0:min: size.
	"``> e'' (not ``>= e'') so an empty window (s = e) still yields the
	one empty-substring match that count: returns for an empty slice."
	s @env0:> e ifTrue: [^ 0].
	^ (self @env0:copyFrom: s @env0:+ 1 to: e) count: sub
%

category: 'Grail-Search Methods'
method: bytes
rfind: rawSub _: start _: end
	"bytes.rfind(sub, start, end) -- highest 0-based index of sub within
	[start, end), or -1.  re._constants.PatternError computes error
	column positions with it on byte patterns."

	| size s e subSize i sub |
	sub := self ___searchOperand___: rawSub.
	size := self @env0:size.
	s := start. e := end.
	"CPython accepts None for start/end (== the default bound)."
	(s @env0:== None) ifTrue: [s := 0].
	(e @env0:== None) ifTrue: [e := size].
	s @env0:< 0 ifTrue: [s := (size @env0:+ s) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (size @env0:+ e) @env0:max: 0].
	e := e @env0:min: size.
	subSize := (sub isKindOf: SmallInteger)
		@env0:ifTrue: [1] @env0:ifFalse: [sub @env0:size].
	i := e @env0:- subSize.
	[i @env0:>= s] @env0:whileTrue: [
		| match |
		match := true.
		(sub isKindOf: SmallInteger)
			ifTrue: [match := (self @env0:at: i @env0:+ 1) @env0:= sub]
			ifFalse: [
				1 @env0:to: subSize do: [:j |
					(self @env0:at: i @env0:+ j) @env0:= (sub @env0:at: j)
						ifFalse: [match := false]]].
		match ifTrue: [^ i].
		i := i @env0:- 1].
	^ -1
%

category: 'Grail-Search Methods'
method: bytes
rfind: sub _: start
	^ self rfind: sub _: start _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytes
rfind: sub
	^ self rfind: sub _: 0 _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytes
___searchOperand___: sub
	"Resolve a search / membership operand to an int byte value or a bytes-like
	object, honoring the two protocols CPython's converters use: __index__ (an
	int needle) and PEP 688's __buffer__ (a bytes-like needle).  Either can run
	arbitrary Python that shrinks a bytearray receiver mid-call; CPython holds a
	buffer export over the receiver and raises BufferError, which we reproduce
	by comparing the receiver's length across the conversion (gh-142560).

	Before this existed an arbitrary object fell through to the sub-sequence
	branch, where ``sub @env0:size'' on a PythonInstance answers 0, so
	``ba.find(obj)'' silently reported an empty-needle match at index 0."

	| size0 resolved |
	"Fast paths -- the overwhelmingly common operands.  Neither can run Python
	code, so neither needs the stability check below."
	(sub isKindOf: bytes) ifTrue: [^ sub].
	(sub isKindOf: Integer) ifTrue: [^ sub].

	size0 := self @env0:size.
	resolved := nil.
	(sub ___respondsTo___: #'__buffer__:')
		ifTrue: [
			resolved := sub @env1:__buffer__: 0.
			(resolved isKindOf: bytes) ifFalse: [
				TypeError ___signal___: '__buffer__ returned a non-buffer object']]
		ifFalse: [
			(sub ___respondsTo___: #'__index__') ifTrue: [
				resolved := bytes ___coerceIndex___: sub]].
	resolved @env0:isNil ifTrue: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (bytes ___pyTypeNameOf___: sub) @env0:, '''')].
	self @env0:size @env0:= size0 ifFalse: [
		BufferError ___signal___:
			'Existing exports of data: object cannot be re-sized'].
	^ resolved
%

category: 'Grail-Search Methods'
method: bytes
___checkByteValue___: n
	"An int used as a single-byte needle (count/find/index/rfind/rindex) or
	membership test must be in range(0, 256); CPython raises ValueError
	otherwise -- including for a large int such as sys.maxsize + 1."
	((n @env0:>= 0) and: [n @env0:<= 255]) ifFalse: [
		ValueError ___signal___: 'byte must be in range(0, 256)'].
	^ n
%

category: 'Grail-Search Methods'
method: bytes
count: rawSub
	"Count non-overlapping occurrences of sub"
	| subSize mySize count i sub |
	sub := self ___searchOperand___: rawSub.

	"sub must be bytes or integer"
	(sub isKindOf: Integer) ifTrue: [
		"Count occurrences of a single byte value (range-checked)."
		self ___checkByteValue___: sub.
		count := 0.
		mySize := self @env0:size.
		1 @env0:to: mySize do: [:idx |
			| byte |
			byte := self @env0:at: idx.
			(byte @env0:= sub) ifTrue: [
				count := count @env0:+ 1
			]
		].
		^ count
	].

	"sub must be a bytes-like object (bytes / bytearray / subclasses) or an int"
	(sub isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'argument should be bytes or integer'
	].

	subSize := sub @env0:size.
	mySize := self @env0:size.

	"Empty sub matches between every position (CPython: len+1)."
	(subSize == 0) ifTrue: [
		^ mySize @env0:+ 1
	].

	count := 0.
	i := 1.

	[i @env0:<= (mySize @env0:- (subSize @env0:- 1))] @env0:whileTrue: [
		| match |
		match := true.
		1 @env0:to: subSize do: [:j |
			| myByte subByte |
			myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
			subByte := sub @env0:at: j.
			(myByte @env0:= subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			count := count @env0:+ 1.
			i := i @env0:+ subSize
		] ifFalse: [
			i := i @env0:+ 1
		]
	].

	^ count
%

category: 'Grail-Encoding/Decoding'
method: bytes
decode
	"Decode bytes to string using UTF-8"
	^ self decode: 'utf-8'
%

category: 'Grail-Encoding/Decoding'
method: bytes
decode: encoding _: errors
	"``bytes.decode(encoding, errors)`` 2-arg form.  For UTF-8 with
	errors='ignore', invalid bytes are skipped; otherwise (strict, or a
	non-UTF-8 codec) decode via the 1-arg form, which raises on ill-formed
	input."

	| enc |
	enc := encoding @env0:asLowercase.
	(((enc @env0:= 'utf-8') or: [enc @env0:= 'utf8']) and: [errors @env0:= 'ignore'])
		ifTrue: [^ self ___pyDecodeUTF8Ignore___].
	^ self decode: encoding
%

category: 'Grail-Encoding/Decoding'
method: bytes
_decode: positional kw: kwargs
	"Varargs form — handles ``bytes.decode()'' / ``bytes.decode(enc)''
	/ ``bytes.decode(enc, errors)'' / ``bytes.decode(errors='replace')''
	and the kwarg-only ``bytes.decode(encoding='latin1')''.  Werkzeug
	calls the kwarg-only form ``encode().decode(errors='replace')''
	for its WSGI encoding dance, which the fixed-arity selectors above
	don't catch."

	| encoding errors |
	encoding := (positional @env0:size @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [
			(kwargs @env0:isNil @env0:not
				and: [kwargs @env0:includesKey: 'encoding'])
				@env0:ifTrue: [kwargs @env0:at: 'encoding']
				@env0:ifFalse: ['utf-8']].
	errors := (positional @env0:size @env0:>= 2)
		@env0:ifTrue: [positional @env0:at: 2]
		@env0:ifFalse: [
			(kwargs @env0:isNil @env0:not
				and: [kwargs @env0:includesKey: 'errors'])
				@env0:ifTrue: [kwargs @env0:at: 'errors']
				@env0:ifFalse: ['strict']].
	^ self decode: encoding _: errors
%

category: 'Grail-Encoding/Decoding'
method: bytes
decode: encoding
	"Decode bytes to string using specified encoding"

	| encodingStr |
	"Normalise the codec name before dispatching, as CPython does and as
	str>>encode already did on this side of the pair.  Without it every
	branch below was an EXACT match on a lowercase hyphenated spelling, so
	``b'x'.decode('UTF-8')'' -- the spelling that appears verbatim in a MIME
	or .mo Content-Type header -- raised LookupError while 'utf-8' worked.
	Lowercase plus underscore-to-hyphen also subsumes the alias spellings
	('utf_8', 'unicode_escape') without enumerating them per branch."
	encodingStr := (encoding @env0:asLowercase)
		@env0:collect: [:c | (c @env0:= $_) ifTrue: [$-] ifFalse: [c]].

	"Support UTF-8.  Ill-formed input raises Python's catchable
	UnicodeDecodeError, not GemStone's raw ArgumentError (which escapes
	try/except -- CPython test_re's locale tests decode latin-1-laden
	byte patterns and expect a Python exception)."
	((encodingStr @env0:= 'utf-8') or: [
		encodingStr @env0:= 'utf8'
	]) ifTrue: [
		^ [self @env0:decodeFromUTF8]
			@env0:on: ArgumentError
			do: [:ex |
				UnicodeDecodeError ___signal___:
					('''utf-8'' codec can''t decode bytes: invalid continuation byte')]
	].

	"Support ASCII"
	(encodingStr @env0:= 'ascii') ifTrue: [
		| result size |
		size := self @env0:size.
		result := Unicode7 ___new___: size.
		1 @env0:to: size do: [:i |
			| byte char |
			byte := self @env0:at: i.
			(byte @env0:> 127) ifTrue: [
				UnicodeDecodeError ___signal___: 'ordinal not in range(128)'
			].
			char := Character @env0:codePoint: byte.
			result @env0:at: i put: char
		].
		^ result
	].

	"Support Latin-1.  ``iso-8859-1'' is the same codec under the name the
	wire actually uses -- it is the default charset of a GNU .mo catalog
	header -- and str>>encode already accepted it on the way out."
	((encodingStr @env0:= 'latin-1') or: [
		(encodingStr @env0:= 'latin1') or: [
		(encodingStr @env0:= 'iso-8859-1') or: [
		encodingStr @env0:= 'iso8859-1'
	]]]) ifTrue: [
		| result size |
		size := self @env0:size.
		result := Unicode7 ___new___: size.
		1 @env0:to: size do: [:i |
			| byte char |
			byte := self @env0:at: i.
			char := Character @env0:codePoint: byte.
			result @env0:at: i put: char
		].
		^ result
	].

	"Support unicode-escape: interpret Python source-style backslash
	escapes (n, t, r, b, f, v, a, hex xHH, uHHHH, UHHHHHHHH, octal ooo).
	Non-backslash bytes pass through as Latin-1 code points."
	((encodingStr @env0:= 'unicode-escape') or: [
		encodingStr @env0:= 'unicode_escape'
	]) ifTrue: [
		^ self @env0:___decodeUnicodeEscape___
	].

	"UTF-16 (BOM-detected for plain 'utf-16', explicit for -le/-be) --
	the inverse of str>>___pyEncodeUTF16___."
	((encodingStr @env0:= 'utf-16') or: [(encodingStr @env0:= 'utf-16-le')
		or: [(encodingStr @env0:= 'utf-16le') or: [(encodingStr @env0:= 'utf-16-be')
		or: [encodingStr @env0:= 'utf-16be']]]]) ifTrue: [
		^ self ___pyDecodeUTF16___: encodingStr].

	"``idna'' is RFC 3490 internationalized-domain decoding —
	ASCII names pass through unchanged, full punycode handling is
	left for a downstream test that needs it.  Werkzeug.urls
	(_decode_idna) calls ``data.decode('idna')'' on every host
	parse; ASCII passthrough is sufficient for the M7 Flask demo."
	(encodingStr @env0:= 'idna') ifTrue: [
		| result size |
		size := self @env0:size.
		result := Unicode7 ___new___: size.
		1 @env0:to: size do: [:i |
			| byte char |
			byte := self @env0:at: i.
			(byte @env0:> 127) ifTrue: [
				UnicodeDecodeError ___signal___: 'idna decode of non-ASCII byte not yet supported'
			].
			char := Character @env0:codePoint: byte.
			result @env0:at: i put: char
		].
		^ result
	].

	"iso-8859-15 (latin-9): the inverse of str>>encode's latin-9 branch --
	latin-1 with 8 code points substituted.  encode has supported it since
	test_bytes needed ``bytes('€', 'iso8859-15')''; decode did not, so a
	round-trip raised LookupError on the way back."
	((encodingStr @env0:= 'iso-8859-15') or: [(encodingStr @env0:= 'iso8859-15')
		or: [(encodingStr @env0:= 'latin-9') or: [(encodingStr @env0:= 'latin9')
		or: [encodingStr @env0:= 'l9']]]]) ifTrue: [
		| result size map |
		"byte -> code point for the 8 that differ from latin-1."
		map := IdentityKeyValueDictionary @env0:new.
		map @env0:at: 16rA4 put: 16r20AC; @env0:at: 16rA6 put: 16r0160;
			@env0:at: 16rA8 put: 16r0161; @env0:at: 16rB4 put: 16r017D;
			@env0:at: 16rB8 put: 16r017E; @env0:at: 16rBC put: 16r0152;
			@env0:at: 16rBD put: 16r0153; @env0:at: 16rBE put: 16r0178.
		size := self @env0:size.
		result := Unicode7 ___new___: size.
		1 @env0:to: size do: [:i |
			| byte |
			byte := self @env0:at: i.
			result @env0:at: i put: (Character @env0:codePoint:
				(map @env0:at: byte otherwise: byte))].
		^ result
	].

	"Unsupported encoding"
	LookupError ___signal___: ('unknown encoding: ' @env0:, encodingStr)
%

category: 'Grail-Encoding/Decoding'
method: bytes
___pyDecodeUTF16___: enc
	"Decode UTF-16 bytes to a str.  Plain 'utf-16' detects a leading BOM
	(FE FF = big-endian, FF FE = little-endian; default little-endian);
	'utf-16-le'/'utf-16-be' force the byte order.  Surrogate pairs are
	reassembled into supplementary codepoints."
	| e n start bigEndian ws i |
	e := enc @env0:asLowercase.
	n := self @env0:size. start := 1.
	((e @env0:= 'utf-16-be') or: [e @env0:= 'utf-16be'])
		ifTrue: [bigEndian := true]
		ifFalse: [((e @env0:= 'utf-16-le') or: [e @env0:= 'utf-16le'])
			ifTrue: [bigEndian := false]
			ifFalse: [
				bigEndian := false.
				(n @env0:>= 2) ifTrue: [
					((self @env0:at: 1) @env0:= 16rFE and: [(self @env0:at: 2) @env0:= 16rFF])
						ifTrue: [bigEndian := true. start := 3]
						ifFalse: [((self @env0:at: 1) @env0:= 16rFF and: [(self @env0:at: 2) @env0:= 16rFE])
							ifTrue: [bigEndian := false. start := 3]]]]].
	ws := AppendStream @env0:on: Unicode16 @env0:new.
	i := start.
	[i @env0:+ 1 @env0:<= n] @env0:whileTrue: [ | b0 b1 unit cp |
		b0 := self @env0:at: i. b1 := self @env0:at: i @env0:+ 1.
		unit := bigEndian ifTrue: [(b0 @env0:bitShift: 8) @env0:+ b1] ifFalse: [(b1 @env0:bitShift: 8) @env0:+ b0].
		((unit @env0:>= 16rD800) and: [(unit @env0:<= 16rDBFF) and: [i @env0:+ 3 @env0:<= n]])
			ifTrue: [ | b2 b3 lo |
				b2 := self @env0:at: i @env0:+ 2. b3 := self @env0:at: i @env0:+ 3.
				lo := bigEndian ifTrue: [(b2 @env0:bitShift: 8) @env0:+ b3] ifFalse: [(b3 @env0:bitShift: 8) @env0:+ b2].
				cp := 16r10000 @env0:+ (((unit @env0:- 16rD800) @env0:bitShift: 10) @env0:+ (lo @env0:- 16rDC00)).
				i := i @env0:+ 4]
			ifFalse: [cp := unit. i := i @env0:+ 2].
		ws @env0:nextPut: (Character @env0:codePoint: cp)].
	^ ws @env0:contents
%

category: 'Grail-Encoding/Decoding'
method: bytes
___pyDecodeUTF8Ignore___
	"UTF-8 decode with errors='ignore': decode well-formed sequences and skip
	invalid bytes.  (Strict decoding uses GemStone's decodeFromUTF8.)"
	| n i ws |
	n := self @env0:size. i := 1.
	ws := AppendStream @env0:on: Unicode16 @env0:new.
	[i @env0:<= n] @env0:whileTrue: [ | b0 cp nbytes ok |
		b0 := self @env0:at: i.
		b0 @env0:< 16r80 ifTrue: [cp := b0. nbytes := 1] ifFalse: [
		(b0 @env0:bitAnd: 16rE0) @env0:= 16rC0 ifTrue: [cp := b0 @env0:bitAnd: 16r1F. nbytes := 2] ifFalse: [
		(b0 @env0:bitAnd: 16rF0) @env0:= 16rE0 ifTrue: [cp := b0 @env0:bitAnd: 16r0F. nbytes := 3] ifFalse: [
		(b0 @env0:bitAnd: 16rF8) @env0:= 16rF0 ifTrue: [cp := b0 @env0:bitAnd: 16r07. nbytes := 4] ifFalse: [
		nbytes := 0]]]].
		ok := (nbytes @env0:> 0) and: [i @env0:+ nbytes @env0:- 1 @env0:<= n].
		ok ifTrue: [
			2 @env0:to: nbytes do: [:k | | bk |
				bk := self @env0:at: i @env0:+ k @env0:- 1.
				(bk @env0:bitAnd: 16rC0) @env0:= 16r80
					ifTrue: [cp := (cp @env0:bitShift: 6) @env0:+ (bk @env0:bitAnd: 16r3F)]
					ifFalse: [ok := false]]].
		ok
			ifTrue: [ws @env0:nextPut: (Character @env0:codePoint: cp). i := i @env0:+ nbytes]
			ifFalse: [i := i @env0:+ 1]].
	^ ws @env0:contents
%

set compile_env: 0

category: 'Grail-Encoding/Decoding'
method: bytes
___decodeUnicodeEscape___
	"unicode-escape decoder.  Pure env-0 helper called by decode:."

	| size out i byte |
	size := self size.
	"WriteStream, NOT AppendStream: the backing collection is pre-SIZED
	(``new: size'' is capacity, not emptiness).  WriteStream on: starts at
	position 0 and overwrites; AppendStream on: starts at the END, so every
	decoded string would carry ``size'' leading NULs.  In Unicode comparison
	mode that corruption is nearly invisible -- NUL is collation-ignorable, so
	the result still compares = to the clean string -- but its hash differs,
	which silently breaks dict lookups keyed by a decoded string (jinja2's
	lexer round-trips every string token through this decoder)."
	out := WriteStream on: (Unicode32 new: size).
	i := 1.
	[i <= size] whileTrue: [
		byte := self at: i.
		(byte = 92 and: [i < size]) ifTrue: [
			| next codeUnit hexN |
			next := self at: i + 1.
			"Simple single-char escapes."
			(next = 110) ifTrue: [out nextPut: (Character codePoint: 10).  i := i + 2] ifFalse: [
			(next = 116) ifTrue: [out nextPut: (Character codePoint: 9).   i := i + 2] ifFalse: [
			(next = 114) ifTrue: [out nextPut: (Character codePoint: 13).  i := i + 2] ifFalse: [
			(next = 98)  ifTrue: [out nextPut: (Character codePoint: 8).   i := i + 2] ifFalse: [
			(next = 102) ifTrue: [out nextPut: (Character codePoint: 12).  i := i + 2] ifFalse: [
			(next = 118) ifTrue: [out nextPut: (Character codePoint: 11).  i := i + 2] ifFalse: [
			(next = 97)  ifTrue: [out nextPut: (Character codePoint: 7).   i := i + 2] ifFalse: [
			(next = 92)  ifTrue: [out nextPut: (Character codePoint: 92).  i := i + 2] ifFalse: [
			(next = 39)  ifTrue: [out nextPut: (Character codePoint: 39).  i := i + 2] ifFalse: [
			(next = 34)  ifTrue: [out nextPut: (Character codePoint: 34).  i := i + 2] ifFalse: [
			"\\x — 2 hex digits."
			(next = 120) ifTrue: [
				(i + 3 <= size) ifFalse: [
					UnicodeDecodeError ___signal___: 'truncated \\xXX escape'].
				hexN := self ___parseHex___: i + 2 length: 2.
				out nextPut: (Character codePoint: hexN).
				i := i + 4
			] ifFalse: [
			"\\u — 4 hex digits."
			(next = 117) ifTrue: [
				(i + 5 <= size) ifFalse: [
					UnicodeDecodeError ___signal___: 'truncated \\uXXXX escape'].
				codeUnit := self ___parseHex___: i + 2 length: 4.
				out nextPut: (Character codePoint: codeUnit).
				i := i + 6
			] ifFalse: [
			"\\U — 8 hex digits."
			(next = 85) ifTrue: [
				(i + 9 <= size) ifFalse: [
					UnicodeDecodeError ___signal___: 'truncated \\UXXXXXXXX escape'].
				codeUnit := self ___parseHex___: i + 2 length: 8.
				out nextPut: (Character codePoint: codeUnit).
				i := i + 10
			] ifFalse: [
			"\\0..\\7 — octal up to 3 digits."
			(next >= 48 and: [next <= 55]) ifTrue: [
				| octVal j endIdx |
				octVal := 0.
				endIdx := (i + 4) min: size + 1.
				j := i + 1.
				[j < endIdx and: [(self at: j) >= 48 and: [(self at: j) <= 55]]]
					whileTrue: [
						octVal := (octVal * 8) + ((self at: j) - 48).
						j := j + 1].
				out nextPut: (Character codePoint: octVal).
				i := j
			] ifFalse: [
				"Unknown escape — emit backslash literally and rescan from next."
				out nextPut: (Character codePoint: 92).
				i := i + 1
			]]]]]]]]]]]]]]
		] ifFalse: [
			out nextPut: (Character codePoint: byte).
			i := i + 1
		]
	].
	^ out contents
%

category: 'Grail-Encoding/Decoding'
method: bytes
___parseHex___: startIdx length: n
	"Parse n hex digits starting at byte index startIdx; return the integer value."

	| value byte digit |
	value := 0.
	1 to: n do: [:k |
		byte := self at: startIdx + k - 1.
		(byte >= 48 and: [byte <= 57]) ifTrue: [digit := byte - 48] ifFalse: [
		(byte >= 97 and: [byte <= 102]) ifTrue: [digit := byte - 87] ifFalse: [
		(byte >= 65 and: [byte <= 70]) ifTrue: [digit := byte - 55] ifFalse: [
			UnicodeDecodeError ___signal___: 'invalid hex digit in escape']]].
		value := (value * 16) + digit
	].
	^ value
%

set compile_env: 1

category: 'Grail-Prefix/Suffix Methods'
method: bytes
endswith: suffix
	"Check if bytes ends with suffix"
	| suffixClass suffixSize mySize offset |
	suffixClass := suffix @env0:class.

	"A tuple of suffixes: True if self ends with ANY of them (CPython).
	Each element is validated by the recursive single-suffix call."
	(suffix isKindOf: tuple) ifTrue: [
		1 @env0:to: (suffix @env0:size) do: [:ti |
			(self endswith: (suffix @env0:at: ti)) ifTrue: [^ true]].
		^ false
	].

	"otherwise the suffix must be a single bytes-like object"
	(suffix isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('endswith first arg must be bytes or a tuple of bytes, not '
			@env0:, (suffix @env0:class @env0:name @env0:asString))
	].

	suffixSize := suffix @env0:size.
	mySize := self @env0:size.

	"If suffix is longer, can't match"
	(suffixSize @env0:> mySize) ifTrue: [
		^ false
	].

	offset := mySize @env0:- (suffixSize).

	"Compare each byte"
	1 @env0:to: suffixSize do: [:i |
		| myByte suffixByte |
		myByte := self @env0:at: (offset @env0:+ i).
		suffixByte := suffix @env0:at: i.
		(myByte @env0:= suffixByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Grail-String-like Methods'
method: bytes
expandtabs
	"Expand tabs to spaces (default tabsize=8)"
	^ self expandtabs: 8
%

category: 'Grail-String-like Methods'
method: bytes
expandtabs: tabsize
	"Expand tabs to spaces with given tabsize"
	| result size column |
	result := bytes ___new___.
	size := self @env0:size.
	column := 0.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.

		(byte == 9) ifTrue: [  "Tab"
			| spaces |
			spaces := tabsize @env0:- (column @env0:\\ tabsize).
			1 @env0:to: spaces do: [:j |
				| newByte |
				newByte := bytes ___new___: 1.
				newByte @env0:at: 1 put: 32.
				result := result @env0:, newByte
			].
			column := column @env0:+ spaces
		] ifFalse: [
			((byte == 10) or: [byte == 13]) ifTrue: [  "LF or CR both reset the column"
				| newByte |
				newByte := bytes ___new___: 1.
				newByte @env0:at: 1 put: byte.
				result := result @env0:, newByte.
				column := 0
			] ifFalse: [
				| newByte |
				newByte := bytes ___new___: 1.
				newByte @env0:at: 1 put: byte.
				result := result @env0:, newByte.
				column := column @env0:+ 1
			]
		]
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
_expandtabs: positional kw: kwargs
	"Varargs form of expandtabs(tabsize=8) -- reached via the BoundMethod
	fallback (getattr(obj,'expandtabs')(...)), accepting tabsize positionally
	or as a keyword."

	| tabsize |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('expandtabs() takes at most 1 argument ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	tabsize := (positional @env0:size @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'tabsize'])
			@env0:ifTrue: [kwargs @env0:at: 'tabsize'] @env0:ifFalse: [8]].
	^ self expandtabs: tabsize
%

category: 'Grail-Search Methods'
method: bytes
find: rawSub
	"Find first occurrence of sub, return index or -1"
	| subSize mySize i sub |
	sub := self ___searchOperand___: rawSub.

	"sub must be bytes or integer"
	(sub isKindOf: Integer) ifTrue: [
		"Find first occurrence of a single byte value (range-checked)."
		self ___checkByteValue___: sub.
		mySize := self @env0:size.
		1 @env0:to: mySize do: [:idx |
			| byte |
			byte := self @env0:at: idx.
			(byte @env0:= sub) ifTrue: [
				^ idx @env0:- (1)  "Convert to 0-based"
			]
		].
		^ -1
	].

	"sub must be a bytes-like object (bytes / bytearray / subclasses)"
	(sub isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'argument should be bytes, bytearray or int'
	].

	subSize := sub @env0:size.
	mySize := self @env0:size.

	"Empty sub always returns 0"
	(subSize == 0) ifTrue: [
		^ 0
	].

	i := 1.
	[i @env0:<= (mySize @env0:- (subSize @env0:- 1))] @env0:whileTrue: [
		| match |
		match := true.
		1 @env0:to: subSize do: [:j |
			| myByte subByte |
			myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
			subByte := sub @env0:at: j.
			(myByte @env0:= subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			^ i @env0:- (1)  "Convert to 0-based"
		].
		i := i @env0:+ 1
	].

	^ -1
%

category: 'Grail-Encoding/Decoding'
method: bytes
hex
	"Return the lowercase hex representation of the bytes (CPython
	bytes.hex() -- e.g. b'\xfe\x01'.hex() = 'fe01')."
	| result size |
	result := ''.
	size := self @env0:size.

	1 @env0:to: size do: [:i |
		| byte hexStr |
		byte := self @env0:at: i.
		hexStr := (byte @env0:printStringRadix: 16) @env0:asLowercase.
		"Pad with leading zero if needed"
		((hexStr @env0:size) == 1) ifTrue: [
			hexStr := '0' @env0:, hexStr
		].
		result := result @env0:, hexStr
	].

	^ result
%

category: 'Grail-Encoding/Decoding'
method: bytes
hex: sep
	"bytes.hex(sep) -- group the hex digits with a one-character separator
	(bytes_per_sep defaults to 1)."
	^ self ___hexWithSep___: sep bytesPerSep: 1
%

category: 'Grail-Encoding/Decoding'
method: bytes
hex: sep _: bytesPerSep
	"bytes.hex(sep, bytes_per_sep) -- a separator every ``bytes_per_sep''
	bytes, counting from the right (positive) or left (negative)."
	^ self ___hexWithSep___: sep bytesPerSep: bytesPerSep
%

category: 'Grail-Encoding/Decoding'
method: bytes
_hex: positional kw: kwargs
	"Varargs/keyword form: hex() / hex(sep) / hex(sep, bytes_per_sep) /
	hex(sep=..., bytes_per_sep=...)."
	| sep n |
	(positional @env0:size @env0:>= 1)
		ifTrue: [sep := positional @env0:at: 1]
		ifFalse: [
			(kwargs @env0:isNil @env0:not and: [kwargs @env0:includesKey: 'sep'])
				ifTrue: [sep := kwargs @env0:at: 'sep']
				ifFalse: [^ self hex]].
	n := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs @env0:isNil @env0:not and: [kwargs @env0:includesKey: 'bytes_per_sep'])
				ifTrue: [kwargs @env0:at: 'bytes_per_sep']
				ifFalse: [1]].
	^ self ___hexWithSep___: sep bytesPerSep: n
%

category: 'Grail-Encoding/Decoding'
method: bytes
___hexSepCode___: sep
	"Resolve a hex() separator to its single ASCII code point (0..127).
	CPython: None / any non-str-non-bytes -> TypeError; a separator that is
	not exactly one character, or whose code point exceeds 127 -> ValueError."
	| code |
	(sep @env0:== None) ifTrue: [
		TypeError ___signal___: 'hex() argument must be str or bytes, not None'].
	(sep isKindOf: CharacterCollection) ifTrue: [
		(sep @env0:size @env0:= 1) ifFalse: [
			ValueError ___signal___: 'sep must be length 1.'].
		code := (sep @env0:at: 1) @env0:asInteger.
		(code @env0:> 127) ifTrue: [ValueError ___signal___: 'sep must be ASCII.'].
		^ code].
	(sep isKindOf: bytes) ifTrue: [
		(sep @env0:size @env0:= 1) ifFalse: [
			ValueError ___signal___: 'sep must be length 1.'].
		code := sep @env0:at: 1.
		(code @env0:> 127) ifTrue: [ValueError ___signal___: 'sep must be ASCII.'].
		^ code].
	TypeError ___signal___: 'sep must be str or bytes.'
%

category: 'Grail-Encoding/Decoding'
method: bytes
___hexWithSep___: sep bytesPerSep: nArg
	"Lowercase hex with a validated one-ASCII-character separator inserted
	between groups of ``nArg'' bytes: positive counts groups from the right,
	negative from the left, and 0 or |nArg| >= size yields no separator (the
	modulo test never fires for a divisor larger than the gap)."
	| size n sepCode ws |
	size := self @env0:size.
	sepCode := self ___hexSepCode___: sep.
	n := nArg.
	ws := AppendStream @env0:on: String @env0:new.
	1 @env0:to: size do: [:i |
		| idx0 needSep byte hexStr |
		idx0 := i @env0:- 1.
		needSep := false.
		((idx0 @env0:> 0) and: [(n @env0:= 0) @env0:not]) ifTrue: [
			(n @env0:> 0)
				ifTrue: [needSep := ((size @env0:- idx0) @env0:\\ n) @env0:= 0]
				ifFalse: [needSep := (idx0 @env0:\\ (n @env0:negated)) @env0:= 0]].
		needSep ifTrue: [ws @env0:nextPut: (Character @env0:codePoint: sepCode)].
		byte := self @env0:at: i.
		hexStr := (byte @env0:printStringRadix: 16) @env0:asLowercase.
		(hexStr @env0:size @env0:= 1) ifTrue: [hexStr := '0' @env0:, hexStr].
		ws @env0:nextPutAll: hexStr].
	^ ws @env0:contents
%

category: 'Grail-Search Methods'
method: bytes
index: sub
	"Find first occurrence of sub, raise ValueError if not found"
	| result |
	result := self find: sub.
	(result == -1) ifTrue: [
		ValueError ___signal___: 'subsection not found'
	].
	^ result
%

category: 'Grail-Testing Methods'
method: bytes
isalnum
	"Check if all bytes are alphanumeric ASCII"
	| size |
	size := self @env0:size.

	"Empty bytes returns False"
	(size == 0) ifTrue: [
		^ false
	].

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Check if 0-9 (48-57), A-Z (65-90), or a-z (97-122)"
		((byte @env0:>= 48) and: [
			byte @env0:<= 57
		]) ifFalse: [
			((byte @env0:>= 65) and: [
				byte @env0:<= 90
			]) ifFalse: [
				((byte @env0:>= 97) and: [
					byte @env0:<= 122
				]) ifFalse: [
					^ false
				]
			]
		]
	].

	^ true
%

category: 'Grail-Testing Methods'
method: bytes
isalpha
	"Check if all bytes are alphabetic ASCII (A-Z, a-z)"
	| size |
	size := self @env0:size.

	"Empty bytes returns False"
	(size == 0) ifTrue: [
		^ false
	].

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Check if A-Z (65-90) or a-z (97-122)"
		((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) ifFalse: [
			((byte @env0:>= 97) and: [
				byte @env0:<= 122
			]) ifFalse: [
				^ false
			]
		]
	].

	^ true
%

category: 'Grail-Testing Methods'
method: bytes
isascii
	"Return True if the sequence is empty or all bytes are ASCII (0-127)"

	| size |
	size := self @env0:size.
	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"ASCII bytes are in the range 0-0x7F (0-127)"
		(byte @env0:> 127) ifTrue: [
			^ false
		]
	].
	^ true
%

category: 'Grail-Testing Methods'
method: bytes
isdigit
	"Check if all bytes are digits (0-9)"
	| size |
	size := self @env0:size.

	"Empty bytes returns False"
	(size == 0) ifTrue: [
		^ false
	].

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Check if 0-9 (48-57)"
		((byte @env0:>= 48) and: [
			byte @env0:<= 57
		]) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Grail-Testing Methods'
method: bytes
islower
	"Check if all cased bytes are lowercase"
	| size hasCased |
	size := self @env0:size.
	hasCased := false.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Check if uppercase (65-90)"
		((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) ifTrue: [
			^ false
		].
		"Check if lowercase (97-122)"
		((byte @env0:>= 97) and: [
			byte @env0:<= 122
		]) ifTrue: [
			hasCased := true
		]
	].

	^ hasCased
%

category: 'Grail-Testing Methods'
method: bytes
isspace
	"Check if all bytes are whitespace"
	| size |
	size := self @env0:size.

	"Empty bytes returns False"
	(size == 0) ifTrue: [
		^ false
	].

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13), form feed(12), vertical tab(11)"
		((byte == 32) or: [
			(byte == 9) or: [
				(byte == 10) or: [
					(byte == 13) or: [
						(byte == 12) or: [
							byte == 11
						]
					]
				]
			]
		]) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Grail-Testing Methods'
method: bytes
istitle
	"Check if bytes is titlecased"
	| size inWord hasCased |
	size := self @env0:size.
	inWord := false.
	hasCased := false.

	1 @env0:to: size do: [:i |
		| byte isUpper isLower |
		byte := self @env0:at: i.

		isUpper := (byte @env0:>= 65) and: [
			byte @env0:<= 90
		].
		isLower := (byte @env0:>= 97) and: [
			byte @env0:<= 122
		].

		(isUpper or: [isLower]) ifTrue: [
			inWord ifFalse: [
				"First letter of word must be uppercase"
				isLower ifTrue: [
					^ false
				].
				inWord := true.
				hasCased := true
			] ifTrue: [
				"Not first letter must be lowercase"
				isUpper ifTrue: [
					^ false
				]
			]
		] ifFalse: [
			inWord := false
		]
	].

	^ hasCased
%

category: 'Grail-Testing Methods'
method: bytes
isupper
	"Check if all cased bytes are uppercase"
	| size hasCased |
	size := self @env0:size.
	hasCased := false.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Check if lowercase (97-122)"
		((byte @env0:>= 97) and: [
			byte @env0:<= 122
		]) ifTrue: [
			^ false
		].
		"Check if uppercase (65-90)"
		((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) ifTrue: [
			hasCased := true
		]
	].

	^ hasCased
%

category: 'Grail-String-like Methods'
method: bytes
join: iterable
	"Join iterable of bytes with self as separator"
	| iterClass parts totalSize result offset |
	iterClass := iterable @env0:class.

	"list / tuple are used by index directly; any other Python iterable
	(generator, ClosingIterator, map, …) is materialized into a list via
	the __iter__/__next__ protocol so it can be indexed.  Only a truly
	non-iterable raises."
	parts := ((iterClass == list) or: [iterClass == tuple])
		ifTrue: [iterable]
		ifFalse: [
			(iterClass @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) notNil
				ifTrue: [list __new__: iterable]
				ifFalse: [TypeError ___signal___: 'can only join an iterable']].

	"Empty iterable -- still a NEW object of the receiver's base type
	(PEP 3137: a bytearray method must never hand back the receiver)."
	((parts @env0:size) == 0) ifTrue: [
		^ self ___translateResultClass___ ___new___
	].

	"Every item must be bytes-like; CPython names the offending index/type
	rather than dying on a Character inside the copy loop below."
	1 @env0:to: parts @env0:size do: [:i |
		((parts @env0:at: i) isKindOf: bytes) ifFalse: [
			TypeError ___signal___: ('sequence item ' @env0:, (i @env0:- 1) @env0:printString
				@env0:, ': expected a bytes-like object, '
				@env0:, (bytes ___pyTypeNameOf___: (parts @env0:at: i)) @env0:, ' found')]].

	"Calculate total size"
	totalSize := 0.
	1 @env0:to: parts @env0:size do: [:i |
		| part |
		part := parts @env0:at: i.
		totalSize := totalSize @env0:+ part @env0:size.
		(i @env0:< parts @env0:size) ifTrue: [
			totalSize := totalSize @env0:+ self @env0:size
		]
	].

	"Build result -- always a fresh object of the receiver's base type."
	result := self ___translateResultClass___ ___new___: totalSize.
	offset := 0.

	1 @env0:to: parts @env0:size do: [:i |
		| part partSize |
		part := parts @env0:at: i.
		partSize := part @env0:size.

		"Copy part"
		1 @env0:to: partSize do: [:j |
			result @env0:at: (offset @env0:+ j) put: (part @env0:at: j)
		].
		offset := offset @env0:+ partSize.

		"Add separator (except after last part)"
		(i @env0:< parts @env0:size) ifTrue: [
			| sepSize |
			sepSize := self @env0:size.
			1 @env0:to: sepSize do: [:j |
				result @env0:at: (offset @env0:+ j) put: (self @env0:at: j)
			].
			offset := offset @env0:+ sepSize
		]
	].

	^ result
%

category: 'Grail-Padding Methods'
method: bytes
ljust: width
	"bytes.ljust(width) -- left-justified in a field of the given width,
	padded with spaces.  ljust(width, fillbyte) supplies a different fill."
	^ self ljust: width _: self ___spaceByteString___
%

category: 'Grail-String-like Methods'
method: bytes
lower
	"Return lowercase version of bytes"

	| result size |
	size := self @env0:size.
	result := bytes ___new___: size.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Convert uppercase ASCII (65-90) to lowercase (97-122)"
		((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) ifTrue: [
			byte := byte @env0:+ 32
		].
		result @env0:at: i put: byte
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
___isAsciiSpaceByte___: byte
	"True if ``byte'' is one of CPython's six ASCII whitespace bytes:
	TAB(9) LF(10) VT(11) FF(12) CR(13) SPACE(32).  The no-argument
	strip/lstrip/rstrip forms trim exactly this set (VT and FF were
	previously omitted)."
	^ #(9 10 11 12 13 32) @env0:includes: byte
%

category: 'Grail-String-like Methods'
method: bytes
lstrip
	"Remove leading whitespace bytes"
	| start size result newSize |
	size := self @env0:size.
	(size == 0) ifTrue: [
		^ bytes ___new___
	].

	"Find first non-whitespace"
	start := 1.
	[(start @env0:<= size) and: [
		self ___isAsciiSpaceByte___: (self @env0:at: start)
	]] @env0:whileTrue: [
		start := start @env0:+ 1
	].

	"All whitespace"
	(start @env0:> size) ifTrue: [
		^ bytes ___new___
	].

	"Extract substring"
	newSize := size @env0:- (start @env0:- 1).
	result := bytes ___new___: newSize.
	1 @env0:to: newSize do: [:i |
		result @env0:at: i put: (self @env0:at: (start @env0:+ (i @env0:- (1))))
	].

	^ result
%

category: 'Grail-Splitting Methods'
method: bytes
partition: sep
	"Partition bytes at first occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize |
	"sep must be a bytes-like object (an int/str is a TypeError) and non-empty."
	(sep isKindOf: ByteArray) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (sep @env1:__class__ @env1:__name__) @env0:, '''')].
	sep @env0:isEmpty ifTrue: [ValueError ___signal___: 'empty separator'].
	idx := self find: sep.

	"Not found - return (self, empty, empty)"
	(idx == -1) ifTrue: [
		^ tuple @env0:with: (self @env0:copy) with: (bytes ___new___) with: (bytes ___new___)
	].

	"Found - split at separator"
	mySize := self @env0:size.
	sepSize := sep @env0:size.

	"Before separator"
	before := bytes ___new___: idx.
	1 @env0:to: idx do: [:i |
		before @env0:at: i put: (self @env0:at: i)
	].

	"After separator"
	afterSize := mySize @env0:- (idx @env0:+ sepSize).
	after := bytes ___new___: afterSize.
	1 @env0:to: afterSize do: [:i |
		after @env0:at: i put: (self @env0:at: (idx @env0:+ (sepSize @env0:+ i)))
	].

	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
removeprefix: prefix
	"Remove prefix if present, otherwise return copy.  Unlike startswith,
	removeprefix accepts only a single bytes-like object -- NOT a tuple."
	| hasPrefix prefixSize mySize result |
	(prefix isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('removeprefix() argument must be a bytes-like object, not '
			@env0:, (prefix @env0:class @env0:name @env0:asString))].
	hasPrefix := self startswith: prefix.
	hasPrefix ifFalse: [
		^ self @env0:copy
	].

	prefixSize := prefix @env0:size.
	mySize := self @env0:size.
	result := bytes ___new___: (mySize @env0:- prefixSize).

	1 @env0:to: (mySize @env0:- prefixSize) do: [:i |
		result @env0:at: i put: (self @env0:at: (prefixSize @env0:+ i))
	].

	^ result
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
removesuffix: suffix
	"Remove suffix if present, otherwise return copy.  Unlike endswith,
	removesuffix accepts only a single bytes-like object -- NOT a tuple."
	| hasSuffix suffixSize mySize result |
	(suffix isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('removesuffix() argument must be a bytes-like object, not '
			@env0:, (suffix @env0:class @env0:name @env0:asString))].
	hasSuffix := self endswith: suffix.
	hasSuffix ifFalse: [
		^ self @env0:copy
	].

	suffixSize := suffix @env0:size.
	mySize := self @env0:size.
	result := bytes ___new___: (mySize @env0:- suffixSize).

	1 @env0:to: (mySize @env0:- suffixSize) do: [:i |
		result @env0:at: i put: (self @env0:at: i)
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
replace: old _: new
	"Replace all occurrences of old with new"
	| oldClass newClass oldSize newSize mySize parts |
	oldClass := old @env0:class.
	newClass := new @env0:class.

	"old and new must be bytes-like (bytes / bytearray / subclasses)"
	(old isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'first argument must be bytes'
	].
	(new isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'second argument must be bytes'
	].

	oldSize := old @env0:size.
	newSize := new @env0:size.
	mySize := self @env0:size.

	"Empty old: insert new at every gap (CPython interleave)."
	(oldSize == 0) ifTrue: [
		^ self ___replaceEmptyOld___: new count: -1
	].

	"Guard against a gigabyte-scale result before building it (OverflowError,
	not an OOM VM crash): resultLen = mySize + occurrences * (newSize - oldSize)."
	self ___checkReplaceResultLen___:
		(mySize @env0:+ ((self count: old) @env0:* (newSize @env0:- oldSize))).

	"Split by old, then join with new"
	parts := self split: old.
	^ new join: parts
%

category: 'Grail-Search Methods'
method: bytes
___checkReplaceResultLen___: resultLen
	"CPython raises OverflowError (``replace bytes is too long'') when the
	result length overflows Py_ssize_t.  Grail additionally cannot materialize
	a multi-gigabyte result in the temp-object cache, so cap at 2**31 - 1 (the
	32-bit ssize_t limit test_replace_overflow checks) and raise rather than
	exhaust VM memory."
	resultLen @env0:> 2147483647 ifTrue: [
		OverflowError ___signal___: 'replace bytes is too long'].
%

category: 'Grail-Search Methods'
method: bytes
___replaceEmptyOld___: new count: count
	"replace(b'', new, count): CPython inserts ``new'' at every gap -- before
	each byte and after the last -- for the first ``count'' gaps (all of them
	when count < 0).  A string of length n has n + 1 gaps, so b''.replace(b'',
	x) is x and b'AA'.replace(b'', b'*-') is b'*-A*-A*-'."
	| n newSize maxInsert result pos |
	n := self @env0:size.
	newSize := new @env0:size.
	maxInsert := n @env0:+ 1.
	((count @env0:>= 0) and: [count @env0:< maxInsert]) ifTrue: [maxInsert := count].
	self ___checkReplaceResultLen___: (n @env0:+ (maxInsert @env0:* newSize)).
	result := bytes ___new___: (n @env0:+ (maxInsert @env0:* newSize)).
	pos := 1.
	1 @env0:to: n do: [:i |
		"insert ``new'' before byte i for the first maxInsert bytes"
		(i @env0:<= maxInsert) ifTrue: [
			1 @env0:to: newSize do: [:k |
				result @env0:at: pos put: (new @env0:at: k). pos := pos @env0:+ 1]].
		result @env0:at: pos put: (self @env0:at: i). pos := pos @env0:+ 1].
	"final gap after the last byte, when the whole (n+1) budget is available"
	(n @env0:< maxInsert) ifTrue: [
		1 @env0:to: newSize do: [:k |
			result @env0:at: pos put: (new @env0:at: k). pos := pos @env0:+ 1]].
	^ result
%

category: 'Grail-Search Methods'
method: bytes
rfind: rawSub
	"Find last occurrence of sub, return index or -1"
	| subSize mySize i sub |
	sub := self ___searchOperand___: rawSub.

	"sub must be bytes or integer"
	(sub isKindOf: Integer) ifTrue: [
		"Find last occurrence of a single byte value (range-checked)."
		self ___checkByteValue___: sub.
		mySize := self @env0:size.
		mySize @env0:to: 1 by: -1 do: [:idx |
			| byte |
			byte := self @env0:at: idx.
			(byte @env0:= sub) ifTrue: [
				^ idx @env0:- (1)  "Convert to 0-based"
			]
		].
		^ -1
	].

	"sub must be a bytes-like object (bytes / bytearray / subclasses)"
	(sub isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'argument should be bytes, bytearray or int'
	].

	subSize := sub @env0:size.
	mySize := self @env0:size.

	"Empty sub always returns size"
	(subSize == 0) ifTrue: [
		^ mySize
	].

	i := mySize @env0:- (subSize @env0:- 1).
	[i @env0:>= 1] @env0:whileTrue: [
		| match |
		match := true.
		1 @env0:to: subSize do: [:j |
			| myByte subByte |
			myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
			subByte := sub @env0:at: j.
			(myByte @env0:= subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			^ i @env0:- (1)  "Convert to 0-based"
		].
		i := i @env0:- (1)
	].

	^ -1
%

category: 'Grail-Search Methods'
method: bytes
rindex: sub
	"Find last occurrence of sub, raise ValueError if not found"
	| result |
	result := self rfind: sub.
	(result == -1) ifTrue: [
		ValueError ___signal___: 'subsection not found'
	].
	^ result
%

category: 'Grail-Padding Methods'
method: bytes
rjust: width
	"bytes.rjust(width) -- right-justified in a field of the given width,
	padded with spaces.  rjust(width, fillbyte) supplies a different fill."
	^ self rjust: width _: self ___spaceByteString___
%

category: 'Grail-Splitting Methods'
method: bytes
rpartition: sep
	"Partition bytes at last occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize|
	"sep must be a bytes-like object (an int/str is a TypeError) and non-empty."
	(sep isKindOf: ByteArray) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (sep @env1:__class__ @env1:__name__) @env0:, '''')].
	sep @env0:isEmpty ifTrue: [ValueError ___signal___: 'empty separator'].
	idx := self rfind: sep.

	"Not found - return (empty, empty, self)"
	(idx == -1) ifTrue: [
		^ tuple @env0:with: (bytes ___new___) with: (bytes ___new___) with: self @env0:copy
	].

	"Found - split at separator"
	mySize := self @env0:size.
	sepSize := sep @env0:size.

	"Before separator"
	before := bytes ___new___: idx.
	1 @env0:to: idx do: [:i |
		before @env0:at: i put: (self @env0:at: i)
	].

	"After separator"
	afterSize := mySize @env0:- (idx @env0:+ sepSize).
	after := bytes ___new___: afterSize.
	1 @env0:to: afterSize do: [:i |
		after @env0:at: i put: (self @env0:at: (idx @env0:+ (sepSize @env0:+ i)))
	].

	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-Splitting Methods'
method: bytes
rsplit: sep
	"bytes.rsplit(sep) -- unlimited split, scanning from the RIGHT.  Not the
	same as split(): with an overlapping separator the two disagree
	(b'abbbc'.rsplit(b'bb') is [b'ab', b'c'], split() gives [b'a', b'bc'])."
	^ self rsplit: sep _: -1
%

category: 'Grail-Splitting Methods'
method: bytes
rsplit: rawSep _: maxsplit
	"Split from right with maximum number of splits.  A None separator splits
	on runs of ASCII whitespace, from the right (honoring maxsplit)."
	| sepClass sepSize mySize parts positions i actualSplits lastEnd firstPart firstPartSize cap sep |
	(rawSep @env0:== None) ifTrue: [^ self ___rsplitWhitespace___: maxsplit].
	sep := self ___searchOperand___: rawSep.
	sepClass := sep @env0:class.

	"sep must be a bytes-like object (bytes / bytearray / subclasses)"
	(sep isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep @env0:size.
	mySize := self @env0:size.

	"Empty separator not allowed"
	(sepSize == 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	"A negative maxsplit means UNLIMITED, but it cannot be delegated to
	split(): with an overlapping separator the two disagree
	(b'abbbc'.rsplit(b'bb') is [b'ab', b'c'], split() gives [b'a', b'bc']),
	so scan right-to-left here with no split cap."
	cap := maxsplit @env0:< 0 ifTrue: [mySize @env0:+ 1] ifFalse: [maxsplit].

	"Find all separator positions from right to left"
	positions := list ___new___.
	i := mySize @env0:- (sepSize @env0:- 1).
	
	[i @env0:>= 1] @env0:whileTrue: [
		| match |
		match := true.
				1 @env0:to: sepSize do: [:j |
			| myByte sepByte |
			myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
			sepByte := sep @env0:at: j.
			(myByte @env0:= sepByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			positions append: i.
			"Matches must not OVERLAP (CPython scans for disjoint separators):
			skip the whole separator, or 'a////b'.rsplit('//', 2) would record
			adjacent starts 14 and 13 and then build a negative-length part."
			i := i @env0:- sepSize
		] ifFalse: [
			i := i @env0:- 1
		].
		"Nothing beyond the first maxsplit (rightmost) separators can matter."
		(positions @env0:size @env0:>= cap) ifTrue: [i := 0]
	].

	"Limit to maxsplit splits (take first maxsplit positions since we collected from right)"
	actualSplits := positions @env0:size.
	(actualSplits @env0:> cap) ifTrue: [
		| newPositions |
		newPositions := list ___new___.
		1 @env0:to: cap do: [:idx |
			newPositions append: (positions @env0:at: idx)
		].
		positions := newPositions
	].

	"Build parts from right to left"
	parts := list ___new___.
	lastEnd := mySize @env0:+ 1.
	
	1 @env0:to: positions @env0:size do: [:idx |
		| pos part partSize |
		pos := positions @env0:at: idx.
		partSize := lastEnd @env0:- (pos @env0:+ sepSize).
		part := bytes ___new___: partSize.
		1 @env0:to: partSize do: [:j |
			part @env0:at: j put: (self @env0:at: (pos @env0:+ (sepSize @env0:+ (j @env0:- (1)))))
		].
		parts @env0:addFirst: part.
		lastEnd := pos
	].

	"Add first part (everything before first split position)"
	firstPartSize := lastEnd @env0:- (1).
	firstPart := bytes ___new___: firstPartSize.
	1 @env0:to: firstPartSize do: [:j |
		firstPart @env0:at: j put: (self @env0:at: j)
	].
	parts @env0:addFirst: firstPart.

	^ parts
%

category: 'Grail-String-like Methods'
method: bytes
rstrip
	"Remove trailing whitespace bytes"
	| end size result |
	size := self @env0:size.
	(size == 0) ifTrue: [
		^ bytes ___new___
	].

	"Find last non-whitespace"
	end := size.
	[(end @env0:>= 1) and: [
		self ___isAsciiSpaceByte___: (self @env0:at: end)
	]] @env0:whileTrue: [
		end := end @env0:- (1)
	].

	"All whitespace"
	(end @env0:< 1) ifTrue: [
		^ bytes ___new___
	].

	"Extract substring"
	result := bytes ___new___: end.
	1 @env0:to: end do: [:i |
		result @env0:at: i put: (self @env0:at: i)
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
split: rawSep
	"Split bytes by separator, return list of bytes.  A ``None'' separator
	(``b.split(None)'') splits on runs of ASCII whitespace."
	| sepClass sepSize mySize parts currentPart i sep |
	"None is the whitespace-split sentinel, checked BEFORE operand resolution
	(which requires a bytes-like or an int)."
	(rawSep @env0:== None) ifTrue: [^ self ___splitWhitespace___].
	sep := self ___searchOperand___: rawSep.
	sepClass := sep @env0:class.

	"sep must be a bytes-like object (bytes / bytearray / subclasses)"
	(sep isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep @env0:size.
	mySize := self @env0:size.

	"Empty separator not allowed"
	(sepSize == 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	parts := list ___new___.
	currentPart := bytes ___new___.
	i := 1.

	[i @env0:<= mySize] @env0:whileTrue: [
		| match |
		match := true.

		"Check if separator matches at current position"
		((i @env0:+ (sepSize @env0:- (1))) @env0:<= mySize) ifTrue: [
			1 @env0:to: sepSize do: [:j |
				| myByte sepByte |
				myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
				sepByte := sep @env0:at: j.
				(myByte @env0:= sepByte) ifFalse: [
					match := false
				]
			]
		] ifFalse: [
			match := false
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts append: currentPart.
			currentPart := bytes ___new___.
			i := i @env0:+ sepSize
		] ifFalse: [
			"Add byte to current part"
			| byte newByte |
			byte := self @env0:at: i.
			newByte := bytes ___new___: 1.
			newByte @env0:at: 1 put: byte.
			currentPart := currentPart @env0:, newByte.
			i := i @env0:+ 1
		]
	].

	"Add final part"
	parts append: currentPart.

	^ parts
%

category: 'Grail-String-like Methods'
method: bytes
split: rawSep _: maxsplit
	"Split bytes by separator with maximum number of splits.  A None separator
	splits on runs of ASCII whitespace (honoring maxsplit)."
	| sepClass sepSize mySize parts currentPart i splitCount match sep |
	(rawSep @env0:== None) ifTrue: [^ self ___splitWhitespace___: maxsplit].
	sep := self ___searchOperand___: rawSep.
	sepClass := sep @env0:class.

	"sep must be a bytes-like object (bytes / bytearray / subclasses)"
	(sep isKindOf: bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep @env0:size.
	mySize := self @env0:size.

	"Empty separator not allowed"
	(sepSize == 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	"If maxsplit is -1 or < 0, do unlimited split"
	(maxsplit @env0:< 0) ifTrue: [
		^ self split: sep
	].

	parts := list ___new___.
	currentPart := bytes ___new___.
	i := 1.
	splitCount := 0.

	[i @env0:<= mySize] @env0:whileTrue: [
		match := true.

		"Check if we've reached maxsplit"
		(splitCount @env0:>= maxsplit) ifTrue: [
			match := false
		] ifFalse: [
			"Check if separator matches at current position"
			((i @env0:+ (sepSize @env0:- 1)) @env0:<= mySize) ifTrue: [
				1 @env0:to: sepSize do: [:j |
					| myByte sepByte |
					myByte := self @env0:at: (i @env0:+ (j @env0:- (1))).
					sepByte := sep @env0:at: j.
					(myByte @env0:= sepByte) ifFalse: [
						match := false
					]
				]
			] ifFalse: [
				match := false
			]
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts append: currentPart.
			currentPart := bytes ___new___.
			i := i @env0:+ sepSize.
			splitCount := splitCount @env0:+ 1
		] ifFalse: [
			"Add byte to current part"
			| byte newByte |
			byte := self @env0:at: i.
			newByte := bytes ___new___: 1.
			newByte @env0:at: 1 put: byte.
			currentPart := currentPart @env0:, newByte.
			i := i @env0:+ 1
		]
	].

	"Add final part"
	parts append: currentPart.

	^ parts
%

category: 'Grail-Splitting Methods'
method: bytes
splitlines
	"Split bytes at line boundaries, return list"
	| parts currentPart size i |
	size := self @env0:size.
	parts := list ___new___.
	currentPart := bytes ___new___.
	i := 1.

	[i @env0:<= size] @env0:whileTrue: [
		| byte |
		byte := self @env0:at: i.

		"Check for line endings"
		(byte == 10) ifTrue: [  "LF"
			parts append: currentPart.
			currentPart := bytes ___new___.
			i := i @env0:+ 1
		] ifFalse: [
			(byte == 13) ifTrue: [  "CR"
				parts append: currentPart.
				currentPart := bytes ___new___.
				"Check for CRLF"
				((i @env0:< size) and: [
					(self @env0:at: (i @env0:+ 1)) == 10
				]) ifTrue: [
					i := i @env0:+ 2
				] ifFalse: [
					i := i @env0:+ 1
				]
			] ifFalse: [
				"Regular character"
				| newByte |
				newByte := bytes ___new___: 1.
				newByte @env0:at: 1 put: byte.
				currentPart := currentPart @env0:, newByte.
				i := i @env0:+ 1
			]
		]
	].

	"Add final part if non-empty"
		(currentPart @env0:size @env0:> 0) ifTrue: [
		parts append: currentPart
	].

	^ parts
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
startswith: prefix
	"Check if bytes starts with prefix"
	| prefixClass prefixSize mySize |
	prefixClass := prefix @env0:class.

	"A tuple of prefixes: True if self starts with ANY of them (CPython).
	Each element is validated by the recursive single-prefix call, so a
	non-bytes-like element raises the same TypeError."
	(prefix isKindOf: tuple) ifTrue: [
		1 @env0:to: (prefix @env0:size) do: [:ti |
			(self startswith: (prefix @env0:at: ti)) ifTrue: [^ true]].
		^ false
	].

	"otherwise the prefix must be a single bytes-like object"
	(prefix isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('startswith first arg must be bytes or a tuple of bytes, not '
			@env0:, (prefix @env0:class @env0:name @env0:asString))
	].

	prefixSize := prefix @env0:size.
	mySize := self @env0:size.

	"If prefix is longer, can't match"
	(prefixSize @env0:> mySize) ifTrue: [
		^ false
	].

	"Compare each byte"
	1 @env0:to: prefixSize do: [:i |
		| myByte prefixByte |
		myByte := self @env0:at: i.
		prefixByte := prefix @env0:at: i.
		(myByte @env0:= prefixByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Grail-String-like Methods'
method: bytes
strip
	"Remove leading and trailing whitespace bytes"
	| start end size result newSize |

	size := self @env0:size.
	(size == 0) ifTrue: [
		^ bytes ___new___
	].

	"Find first non-whitespace"
	start := 1.
	[(start @env0:<= size) and: [
		self ___isAsciiSpaceByte___: (self @env0:at: start)
	]] @env0:whileTrue: [
		start := start @env0:+ 1
	].

	"All whitespace"
	(start @env0:> size) ifTrue: [
		^ bytes ___new___
	].

	"Find last non-whitespace"
	end := size.
	[(end @env0:>= start) and: [
		self ___isAsciiSpaceByte___: (self @env0:at: end)
	]] @env0:whileTrue: [
		end := end @env0:- (1)
	].

	"Extract substring"
	newSize := end @env0:- (start @env0:- 1).
	result := bytes ___new___: newSize.
	1 @env0:to: newSize do: [:i |
		result @env0:at: i put: (self @env0:at: (start @env0:+ (i @env0:- (1))))
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
rstrip: chars
	"``bytes.rstrip(chars)`` - drop trailing bytes matching any byte
	in `chars`.  itsdangerous uses this with the b'=' padding from
	base64.urlsafe_b64encode."

	| charsBytes size end result |
	"None (or the no-arg form) strips ASCII whitespace; a non-bytes-like
	chars is a TypeError, matching CPython (a str/int is NOT accepted)."
	(chars @env0:== None) ifTrue: [^ self rstrip].
	(chars isKindOf: ByteArray) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (chars @env1:__class__ @env1:__name__) @env0:, '''')].
	charsBytes := chars.
	size := self @env0:size.
	end := size.
	[(end @env0:>= 1) @env0:and: [charsBytes @env0:includes: (self @env0:at: end)]]
		@env0:whileTrue: [end := end @env0:- 1].
	"Even a no-op strip yields a NEW object of the BASE type: CPython only
	returns the receiver for an exact-bytes receiver, and string_tests'
	checkequal asserts a subclass never gets itself back."
	result := self ___translateResultClass___ ___new___: end.
	1 @env0:to: end do: [:i | result @env0:at: i put: (self @env0:at: i)].
	^ result
%

category: 'Grail-String-like Methods'
method: bytes
lstrip: chars
	"``bytes.lstrip(chars)`` - drop leading bytes matching any byte
	in `chars`."

	| charsBytes size start result newSize |
	"None (or the no-arg form) strips ASCII whitespace; a non-bytes-like
	chars is a TypeError, matching CPython (a str/int is NOT accepted)."
	(chars @env0:== None) ifTrue: [^ self lstrip].
	(chars isKindOf: ByteArray) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (chars @env1:__class__ @env1:__name__) @env0:, '''')].
	charsBytes := chars.
	size := self @env0:size.
	start := 1.
	[(start @env0:<= size) @env0:and: [charsBytes @env0:includes: (self @env0:at: start)]]
		@env0:whileTrue: [start := start @env0:+ 1].
	newSize := size @env0:- start @env0:+ 1.
	result := self ___translateResultClass___ ___new___: newSize.
	1 @env0:to: newSize do: [:i | result @env0:at: i put: (self @env0:at: start @env0:+ i @env0:- 1)].
	^ result
%

category: 'Grail-String-like Methods'
method: bytes
strip: chars
	"``bytes.strip(chars)`` - drop leading + trailing bytes matching
	any byte in `chars`."

	^ (self lstrip: chars) rstrip: chars
%

category: 'Grail-String-like Methods'
method: bytes
swapcase
	"Return bytes with case swapped"
	| result size |
	size := self @env0:size.
	result := bytes ___new___: size.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Uppercase to lowercase"
		((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) ifTrue: [
			byte := byte @env0:+ 32
		] ifFalse: [
			"Lowercase to uppercase"
			((byte @env0:>= 97) and: [
				byte @env0:<= 122
			]) ifTrue: [
				byte := byte @env0:- (32)
			]
		].
		result @env0:at: i put: byte
	].

	^ result
%

category: 'Grail-String-like Methods'
method: bytes
title
	"Return titlecased bytes (first letter of each word capitalized)"
	| result size inWord |
	size := self @env0:size.
	result := bytes ___new___: size.
	inWord := false.

	1 @env0:to: size do: [:i |
		| byte isAlpha |
		byte := self @env0:at: i.

		"Check if alphabetic"
		isAlpha := ((byte @env0:>= 65) and: [
			byte @env0:<= 90
		]) or: [
			(byte @env0:>= 97) and: [
				byte @env0:<= 122
			]
		].

		isAlpha ifTrue: [
			inWord ifFalse: [
				"First letter of word - capitalize"
				((byte @env0:>= 97) and: [
					byte @env0:<= 122
				]) ifTrue: [
					byte := byte @env0:- (32)
				].
				inWord := true
			] ifTrue: [
				"Not first letter - lowercase"
				((byte @env0:>= 65) and: [
					byte @env0:<= 90
				]) ifTrue: [
					byte := byte @env0:+ 32
				]
			]
		] ifFalse: [
			inWord := false
		].

		result @env0:at: i put: byte
	].

	^ result
%

category: 'Grail-Translation Methods'
method: bytes
translate: table
	"Translate bytes using a 256-entry table (None = identity copy).  The
	result is the receiver's own base type (bytes -> bytes, bytearray ->
	bytearray), as in CPython."
	| tableSize mySize result |
	(table @env0:== None) ifTrue: [^ self ___translateResultClass___ ___copyBytesOf___: self].
	(table isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (bytes ___pyTypeNameOf___: table) @env0:, '''')].
	tableSize := table @env0:size.
	mySize := self @env0:size.

	"Table must be 256 bytes"
	(tableSize == 256) ifFalse: [
		ValueError ___signal___: 'translation table must be 256 characters long'
	].

	result := self ___translateResultClass___ ___new___: mySize.

	1 @env0:to: mySize do: [:i |
		| byte newByte |
		byte := self @env0:at: i.
		newByte := table @env0:at: (byte @env0:+ 1).
		result @env0:at: i put: newByte
	].

	^ result
%

category: 'Grail-Translation Methods'
method: bytes
___translateResultClass___
	"CPython's translate() / string methods on a SUBCLASS return the base
	type, never the subclass -- bytearray subclasses yield bytearray, bytes
	subclasses yield bytes."

	^ (self isKindOf: bytearray) ifTrue: [bytearray] ifFalse: [ByteArray]
%

category: 'Grail-String-like Methods'
method: bytes
upper
	"Return uppercase version of bytes"

	| result size |
	size := self @env0:size.
	result := (self @env0:class) ___new___: size.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		"Convert lowercase ASCII (97-122) to uppercase (65-90)"
		((byte @env0:>= 97) and: [
			byte @env0:<= 122
		]) ifTrue: [
			byte := byte @env0:- (32)
		].
		result @env0:at: i put: byte
	].

	^ result
%

category: 'Grail-Padding Methods'
method: bytes
zfill: width
	"Pad bytes with zeros on the left to fill width.  A leading ASCII sign
	(``+'' / ``-'') stays in front of the zero fill (b'+1'.zfill(4) -> b'+01',
	not b'0+1')."
	| mySize result padding hasSign |
	mySize := self @env0:size.

	"If already wide enough, return copy"
	(width @env0:<= mySize) ifTrue: [
		^ self @env0:copy
	].

	padding := width @env0:- (mySize).
	result := bytes ___new___: width.

	hasSign := (mySize @env0:> 0) and: [
		| b | b := self @env0:at: 1. (b == 43) or: [b == 45]].
	hasSign ifTrue: [
		"Sign first, then the zero fill, then the digits after the sign."
		result @env0:at: 1 put: (self @env0:at: 1).
		1 @env0:to: padding do: [:i | result @env0:at: (i @env0:+ 1) put: 48].
		2 @env0:to: mySize do: [:i | result @env0:at: (padding @env0:+ i) put: (self @env0:at: i)]
	] ifFalse: [
		1 @env0:to: padding do: [:i | result @env0:at: i put: 48  "ASCII '0'"].
		1 @env0:to: mySize do: [:i | result @env0:at: (padding @env0:+ i) put: (self @env0:at: i)]
	].

	^ result
%

! ===============================================================================
! Optional-argument signatures (CPython accepts more arg counts than Grail
! originally defined). Python maps ``b.m(a, b)'' to the ``m:_:'' selector, so
! each accepted arity needs its own method.  bytearray inherits these (it only
! overrides find).
! ===============================================================================

category: 'Grail-Search Methods'
method: bytes
find: sub _: start
	"bytes.find(sub, start) -- first index >= start, else -1."
	^ self find: sub _: start _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytes
find: sub _: start _: end
	"bytes.find(sub, start, end) -- first 0-based index of sub within the
	[start, end) slice (CPython negative-index clamping), else -1.  Reuses the
	1-arg scan on the slice and offsets the hit back to an absolute index."
	| size s e r |
	size := self @env0:size.
	s := start. e := end.
	"CPython accepts None for start/end (== the default bound)."
	(s @env0:== None) ifTrue: [s := 0].
	(e @env0:== None) ifTrue: [e := size].
	s @env0:< 0 ifTrue: [s := (size @env0:+ s) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (size @env0:+ e) @env0:max: 0].
	e := e @env0:min: size.
	"Do NOT clamp s to size: a start past the end must miss (empty sub
	included) -- ``s > e'' then rejects it, since e <= size < s."
	s @env0:> e ifTrue: [^ -1].
	r := (self @env0:copyFrom: s @env0:+ 1 to: e) find: sub.
	^ (r @env0:= -1) ifTrue: [-1] ifFalse: [r @env0:+ s]
%

category: 'Grail-Search Methods'
method: bytes
index: sub _: start
	"bytes.index(sub, start) -- like find, ValueError if absent."
	| r |
	r := self find: sub _: start.
	(r @env0:= -1) ifTrue: [ValueError ___signal___: 'subsection not found'].
	^ r
%

category: 'Grail-Search Methods'
method: bytes
index: sub _: start _: end
	"bytes.index(sub, start, end)."
	| r |
	r := self find: sub _: start _: end.
	(r @env0:= -1) ifTrue: [ValueError ___signal___: 'subsection not found'].
	^ r
%

category: 'Grail-Search Methods'
method: bytes
rindex: sub _: start
	"bytes.rindex(sub, start) -- like rfind, ValueError if absent."
	| r |
	r := self rfind: sub _: start.
	(r @env0:= -1) ifTrue: [ValueError ___signal___: 'subsection not found'].
	^ r
%

category: 'Grail-Search Methods'
method: bytes
rindex: sub _: start _: end
	"bytes.rindex(sub, start, end)."
	| r |
	r := self rfind: sub _: start _: end.
	(r @env0:= -1) ifTrue: [ValueError ___signal___: 'subsection not found'].
	^ r
%

category: 'Grail-Padding Methods'
method: bytes
___spaceByteString___
	"A length-1 bytes holding the ASCII space -- the default fill for the
	no-fill center/ljust/rjust forms, passed through the same (int-rejecting)
	fill validation as an explicit fill argument."
	| b |
	b := bytes ___new___: 1.
	b @env0:at: 1 put: 32.
	^ b
%

category: 'Grail-Padding Methods'
method: bytes
___byteValueOf___: aFill
	"The single byte value of a center/ljust/rjust fill argument.  CPython
	requires the fill to be a byte STRING of length 1 -- an int (or str) is a
	TypeError, unlike the fills accepted elsewhere (e.g. a bytes constructor)."
	(aFill isKindOf: ByteArray) ifFalse: [
		TypeError ___signal___: ('a bytes-like object of length 1 is required, not '''
			@env0:, (aFill @env1:__class__ @env1:__name__) @env0:, '''')].
	(aFill @env0:size @env0:= 1) ifFalse: [
		TypeError ___signal___: 'The fill character must be a byte string of length 1'].
	^ aFill @env0:at: 1
%

category: 'Grail-Padding Methods'
method: bytes
center: width _: fillchar
	"bytes.center(width, fillbyte) -- centered, padded with the given fill."
	| mySize result totalPadding leftPadding rightPadding fill |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [^ self @env0:copy].
	fill := self ___byteValueOf___: fillchar.
	totalPadding := width @env0:- mySize.
	leftPadding := totalPadding @env0:// 2.
	rightPadding := totalPadding @env0:- leftPadding.
	result := bytes ___new___: width.
	1 @env0:to: leftPadding do: [:i | result @env0:at: i put: fill].
	1 @env0:to: mySize do: [:i | result @env0:at: (leftPadding @env0:+ i) put: (self @env0:at: i)].
	1 @env0:to: rightPadding do: [:i | result @env0:at: (leftPadding @env0:+ (mySize @env0:+ i)) put: fill].
	^ result
%

category: 'Grail-String-like Methods'
method: bytes
ljust: width _: fillchar
	"bytes.ljust(width, fillbyte)."
	| mySize result padding fill |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [^ self @env0:copy].
	fill := self ___byteValueOf___: fillchar.
	padding := width @env0:- mySize.
	result := bytes ___new___: width.
	1 @env0:to: mySize do: [:i | result @env0:at: i put: (self @env0:at: i)].
	1 @env0:to: padding do: [:i | result @env0:at: (mySize @env0:+ i) put: fill].
	^ result
%

category: 'Grail-Padding Methods'
method: bytes
rjust: width _: fillchar
	"bytes.rjust(width, fillbyte)."
	| mySize result padding fill |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [^ self @env0:copy].
	fill := self ___byteValueOf___: fillchar.
	padding := width @env0:- mySize.
	result := bytes ___new___: width.
	1 @env0:to: padding do: [:i | result @env0:at: i put: fill].
	1 @env0:to: mySize do: [:i | result @env0:at: (padding @env0:+ i) put: (self @env0:at: i)].
	^ result
%

category: 'Grail-String-like Methods'
method: bytes
replace: old _: new _: count
	"bytes.replace(old, new, count) -- replace the first ``count''
	occurrences (count < 0 = all, count = 0 = none).  Splitting at the first
	``count'' separators then joining with ``new'' performs exactly ``count''
	replacements."
	(count @env0:< 0) ifTrue: [^ self replace: old _: new].
	(count @env0:= 0) ifTrue: [^ self @env0:copy].
	(old isKindOf: bytes) ifFalse: [TypeError ___signal___: 'first argument must be bytes'].
	(new isKindOf: bytes) ifFalse: [TypeError ___signal___: 'second argument must be bytes'].
	"Empty old: interleave new at the first ``count'' gaps (count > 0 here)."
	(old @env0:size @env0:= 0) ifTrue: [^ self ___replaceEmptyOld___: new count: count].
	"Guard against a gigabyte-scale result: at most ``count'' replacements happen."
	self ___checkReplaceResultLen___:
		(self @env0:size @env0:+ (((self count: old) @env0:min: count)
			@env0:* (new @env0:size @env0:- old @env0:size))).
	^ new join: (self split: old _: count)
%

category: 'Grail-Search Methods'
method: bytes
_replace: positional kw: kwargs
	"Varargs form of replace(old, new, count=-1) -- reached via the
	BoundMethod fallback (getattr(obj,'replace')(...)) when a ``count=''
	keyword is present (the fixed-arity replace:_: / replace:_:_: fast paths
	take positionals only)."

	| old new count |
	positional @env0:size @env0:< 2 ifTrue: [
		TypeError ___signal___: ('replace() takes at least 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	positional @env0:size @env0:> 3 ifTrue: [
		TypeError ___signal___: ('replace() takes at most 3 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	old := positional @env0:at: 1.
	new := positional @env0:at: 2.
	count := (positional @env0:size @env0:>= 3)
		@env0:ifTrue: [positional @env0:at: 3]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'count'])
			@env0:ifTrue: [kwargs @env0:at: 'count'] @env0:ifFalse: [-1]].
	^ self replace: old _: new _: count
%

category: 'Grail-Splitting Methods'
method: bytes
___splitWhitespace___
	"split() / split(None): split on runs of ASCII whitespace
	(HT LF VT FF CR SP), discarding empty parts (no leading/trailing/
	repeated-whitespace empty strings)."
	| parts current mySize |
	parts := list ___new___.
	current := bytes ___new___.
	mySize := self @env0:size.
	1 @env0:to: mySize do: [:i | | byte nb |
		byte := self @env0:at: i.
		(#(9 10 11 12 13 32) @env0:includes: byte)
			ifTrue: [(current @env0:size @env0:> 0) ifTrue: [parts append: current. current := bytes ___new___]]
			ifFalse: [nb := bytes ___new___: 1. nb @env0:at: 1 put: byte. current := current @env0:, nb]].
	(current @env0:size @env0:> 0) ifTrue: [parts append: current].
	^ parts
%

category: 'Grail-Splitting Methods'
method: bytes
___splitWhitespace___: maxsplit
	"split(None, maxsplit): at most maxsplit splits on runs of ASCII
	whitespace, from the LEFT.  The piece after the maxsplit-th token is kept
	whole -- its leading whitespace stripped, internal/trailing retained.
	maxsplit < 0 means unlimited."
	| parts size i splits ws |
	(maxsplit @env0:< 0) ifTrue: [^ self ___splitWhitespace___].
	parts := list ___new___.
	size := self @env0:size.
	ws := #(9 10 11 12 13 32).
	i := 1.
	splits := 0.
	[splits @env0:< maxsplit] @env0:whileTrue: [
		| start |
		[(i @env0:<= size) and: [ws @env0:includes: (self @env0:at: i)]] @env0:whileTrue: [i := i @env0:+ 1].
		(i @env0:> size) ifTrue: [^ parts].
		start := i.
		[(i @env0:<= size) and: [(ws @env0:includes: (self @env0:at: i)) @env0:not]] @env0:whileTrue: [i := i @env0:+ 1].
		parts append: (self @env0:copyFrom: start to: i @env0:- 1).
		splits := splits @env0:+ 1].
	"remainder: strip leading whitespace, keep the rest whole"
	[(i @env0:<= size) and: [ws @env0:includes: (self @env0:at: i)]] @env0:whileTrue: [i := i @env0:+ 1].
	(i @env0:<= size) ifTrue: [parts append: (self @env0:copyFrom: i to: size)].
	^ parts
%

category: 'Grail-Splitting Methods'
method: bytes
___rsplitWhitespace___: maxsplit
	"rsplit(None, maxsplit): like ___splitWhitespace___: but from the RIGHT --
	the piece before the maxsplit-th token (counting from the end) is kept
	whole (its trailing whitespace stripped, leading/internal retained).
	maxsplit < 0 means unlimited (identical to split)."
	| acc size i splits ws result done |
	(maxsplit @env0:< 0) ifTrue: [^ self ___splitWhitespace___].
	acc := OrderedCollection @env0:new.
	size := self @env0:size.
	ws := #(9 10 11 12 13 32).
	i := size.
	splits := 0.
	done := false.
	[(splits @env0:< maxsplit) and: [done @env0:not]] @env0:whileTrue: [
		[(i @env0:>= 1) and: [ws @env0:includes: (self @env0:at: i)]] @env0:whileTrue: [i := i @env0:- 1].
		(i @env0:< 1)
			ifTrue: [done := true]
			ifFalse: [ | stop |
				stop := i.
				[(i @env0:>= 1) and: [(ws @env0:includes: (self @env0:at: i)) @env0:not]] @env0:whileTrue: [i := i @env0:- 1].
				acc @env0:add: (self @env0:copyFrom: i @env0:+ 1 to: stop).
				splits := splits @env0:+ 1]].
	"left remainder: strip trailing whitespace, keep whole"
	[(i @env0:>= 1) and: [ws @env0:includes: (self @env0:at: i)]] @env0:whileTrue: [i := i @env0:- 1].
	(i @env0:>= 1) ifTrue: [acc @env0:add: (self @env0:copyFrom: 1 to: i)].
	result := list ___new___.
	acc @env0:reverseDo: [:p | result append: p].
	^ result
%

category: 'Grail-Splitting Methods'
method: bytes
split
	"bytes.split() -- split on runs of ASCII whitespace."
	^ self ___splitWhitespace___
%

category: 'Grail-Splitting Methods'
method: bytes
rsplit
	"bytes.rsplit() -- with no separator, identical to split()."
	^ self ___splitWhitespace___
%

category: 'Grail-Splitting Methods'
method: bytes
_split: positional kw: kwargs
	"Varargs form of split(sep=None, maxsplit=-1) -- reached via the
	BoundMethod fallback (getattr(obj,'split')(...)) when the fixed-arity
	fast path does not resolve.  sep=None splits on ASCII whitespace runs."

	| sep maxsplit |
	positional @env0:size @env0:> 2 ifTrue: [
		TypeError ___signal___: ('split() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	sep := (positional @env0:size @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'sep'])
			@env0:ifTrue: [kwargs @env0:at: 'sep'] @env0:ifFalse: [None]].
	maxsplit := (positional @env0:size @env0:>= 2)
		@env0:ifTrue: [positional @env0:at: 2]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'maxsplit'])
			@env0:ifTrue: [kwargs @env0:at: 'maxsplit'] @env0:ifFalse: [-1]].
	^ self split: sep _: maxsplit
%

category: 'Grail-Splitting Methods'
method: bytes
_rsplit: positional kw: kwargs
	"Varargs form of rsplit(sep=None, maxsplit=-1) -- see _split:kw:."

	| sep maxsplit |
	positional @env0:size @env0:> 2 ifTrue: [
		TypeError ___signal___: ('rsplit() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	sep := (positional @env0:size @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'sep'])
			@env0:ifTrue: [kwargs @env0:at: 'sep'] @env0:ifFalse: [None]].
	maxsplit := (positional @env0:size @env0:>= 2)
		@env0:ifTrue: [positional @env0:at: 2]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'maxsplit'])
			@env0:ifTrue: [kwargs @env0:at: 'maxsplit'] @env0:ifFalse: [-1]].
	^ self rsplit: sep _: maxsplit
%

category: 'Grail-Splitting Methods'
method: bytes
_splitlines: positional kw: kwargs
	"Varargs form of splitlines(keepends=False) -- see _split:kw:."

	| keepends |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('splitlines() takes at most 1 argument ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	keepends := (positional @env0:size @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'keepends'])
			@env0:ifTrue: [kwargs @env0:at: 'keepends'] @env0:ifFalse: [false]].
	^ self splitlines: keepends
%

category: 'Grail-Splitting Methods'
method: bytes
___boundedSlice___: start end: end
	"self[start:end] with CPython negative-index clamping -- shared by the
	bounded startswith/endswith forms."
	| size s e |
	size := self @env0:size.
	s := start. e := end.
	"CPython accepts None for start/end (== the default bound)."
	(s @env0:== None) ifTrue: [s := 0].
	(e @env0:== None) ifTrue: [e := size].
	s @env0:< 0 ifTrue: [s := (size @env0:+ s) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (size @env0:+ e) @env0:max: 0].
	e := e @env0:min: size. s := s @env0:min: size.
	e @env0:< s ifTrue: [e := s].
	^ self @env0:copyFrom: s @env0:+ 1 to: e
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
startswith: prefix _: start
	"bytes.startswith(prefix, start)."
	^ self startswith: prefix _: start _: self @env0:size
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
startswith: prefix _: start _: end
	"bytes.startswith(prefix, start, end) -- tested against the [start, end)
	slice."
	^ (self ___boundedSlice___: start end: end) startswith: prefix
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
endswith: suffix _: start
	"bytes.endswith(suffix, start)."
	^ self endswith: suffix _: start _: self @env0:size
%

category: 'Grail-Prefix/Suffix Methods'
method: bytes
endswith: suffix _: start _: end
	"bytes.endswith(suffix, start, end) -- tested against the [start, end)
	slice."
	^ (self ___boundedSlice___: start end: end) endswith: suffix
%

category: 'Grail-String-like Methods'
method: bytes
splitlines: keepends
	"bytes.splitlines(keepends) -- split at LF / CR / CRLF boundaries; when
	keepends is truthy the boundary bytes are retained in each line."
	| parts current size i keep |
	size := self @env0:size.
	keep := keepends ___isTruthy___.
	parts := list ___new___.
	current := bytes ___new___.
	i := 1.
	[i @env0:<= size] @env0:whileTrue: [ | byte nb crlf |
		byte := self @env0:at: i.
		(byte @env0:= 10) ifTrue: [
			keep ifTrue: [nb := bytes ___new___: 1. nb @env0:at: 1 put: 10. current := current @env0:, nb].
			parts append: current. current := bytes ___new___. i := i @env0:+ 1]
		ifFalse: [(byte @env0:= 13) ifTrue: [
			crlf := (i @env0:< size) and: [(self @env0:at: i @env0:+ 1) @env0:= 10].
			keep ifTrue: [
				nb := bytes ___new___: (crlf ifTrue: [2] ifFalse: [1]).
				nb @env0:at: 1 put: 13. crlf ifTrue: [nb @env0:at: 2 put: 10].
				current := current @env0:, nb].
			parts append: current. current := bytes ___new___.
			i := i @env0:+ (crlf ifTrue: [2] ifFalse: [1])]
		ifFalse: [
			nb := bytes ___new___: 1. nb @env0:at: 1 put: byte. current := current @env0:, nb.
			i := i @env0:+ 1]]].
	(current @env0:size @env0:> 0) ifTrue: [parts append: current].
	^ parts
%

category: 'Grail-String-like Methods'
method: bytes
_translate: positional kw: kwargs
	"Varargs/keyword form: translate(table) / translate(table, delete) /
	translate(table, delete=...).  CPython makes ``delete'' keyword-passable,
	and test_bytes uses that spelling."

	| table delete |
	positional @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'translate() takes at least 1 argument (0 given)'].
	positional @env0:size @env0:> 2 ifTrue: [
		TypeError ___signal___: ('translate() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	table := positional @env0:at: 1.
	delete := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			((kwargs @env0:isNil @env0:not) and: [kwargs @env0:includesKey: 'delete'])
				ifTrue: [kwargs @env0:at: 'delete']
				ifFalse: [nil]].
	delete @env0:isNil ifTrue: [^ self translate: table].
	^ self translate: table _: delete
%

category: 'Grail-String-like Methods'
method: bytes
translate: table _: delete
	"bytes.translate(table, delete) -- map each byte through the 256-entry
	table (None = identity) and drop every byte present in ``delete''."
	| mySize kept tableIsNone result |
	mySize := self @env0:size.
	tableIsNone := table @env0:== None.
	tableIsNone ifFalse: [
		(table isKindOf: bytes) ifFalse: [
			TypeError ___signal___: ('a bytes-like object is required, not '''
				@env0:, (bytes ___pyTypeNameOf___: table) @env0:, '''')].
		(table @env0:size @env0:= 256) ifFalse: [
			ValueError ___signal___: 'translation table must be 256 characters long']].
	"``delete'' is positional-only and must be bytes-like; None is a TypeError
	(CPython: b'x'.translate(None, None) raises), not an identity copy."
	(delete isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('a bytes-like object is required, not '''
			@env0:, (bytes ___pyTypeNameOf___: delete) @env0:, '''')].
	kept := OrderedCollection @env0:new.
	1 @env0:to: mySize do: [:i | | byte |
		byte := self @env0:at: i.
		(delete @env0:includes: byte) ifFalse: [
			kept @env0:add: (tableIsNone ifTrue: [byte] ifFalse: [table @env0:at: byte @env0:+ 1])]].
	result := self ___translateResultClass___ ___new___: kept @env0:size.
	1 @env0:to: kept @env0:size do: [:i | result @env0:at: i put: (kept @env0:at: i)].
	^ result
%

set compile_env: 0

! ___pythonValueAttrs___ is consulted through an ENV-0 ``respondsTo:'' in
! Object>>___pyAttrLoad___, so (like PythonInstance's copy) it must be an
! env-0 method -- an env-1 one is invisible there.
category: 'Grail-Introspection'
classmethod: bytes
___pythonValueAttrs___
	"Selectors ___pyAttrLoad___ must treat as VALUE attribute reads rather
	than BoundMethod wraps.  Without this, ``obj.__dict__'' on a bytes
	subclass answers a callable wrapper and ``.keys()'' on it fails."

	^ IdentitySet new
		add: #'__dict__';
		yourself
%
