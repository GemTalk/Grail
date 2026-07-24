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

	| result sourceClass materialized ba size |
	sourceClass := source @env0:class.

	"If source is an integer, create bytes of that size filled with zeros"
	sourceClass == SmallInteger ifTrue: [
		(source @env0:< 0) ifTrue: [
			ValueError ___signal___: 'negative count'
		].
		^ self ___new___: source
	].

	"If source is a string, raise TypeError (need encoding)"
	(source isKindOf: String) ifTrue: [
		TypeError ___signal___: 'string argument without an encoding'
	].

	"If source is any bytes-like object (bytes / bytearray / subclasses --
	all ByteArray, same byte-storage layout), make a copy.  Previously the
	bytearray path fell through to the default empty-bytes branch, which
	silently produced ``bytes(0)`` from any bytearray and broke
	re._compiler._optimize_charset's BIGCHARSET path (``charmap =
	bytes(charmap)`` lost all 256 bytes of the bitmap)."
	(source isKindOf: bytes) ifTrue: [
		result := self ___new___: source @env0:size.
		1 @env0:to: source @env0:size do: [:i |
			result @env0:at: i put: (source @env0:at: i)
		].
		^ result
	].

	"If source is a list, tuple, or array, convert elements to bytes"
	(sourceClass == list or: [
		sourceClass == tuple or: [
			sourceClass == Array
		]
	]) ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := self ___new___: size.
		1 @env0:to: size do: [:i |
			| elem val |
			elem := source @env0:at: i.
			val := elem.
			"Validate byte value (0-255)"
			((val @env0:< 0) or: [
				val @env0:> 255
			]) ifTrue: [
				ValueError ___signal___: 'bytes must be in range(0, 256)'
			].
			ba @env0:at: i put: val
		].
		^ ba
	].

	"If source is a range, convert to bytes"
	(sourceClass == Interval) ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := self ___new___: size.
		1 @env0:to: size do: [:i |
			| val |
			val := source @env0:at: i.
			"Validate byte value (0-255)"
			((val @env0:< 0) or: [
				val @env0:> 255
			]) ifTrue: [
				ValueError ___signal___: 'bytes must be in range(0, 256)'
			].
			ba @env0:at: i put: val
		].
		^ ba
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
		val := materialized @env0:at: i.
		((val @env0:< 0) or: [val @env0:> 255]) ifTrue: [
			ValueError ___signal___: 'bytes must be in range(0, 256)'].
		ba @env0:at: i put: val].
	^ ba
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
		TypeError ___signal___: 'encoding without a string argument'].
	encoded := source encode: enc _: errs.
	r := self ___new___: encoded @env0:size.
	1 @env0:to: encoded @env0:size do: [:i | r @env0:at: i put: (encoded @env0:at: i)].
	^ r
%

category: 'Grail-Constructors'
classmethod: bytes
__new__: source _: encoding
	"bytes(str, encoding) -- encode the string to bytes, self-typed (so a
	bytearray subclass instantiates itself), default 'strict' error policy."
	^ self ___encodeSourceToSelf___: source _: encoding _: 'strict'
%

category: 'Grail-Constructors'
classmethod: bytes
__new__: source _: encoding _: errors
	"bytes(str, encoding, errors) -- 3-arg form with an explicit error policy
	('strict' raises, 'ignore' drops un-encodable characters)."
	^ self ___encodeSourceToSelf___: source _: encoding _: errors
%

