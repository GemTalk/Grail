! ------------------- Superclass check
run
bytes ifNil: [self error: 'bytes is not defined. Check file ordering.'].
%

! ===============================================================================
! Python Class Definitions - Other New Python Classes (as DataCurator)
! ===============================================================================
! Define new classes specific to Python that don't exist in GemStone.
! These are created as DataCurator.
! ===============================================================================

! ------- bytearray class (Python 'bytearray' type - mutable bytes)
expectvalue /Class
doit
bytes subclass: 'bytearray'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
bytearray comment:
'Python bytearray type - mutable sequence of bytes.

This is the mutable variant of bytes. It inherits all methods from ByteArray
(which implements Python''s bytes type) but allows mutation through __setitem__
and provides additional mutation methods like append, extend, insert, etc.

Unlike bytes (ByteArray), bytearray instances can be modified in place.
'
%

expectvalue /Class
doit
bytearray category: 'Collections-Ordered'
%

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
bytearray removeAllMethods: 1.
bytearray class removeAllMethods: 1.
%

set compile_env: 1

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
	sourceClass := source @env0:class.

	"If source is an integer, create bytearray of that size filled with zeros"
	sourceClass == SmallInteger ifTrue: [
		(source @env0:< 0) ifTrue: [
			ValueError ___signal___: 'negative count'
		].
		^ cls ___new___: source
	].

	"If source is a string, raise TypeError (need encoding)"
	(source @env0:isKindOf: String) ifTrue: [
		TypeError ___signal___: 'string argument without an encoding'
	].

	"If source is bytes or bytearray, make a copy"
	((sourceClass @env0:= bytes) or: [
		sourceClass @env0:= bytearray
	]) ifTrue: [
		result := cls ___new___: (source @env0:size).
		1 @env0:to: source @env0:size do: [:i |
			result @env0:at: i put: (source @env0:at: i)
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
		size := source @env0:size.
		ba := cls ___new___: size.
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

	"If source is a range, convert to bytearray"
	(sourceClass == Interval) ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := cls ___new___: size.
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

	"Default: empty bytearray"
	^ cls ___new___
%

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls _: source _: encoding
	"bytearray(string, encoding) - encode string to bytearray"

	| result sourceClass encodingStr |
	sourceClass := source @env0:class.

	"Source must be a string"
	((source @env0:isKindOf: String) not) ifTrue: [
		TypeError ___signal___: 'encoding without a string argument'
	].

	"Get encoding as a Smalltalk string"
	encodingStr := encoding.

	"Support ASCII encoding"
	(encodingStr @env0:= 'ascii') ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := cls __new__: cls _: size.
		1 @env0:to: size do: [:i |
			| char codePoint |
			char := source @env0:at: i.
			codePoint := char @env0:codePoint.
			(codePoint @env0:> 127) ifTrue: [
				UnicodeEncodeError ___signal___: 'ordinal not in range(128)'
			].
			ba @env0:at: i put: codePoint
		].
		^ ba
	].

	"Support UTF-8 encoding"
	((encodingStr @env0:= 'utf-8') or: [
		encodingStr @env0:= 'utf8'
	]) ifTrue: [
		| utf8Bytes |
		utf8Bytes := source @env0:encodeAsUTF8.
		result := cls __new__: (utf8Bytes @env0:size).
		1 @env0:to: utf8Bytes @env0:size do: [:i |
			result @env0:at: i put: (utf8Bytes @env0:at: i)
		].
		^ result
	].

	"Support Latin-1 encoding"
	((encodingStr @env0:= 'latin-1') or: [
		encodingStr @env0:= 'latin1'
	]) ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := cls ___new___: size.
		1 @env0:to: size do: [:i |
			| char codePoint |
			char := source @env0:at: i.
			codePoint := char @env0:codePoint.
			(codePoint @env0:> 255) ifTrue: [
				UnicodeEncodeError ___signal___: 'ordinal not in range(256)'
			].
			ba @env0:at: i put: codePoint
		].
		^ ba
	].

	"Unsupported encoding"
	LookupError ___signal___: ('unknown encoding: ' @env0:, encodingStr)
%

