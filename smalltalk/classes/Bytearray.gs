! ===============================================================================
! bytearray Methods (Python 'bytearray' type - mutable bytes)
! ===============================================================================
! This file contains Python method implementations for the bytearray class.
! bytearray is a mutable sequence of bytes (integers 0-255).
!
! bytearray inherits from bytes, which implements Python's bytes type.
! Most methods are inherited from bytes. This file only contains:
!   1. Overrides for methods that differ (e.g., __class__, __setitem__)
!   2. Additional mutation methods (append, extend, insert, remove, pop, etc.)
!   3. Constructors that return bytearray instances
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytearray
expectvalue /Metaclass3
doit
bytearray removeAllMethods: 2.
bytearray class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Class methods for bytearray

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls
	"bytearray() - create empty bytearray"

	^ cls ___new___
%

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls _: source
	"bytearray(source) - create bytearray from various sources"

	| result sourceClass |
	sourceClass := source ___class___.

	"If source is an integer, create bytearray of that size filled with zeros"
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

	"If source is bytes or bytearray, make a copy"
	((sourceClass ___eq___: bytes) or: [
		sourceClass ___eq___: bytearray
	]) ifTrue: [
		result := cls ___new___: (source ___size___).
		1 ___to___: source ___size___ do: [:i |
			result ___at___: i put: (source ___at___: i)
		].
		^ result
	].

	"If source is a list, tuple, or array, convert elements to bytes"
	((sourceClass == list) or: [
		(sourceClass == tuple) or: [
			sourceClass == Array
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

	"If source is a range, convert to bytearray"
	(sourceClass == Interval) ifTrue: [
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

	"Default: empty bytearray"
	^ cls ___new___
%

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls _: source _: encoding
	"bytearray(string, encoding) - encode string to bytearray"

	| result sourceClass encodingStr |
	sourceClass := source ___class___.

	"Source must be a string"
	((source ___isKindOf___: String) not) ifTrue: [
		TypeError ___signal___: 'encoding without a string argument'
	].

	"Get encoding as a Smalltalk string"
	encodingStr := encoding.

	"Support ASCII encoding"
	(encodingStr ___eq___: 'ascii') ifTrue: [
		| ba size |
		size := source ___size___.
		ba := cls __new__: cls _: size.
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
		result := cls __new__: (utf8Bytes ___size___).
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
classmethod: bytearray
fromhex: cls _: hexString
	"Create bytearray from hex string (e.g., 'deadbeef')"

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

	"Create bytearray and fill with hex values"
	ba := cls ___new___: (size ___divideInteger___: 2).
	1 ___to___: size by: 2 do: [:i |
		| hexPair byte stream |
		hexPair := cleaned ___copyFrom___: i to: (i ___plus___: 1).
		stream := ReadStream ___on___: ('16r' ___concat___: hexPair).
		byte := Integer ___fromStream___: stream.
		ba ___at___: ((i ___plus___: 1) ___divideInteger___: 2) put: byte
	].

	^ ba
%

! ------------------- Instance methods for bytearray
category: 'Python-Type'
method: bytearray
__class__
	"Return the Python type for bytearray"
	^ bytearray
%

category: 'Python-Sequence Protocol'
method: bytearray
__setitem__: index _: value
	"Set byte at index (mutable)"
	| idx size val |
	size := self ___size___.
	idx := index.
	val := value.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Check bounds"
	((idx ___lt___: 0) or: [
		idx ___ge___: size
	]) ifTrue: [
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val ___gt___: 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Set value (convert to 1-based index)"
	self ___at___: (idx ___plus___: 1) put: val.
	^ nil
%

category: 'Python-Mutation Methods'
method: bytearray
append: item
	"Append a single byte to the end"

	| val |
	val := item.

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val ___gt___: 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Add to end"
	self ___add___: val
%

category: 'Python-Mutation Methods'
method: bytearray
clear
	"Remove all bytes"

	self ___size___: 0
%

category: 'Python-Mutation Methods'
method: bytearray
copy
	"Return a shallow copy"

	| result size |
	size := self ___size___.
	result := bytearray ___new___: size.
	1 ___to___: size do: [:i |
		result ___at___: i put: (self ___at___: i)
	].
	^ result
%

category: 'Python-Mutation Methods'
method: bytearray
extend: iterable
	"Extend bytearray with bytes from iterable"

	| iterClass size |
	iterClass := iterable ___class___.

	"Handle bytes or bytearray"
	((iterClass ___eq___: bytes) or: [
		iterClass ___eq___: bytearray
	]) ifTrue: [
		size := iterable ___size___.
		1 ___to___: size do: [:i |
			| byte |
			byte := iterable ___at___: i.
			self append: byte
		].
		^ nil
	].

	"Handle list or tuple"
	((iterClass ___eq___: list) or: [
		iterClass ___eq___: tuple
	]) ifTrue: [
		size := iterable ___size___.
		1 ___to___: size do: [:i |
			| val |
			val := iterable ___at___: i.
			"Validate byte value"
			((val ___lt___: 0) or: [
				val ___gt___: 255
			]) ifTrue: [
				ValueError ___signal___: 'byte must be in range(0, 256)'
			].
			self append: val
		].
		^ nil
	].

	TypeError ___signal___: 'extend() argument must be iterable'
%

category: 'Python-Mutation Methods'
method: bytearray
insert: index _: item
"Insert byte at index"

	| idx size val |
	size := self ___size___.
	idx := index.
	val := item.

	"Handle negative indices"
	(index ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Clamp to valid range"
	(index ___lt___: 0) ifTrue: [
		idx := 0
	].
	(index ___gt___: size) ifTrue: [
		idx := size
	].

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val ___gt___: 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Insert at position (convert to 1-based)"
	self 
		perform: #insertAll:at: 
		env: 0 
		withArguments: {
			bytearray ___with___: val. 
			index ___plus___: 1.
			
		}
%

category: 'Python-Mutation Methods'
method: bytearray
remove: value
	"Remove first occurrence of value"

	| size |
	size := self ___size___.

	1 ___to___: size do: [:i |
		| byte |
		byte := self ___at___: i.
		(byte ___eq___: value) ifTrue: [
			self ___removeAtIndex___: i.
			^ nil
		]
	].

	ValueError ___signal___: 'value not in bytearray'
%

category: 'Python-Mutation Methods'
method: bytearray
pop
	"Remove and return last byte"

	| size |
	size := self ___size___.

	(size ___eq___: 0) ifTrue: [
		IndexError ___signal___: 'pop from empty bytearray'
	].

	^ self perform: #removeLast env: 0
%

category: 'Python-Mutation Methods'
method: bytearray
pop: index
	"Remove and return byte at index"

	| idx size byte |
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
		IndexError ___signal___: 'pop index out of range'
	].

	"Get byte and remove (convert to 1-based)"
	byte := self ___at___: (idx ___plus___: 1).
	self ___removeAtIndex___: (idx ___plus___: 1).
	^ byte
%

category: 'Python-Mutation Methods'
method: bytearray
reverse
	"Reverse bytearray in place"

	| size |
	size := self ___size___.

	1 ___to___: (size ___divideInteger___: 2) do: [:i |
		| temp j |
		j := size ___minus___: (i ___minus___: 1).
		temp := self ___at___: i.
		self ___at___: i put: (self ___at___: j).
		self ___at___: j put: temp
	]
%

category: 'Python-Sequence Protocol'
method: bytearray
__delitem__: index
	"Delete byte at index"

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
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Remove (convert to 1-based)"
	self ___removeAtIndex___: (idx ___plus___: 1)
%

category: 'Python-Concatenation'
method: bytearray
__iadd__: other
	"In-place concatenation"

	| otherClass |
	otherClass := other ___class___.

	"Can only concatenate with bytes or bytearray"
	((otherClass ___eq___: bytes) or: [
		otherClass ___eq___: bytearray
	]) ifFalse: [
		TypeError ___signal___: ('can''t concat bytearray to ' ___concat___: otherClass)
	].

	self perform: #extend: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-Concatenation'
method: bytearray
__imul__: count
	"In-place repetition"

	| n originalSize original |
	n := count.

	"Validate count is an integer"
	(n ___class___) == SmallInteger ifFalse: [
		TypeError ___signal___: 'can''t multiply sequence by non-int'
	].

	"If count <= 1, nothing to do (or clear if <= 0)"
	(n ___le___: 0) ifTrue: [
		self ___size___: 0.
		^ self
	].

	(n ___eq___: 1) ifTrue: [
		^ self
	].

	"Save original content"
	originalSize := self ___size___.
	original := bytearray ___new___: originalSize.
	1 ___to___: originalSize do: [:i |
		original ___at___: i put: (self ___at___: i)
	].

	"Repeat n-1 times"
	2 ___to___: n do: [:rep |
		self perform: #extend: env: 2 withArguments: {original}
	].

	^ self
%

set compile_env: 0
