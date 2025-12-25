! ===============================================================================
! ByteArray Methods (Python 'bytes' type)
! ===============================================================================
! This file contains Python method implementations for ByteArray
! to make it behave like Python's bytes type.
!
! Python's bytes is an immutable sequence of bytes (integers 0-255).
! ByteArray in GemStone is mutable, but we enforce immutability through Python methods.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytes
expectvalue /Metaclass3
doit
bytes removeAllMethods: 2.
bytes class removeAllMethods: 2.
%

! ------------------- Class methods for bytes
set compile_env: 2

category: 'Python-Constructors'
classmethod: bytes
__new__: cls
	"bytes() - create empty bytes"

	^ cls ___new___
%

category: 'Python-Constructors'
classmethod: bytes
__new__: cls _: source
	"bytes(source) - create bytes from various sources"

	| result sourceClass |
	sourceClass := source ___class___.

	"If source is an integer, create bytes of that size filled with zeros"
	sourceClass == SmallInteger ifTrue: [
		(source ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'negative count'
		].
		^ cls ___new___: source
	].

	"If source is a string, raise TypeError (need encoding)"
	(source ___isKindOf___: String) ifTrue: [
		TypeError ___signal___: 'string argument without an encoding'
	].

	"If source is bytes, make a copy"
	(sourceClass == bytes) ifTrue: [
		result := cls ___new___: (source ___size___).
		1 ___to___: source ___size___ do: [:i |
			result ___at___: i put: (source ___at___: i)
		].
		^ result
	].

	"If source is a list, tuple, or array, convert elements to bytes"
	((sourceClass ___eq___: OrderedCollection) or: [
		(sourceClass ___eq___: InvariantArray) or: [
			sourceClass ___eq___: Array
		]
	]) ifTrue: [
		| ba size |
		size := source ___size___.
		ba := cls ___new___: size.
		1 ___to___: size do: [:i |
			| elem val |
			elem := source ___at___: i.
			val := elem.
			"Validate byte value (0-255)"
			((val ___lt___: 0) or: [
				val ___gt___: 255
			]) ifTrue: [
				ValueError ___signal___: 'bytes must be in range(0, 256)'
			].
			ba ___at___: i put: val
		].
		^ ba
	].

	"If source is a range, convert to bytes"
	(sourceClass ___eq___: Interval) ifTrue: [
		| ba size |
		size := source ___size___.
		ba := cls ___new___: size.
		1 ___to___: size do: [:i |
			| val |
			val := source ___at___: i.
			"Validate byte value (0-255)"
			((val ___lt___: 0) or: [
				val ___gt___: 255
			]) ifTrue: [
				ValueError ___signal___: 'bytes must be in range(0, 256)'
			].
			ba ___at___: i put: val
		].
		^ ba
	].

	"Default: empty bytes"
	^ cls ___new___
%

category: 'Python-Constructors'
classmethod: bytes
__new__: cls _: source _: encoding
	"bytes(string, encoding) - encode string to bytes"

	| result sourceClass encodingStr |
	sourceClass := source ___class___.

	"Source must be a string (String or Unicode7)"
	((source ___isKindOf___: String) not) ifTrue: [
		TypeError ___signal___: 'encoding without a string argument'
	].

	"Get encoding as a Smalltalk string"
	encodingStr := encoding.

	"Support ASCII encoding"
	(encodingStr ___eq___: 'ascii') ifTrue: [
		| ba size |
		size := source ___size___.
		ba := cls ___new___: size.
		1 ___to___: size do: [:i |
			| char codePoint |
			char := source ___at___: i.
			codePoint := char ___codePoint___.
			(codePoint ___gt___: 127) ifTrue: [
				UnicodeEncodeError ___signal___: 'ordinal not in range(128)'
			].
			ba ___at___: i put: codePoint
		].
		^ ba
	].

	"Support UTF-8 encoding"
	((encodingStr ___eq___: 'utf-8') or: [
		encodingStr ___eq___: 'utf8'
	]) ifTrue: [
		| utf8Bytes |
		utf8Bytes := source perform: #encodeAsUTF8 env: 0.
		result := cls ___new___: (utf8Bytes ___size___).
		1 ___to___: utf8Bytes ___size___ do: [:i |
			result ___at___: i put: (utf8Bytes ___at___: i)
		].
		^ result
	].

	"Support Latin-1 encoding"
	((encodingStr ___eq___: 'latin-1') or: [
		encodingStr ___eq___: 'latin1'
	]) ifTrue: [
		| ba size |
		size := source ___size___.
		ba := cls ___new___: size.
		1 ___to___: size do: [:i |
			| char codePoint |
			char := source ___at___: i.
			codePoint := char ___codePoint___.
			(codePoint ___gt___: 255) ifTrue: [
				UnicodeEncodeError ___signal___: 'ordinal not in range(256)'
			].
			ba ___at___: i put: codePoint
		].
		^ ba
	].

	"Unsupported encoding"
	LookupError ___signal___: ('unknown encoding: ' ___concat___: encodingStr)
%

category: 'Python-Constructors'
classmethod: bytes
fromhex: cls _: hexString
	"Create bytes from hex string (e.g., 'deadbeef')"

	| cleaned size ba |
	"Remove spaces from hex string"
	cleaned := hexString ___select___: [:ch |
		(ch ___ne___: $ )
	].

	"Hex string must have even length"
	size := cleaned ___size___.
	((size ___modulo___: 2) ___ne___: 0) ifTrue: [
		ValueError ___signal___: 'non-hexadecimal number found in fromhex() arg'
	].

	"Create bytes and fill with hex values"
	ba := cls ___new___: (size ___divideInteger___: 2).
	1 ___to___: size by: 2 do: [:i |
		| hexPair byte stream |
		hexPair := cleaned ___copyFrom___: i to: (i ___plus___: 1).
		stream := ReadStream ___on___: ('16r' ___concat___: hexPair).
		byte := Number ___fromStream___: stream.
		ba ___at___: ((i ___plus___: 1) ___divideInteger___: 2) put: byte
	].

	^ ba