category: 'Python-Constructors'
classmethod: bytearray
fromhex: cls _: hexString
	"Create bytearray from hex string (e.g., 'deadbeef')"

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

	"Create bytearray and fill with hex values"
	ba := cls ___new___: (size @env0:// 2).
	1 @env0:to: size by: 2 do: [:i |
		| hexPair byte stream |
		hexPair := cleaned @env0:copyFrom: i to: (i @env0:+ 1).
		stream := ReadStream @env0:on: ('16r' @env0:, hexPair).
		byte := Integer @env0:fromStream: stream.
		ba @env0:at: ((i @env0:+ 1) @env0:// 2) put: byte
	].

	^ ba
%

category: 'Python-Type'
method: bytearray
__class__
	"Return the Python type for bytearray"
	^ bytearray
%

category: 'Python-Sequence Protocol'
method: bytearray
__delitem__: index
	"Delete byte at index"

	| idx size |
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
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Remove (convert to 1-based)"
	self @env0:removeAtIndex: (idx @env0:+ 1)
%

category: 'Python-Concatenation'
method: bytearray
__iadd__: other
	"In-place concatenation"

	| otherClass |
	otherClass := other @env0:class.

	"Can only concatenate with bytes or bytearray"
	((otherClass @env0:= bytes) or: [
		otherClass @env0:= bytearray
	]) ifFalse: [
		TypeError ___signal___: ('can''t concat bytearray to ' @env0:, otherClass)
	].

	self @env1:extend: other.
	^ self
%

category: 'Python-Concatenation'
method: bytearray
__imul__: count
	"In-place repetition"

	| n originalSize original |
	n := count.

	"Validate count is an integer"
	(n @env0:class) == SmallInteger ifFalse: [
		TypeError ___signal___: 'can''t multiply sequence by non-int'
	].

	"If count <= 1, nothing to do (or clear if <= 0)"
	(n @env0:<= 0) ifTrue: [
		self @env0:size: 0.
		^ self
	].

	(n @env0:= 1) ifTrue: [
		^ self
	].

	"Save original content"
	originalSize := self @env0:size.
	original := bytearray ___new___: originalSize.
	1 @env0:to: originalSize do: [:i |
		original @env0:at: i put: (self @env0:at: i)
	].

	"Repeat n-1 times"
	2 @env0:to: n do: [:rep |
		self @env1:extend: original
	].

	^ self
%

category: 'Python-Sequence Protocol'
method: bytearray
__setitem__: index _: value
	"Set byte at index (mutable)"
	| idx size val |
	size := self @env0:size.
	idx := index.
	val := value.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Validate byte value"
	((val @env0:< 0) or: [
		val @env0:> 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Set value (convert to 1-based index)"
	self @env0:at: (idx @env0:+ 1) put: val.
	^ nil
%

category: 'Python-Mutation Methods'
method: bytearray
append: item
	"Append a single byte to the end"

	| val |
	val := item.

	"Validate byte value"
	((val @env0:< 0) or: [
		val @env0:> 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Add to end"
	self @env0:add: val
%

category: 'Python-Mutation Methods'
method: bytearray
clear
	"Remove all bytes"

	self @env0:size: 0
%

category: 'Python-Mutation Methods'
method: bytearray
copy
	"Return a shallow copy"

	| result size |
	size := self @env0:size.
	result := bytearray ___new___: size.
	1 @env0:to: size do: [:i |
		result @env0:at: i put: (self @env0:at: i)
	].
	^ result
%

category: 'Python-Mutation Methods'
method: bytearray
extend: iterable
	"Extend bytearray with bytes from iterable"

	| iterClass size |
	iterClass := iterable @env0:class.

	"Handle bytes or bytearray"
	((iterClass @env0:= bytes) or: [
		iterClass @env0:= bytearray
	]) ifTrue: [
		size := iterable @env0:size.
		1 @env0:to: size do: [:i |
			| byte |
			byte := iterable @env0:at: i.
			self append: byte
		].
		^ nil
	].

	"Handle list or tuple"
	((iterClass @env0:= list) or: [
		iterClass @env0:= tuple
	]) ifTrue: [
		size := iterable @env0:size.
		1 @env0:to: size do: [:i |
			| val |
			val := iterable @env0:at: i.
			"Validate byte value"
			((val @env0:< 0) or: [
				val @env0:> 255
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
	size := self @env0:size.
	idx := index.
	val := item.

	"Handle negative indices"
	(index @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Clamp to valid range"
	(index @env0:< 0) ifTrue: [
		idx := 0
	].
	(index @env0:> size) ifTrue: [
		idx := size
	].

	"Validate byte value"
	((val @env0:< 0) or: [
		val @env0:> 255
	]) ifTrue: [
		ValueError ___signal___: 'byte must be in range(0, 256)'
	].

	"Insert at position (convert to 1-based)"
	self @env0:insertAll: (bytearray @env0:with: val) at: (index @env0:+ 1)
%

category: 'Python-Mutation Methods'
method: bytearray
pop
	"Remove and return last byte"

	| size |
	size := self @env0:size.

	(size @env0:= 0) ifTrue: [
		IndexError ___signal___: 'pop from empty bytearray'
	].

	^ self @env0:removeLast
%

category: 'Python-Mutation Methods'
method: bytearray
pop: index
	"Remove and return byte at index"

	| idx size byte |
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
		IndexError ___signal___: 'pop index out of range'
	].

	"Get byte and remove (convert to 1-based)"
	byte := self @env0:at: (idx @env0:+ 1).
	self @env0:removeAtIndex: (idx @env0:+ 1).
	^ byte
%

category: 'Python-Mutation Methods'
method: bytearray
remove: value
	"Remove first occurrence of value"

	| size |
	size := self @env0:size.

	1 @env0:to: size do: [:i |
		| byte |
		byte := self @env0:at: i.
		(byte @env0:= value) ifTrue: [
			self @env0:removeAtIndex: i.
			^ nil
		]
	].

	ValueError ___signal___: 'value not in bytearray'
%

category: 'Python-Mutation Methods'
method: bytearray
reverse
	"Reverse bytearray in place"

	| size |
	size := self @env0:size.

	1 @env0:to: (size @env0:// 2) do: [:i |
		| temp j |
		j := size @env0:- (i @env0:- 1).
		temp := self @env0:at: i.
		self @env0:at: i put: (self @env0:at: j).
		self @env0:at: j put: temp
	]
%

set compile_env: 0
