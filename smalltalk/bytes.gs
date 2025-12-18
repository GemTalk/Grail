! ------------------- Remove existing behavior from bytes
removeallmethods bytes
removeallclassmethods bytes
! ------------------- Class methods for bytes
category: 'Python'
classmethod: bytes
__call__

	^self __new__ __init__; yourself
%
category: 'Python'
classmethod: bytes
__call__: pythonObject

	^(self __new__: pythonObject) __init__: pythonObject; yourself
%
category: 'Python'
classmethod: bytes
__call__: pythonString _: encoding

	^(self __new__: pythonString _: encoding) __init__: pythonString _: encoding; yourself
%
category: 'Python'
classmethod: bytes
__call__: pythonBytes _: encoding _: errors

	^(self __new__: pythonBytes _: encoding _: errors) __init__: pythonBytes _: encoding _: errors; yourself
%
category: 'Python'
classmethod: bytes
__new__

	^self basicNew
%
category: 'Python'
classmethod: bytes
__new__: pythonObject

"
	pythonBytes can be:
		literal - byte string
		int - fill a bytearray of length pythonBytes with 0 (ByteArray is already initialized to 0s)
		iterable - fill bytearray with an iterable of integers

"
	(pythonObject isKindOf: int) ifTrue: [
		^self basicNew ___value: (ByteArray new: pythonObject ___value)
	].
	" TODO should throw error if iterable contains non-int value "
	((pythonObject isKindOf: range)
		or: [(pythonObject isKindOf: list)
		or: [(pythonObject isKindOf: set)
		or: [pythonObject isKindOf: tuple]]]) ifTrue: [
		^self basicNew ___value: pythonObject ___value asArray
	].
	(pythonObject isKindOf: str) ifTrue: [
		TypeError signal: 'string argument without an encoding'
	].


	UnicodeEncodeError signal: '''ascii'' codec can''t encode character ''\x80'' in position 0: ordinal not in range(128)'
%
category: 'Python'
classmethod: bytes
__new__: pythonString _: encoding

	" TODO support more encodings "
	(encoding ___value = 'ascii') ifTrue: [
		(pythonString ___value isKindOf: Unicode7) ifTrue: [
			^self basicNew ___value: (pythonString ___value asArray collect: [:each | each codePoint])
		].
		(pythonString ___value isKindOf: String) ifTrue: [
			^self basicNew ___value: (pythonString ___value asArray collect: [:each | each codePoint])
		].
	].
	self error: 'we only support ascii for now'
%
category: 'Python'
classmethod: bytes
__new__: pythonBytes _: encoding _: errors

"
String Error Handlers : 
	strict : Raises the default UnicodeDecodeError in case of encode failure.
	ignore : Ignores the unencodable character and encodes the remaining string.
	replace : Replaces the unencodable character with a ‘?’.
"

	^self __new__: pythonBytes _: encoding
%
category: 'Smalltalk'
classmethod: bytes
___containerClass

	^ByteArray
%
category: 'Smalltalk'
classmethod: bytes
___fromAsciiString: aString   

	^bytes __call__: (str ___value: aString) _: (str ___value: 'ascii')
%
category: 'Smalltalk'
classmethod: bytes
___whiteSpace

	^self ___value: { 9. 10. 11. 12. 13. 32 }
%
! ------------------- Instance methods for bytes
category: 'Python'
method: bytes
__add__: anArgument

	TypeError signal: 'can''t concat', anArgument class name.
%
category: 'Python'
method: bytes
__contains__: someBytes

	^(self ___container indexOfSubCollection: someBytes ___container
		startingAt: 1
		ifAbsent: [0]) > 0
%
category: 'Python'
method: bytes
__doc__

	^str ___value: 'bytes(iterable_of_ints) -> bytes\n' ,
		'bytes(string, encoding[, errors]) -> bytes\n' ,
		'bytes(bytes_or_buffer) -> immutable copy of bytes_or_buffer\n' ,
		'bytes(int) -> bytes object of size given by the parameter initialized with null bytes\n' ,
		'bytes() -> empty bytes object\n' ,
		'\n' ,
		'Construct an immutable array of bytes from:\n' ,
		'  - an iterable yielding integers in range(256)\n' ,
		'  - a text string encoded using the specified encoding\n' ,
		'  - any object implementing the buffer API.\n' ,
		'  - an integer'
%
category: 'Python'
method: bytes
__eq__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	(otherBytes isKindOf: bytes) ifFalse: [^False].
	^bool ___value: self ___container = otherBytes ___container
%
category: 'Python'
method: bytes
__ge__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	^(self __gt__: otherBytes) ___or: [self __eq__: otherBytes]
%
category: 'Python'
method: bytes
__getitem__: anIndex

	"Handle slice object"
	(anIndex isKindOf: slice) ifTrue: [
		^self ___getslice: anIndex start _: anIndex stop _: anIndex step
	].

	"Handle integer index - returns an int (byte value), not bytes"
	^int ___value: (super __getitem__: anIndex)
%
category: 'Python'
method: bytes
__gt__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	| size |
	size := self ___container size min: otherBytes ___container size.
	1 to: size do: [:index |
		(self ___container at: index) > (otherBytes ___container at: index) ifTrue: [^True].
		(self ___container at: index) < (otherBytes ___container at: index) ifTrue: [^False]
	].
	^self ___container size > otherBytes ___container size ifTrue: [True] ifFalse: [False]
%
category: 'Python'
method: bytes
__init__

		container := self class ___containerClass new.
%
category: 'Python'
method: bytes
__init__: pythonBytes
%
category: 'Python'
method: bytes
__init__: pythonString _: encoding
%
category: 'Python'
method: bytes
__le__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	^(self __gt__: otherBytes) __not__
%
category: 'Python'
method: bytes
__lt__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	^(self __gt__: otherBytes) __not__ ___and: [self __ne__: otherBytes]
%
category: 'Python'
method: bytes
__mod__: anArgument

	TypeError signal: 'not all arguments converted during bytes formatting'.
%
category: 'Python'
method: bytes
__ne__: otherBytes
	"bytes stores Smalltalk Integers, so use Smalltalk comparison"

	^(self __eq__: otherBytes) __not__
%
category: 'Python'
method: bytes
__rmod__: anArgument

	^NotImplementedType singleton
%
category: 'Python'
method: bytes
__str__

	| code1 code2 stream |
	
	code1 := #(9 10 13).
	code2 := #($t $n $r).
	stream := WriteStream on: String new.
	stream nextPutAll: 'b'''.
	container do: [:each |
		(each >= 32 and: [each <= 127]) ifTrue: [
			stream nextPut: (Character codePoint: each).
		] ifFalse: [
			| index |
			index := code1 indexOf: each.
			index > 0 ifTrue: [stream nextPut: $\; nextPut: (code2 at: index)] ifFalse: [
				stream nextPutAll: '\x'.
				each < 16 ifTrue: [stream nextPut: $0].
				stream nextPutAll: (each printStringRadix: 16) asLowercase.
			].
		].
	].
	stream nextPut: $'.

	^str new ___value: stream contents