%

! ------------------- Instance methods for bytes
category: 'Python-Type'
method: bytes
__class__
	"Return the Python type for bytes"
	^ bytes
%

category: 'Python-Sequence Protocol'
method: bytes
__len__
	"Return the number of bytes"
	^ self ___size___
%

category: 'Python-Sequence Protocol'
method: bytes
__getitem__: index
	"Get byte at index (0-based, supports negative indices)"
	| idx size |
	size := self ___size___.
	idx := index.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Check bounds"
	((idx ___lt___: 0) or: [
		idx ___ge___: size
	]) ifTrue: [
		IndexError ___signal___: 'index out of range'
	].

	"Return byte value (convert to 1-based index)"
	^ self ___at___: (idx ___plus___: 1)
%

category: 'Python-Sequence Protocol'
method: bytes
__setitem__: index _: value
	"bytes is immutable - raise TypeError"
	TypeError ___signal___: '''bytes'' object does not support item assignment'
%

category: 'Python-Sequence Protocol'
method: bytes
__contains__: item
	"Check if byte value is in bytes"
	| size |
	size := self ___size___.
	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		(byte ___eq___: item) ifTrue: [
			^ true
		]
	].
	^ false
%

category: 'Python-Comparison'
method: bytes
__eq__: other
	"Compare bytes for equality"
	| otherClass size |
	otherClass := other ___class___.

	"Can only concatenate with bytes or bytearray"
	((otherClass ___eq___: bytes) or: [
		otherClass ___eq___: bytearray
	]) ifFalse: [
		^ false
	].

	"Check sizes"
	size := self ___size___.
	(size ___eq___: other ___size___) ifFalse: [
		^ false
	].

	"Compare each byte"
	1 ___to___: size do: [:i |
		| myByte otherByte |
		myByte := self ___at___: i.
		otherByte := other ___at___: i.
		(myByte ___eq___: otherByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Python-Comparison'
method: bytes
__ne__: other
	"Compare bytes for inequality"
	| result |
	result := self perform: #__eq__: env: 2 withArguments: {other}.
	^ result ___not___
%

category: 'Python-Hashing'
method: bytes
__hash__
	"Return hash of bytes"
	^ self ___hash___
%

category: 'Python-String Representation'
method: bytes
__repr__
	"Return string representation of bytes (e.g., b'hello')"
	| result size |
	result := 'b'''.
	size := self ___size___.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.

		"Printable ASCII characters (32-126)"
		((byte ___ge___: 32) and: [
			byte ___le___: 126
		]) ifTrue: [
			"Special cases that need escaping"
			(byte ___eq___: 39) ifTrue: [  "single quote"
				result := result ___concat___: '\'''
			] ifFalse: [
				(byte ___eq___: 92) ifTrue: [  "backslash"
					result := result ___concat___: '\\'
				] ifFalse: [
					| char |
					char := Character ___codePoint___: byte.
					result := result ___concat___: (char ___asString___)
				]
			]
		] ifFalse: [
			"Non-printable: use \xNN format"
			| hex |
			hex := byte ___printStringRadix___: 16.
			((hex ___size___) ___eq___: 1) ifTrue: [
				hex := '0' ___concat___: hex
			].
			result := result ___concat___: ('\x' ___concat___: hex)
		]
	].

	result := result ___concat___: ''''.
	^ result
%

category: 'Python-Concatenation'
method: bytes
__add__: other
	"Concatenate bytes"
	| otherClass size1 size2 result |
	otherClass := other ___class___.

	"Can only concatenate with bytes or bytearray"
	((otherClass ___eq___: bytes) or: [
		otherClass ___eq___: bytearray
	]) ifFalse: [
		TypeError ___signal___: ('can''t concat bytes to ' ___concat___: otherClass)
	].

	size1 := self ___size___.
	size2 := other ___size___.
	result := (self ___class___) ___new___: (size1 ___plus___: size2).

	"Copy self"
	1 ___to___: size1 do: [:i |
		result ___at___: i put: (self ___at___: i)
	].

	"Copy other"
	1 ___to___: size2 do: [:i |
		result ___at___: (size1 ___plus___: i) put: (other ___at___: i)
	].

	^ result
%

category: 'Python-Concatenation'
method: bytes
__mul__: count
	"Repeat bytes count times"
	| n size result offset |
	n := count.

	"Validate count is an integer"
	(n ___class___) == SmallInteger ifFalse: [
		TypeError ___signal___: 'can''t multiply sequence by non-int'
	].

	"If count <= 0, return empty bytes"
	(n ___le___: 0) ifTrue: [
		^ bytes ___new___
	].

	size := self ___size___.
	result := bytes ___new___: (size ___times___: n).
	offset := 0.

	1 ___to___: n do: [:rep |
		1 ___to___: size do: [:i |
			result ___at___: (offset ___plus___: i) put: (self ___at___: i)
		].
		offset := offset ___plus___: size
	].

	^ result
%

category: 'Python-Search Methods'
method: bytes
count: sub
	"Count non-overlapping occurrences of sub"
	| subClass subSize mySize count i |
	subClass := sub ___class___.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Count occurrences of single byte"
		count := 0.
		mySize := self ___size___.
		1 ___to___: mySize do: [:idx |
			| byte |
			byte := self ___at___: idx.
			(byte ___eq___: sub) ifTrue: [
				count := count ___plus___: 1
			]
		].
		^ count
	].

	"sub must be bytes"
	subClass == bytes ifFalse: [
		TypeError ___signal___: 'argument should be bytes or integer'
	].

	subSize := sub ___size___.
	mySize := self ___size___.

	"Empty sub always returns 0"
	(subSize ___eq___: 0) ifTrue: [
		^ 0
	].

	count := 0.
	i := 1.

	[i ___le___: (mySize ___minus___: (subSize ___minus___: 1))] ___whileTrue___: [
		| match |
		match := true.
		1 ___to___: subSize do: [:j |
			| myByte subByte |
			myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
			subByte := sub ___at___: j.
			(myByte ___eq___: subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			count := count ___plus___: 1.
			i := i ___plus___: subSize
		] ifFalse: [
			i := i ___plus___: 1
		]
	].

	^ count
%

category: 'Python-Search Methods'
method: bytes
find: sub
	"Find first occurrence of sub, return index or -1"
	| subClass subSize mySize i w x y z |
	subClass := sub ___class___.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find first occurrence of single byte"
		mySize := self ___size___.
		1 ___to___: mySize do: [:idx |
			| byte |
			byte := self ___at___: idx.
			(byte ___eq___: sub) ifTrue: [
				^ idx ___minus___: (1)  "Convert to 0-based"
			]
		].
		^ -1
	].

	"sub must be bytes"
	w := bytearray.
	x := subClass == bytes.
	y := subClass == bytearray.
	z := x or: [y].
	(subClass == bytes or: [subClass == bytearray]) ifFalse: [
		TypeError ___signal___: 'argument should be bytes, bytearray or int'
	].

	subSize := sub ___size___.
	mySize := self ___size___.

	"Empty sub always returns 0"
	(subSize ___eq___: 0) ifTrue: [
		^ 0
	].

	i := 1.
	[i ___le___: (mySize ___minus___: (subSize ___minus___: 1))] ___whileTrue___: [
		| match |
		match := true.
		1 ___to___: subSize do: [:j |
			| myByte subByte |
			myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
			subByte := sub ___at___: j.
			(myByte ___eq___: subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			^ i ___minus___: (1)  "Convert to 0-based"
		].
		i := i ___plus___: 1
	].

	^ -1
%

category: 'Python-Search Methods'
method: bytes
index: sub
	"Find first occurrence of sub, raise ValueError if not found"
	| result |
	result := self perform: #find: env: 2 withArguments: {sub}.
	(result ___eq___: -1) ifTrue: [
		ValueError ___signal___: 'subsection not found'
	].
	^ result
%

category: 'Python-Search Methods'
method: bytes
rfind: sub
	"Find last occurrence of sub, return index or -1"
	| subClass subSize mySize i |
	subClass := sub ___class___.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find last occurrence of single byte"
		mySize := self ___size___.
		mySize ___to___: 1 by: -1 do: [:idx |
			| byte |
			byte := self ___at___: idx.
			(byte ___eq___: sub) ifTrue: [
				^ idx ___minus___: (1)  "Convert to 0-based"
			]
		].
		^ -1
	].

	"sub must be bytes"
	(subClass == bytes or: [subClass == bytearray]) ifFalse: [
		TypeError ___signal___: 'argument should be bytes, bytearray or int'
	].

	subSize := sub ___size___.
	mySize := self ___size___.

	"Empty sub always returns size"
	(subSize ___eq___: 0) ifTrue: [
		^ mySize
	].

	i := mySize ___minus___: (subSize ___minus___: 1).
	[i ___ge___: 1] ___whileTrue___: [
		| match |
		match := true.
		1 ___to___: subSize do: [:j |
			| myByte subByte |
			myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
			subByte := sub ___at___: j.
			(myByte ___eq___: subByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			^ i ___minus___: (1)  "Convert to 0-based"
		].
		i := i ___minus___: (1)
	].

	^ -1
%

category: 'Python-Search Methods'
method: bytes
rindex: sub
	"Find last occurrence of sub, raise ValueError if not found"
	| result |
	result := self perform: #rfind: env: 2 withArguments: {sub}.
	(result ___eq___: -1) ifTrue: [
		ValueError ___signal___: 'subsection not found'
	].
	^ result
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
startswith: prefix
	"Check if bytes starts with prefix"
	| prefixClass prefixSize mySize |
	prefixClass := prefix ___class___.

	"prefix must be bytes"
	(prefixClass ___eq___: bytes) ifFalse: [
		TypeError ___signal___: 'argument should be bytes'
	].

	prefixSize := prefix ___size___.
	mySize := self ___size___.

	"If prefix is longer, can't match"
	(prefixSize ___gt___: mySize) ifTrue: [
		^ false
	].

	"Compare each byte"
	1 ___to___: prefixSize do: [:i |
		| myByte prefixByte |
		myByte := self ___at___: i.
		prefixByte := prefix ___at___: i.
		(myByte ___eq___: prefixByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
endswith: suffix
	"Check if bytes ends with suffix"
	| suffixClass suffixSize mySize offset |
	suffixClass := suffix ___class___.

	"suffix must be bytes"
	(suffixClass ___eq___: bytes) ifFalse: [
		TypeError ___signal___: 'argument should be bytes'
	].

	suffixSize := suffix ___size___.
	mySize := self ___size___.

	"If suffix is longer, can't match"
	(suffixSize ___gt___: mySize) ifTrue: [
		^ false
	].

	offset := mySize ___minus___: (suffixSize).

	"Compare each byte"
	1 ___to___: suffixSize do: [:i |
		| myByte suffixByte |
		myByte := self ___at___: (offset ___plus___: i).
		suffixByte := suffix ___at___: i.
		(myByte ___eq___: suffixByte) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
removeprefix: prefix
	"Remove prefix if present, otherwise return copy"
	| hasPrefix prefixSize mySize result |
	hasPrefix := self perform: #startswith: env: 2 withArguments: {prefix}.
	hasPrefix ifFalse: [
		^ self ___copy___
	].

	prefixSize := prefix ___size___.
	mySize := self ___size___.
	result := bytes ___new___: (mySize ___minus___: prefixSize).

	1 ___to___: (mySize ___minus___: prefixSize) do: [:i |
		result ___at___: i put: (self ___at___: (prefixSize ___plus___: i))
	].

	^ result
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
removesuffix: suffix
	"Remove suffix if present, otherwise return copy"
	| hasSuffix suffixSize mySize result |
	hasSuffix := self perform: #endswith: env: 2 withArguments: {suffix}.
	hasSuffix ifFalse: [
		^ self ___copy___
	].

	suffixSize := suffix ___size___.
	mySize := self ___size___.
	result := bytes ___new___: (mySize ___minus___: suffixSize).

	1 ___to___: (mySize ___minus___: suffixSize) do: [:i |
		result ___at___: i put: (self ___at___: i)
	].

	^ result
%

category: 'Python-Testing Methods'
method: bytes
isascii
	"Return True if the sequence is empty or all bytes are ASCII (0-127)"

	| size |
	size := self ___size___.
	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"ASCII bytes are in the range 0-0x7F (0-127)"
		(byte ___gt___: 127) ifTrue: [
			^ false
		]
	].
	^ true
%

category: 'Python-String-like Methods'
method: bytes
upper
	"Return uppercase version of bytes"

	| result size |
	size := self ___size___.
	result := (self ___class___) ___new___: size.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Convert lowercase ASCII (97-122) to uppercase (65-90)"
		((byte ___ge___: 97) and: [
			byte ___le___: 122
		]) ifTrue: [
			byte := byte ___minus___: (32)
		].
		result ___at___: i put: byte
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
lower
	"Return lowercase version of bytes"

	| result size |
	size := self ___size___.
	result := bytes ___new___: size.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Convert uppercase ASCII (65-90) to lowercase (97-122)"
		((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) ifTrue: [
			byte := byte ___plus___: 32
		].
		result ___at___: i put: byte
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
capitalize
	"Return capitalized version (first byte uppercase, rest lowercase)"

	| result size firstByte |
	size := self ___size___.
	(size ___eq___: 0) ifTrue: [
		^ bytes ___new___
	].

	result := self perform: #lower env: 2.

	"Capitalize first byte if it's a lowercase letter"
	firstByte := result ___at___: 1.
	((firstByte ___ge___: 97) and: [
		firstByte ___le___: 122
	]) ifTrue: [
		result ___at___: 1 put: (firstByte ___minus___: (32))
	].

	^ result
%

category: 'Python-Encoding/Decoding'
method: bytes
decode
	"Decode bytes to string using UTF-8"
	^ self perform: #decode: env: 2 withArguments: {'utf-8'}
%

category: 'Python-Encoding/Decoding'
method: bytes
decode: encoding
	"Decode bytes to string using specified encoding"

	| encodingStr |
	encodingStr := encoding.

	"Support UTF-8"
	((encodingStr ___eq___: 'utf-8') or: [
		encodingStr ___eq___: 'utf8'
	]) ifTrue: [
		^ self perform: #decodeFromUTF8 env: 0
	].

	"Support ASCII"
	(encodingStr ___eq___: 'ascii') ifTrue: [
		| result size |
		size := self ___size___.
		result := Unicode7 ___new___: size.
		1 ___to___: size do: [:i |
			| byte char |
			byte := self ___at___: i.
			(byte ___gt___: 127) ifTrue: [
				UnicodeDecodeError ___signal___: 'ordinal not in range(128)'
			].
			char := Character ___codePoint___: byte.
			result ___at___: i put: char
		].
		^ result
	].

	"Support Latin-1"
	((encodingStr ___eq___: 'latin-1') or: [
		encodingStr ___eq___: 'latin1'
	]) ifTrue: [
		| result size |
		size := self ___size___.
		result := Unicode7 ___new___: size.
		1 ___to___: size do: [:i |
			| byte char |
			byte := self ___at___: i.
			char := Character ___codePoint___: byte.
			result ___at___: i put: char
		].
		^ result
	].

	"Unsupported encoding"
	LookupError ___signal___: ('unknown encoding: ' ___concat___: encodingStr)
%

category: 'Python-Encoding/Decoding'
method: bytes
hex
	"Return hex representation of bytes"
	| result size |
	result := ''.
	size := self ___size___.

	1 ___to___: size do: [:i |
		| byte hexStr |
		byte := self ___at___: i.
		hexStr := byte ___printStringRadix___: 16.
		"Pad with leading zero if needed"
		((hexStr ___size___) ___eq___: 1) ifTrue: [
			hexStr := '0' ___concat___: hexStr
		].
		result := result ___concat___: hexStr
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
strip
	"Remove leading and trailing whitespace bytes"
	| start end size result newSize |

	size := self ___size___.
	(size ___eq___: 0) ifTrue: [
		^ bytes ___new___
	].

	"Find first non-whitespace"
	start := 1.
	[(start ___le___: size) and: [
		| byte |
		byte := self ___at___: start.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13)"
		(byte ___eq___: 32) or: [
			(byte ___eq___: 9) or: [
				(byte ___eq___: 10) or: [
					byte ___eq___: 13
				]
			]
		]
	]] ___whileTrue___: [
		start := start ___plus___: 1
	].

	"All whitespace"
	(start ___gt___: size) ifTrue: [
		^ bytes ___new___
	].

	"Find last non-whitespace"
	end := size.
	[(end ___ge___: start) and: [
		| byte |
		byte := self ___at___: end.
		(byte ___eq___: 32) or: [
			(byte ___eq___: 9) or: [
				(byte ___eq___: 10) or: [
					byte ___eq___: 13
				]
			]
		]
	]] ___whileTrue___: [
		end := end ___minus___: (1)
	].

	"Extract substring"
	newSize := end ___minus___: (start ___minus___: 1).
	result := bytes ___new___: newSize.
	1 ___to___: newSize do: [:i |
		result ___at___: i put: (self ___at___: (start ___plus___: (i ___minus___: (1))))
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
lstrip
	"Remove leading whitespace bytes"
	| start size result newSize |
	size := self ___size___.
	(size ___eq___: 0) ifTrue: [
		^ bytes ___new___
	].

	"Find first non-whitespace"
	start := 1.
	[(start ___le___: size) and: [
		| byte |
		byte := self ___at___: start.
		(byte ___eq___: 32) or: [
			(byte ___eq___: 9) or: [
				(byte ___eq___: 10) or: [
					byte ___eq___: 13
				]
			]
		]
	]] ___whileTrue___: [
		start := start ___plus___: 1
	].

	"All whitespace"
	(start ___gt___: size) ifTrue: [
		^ bytes ___new___
	].

	"Extract substring"
	newSize := size ___minus___: (start ___minus___: 1).
	result := bytes ___new___: newSize.
	1 ___to___: newSize do: [:i |
		result ___at___: i put: (self ___at___: (start ___plus___: (i ___minus___: (1))))
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
rstrip
	"Remove trailing whitespace bytes"
	| end size result |
	size := self ___size___.
	(size ___eq___: 0) ifTrue: [
		^ bytes ___new___
	].

	"Find last non-whitespace"
	end := size.
	[(end ___ge___: 1) and: [
		| byte |
		byte := self ___at___: end.
		(byte ___eq___: 32) or: [
			(byte ___eq___: 9) or: [
				(byte ___eq___: 10) or: [
					byte ___eq___: 13
				]
			]
		]
	]] ___whileTrue___: [
		end := end ___minus___: (1)
	].

	"All whitespace"
	(end ___lt___: 1) ifTrue: [
		^ bytes ___new___
	].

	"Extract substring"
	result := bytes ___new___: end.
	1 ___to___: end do: [:i |
		result ___at___: i put: (self ___at___: i)
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
split: sep
	"Split bytes by separator, return list of bytes"
	| sepClass sepSize mySize parts currentPart i |
	sepClass := sep ___class___.

	"sep must be bytes"
	(sepClass ___eq___: bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep ___size___.
	mySize := self ___size___.

	"Empty separator not allowed"
	(sepSize ___eq___: 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	parts := OrderedCollection ___new___.
	currentPart := bytes ___new___.
	i := 1.

	[i ___le___: mySize] ___whileTrue___: [
		| match |
		match := true.

		"Check if separator matches at current position"
		((i ___plus___: (sepSize ___minus___: (1))) perform: #<= env: 0  withArguments: {mySize}) ifTrue: [
			1 ___to___: sepSize do: [:j |
				| myByte sepByte |
				myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
				sepByte := sep ___at___: j.
				(myByte ___eq___: sepByte) ifFalse: [
					match := false
				]
			]
		] ifFalse: [
			match := false
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts ___add___: currentPart.
			currentPart := bytes ___new___.
			i := i ___plus___: sepSize
		] ifFalse: [
			"Add byte to current part"
			| byte newByte |
			byte := self ___at___: i.
			newByte := bytes ___new___: 1.
			newByte ___at___: 1 put: byte.
			currentPart := currentPart ___concat___: newByte.
			i := i ___plus___: 1
		]
	].

	"Add final part"
	parts ___add___: currentPart.

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
split: sep _: maxsplit
	"Split bytes by separator with maximum number of splits"
	| sepClass sepSize mySize parts currentPart i splitCount match |
	sepClass := sep ___class___.

	"sep must be bytes"
	(sepClass == bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep ___size___.
	mySize := self ___size___.

	"Empty separator not allowed"
	(sepSize ___eq___: 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	"If maxsplit is -1 or < 0, do unlimited split"
	(maxsplit ___lt___: 0) ifTrue: [
		^ self perform: #split: env: 2 withArguments: {sep}
	].

	parts := OrderedCollection ___new___.
	currentPart := bytes ___new___.
	i := 1.
	splitCount := 0.

	[i ___le___: mySize] ___whileTrue___: [
		match := true.

		"Check if we've reached maxsplit"
		(splitCount ___ge___: maxsplit) ifTrue: [
			match := false
		] ifFalse: [
			"Check if separator matches at current position"
			((i ___plus___: (sepSize ___minus___: 1)) ___le___: mySize) ifTrue: [
				1 ___to___: sepSize do: [:j |
					| myByte sepByte |
					myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
					sepByte := sep ___at___: j.
					(myByte ___eq___: sepByte) ifFalse: [
						match := false
					]
				]
			] ifFalse: [
				match := false
			]
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts ___add___: currentPart.
			currentPart := bytes ___new___.
			i := i ___plus___: sepSize.
			splitCount := splitCount ___plus___: 1
		] ifFalse: [
			"Add byte to current part"
			| byte newByte |
			byte := self ___at___: i.
			newByte := bytes ___new___: 1.
			newByte ___at___: 1 put: byte.
			currentPart := currentPart ___concat___: newByte.
			i := i ___plus___: 1
		]
	].

	"Add final part"
	parts ___add___: currentPart.

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
join: iterable
	"Join iterable of bytes with self as separator"
	| iterClass parts totalSize result offset |
	iterClass := iterable ___class___.

	"iterable must be list or tuple"
		((iterClass ___eq___: OrderedCollection) or: [
		iterClass ___eq___: InvariantArray
	]) ifFalse: [
		TypeError ___signal___: 'can only join an iterable'
	].

	parts := iterable.

	"Empty iterable"
	((parts ___size___) ___eq___: 0) ifTrue: [
		^ bytes ___new___
	].

	"Calculate total size"
	totalSize := 0.
	1 ___to___: parts ___size___ do: [:i |
		| part |
		part := parts ___at___: i.
		totalSize := totalSize ___plus___: part ___size___.
		(i ___lt___: parts ___size___) ifTrue: [
			totalSize := totalSize ___plus___: self ___size___
		]
	].

	"Build result"
	result := bytes ___new___: totalSize.
	offset := 0.

	1 ___to___: parts ___size___ do: [:i |
		| part partSize |
		part := parts ___at___: i.
		partSize := part ___size___.

		"Copy part"
		1 ___to___: partSize do: [:j |
			result ___at___: (offset ___plus___: j) put: (part ___at___: j)
		].
		offset := offset ___plus___: partSize.

		"Add separator (except after last part)"
		(i ___lt___: parts ___size___) ifTrue: [
			| sepSize |
			sepSize := self ___size___.
			1 ___to___: sepSize do: [:j |
				result ___at___: (offset ___plus___: j) put: (self ___at___: j)
			].
			offset := offset ___plus___: sepSize
		]
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
replace: old _: new
	"Replace all occurrences of old with new"
	| oldClass newClass oldSize newSize mySize parts i |
	oldClass := old ___class___.
	newClass := new ___class___.

	"old and new must be bytes"
	(oldClass ___eq___: bytes) ifFalse: [
		TypeError ___signal___: 'first argument must be bytes'
	].
	(newClass ___eq___: bytes) ifFalse: [
		TypeError ___signal___: 'second argument must be bytes'
	].

	oldSize := old ___size___.
	newSize := new ___size___.
	mySize := self ___size___.

	"Empty old not allowed"
	(oldSize ___eq___: 0) ifTrue: [
		^ self ___copy___
	].

	"Split by old, then join with new"
	parts := self perform: #split: env: 2 withArguments: {old}.
	^ new perform: #join: env: 2 withArguments: {parts}
%

category: 'Python-Testing Methods'
method: bytes
isalpha
	"Check if all bytes are alphabetic ASCII (A-Z, a-z)"
	| size |
	size := self ___size___.

	"Empty bytes returns False"
	(size ___eq___: 0) ifTrue: [
		^ false
	].

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Check if A-Z (65-90) or a-z (97-122)"
		((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) ifFalse: [
			((byte ___ge___: 97) and: [
				byte ___le___: 122
			]) ifFalse: [
				^ false
			]
		]
	].

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isdigit
	"Check if all bytes are digits (0-9)"
	| size |
	size := self ___size___.

	"Empty bytes returns False"
	(size ___eq___: 0) ifTrue: [
		^ false
	].

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Check if 0-9 (48-57)"
		((byte ___ge___: 48) and: [
			byte ___le___: 57
		]) ifFalse: [
			^ false
		]
	].

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isalnum
	"Check if all bytes are alphanumeric ASCII"
	| size |
	size := self ___size___.

	"Empty bytes returns False"
	(size ___eq___: 0) ifTrue: [
		^ false
	].

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Check if 0-9 (48-57), A-Z (65-90), or a-z (97-122)"
		((byte ___ge___: 48) and: [
			byte ___le___: 57
		]) ifFalse: [
			((byte ___ge___: 65) and: [
				byte ___le___: 90
			]) ifFalse: [
				((byte ___ge___: 97) and: [
					byte ___le___: 122
				]) ifFalse: [
					^ false
				]
			]
		]
	].

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isspace
	"Check if all bytes are whitespace"
	| size |
	size := self ___size___.

	"Empty bytes returns False"
	(size ___eq___: 0) ifTrue: [
		^ false
	].

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13), form feed(12), vertical tab(11)"
		((byte ___eq___: 32) or: [
			(byte ___eq___: 9) or: [
				(byte ___eq___: 10) or: [
					(byte ___eq___: 13) or: [
						(byte ___eq___: 12) or: [
							byte ___eq___: 11
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

category: 'Python-Testing Methods'
method: bytes
isupper
	"Check if all cased bytes are uppercase"
	| size hasCased |
	size := self ___size___.
	hasCased := false.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Check if lowercase (97-122)"
		((byte ___ge___: 97) and: [
			byte ___le___: 122
		]) ifTrue: [
			^ false
		].
		"Check if uppercase (65-90)"
		((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) ifTrue: [
			hasCased := true
		]
	].

	^ hasCased
%

category: 'Python-Testing Methods'
method: bytes
islower
	"Check if all cased bytes are lowercase"
	| size hasCased |
	size := self ___size___.
	hasCased := false.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Check if uppercase (65-90)"
		((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) ifTrue: [
			^ false
		].
		"Check if lowercase (97-122)"
		((byte ___ge___: 97) and: [
			byte ___le___: 122
		]) ifTrue: [
			hasCased := true
		]
	].

	^ hasCased
%

category: 'Python-String-like Methods'
method: bytes
swapcase
	"Return bytes with case swapped"
	| result size |
	size := self ___size___.
	result := bytes ___new___: size.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		"Uppercase to lowercase"
		((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) ifTrue: [
			byte := byte ___plus___: 32
		] ifFalse: [
			"Lowercase to uppercase"
			((byte ___ge___: 97) and: [
				byte ___le___: 122
			]) ifTrue: [
				byte := byte ___minus___: (32)
			]
		].
		result ___at___: i put: byte
	].

	^ result
%

category: 'Python-String-like Methods'
method: bytes
title
	"Return titlecased bytes (first letter of each word capitalized)"
	| result size inWord |
	size := self ___size___.
	result := bytes ___new___: size.
	inWord := false.

	1 ___to___: size do: [:i |
		| byte isAlpha |
		byte := self ___at___: i.

		"Check if alphabetic"
		isAlpha := ((byte ___ge___: 65) and: [
			byte ___le___: 90
		]) or: [
			(byte ___ge___: 97) and: [
				byte ___le___: 122
			]
		].

		isAlpha ifTrue: [
			inWord ifFalse: [
				"First letter of word - capitalize"
				((byte ___ge___: 97) and: [
					byte ___le___: 122
				]) ifTrue: [
					byte := byte ___minus___: (32)
				].
				inWord := true
			] ifTrue: [
				"Not first letter - lowercase"
				((byte ___ge___: 65) and: [
					byte ___le___: 90
				]) ifTrue: [
					byte := byte ___plus___: 32
				]
			]
		] ifFalse: [
			inWord := false
		].

		result ___at___: i put: byte
	].

	^ result
%

category: 'Python-Testing Methods'
method: bytes
istitle
	"Check if bytes is titlecased"
	| size inWord hasCased |
	size := self ___size___.
	inWord := false.
	hasCased := false.

	1 ___to___: size do: [:i |
		| byte isUpper isLower |
		byte := self ___at___: i.

		isUpper := (byte ___ge___: 65) and: [
			byte ___le___: 90
		].
		isLower := (byte ___ge___: 97) and: [
			byte ___le___: 122
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

category: 'Python-Padding Methods'
method: bytes
ljust: width
	"Left justify bytes in field of given width"
	| mySize result padding |
	mySize := self ___size___.

	"If already wide enough, return copy"
	(width ___le___: mySize) ifTrue: [
		^ self ___copy___
	].

	"Pad with spaces"
	padding := width ___minus___: (mySize).
	result := bytes ___new___: width.

	"Copy original"
	1 ___to___: mySize do: [:i |
		result ___at___: i put: (self ___at___: i)
	].

	"Add spaces"
	1 ___to___: padding do: [:i |
		result ___at___: (mySize ___plus___: i) put: 32
	].

	^ result
%

category: 'Python-Padding Methods'
method: bytes
rjust: width
	"Right justify bytes in field of given width"
	| mySize result padding |
	mySize := self ___size___.

	"If already wide enough, return copy"
	(width ___le___: mySize) ifTrue: [
		^ self ___copy___
	].

	"Pad with spaces"
	padding := width ___minus___: (mySize).
	result := bytes ___new___: width.

	"Add spaces"
	1 ___to___: padding do: [:i |
		result ___at___: i put: 32
	].

	"Copy original"
	1 ___to___: mySize do: [:i |
		result ___at___: (padding ___plus___: i) put: (self ___at___: i)
	].

	^ result
%

category: 'Python-Padding Methods'
method: bytes
center: width
	"Center bytes in field of given width"
	| mySize result totalPadding leftPadding rightPadding |
	mySize := self ___size___.

	"If already wide enough, return copy"
	(width ___le___: mySize) ifTrue: [
		^ self ___copy___
	].

	"Calculate padding"
	totalPadding := width ___minus___: (mySize).
	leftPadding := totalPadding ___divideInteger___: 2.
	rightPadding := totalPadding ___minus___: (leftPadding).
	result := bytes ___new___: width.

	"Add left spaces"
	1 ___to___: leftPadding do: [:i |
		result ___at___: i put: 32
	].

	"Copy original"
	1 ___to___: mySize do: [:i |
		result ___at___: (leftPadding ___plus___: i) put: (self ___at___: i)
	].

	"Add right spaces"
	1 ___to___: rightPadding do: [:i |
		result ___at___: (leftPadding ___plus___: (mySize ___plus___: i)) put: 32
	].

	^ result
%

category: 'Python-Padding Methods'
method: bytes
zfill: width
	"Pad bytes with zeros on the left to fill width"
	| mySize result padding |
	mySize := self ___size___.

	"If already wide enough, return copy"
	(width ___le___: mySize) ifTrue: [
		^ self ___copy___
	].

	"Pad with zeros"
	padding := width ___minus___: (mySize).
	result := bytes ___new___: width.

	"Add zeros"
	1 ___to___: padding do: [:i |
		result ___at___: i put: 48  "ASCII '0'"
	].

	"Copy original"
	1 ___to___: mySize do: [:i |
		result ___at___: (padding ___plus___: i) put: (self ___at___: i)
	].

	^ result
%

category: 'Python-Splitting Methods'
method: bytes
partition: sep
	"Partition bytes at first occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize |
	idx := self perform: #find: env: 2 withArguments: {sep}.

	"Not found - return (self, empty, empty)"
	(idx ___eq___: -1) ifTrue: [
		^ InvariantArray ___with___: (self ___copy___) with: (bytes ___new___) with: (bytes ___new___)
	].

	"Found - split at separator"
	mySize := self ___size___.
	sepSize := sep ___size___.

	"Before separator"
	before := bytes ___new___: idx.
	1 ___to___: idx do: [:i |
		before ___at___: i put: (self ___at___: i)
	].

	"After separator"
	afterSize := mySize ___minus___: (idx ___plus___: sepSize).
	after := bytes ___new___: afterSize.
	1 ___to___: afterSize do: [:i |
		after ___at___: i put: (self ___at___: (idx ___plus___: (sepSize ___plus___: i)))
	].

	^ InvariantArray ___with___: before with: sep with: after
%

category: 'Python-Splitting Methods'
method: bytes
rpartition: sep
	"Partition bytes at last occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize|
	idx := self perform: #rfind: env: 2 withArguments: {sep}.

	"Not found - return (empty, empty, self)"
	(idx ___eq___: -1) ifTrue: [
		^ InvariantArray ___with___: (bytes ___new___) with: (bytes ___new___) with: self ___copy___
	].

	"Found - split at separator"
	mySize := self ___size___.
	sepSize := sep ___size___.

	"Before separator"
	before := bytes ___new___: idx.
	1 ___to___: idx do: [:i |
		before ___at___: i put: (self ___at___: i)
	].

	"After separator"
	afterSize := mySize ___minus___: (idx ___plus___: sepSize).
	after := bytes ___new___: afterSize.
	1 ___to___: afterSize do: [:i |
		after ___at___: i put: (self ___at___: (idx ___plus___: (sepSize ___plus___: i)))
	].

	^ InvariantArray ___with___: before with: sep with: after
%

category: 'Python-Splitting Methods'
method: bytes
rsplit: sep
	"Split from right (same as split for now - full implementation would need maxsplit)"
	^ self perform: #split: env: 2 withArguments: {sep}
%

category: 'Python-Splitting Methods'
method: bytes
rsplit: sep _: maxsplit
	"Split from right with maximum number of splits"
	| sepClass sepSize mySize parts positions i actualSplits lastEnd firstPart firstPartSize |
	sepClass := sep ___class___.

	"sep must be bytes"
	(sepClass == bytes) ifFalse: [
		TypeError ___signal___: 'sep must be bytes'
	].

	sepSize := sep ___size___.
	mySize := self ___size___.

	"Empty separator not allowed"
	(sepSize ___eq___: 0) ifTrue: [
		ValueError ___signal___: 'empty separator'
	].

	"If maxsplit is -1 or < 0, do unlimited split"
	(maxsplit ___lt___: 0) ifTrue: [
		^ self perform: #split: env: 2 withArguments: {sep}
	].

	"Find all separator positions from right to left"
	positions := OrderedCollection ___new___.
	i := mySize ___minus___: (sepSize ___minus___: 1).
	
	[i ___ge___: 1] ___whileTrue___: [
		| match |
		match := true.
				1 ___to___: sepSize do: [:j |
			| myByte sepByte |
			myByte := self ___at___: (i ___plus___: (j ___minus___: (1))).
			sepByte := sep ___at___: j.
			(myByte ___eq___: sepByte) ifFalse: [
				match := false
			]
		].
		match ifTrue: [
			positions ___add___: i
		].
		i := i ___minus___: (1)
	].

	"Limit to maxsplit splits (take first maxsplit positions since we collected from right)"
	actualSplits := positions ___size___.
	(actualSplits ___gt___: maxsplit) ifTrue: [
		| newPositions |
		newPositions := OrderedCollection ___new___.
		1 ___to___: maxsplit do: [:idx |
			newPositions ___add___: (positions ___at___: idx)
		].
		positions := newPositions
	].

	"Build parts from right to left"
	parts := OrderedCollection ___new___.
	lastEnd := mySize ___plus___: 1.
	
	1 ___to___: positions ___size___ do: [:idx |
		| pos part partSize |
		pos := positions ___at___: idx.
		partSize := lastEnd ___minus___: (pos ___plus___: sepSize).
		part := bytes ___new___: partSize.
		1 ___to___: partSize do: [:j |
			part ___at___: j put: (self ___at___: (pos ___plus___: (sepSize ___plus___: (j ___minus___: (1)))))
		].
		parts perform: #addFirst: env: 0 withArguments: {part}.
		lastEnd := pos
	].

	"Add first part (everything before first split position)"
	firstPartSize := lastEnd ___minus___: (1).
	firstPart := bytes ___new___: firstPartSize.
	1 ___to___: firstPartSize do: [:j |
		firstPart ___at___: j put: (self ___at___: j)
	].
	parts perform: #addFirst: env: 0 withArguments: {firstPart}.

	^ parts
%

category: 'Python-Splitting Methods'
method: bytes
splitlines
	"Split bytes at line boundaries, return list"
	| parts currentPart size i |
	size := self ___size___.
	parts := OrderedCollection ___new___.
	currentPart := bytes ___new___.
	i := 1.

	[i ___le___: size] ___whileTrue___: [
		| byte |
		byte := self ___at___: i.

		"Check for line endings"
		(byte ___eq___: 10) ifTrue: [  "LF"
			parts ___add___: currentPart.
			currentPart := bytes ___new___.
			i := i ___plus___: 1
		] ifFalse: [
			(byte ___eq___: 13) ifTrue: [  "CR"
				parts ___add___: currentPart.
				currentPart := bytes ___new___.
				"Check for CRLF"
				((i ___lt___: size) and: [
					(self ___at___: (i ___plus___: 1)) ___eq___: 10
				]) ifTrue: [
					i := i ___plus___: 2
				] ifFalse: [
					i := i ___plus___: 1
				]
			] ifFalse: [
				"Regular character"
				| newByte |
				newByte := bytes ___new___: 1.
				newByte ___at___: 1 put: byte.
				currentPart := currentPart ___concat___: newByte.
				i := i ___plus___: 1
			]
		]
	].

	"Add final part if non-empty"
		((currentPart ___size___) ___gt___: 0) ifTrue: [
		parts ___add___: currentPart
	].

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
expandtabs
	"Expand tabs to spaces (default tabsize=8)"
	^ self perform: #expandtabs: env: 2 withArguments: {8}
%

category: 'Python-String-like Methods'
method: bytes
expandtabs: tabsize
	"Expand tabs to spaces with given tabsize"
	| result size column |
	result := bytes ___new___.
	size := self ___size___.
	column := 0.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.

		(byte ___eq___: 9) ifTrue: [  "Tab"
			| spaces |
			spaces := tabsize ___minus___: (column ___modulo___: tabsize).
			1 ___to___: spaces do: [:j |
				| newByte |
				newByte := bytes ___new___: 1.
				newByte ___at___: 1 put: 32.
				result := result ___concat___: newByte
			].
			column := column ___plus___: spaces
		] ifFalse: [
			(byte ___eq___: 10) ifTrue: [  "Newline"
				| newByte |
				newByte := bytes ___new___: 1.
				newByte ___at___: 1 put: byte.
				result := result ___concat___: newByte.
				column := 0
			] ifFalse: [
				| newByte |
				newByte := bytes ___new___: 1.
				newByte ___at___: 1 put: byte.
				result := result ___concat___: newByte.
				column := column ___plus___: 1
			]
		]
	].

	^ result
%

category: 'Python-Translation Methods'
classmethod: bytes
maketrans: frm _: to
	"Create translation table (identity table with replacements)
	Note: This is actually a staticmethod in Python (doesn't receive cls),
	but Grail doesn't have a staticmethod: directive for hand-written methods."
	| frmSize toSize table |
	frmSize := frm ___size___.
	toSize := to ___size___.

	"frm and to must be same size"
	(frmSize ___eq___: toSize) ifFalse: [
		ValueError ___signal___: 'maketrans arguments must have same length'
	].

	"Create identity table (0-255)"
	table := bytes ___new___: 256.
	0 ___to___: 255 do: [:i |
		table ___at___: (i ___plus___: 1) put: i
	].

	"Apply replacements"
	1 ___to___: frmSize do: [:i |
		| frmByte toByte |
		frmByte := frm ___at___: i.
		toByte := to ___at___: i.
		table ___at___: (frmByte ___plus___: 1) put: toByte
	].

	^ table
%

category: 'Python-Translation Methods'
method: bytes
translate: table
	"Translate bytes using translation table"
	| tableSize mySize result |
	tableSize := table ___size___.
	mySize := self ___size___.

	"Table must be 256 bytes"
	(tableSize ___eq___: 256) ifFalse: [
		ValueError ___signal___: 'translation table must be 256 characters long'
	].

	result := bytes ___new___: mySize.

	1 ___to___: mySize do: [:i |
		| byte newByte |
		byte := self ___at___: i.
		newByte := table ___at___: (byte ___plus___: 1).
		result ___at___: i put: newByte
	].

	^ result
%

set compile_env: 0