category: 'Grail-Constructors'
classmethod: bytes
fromhex: hexString
	"Create bytes from hex string (e.g., 'deadbeef'). Receiver is the
	class. In Python: bytes.fromhex('deadbeef')."

	| cleaned size ba |
	"Remove spaces from hex string"
	cleaned := hexString @env0:select: [:ch |
		(ch @env0:~= $ )
	].

	"Hex string must have even length"
	size := cleaned @env0:size.
	((size @env0:\\ 2) @env0:~= 0) ifTrue: [
		ValueError ___signal___: 'non-hexadecimal number found in fromhex() arg'
	].

	"Create bytes and fill with hex values"
	ba := self ___new___: (size @env0:// 2).
	1 @env0:to: size by: 2 do: [:i |
		| hexPair byte stream |
		hexPair := cleaned @env0:copyFrom: i to: (i @env0:+ 1).
		stream := ReadStream @env0:on: ('16r' @env0:, hexPair).
		byte := Number @env0:fromStream: stream.
		ba @env0:at: ((i @env0:+ 1) @env0:// 2) put: byte
	].

	^ ba
%

category: 'Grail-Translation Methods'
classmethod: bytes
maketrans: frm _: to
	"Create translation table (identity table with replacements)
	Note: This is actually a staticmethod in Python (doesn't receive cls),
	but Grail doesn't have a staticmethod: directive for hand-written methods."
	| frmSize toSize table |
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
__mod__: args
	"``bytes % args'' printf-style formatting (CPython 3.5+).  Grail
	delegates to the str formatter: decode the format spec as
	latin1 (round-trips arbitrary bytes), format using args, then
	re-encode the result.  Lossy for non-latin1 args but covers
	Werkzeug.http's cookie escape table (``b'\\%03o' % v'')
	which only uses ASCII format specs."

	| fmt formatted |
	fmt := self decode: 'latin1'.
	formatted := fmt __mod__: args.
	^ formatted encode: 'latin1'
%

category: 'Grail-Concatenation'
method: bytes
__add__: other
	"Concatenate bytes"
	| otherClass size1 size2 result |
	otherClass := other @env0:class.

	"Concatenate with any bytes-like object (bytes / bytearray / subclasses)."
	(other isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('can''t concat bytes to ' @env0:, otherClass)
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
__contains__: item
	"Python: `int in bytes` checks for that byte; `bytes/bytearray
	in bytes` does substring search.  Without the substring branch
	itsdangerous's `self.sep not in signed_value` (with sep = b'.')
	always reports false because indexOfSubCollection: only handles
	subcollection-against-subcollection."

	(item isKindOf: Integer) ifTrue: [
		^ self @env0:includes: item
	].
	((item isKindOf: ByteArray) @env0:or: [item isKindOf: CharacterCollection]) ifTrue: [
		| needle |
		needle := (item isKindOf: ByteArray)
			ifTrue: [item]
			ifFalse: [item @env0:asByteArray].
		^ (self @env0:indexOfSubCollection: needle) @env0:> 0
	].
	^ self @env0:includes: item
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
		TypeError ___signal___: ('byte indices must be integers or slices, not '
			@env0:, index @env0:class @env0:name @env0:asString)].
	size := self @env0:size.
	idx := index.

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

	"Validate count is an integer"
	(n @env0:class) == SmallInteger ifFalse: [
		TypeError ___signal___: 'can''t multiply sequence by non-int'
	].

	"If count <= 0, return empty bytes"
	(n @env0:<= 0) ifTrue: [
		^ bytes ___new___
	].

	size := self @env0:size.
	result := bytes ___new___: (size @env0:* n).
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
	"The ``b'...'''-style representation shared by bytes and bytearray repr.
	Matches CPython: single quotes, unless the data holds a single quote and
	no double quote (then double quotes); escape backslash, \t, \n, \r and the
	active quote; other non-printable bytes as LOWERCASE \xNN; printable ASCII
	(32-126) literally."
	| size hasSingle hasDouble quote out bs |
	size := self @env0:size.
	hasSingle := false. hasDouble := false.
	1 @env0:to: size do: [:i | | b |
		b := self @env0:at: i.
		(b @env0:= 39) ifTrue: [hasSingle := true].
		(b @env0:= 34) ifTrue: [hasDouble := true]].
	quote := (hasSingle @env0:and: [hasDouble @env0:not]) ifTrue: [34] ifFalse: [39].
	bs := Character @env0:codePoint: 92.
	out := WriteStream @env0:on: Unicode7 @env0:new.
	out @env0:nextPut: $b; @env0:nextPut: (Character @env0:codePoint: quote).
	1 @env0:to: size do: [:i | | b |
		b := self @env0:at: i.
		((b @env0:= 92) @env0:or: [b @env0:= quote]) ifTrue: [out @env0:nextPut: bs; @env0:nextPut: (Character @env0:codePoint: b)] ifFalse: [
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
	^ self center: width _: 32
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
	s @env0:>= e ifTrue: [^ 0].
	^ (self @env0:copyFrom: s @env0:+ 1 to: e) count: sub
%

category: 'Grail-Search Methods'
method: bytes
rfind: sub _: start _: end
	"bytes.rfind(sub, start, end) -- highest 0-based index of sub within
	[start, end), or -1.  re._constants.PatternError computes error
	column positions with it on byte patterns."

	| size s e subSize i |
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
count: sub
	"Count non-overlapping occurrences of sub"
	| subClass subSize mySize count i |
	subClass := sub @env0:class.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Count occurrences of single byte"
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

	"Empty sub always returns 0"
	(subSize == 0) ifTrue: [
		^ 0
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
	encodingStr := encoding.

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

	"Support Latin-1"
	((encodingStr @env0:= 'latin-1') or: [
		encodingStr @env0:= 'latin1'
	]) ifTrue: [
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
	ws := WriteStream @env0:on: Unicode16 @env0:new.
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
	ws := WriteStream @env0:on: Unicode16 @env0:new.
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
			(byte == 10) ifTrue: [  "Newline"
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

category: 'Grail-Search Methods'
method: bytes
find: sub
	"Find first occurrence of sub, return index or -1"
	| subClass subSize mySize i |
	subClass := sub @env0:class.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find first occurrence of single byte"
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

	"Empty iterable"
	((parts @env0:size) == 0) ifTrue: [
		^ bytes ___new___
	].

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

	"Build result"
	result := bytes ___new___: totalSize.
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
	^ self ljust: width _: 32
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
		| byte |
		byte := self @env0:at: start.
		(byte == 32) or: [
			(byte == 9) or: [
				(byte == 10) or: [
					byte == 13
				]
			]
		]
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
	| oldClass newClass oldSize newSize mySize parts i |
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

	"Empty old not allowed"
	(oldSize == 0) ifTrue: [
		^ self @env0:copy
	].

	"Split by old, then join with new"
	parts := self split: old.
	^ new join: parts
%

category: 'Grail-Search Methods'
method: bytes
rfind: sub
	"Find last occurrence of sub, return index or -1"
	| subClass subSize mySize i |
	subClass := sub @env0:class.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find last occurrence of single byte"
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
	^ self rjust: width _: 32
%

category: 'Grail-Splitting Methods'
method: bytes
rpartition: sep
	"Partition bytes at last occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize|
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
	"Split from right (same as split for now - full implementation would need maxsplit)"
	^ self split: sep
%

category: 'Grail-Splitting Methods'
method: bytes
rsplit: sep _: maxsplit
	"Split from right with maximum number of splits.  A None separator splits
	on runs of ASCII whitespace, from the right (honoring maxsplit)."
	| sepClass sepSize mySize parts positions i actualSplits lastEnd firstPart firstPartSize |
	(sep @env0:== None) ifTrue: [^ self ___rsplitWhitespace___: maxsplit].
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
			positions append: i
		].
		i := i @env0:- (1)
	].

	"Limit to maxsplit splits (take first maxsplit positions since we collected from right)"
	actualSplits := positions @env0:size.
	(actualSplits @env0:> maxsplit) ifTrue: [
		| newPositions |
		newPositions := list ___new___.
		1 @env0:to: maxsplit do: [:idx |
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
		| byte |
		byte := self @env0:at: end.
		(byte == 32) or: [
			(byte == 9) or: [
				(byte == 10) or: [
					byte == 13
				]
			]
		]
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
split: sep
	"Split bytes by separator, return list of bytes.  A ``None'' separator
	(``b.split(None)'') splits on runs of ASCII whitespace."
	| sepClass sepSize mySize parts currentPart i |
	(sep @env0:== None) ifTrue: [^ self ___splitWhitespace___].
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
split: sep _: maxsplit
	"Split bytes by separator with maximum number of splits.  A None separator
	splits on runs of ASCII whitespace (honoring maxsplit)."
	| sepClass sepSize mySize parts currentPart i splitCount match |
	(sep @env0:== None) ifTrue: [^ self ___splitWhitespace___: maxsplit].
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
		| byte |
		byte := self @env0:at: start.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13)"
		(byte == 32) or: [
			(byte == 9) or: [
				(byte == 10) or: [
					byte == 13
				]
			]
		]
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
		| byte |
		byte := self @env0:at: end.
		(byte == 32) or: [
			(byte == 9) or: [
				(byte == 10) or: [
					byte == 13
				]
			]
		]
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
	charsBytes := (chars isKindOf: ByteArray)
		ifTrue: [chars]
		ifFalse: [chars @env0:asByteArray].
	size := self @env0:size.
	end := size.
	[(end @env0:>= 1) @env0:and: [charsBytes @env0:includes: (self @env0:at: end)]]
		@env0:whileTrue: [end := end @env0:- 1].
	end @env0:= size ifTrue: [^ self].
	result := bytes @env0:___new___: end.
	1 @env0:to: end do: [:i | result @env0:at: i put: (self @env0:at: i)].
	^ result
%

category: 'Grail-String-like Methods'
method: bytes
lstrip: chars
	"``bytes.lstrip(chars)`` - drop leading bytes matching any byte
	in `chars`."

	| charsBytes size start result newSize |
	charsBytes := (chars isKindOf: ByteArray)
		ifTrue: [chars]
		ifFalse: [chars @env0:asByteArray].
	size := self @env0:size.
	start := 1.
	[(start @env0:<= size) @env0:and: [charsBytes @env0:includes: (self @env0:at: start)]]
		@env0:whileTrue: [start := start @env0:+ 1].
	start @env0:= 1 ifTrue: [^ self].
	newSize := size @env0:- start @env0:+ 1.
	result := bytes @env0:___new___: newSize.
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
	"Translate bytes using a 256-entry table (None = identity copy)."
	| tableSize mySize result |
	(table @env0:== None) ifTrue: [^ self @env0:copy].
	tableSize := table @env0:size.
	mySize := self @env0:size.

	"Table must be 256 bytes"
	(tableSize == 256) ifFalse: [
		ValueError ___signal___: 'translation table must be 256 characters long'
	].

	result := bytes ___new___: mySize.

	1 @env0:to: mySize do: [:i |
		| byte newByte |
		byte := self @env0:at: i.
		newByte := table @env0:at: (byte @env0:+ 1).
		result @env0:at: i put: newByte
	].

	^ result
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
	"Pad bytes with zeros on the left to fill width"
	| mySize result padding |
	mySize := self @env0:size.

	"If already wide enough, return copy"
	(width @env0:<= mySize) ifTrue: [
		^ self @env0:copy
	].

	"Pad with zeros"
	padding := width @env0:- (mySize).
	result := bytes ___new___: width.

	"Add zeros"
	1 @env0:to: padding do: [:i |
		result @env0:at: i put: 48  "ASCII '0'"
	].

	"Copy original"
	1 @env0:to: mySize do: [:i |
		result @env0:at: (padding @env0:+ i) put: (self @env0:at: i)
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
	e := e @env0:min: size. s := s @env0:min: size.
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
___byteValueOf___: aFill
	"The single byte value of a padding/fill argument: an int is used
	directly; a length-1 bytes/bytearray yields its one byte (CPython
	requires the fill to be a single byte)."
	(aFill isKindOf: SmallInteger) ifTrue: [^ aFill].
	(aFill @env0:size @env0:= 1) ifFalse: [
		TypeError ___signal___: 'fill character must be a byte or a bytes of length 1'].
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
	(old @env0:size @env0:= 0) ifTrue: [^ self @env0:copy].
	^ new join: (self split: old _: count)
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
translate: table _: delete
	"bytes.translate(table, delete) -- map each byte through the 256-entry
	table (None = identity) and drop every byte present in ``delete''."
	| mySize kept tableIsNone result |
	mySize := self @env0:size.
	tableIsNone := table @env0:== None.
	tableIsNone ifFalse: [
		(table @env0:size @env0:= 256) ifFalse: [
			ValueError ___signal___: 'translation table must be 256 characters long']].
	kept := OrderedCollection @env0:new.
	1 @env0:to: mySize do: [:i | | byte |
		byte := self @env0:at: i.
		(delete @env0:includes: byte) ifFalse: [
			kept @env0:add: (tableIsNone ifTrue: [byte] ifFalse: [table @env0:at: byte @env0:+ 1])]].
	result := bytes ___new___: kept @env0:size.
	1 @env0:to: kept @env0:size do: [:i | result @env0:at: i put: (kept @env0:at: i)].
	^ result
%

set compile_env: 0