%
category: 'Python'
method: bytes
capitalize

	| contents new |
	contents := (String withAll: (self ___value asArray collect: [:each | Character codePoint: each])) asLowercase.
	contents at: 1 put: contents first asUppercase.
	new := Array new.
	contents do: [:each | new add: each codePoint].

	^self class ___value: new
%
category: 'Python'
method: bytes
center: with

	^self center: with _: (bytes ___value: { 32 })
%
category: 'Python'
method: bytes
center: pyIntWidth _: pyFillByte

	| leftPad leftPadSize rightPad rightPadSize oddLen |

	(pyFillByte class ~= bytes or: [pyFillByte ___value size > 1]) ifTrue: [TypeError signal: 'center() argument 2 must be a byte string of length 1, not ', pyFillByte class name].
	
	oddLen := self __len__ ___value + (self __len__ ___value \\ 2).

	rightPadSize := (((pyIntWidth ___value - oddLen)//2)+oddLen) - self __len__ ___value.
	rightPad := Array new replaceFrom: 1 to: rightPadSize withObject: pyFillByte ___value first; yourself.

	leftPadSize := pyIntWidth ___value - self __len__ ___value - rightPadSize.
	leftPad := Array new replaceFrom: 1 to: leftPadSize withObject: pyFillByte ___value first; yourself.

	^self class ___value: (Array new addAll: leftPad; addAll: (Array withAll: self ___container); addAll: rightPad; yourself) asArray
%
category: 'Python'
method: bytes
copy

	^self class new ___value: self ___container
%
category: 'Python'
method: bytes
count: aPyObject

	^self count: aPyObject _: (int ___value: 0)
%
category: 'Python'
method: bytes
count: aPyObject _: aPyIntStart


	^self count: aPyObject _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
count: aPyObject _: aPyIntStart _: aPyIntEnd

	| count start idx |

	((aPyObject isKindOf: bytes) or: [aPyObject isKindOf: int]) ifFalse: [TypeError signal: 'argument should be integer or bytes-like object, not ''', aPyObject class name, ''''].

	count := 0.
	start := aPyIntStart ___value.
	[(idx := (self find: aPyObject _: (int ___value: start) _: aPyIntEnd) ___value) >= 0] whileTrue: [
		count := count + 1.
		start := idx + aPyObject ___value size.
	].

	^int ___value: count
%
category: 'Python'
method: bytes
decode

	^self decode: (str ___value: 'utf-8') _: (str ___value: 'strict')
%
category: 'Python'
method: bytes
decode: pyStrEncoding _: pyStrErrors

	#PyTodo"Handle encoding and error handlers".

	^str ___value: (String withAll: (container asArray collect: [:x | Character codePoint: x]))
%
category: 'Python'
method: bytes
endswith: aPyBytes

	^self endswith: aPyBytes _: (int ___value: 0)
%
category: 'Python'
method: bytes
endswith: aPyBytes _: aPyIntStart

	^self endswith: aPyBytes _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
endswith: aPyBytes _: aPyIntStart _: aPyIntEnd

	| idx |
	
	"TODO there is also a case where all elements in the tuple are not bytes objects:
		b'aaa'.endswith(('aa', 'a'))
		TypeError: a bytes-like object is required, not 'str'
	"
	((aPyBytes isKindOf: bytes) or: [aPyBytes isKindOf: tuple]) ifFalse: [TypeError signal: 'endswith first arg must be bytes or a tuple of bytes, not ', aPyBytes class name].

	(aPyBytes isKindOf: bytes) ifTrue: [
		idx := aPyIntEnd ___value - aPyBytes ___value size.
		^bool ___value: (self find: aPyBytes _: (int ___value: idx) _: aPyIntEnd) ___value = idx
	].

	(aPyBytes isKindOf: tuple) ifTrue: [
		aPyBytes ___value do: [:each |
			"Python bool implemented as a Python int which is implemented as a Smalltalk integer, meaning we have this odd test for equality with Smalltalk Booleans"
			(self endswith: each _: aPyIntStart _: aPyIntEnd) ___value ifTrue: [
				^True
			].
		].
		^False
	].
%
category: 'Python'
method: bytes
expandtabs

	^self expandtabs: (int ___value: 8)
%
category: 'Python'
method: bytes
expandtabs: pythonInt

	| columnIndex new tabsize |
	tabsize := pythonInt ___value.
	new := WriteStream on: container class new.
	columnIndex := 0.
	container do: [:each | 
		each == 9 ifTrue: [
			| gap |
			gap := tabsize - (columnIndex \\ tabsize).
			gap == 0 ifTrue: [gap := tabsize].
			gap timesRepeat: [
				new nextPut: 32.
				columnIndex := columnIndex + 1.
			].
		] ifFalse: [
			new nextPut: each.
			(each == 10 or: [each == 13]) ifTrue: [
				columnIndex := 0.
			] ifFalse: [
				columnIndex := columnIndex + 1.
			].
		]
	].

	^self class ___value: new contents
%
category: 'Python'
method: bytes
find: aPyObjectSublist

	^self find: aPyObjectSublist _: (int ___value: 0)
%
category: 'Python'
method: bytes
find: aPyObjectSublist _: aPyIntStart

	^self find: aPyObjectSublist _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
find: aPyObjectSublist _: aPyIntStart _: aPyIntEnd

	| searchBounds searchResult start x |
	start := aPyIntStart ___value.

	(aPyObjectSublist isKindOf: int) ifTrue: [
		x := bytes ___value: { aPyObjectSublist ___value }.
	] ifFalse: [
		(aPyObjectSublist isKindOf: bytes) ifTrue: [
			x := aPyObjectSublist.
		] ifFalse: [
			TypeError signal: 'argument should be integer or bytes-like object, not ''', aPyObjectSublist class name, ''''.
		].
	].

	start < 0 ifTrue: [start := container size - start abs].

	searchBounds := (self ___getslice: (int ___value: 0) _: aPyIntEnd) ___value.
	searchResult := (searchBounds indexOfSubCollection: x ___value startingAt: start + 1) - 1.

	^int ___value: searchResult
%
category: 'Python'
method: bytes
index: aPyObject

	^self index: aPyObject _: (int ___value: 0)
%
category: 'Python'
method: bytes
index: aPyObject _: aPyIntStart

	^self index: aPyObject _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
index: aPyObject _: aPyIntStart _: aPyIntEnd

	| idx |

	((aPyObject isKindOf: bytes) or: [aPyObject isKindOf: int]) ifFalse: [TypeError signal: 'argument should be integer or bytes-like object, not ''', aPyObject class name, ''''].

	idx := self find: aPyObject _: aPyIntStart _: aPyIntEnd.
	idx ___value > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal: 'subsection not found']
%
category: 'Python'
method: bytes
isalnum

	^self __len__ ___value > 0 and: [
		(String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) allSatisfy: [:e | e isAlphaNumeric]
	]
%
category: 'Python'
method: bytes
isalpha

	^self __len__ ___value > 0 and: [
		(String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) allSatisfy: [:e | e isLetter]
	]
%
category: 'Python'
method: bytes
isascii

	^self __len__ ___value == 0 or: [
		self ___container allSatisfy: [:each | each <= 127]
	]
%
category: 'Python'
method: bytes
isdigit

	^self __len__ ___value > 0 and: [
		(String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) allSatisfy: [:e | e isDigit]
	]
%
category: 'Python'
method: bytes
islower

	^self __len__ ___value > 0 and: [
		(String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) allSatisfy: [:e | e isLowercase]
	]
%
category: 'Python'
method: bytes
isspace

	^self __len__ ___value > 0 and: [
		self ___container allSatisfy: [:e | e == 32]
	]
%
category: 'Python'
method: bytes
istitle

	^self __len__ ___value > 0 and: [
		self = self title
	]
%
category: 'Python'
method: bytes
isupper

	^self __len__ ___value > 0 and: [
		(String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) allSatisfy: [:e | e isUppercase]
	]
%
category: 'Python'
method: bytes
join: pyIterable

	| stream first |
	stream := WriteStream on: ByteArray new.
	first := true.
	pyIterable ___container do: [:each |
		(each isKindOf: bytes) ifFalse: [TypeError signal: 'sequence item: expected a bytes-like object, ', each class name, ' found'].
		first ifTrue: [first := false] ifFalse: [stream nextPutAll: container].
		stream nextPutAll: each ___container.
	].
	^self class ___value: stream contents
%
category: 'Python'
method: bytes
ljust: pyIntWidth

	^self ljust: pyIntWidth _: (bytes ___value: (Array with: 32))
%
category: 'Python'
method: bytes
ljust: pyIntWidth _: pyByte

	| new |
	(pyByte class ~= bytes or: [pyByte ___value size > 1]) ifTrue: [TypeError signal: 'ljust() argument 2 must be a byte string of length 1, not ', pyByte class name].
	
	new := Array withAll: container.
	(1 to: (pyIntWidth ___value - container size)) do: [:each | new add: pyByte ___value first].
	^self class ___value: new
%
category: 'Python'
method: bytes
lower

	| lowerString |
	lowerString := Array withAll: (String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) asLowercase.

	^self class ___value: (lowerString collect: [:x | x codePoint])
%
category: 'Python'
method: bytes
lstrip

	^self lstrip: bytes ___whiteSpace
%
category: 'Python'
method: bytes
lstrip: aPyBytesStripset

	| left |
	left := 1.
	
	1 to: container size do: [:i |
		(aPyBytesStripset ___value includes: (container at: i)) ifFalse: [
			^self class ___value: (container copyFrom: left to: container size)
		].
		left := left + 1.
	]
%
category: 'Python'
method: bytes
partition: sep

	| element1 idx |
	idx := self find: sep.
	idx ___value < 0 ifTrue: [
		^tuple ___value: { self copy. self class __call__. self class __call__ }
	].

	element1 := self class __call__.
	idx ___value > 0 ifTrue: [
		element1 := self class ___value: (container copyFrom: 1 to: idx ___value).
	].

	^tuple ___value: {
		element1.
		sep.
		self class ___value: (container copyFrom: idx ___value + 1 + sep ___value size to: container size).
	}
%
category: 'Python'
method: bytes
removeprefix: pyBytesPrefix

	| new |
	(pyBytesPrefix isKindOf: bytes) ifFalse: [TypeError signal: 'a bytes-like object is required, not ''str'''].

	new := container copy.
	(container beginsWith: pyBytesPrefix ___value) ifTrue: [new := container copyFrom: 1 + pyBytesPrefix ___value size to: container size].

	^self class ___value: new
%
category: 'Python'
method: bytes
removesuffix: pyBytesSuffix

	| new |
	(pyBytesSuffix isKindOf: bytes) ifFalse: [TypeError signal: 'a bytes-like object is required, not ''str'''].

	new := container copy.
	(self endswith: pyBytesSuffix) ___value ifTrue: [new := container copyFrom: 1 to: container size - pyBytesSuffix ___value size].

	^self class ___value: new
%
category: 'Python'
method: bytes
replace: pyBytesOld _: pyBytesNew

	^self class ___value: (container copyReplaceAll: pyBytesOld ___value with: pyBytesNew ___value)
%
category: 'Python'
method: bytes
rfind: aSublist

	^self rfind: aSublist _: (int ___value: 0)
%
category: 'Python'
method: bytes
rfind: aSublist _: start

	^self rfind: aSublist _: start _: self __len__
%
category: 'Python'
method: bytes
rfind: aPyObjectSublist _: aPyIntStart _: aPyIntEnd

	| searchResult start end x |

	(aPyObjectSublist isKindOf: int) ifTrue: [
		x := bytes ___value: { aPyObjectSublist ___value }.
	] ifFalse: [
		(aPyObjectSublist isKindOf: bytes) ifTrue: [
			x := bytes ___value: aPyObjectSublist ___value reverse.
		] ifFalse: [
			TypeError signal: 'argument should be integer or bytes-like object, not ''', aPyObjectSublist class name, ''''.
		].
	].
	
	start := int ___value: container size - aPyIntEnd ___value.
	end := int ___value: container size - aPyIntStart ___value.

	searchResult := (bytes ___value: container reverse) find: x _: start _: end.
	searchResult ___value == -1 ifTrue: [^searchResult].
	^int ___value: container size - x ___value size - searchResult ___value
%
category: 'Python'
method: bytes
rindex: aPyObjectSublist

	^self rindex: aPyObjectSublist _: (int ___value: 0)
%
category: 'Python'
method: bytes
rindex: aPyObjectSublist _: aPyIntStart

	^self rindex: aPyObjectSublist _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
rindex: aPyObjectSublist _: aPyIntStart _: aPyIntEnd

	| idx |

	idx := self rfind: aPyObjectSublist _: aPyIntStart _: aPyIntEnd.
	idx ___value > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal: 'subsection not found']
%
category: 'Python'
method: bytes
rjust: aPyIntWidth

	^self rjust: aPyIntWidth _: (bytes ___value: { 32 })
%
category: 'Python'
method: bytes
rjust: aPyIntWidth _: aPyBytesFillChar

	^self class ___value: ((bytes ___value: container reverse) ljust: aPyIntWidth _: aPyBytesFillChar) ___value reverse
%
category: 'Python'
method: bytes
rpartition: aPyObjectSep

	| element1 idx |
	idx := self rfind: aPyObjectSep.
	idx ___value < 0 ifTrue: [
		^tuple ___value: { self class __call__. self class __call__. self copy }
	].

	element1 := self class __call__.
	idx ___value > 0 ifTrue: [
		element1 := self class ___value: (container copyFrom: 1 to: idx ___value).
	].

	^tuple ___value: {
		element1.
		aPyObjectSep.
		self class ___value: (container copyFrom: idx ___value + 1 + aPyObjectSep ___value size to: container size).
	}
%
category: 'Python'
method: bytes
rsplit: sep

	^self rsplit: sep _: (int ___value: -1)
%
category: 'Python'
method: bytes
rsplit: pyBytesSep _: pyIntLimit

	| idx newLimit remaining splits splitsIndex |
	idx := (self rfind: pyBytesSep) ___value + 1.
	idx < 1 ifTrue: [
		^tuple ___value: { self copy }
	].
	pyIntLimit ___value == 0 ifTrue: [
		^tuple ___value: { self copy }
	].

	splits := OrderedCollection new.
	splitsIndex := idx + pyBytesSep ___value size.
	splitsIndex > container size ifTrue: [
		splits add: self class __call__.
	] ifFalse: [
		splits add: (self class ___value: (container copyFrom: splitsIndex to: container size)).
	].
	remaining := container copyFrom: 1 to: idx - 1.
	newLimit := int ___value: pyIntLimit ___value - 1.
	splits addAllFirst: ((self class ___value: remaining) rsplit: pyBytesSep _: newLimit) ___container.

	^tuple ___value: (Array withAll: splits)
%
category: 'Python'
method: bytes
rstrip

	^self rstrip: bytes ___whiteSpace
%
category: 'Python'
method: bytes
rstrip: aPyBytesStripset

	| left |
	left := 1.

	1 to: container size do: [:i |
		(aPyBytesStripset ___value includes: (container reverse at: i)) ifFalse: [
			^self class ___value: (container reverse copyFrom: left to: container size) reverse
		].
		left := left + 1.
	]
%
category: 'Python'
method: bytes
split: pyBytesSep

	^self split: pyBytesSep _: (int ___value: -1)
%
category: 'Python'
method: bytes
split: pyBytesSep _: pyIntLimit

	| idx newLimit remaining splits |
	idx := (self find: pyBytesSep) ___value + 1.
	idx < 1 ifTrue: [
		^tuple ___value: { self copy }
	].
	pyIntLimit ___value == 0 ifTrue: [
		^tuple ___value: { self copy }
	].

	splits := OrderedCollection new.
	splits add: (self class ___value: (container copyFrom: 1 to: idx - 1)).
	remaining := container copyFrom: (idx + pyBytesSep ___value size) to: container size.
	newLimit := int ___value: pyIntLimit ___value - 1.
	splits addAll: ((self class ___value: remaining) split: pyBytesSep _: newLimit) ___container.


	^tuple ___value: (Array withAll: splits)
%
category: 'Python'
method: bytes
splitlines

	^self splitlines: False
%
category: 'Python'
method: bytes
splitlines: keepends

	| lines stream currentLine |
	lines := OrderedCollection new.
	stream := ReadStream on: container.
	currentLine := WriteStream on: ByteArray new.

	[stream atEnd] whileFalse: [
		| byte |
		byte := stream next.
		(byte == 13 or: [byte == 10]) ifTrue: [
			keepends == True ifTrue: [currentLine nextPut: byte].
			"Handle CRLF"
			(byte == 13 and: [stream peek == 10]) ifTrue: [
				keepends == True ifTrue: [currentLine nextPut: stream next] ifFalse: [stream next].
			].
			lines add: (self class ___value: currentLine contents).
			currentLine := WriteStream on: ByteArray new.
		] ifFalse: [
			currentLine nextPut: byte.
		].
	].

	currentLine contents isEmpty ifFalse: [
		lines add: (self class ___value: currentLine contents).
	].

	^list ___value: lines asArray
%
category: 'Python'
method: bytes
startswith: aPyBytesSublist

	^self startswith: aPyBytesSublist _: (int ___value: 0)
%
category: 'Python'
method: bytes
startswith: aPyBytesSublist _: aPyIntStart

	^self startswith: aPyBytesSublist _: aPyIntStart _: self __len__
%
category: 'Python'
method: bytes
startswith: aPyBytesSublist _: aPyIntStart _: aPyBytesEnd

	^bool ___value: (self find: aPyBytesSublist _: aPyIntStart _:aPyBytesEnd) = aPyIntStart
%
category: 'Python'
method: bytes
strip

	^self strip: bytes ___whiteSpace
%
category: 'Python'
method: bytes
strip: stripset

	^(self rstrip: stripset) lstrip: stripset
%
category: 'Python'
method: bytes
swapcase

	| answer |

	answer := String withAll: (self ___container asArray collect: [:x | Character codePoint: x]).
	1 to: answer size do: [:i |
		(answer at: i) isUppercase ifTrue: [answer at: i put: (answer at: i)asLowercase
		] ifFalse: [(answer at: i) isLowercase ifTrue: [answer at: i put: (answer at: i) asUppercase]
			]
		].

	^self class ___value: ((Array withAll: answer) collect: [:x | x codePoint])
%
category: 'Python'
method: bytes
title

	| new previous |
	new := Array new.
	previous := -1.
	container do: [:each |
		((previous between: 65 and: 90) or: [(previous between: 97 and: 122)]) ifTrue: [
			(each between: 65 and: 90) ifTrue: [
				new add: each + 32.
			] ifFalse: [
				new add: each.
			].
		] ifFalse: [
			(each between: 97 and: 122) ifTrue: [
				new add: each - 32.
			] ifFalse: [
				new add: each.
			].
		].
		previous := new last.
	].
	^self class ___value: new
%
category: 'Python'
method: bytes
upper

	| upperString |
	upperString := Array withAll: (String withAll: (self ___container asArray collect: [:x | Character codePoint: x])) asUppercase.

	^self class ___value: (upperString collect: [:x | x codePoint])
%
category: 'Python'
method: bytes
zfill: pyIntWidth

	| padSize result |
	padSize := pyIntWidth ___value - container size.
	padSize <= 0 ifTrue: [^self class ___value: container copy].

	result := ByteArray new: pyIntWidth ___value.
	result atAllPut: 48.  "ASCII for '0'"
	1 to: container size do: [:i | result at: padSize + i put: (container at: i)].

	"Handle sign characters (+ is 43, - is 45)"
	(container size > 0 and: [(container first == 43 or: [container first == 45])]) ifTrue: [
		result at: 1 put: container first.
		result at: padSize + 1 put: 48.
	].

	^self class ___value: result
%
category: 'Smalltalk'
method: bytes
___getslice: aPyIntStart _: aPyIntEnd

	"Delegate to 3-argument version with None step"
	^self ___getslice: aPyIntStart _: aPyIntEnd _: None
%
category: 'Smalltalk'
method: bytes
___getslice: aPyIntStart _: aPyIntEnd _: aPyIntStep
	"Slice with step: b[i:j:k]"

	| start stop step result size |
	size := container size.

	"Handle None step - defaults to 1"
	step := aPyIntStep == None ifTrue: [1] ifFalse: [aPyIntStep ___value].
	step == 0 ifTrue: [ValueError signal: 'slice step cannot be zero'].

	"Handle None values for start and stop based on step direction"
	step > 0 ifTrue: [
		start := aPyIntStart == None ifTrue: [0] ifFalse: [aPyIntStart ___value].
		stop := aPyIntEnd == None ifTrue: [size] ifFalse: [aPyIntEnd ___value].
	] ifFalse: [
		start := aPyIntStart == None ifTrue: [size - 1] ifFalse: [aPyIntStart ___value].
		stop := aPyIntEnd == None ifTrue: [-1 - size] ifFalse: [aPyIntEnd ___value].
	].

	"Handle negative indices"
	start < 0 ifTrue: [start := (size + start) max: 0].
	stop < 0 ifTrue: [stop := size + stop].

	"Clamp to valid range"
	step > 0 ifTrue: [
		start := start min: size.
		stop := stop min: size.
	] ifFalse: [
		start := start min: (size - 1).
		stop := (stop max: -1).
	].

	"Build result"
	result := OrderedCollection new.
	step > 0 ifTrue: [
		| i |
		i := start.
		[i < stop] whileTrue: [
			result add: (container at: i + 1).
			i := i + step.
		].
	] ifFalse: [
		| i |
		i := start.
		[i > stop] whileTrue: [
			result add: (container at: i + 1).
			i := i + step.
		].
	].

	^self class ___value: result asArray
%
category: 'Smalltalk'
method: bytes
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

	"aStream nextPut: self class ___startChar."
	self ___container do: [:element | aStream nextPut: element asCharacter].
	"aStream nextPut: self class ___endChar."
%
