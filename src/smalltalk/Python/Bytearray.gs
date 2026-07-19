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
bytearray category: 'Grail-Collections-Ordered'
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
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytearray
expectvalue /Metaclass3
doit
bytearray removeAllMethods: 1.
bytearray class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Constructors'
classmethod: bytearray
__new__
	"bytearray() — create empty bytearray. Receiver is the class."

	^ self ___new___
%

category: 'Grail-Constructors'
classmethod: bytearray
__new__: source
	"bytearray(source) — create bytearray from various sources.
	Receiver is the class."

	| result sourceClass |
	sourceClass := source @env0:class.

	"If source is an integer, create bytearray of that size filled with zeros"
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

	"If source is bytes or bytearray, make a copy"
	((sourceClass == bytes) or: [
		sourceClass == bytearray
	]) ifTrue: [
		result := self ___new___: (source @env0:size).
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

	"If source is a range, convert to bytearray"
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

	"Default: empty bytearray"
	^ self ___new___
%

category: 'Grail-Constructors'
classmethod: bytearray
__new__: source _: encoding
	"bytearray(string, encoding) — encode string to bytearray.
	Receiver is the class."

	| result encodingStr |
	"Source must be a string"
	((source isKindOf: String) not) ifTrue: [
		TypeError ___signal___: 'encoding without a string argument'
	].

	"Get encoding as a Smalltalk string"
	encodingStr := encoding.

	"Support ASCII encoding"
	(encodingStr @env0:= 'ascii') ifTrue: [
		| ba size |
		size := source @env0:size.
		ba := self ___new___: size.
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
		result := self ___new___: (utf8Bytes @env0:size).
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
		ba := self ___new___: size.
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

category: 'Grail-Constructors'
classmethod: bytearray
fromhex: hexString
	"Create bytearray from hex string (e.g., 'deadbeef'). Receiver is
	the class. In Python: bytearray.fromhex('deadbeef')."

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
	ba := self ___new___: (size @env0:// 2).
	1 @env0:to: size by: 2 do: [:i |
		| hexPair byte stream |
		hexPair := cleaned @env0:copyFrom: i to: (i @env0:+ 1).
		stream := ReadStream @env0:on: ('16r' @env0:, hexPair).
		byte := Integer @env0:fromStream: stream.
		ba @env0:at: ((i @env0:+ 1) @env0:// 2) put: byte
	].

	^ ba
%

category: 'Grail-Type'
method: bytearray
__class__
	"Return the Python type for bytearray"
	^ bytearray
%

category: 'Grail-Sequence Protocol'
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

category: 'Grail-Concatenation'
method: bytearray
__iadd__: other
	"In-place concatenation"

	| otherClass |
	otherClass := other @env0:class.

	"Can only concatenate with bytes or bytearray"
	((otherClass == bytes) or: [
		otherClass == bytearray
	]) ifFalse: [
		TypeError ___signal___: ('can''t concat bytearray to ' @env0:, otherClass)
	].

	self extend: other.
	^ self
%

category: 'Grail-Concatenation'
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

	(n == 1) ifTrue: [
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
		self extend: original
	].

	^ self
%

category: 'Grail-Sequence Protocol'
method: bytearray
__setitem__: index _: value
	"Set byte at index, or assign to a slice (mutable)."
	| idx size val |
	size := self @env0:size.

	"Slice assignment: bytearray[i:j[:k]] = bytes-like."
	(index isKindOf: slice) ifTrue: [
		^ self ___setSliceItem: index value: value size: size
	].

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
	^ None
%

category: 'Grail-Sequence Protocol'
method: bytearray
___setSliceItem: aSlice value: value size: size
	"bytearray[i:j[:k]] = value.  For step 1 the length may change; the
	receiver is resized IN PLACE (identity preserved) via ``size:''.  For
	an extended slice (step != 1) the value length must equal the number
	of selected indices (CPython semantics)."

	| idxTuple lo hi st vals newVals indices i |
	idxTuple := aSlice indices: size.
	lo := idxTuple @env0:at: 1.
	hi := idxTuple @env0:at: 2.
	st := idxTuple @env0:at: 3.
	vals := self ___bytesFrom: value.

	(st @env0:= 1) ifTrue: [
		newVals := OrderedCollection @env0:new.
		1 @env0:to: lo do: [:j | newVals @env0:add: (self @env0:at: j)].
		newVals @env0:addAll: vals.
		(hi @env0:+ 1) @env0:to: size do: [:j | newVals @env0:add: (self @env0:at: j)].
		self @env0:size: newVals @env0:size.
		1 @env0:to: newVals @env0:size do: [:j | self @env0:at: j put: (newVals @env0:at: j)].
		^ None
	].

	"Extended slice: collect the selected 0-based indices."
	indices := OrderedCollection @env0:new.
	i := lo.
	st @env0:> 0
		ifTrue: [[i @env0:< hi] @env0:whileTrue: [indices @env0:add: i. i := i @env0:+ st]]
		ifFalse: [[i @env0:> hi] @env0:whileTrue: [indices @env0:add: i. i := i @env0:+ st]].
	(vals @env0:size @env0:= indices @env0:size) ifFalse: [
		ValueError ___signal___: ('attempt to assign bytes of size '
			@env0:, vals @env0:size @env0:printString
			@env0:, ' to extended slice of size '
			@env0:, indices @env0:size @env0:printString)
	].
	1 @env0:to: indices @env0:size do: [:k |
		self @env0:at: ((indices @env0:at: k) @env0:+ 1) put: (vals @env0:at: k)].
	^ None
%

category: 'Grail-Sequence Protocol'
method: bytearray
___bytesFrom: value
	"Materialize a bytes-like value (bytes / bytearray / list / tuple of
	ints) into an OrderedCollection of validated byte ints (0..255)."

	| cls out |
	cls := value @env0:class.
	((cls == bytes) or: [(cls == bytearray)
		or: [(cls == list) or: [cls == tuple]]]) ifFalse: [
			TypeError ___signal___:
				'can assign only a bytes-like object to a bytearray slice'
	].
	out := OrderedCollection @env0:new.
	1 @env0:to: value @env0:size do: [:i | | b |
		b := value @env0:at: i.
		((b @env0:< 0) or: [b @env0:> 255]) ifTrue: [
			ValueError ___signal___: 'byte must be in range(0, 256)'
		].
		out @env0:add: b
	].
	^ out
%

category: 'Grail-Mutation Methods'
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

category: 'Grail-Mutation Methods'
method: bytearray
clear
	"Remove all bytes"

	self @env0:size: 0
%

category: 'Grail-Mutation Methods'
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

category: 'Grail-Mutation Methods'
method: bytearray
extend: iterable
	"Extend bytearray with bytes from iterable"

	| iterClass size |
	iterClass := iterable @env0:class.

	"Handle bytes or bytearray"
	((iterClass == bytes) or: [
		iterClass == bytearray
	]) ifTrue: [
		size := iterable @env0:size.
		1 @env0:to: size do: [:i |
			| byte |
			byte := iterable @env0:at: i.
			self append: byte
		].
		^ None
	].

	"Handle list or tuple"
	((iterClass == list) or: [
		iterClass == tuple
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
		^ None
	].

	TypeError ___signal___: 'extend() argument must be iterable'
%

category: 'Grail-Mutation Methods'
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

category: 'Grail-Mutation Methods'
method: bytearray
pop
	"Remove and return last byte"

	| size |
	size := self @env0:size.

	(size == 0) ifTrue: [
		IndexError ___signal___: 'pop from empty bytearray'
	].

	^ self @env0:removeLast
%

category: 'Grail-Mutation Methods'
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

category: 'Grail-Mutation Methods'
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

category: 'Grail-Mutation Methods'
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

! ===============================================================================
! find — Python bytearray.find(sub[, start[, end]])
! Returns the lowest index where ``sub`` is found in self[start:end],
! or -1 if not found.  ``sub`` may be a single int byte (the
! re._compiler usage) or a bytes/bytearray-like sub-sequence.
! ===============================================================================

category: 'Grail-Search Methods'
method: bytearray
find: sub
	"find(sub) → first index where sub occurs, or -1."

	^ self find: sub _: 0 _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytearray
find: sub _: start
	"find(sub, start) → first index >= start where sub occurs, or -1."

	^ self find: sub _: start _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytearray
find: sub _: start _: end
	"find(sub, start, end) → first index in [start, end) where ``sub``
	matches, or -1.  Single-int ``sub`` searches for that byte value;
	a sequence ``sub`` searches for the contiguous run."

	| size lo hi subSize |
	size := self @env0:size.
	lo := start @env0:max: 0.
	hi := end @env0:min: size.
	"Single byte value: linear scan."
	(sub isKindOf: SmallInteger) ifTrue: [
		lo @env0:+ 1 @env0:to: hi do: [:i |
			(self @env0:at: i) @env0:= sub ifTrue: [
				^ i @env0:- 1
			]
		].
		^ -1
	].
	"Sub-sequence: O(n*m) scan.  ``sub`` is itself a bytes /
	bytearray / sequence of ints."
	subSize := sub @env0:size.
	subSize @env0:= 0 ifTrue: [^ lo].
	subSize @env0:> (hi @env0:- lo) ifTrue: [^ -1].
	lo @env0:+ 1 @env0:to: hi @env0:- subSize @env0:+ 1 do: [:i |
		| match |
		match := true.
		1 @env0:to: subSize do: [:j |
			(self @env0:at: i @env0:+ j @env0:- 1) @env0:= (sub @env0:at: j) ifFalse: [
				match := false
			]
		].
		match ifTrue: [^ i @env0:- 1]
	].
	^ -1
%

set compile_env: 0
