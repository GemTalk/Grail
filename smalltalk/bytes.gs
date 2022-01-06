! ------------------- Remove existing behavior from bytes
removeAllMethods bytes
removeAllClassMethods bytes
! ------------------- Class methods for bytes
set compile_env: 0
category: 'Python'
classmethod: bytes
__call__

	^(self __new__) __init__; yourself
%
category: 'Python'
classmethod: bytes
__call__: pythonObject

	^(self __new__: pythonObject) __init__: pythonObject; yourself.
%
category: 'Python'
classmethod: bytes
__call__: pythonString _: encoding

	^(self __new__: pythonString _: encoding) __init__: pythonString _: encoding; yourself.
%
category: 'Python'
classmethod: bytes
__call__: pythonBytes _: encoding _: errors

	^(self __new__: pythonBytes _: encoding _: errors) __init__: pythonBytes _: encoding _: errors; yourself.
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
		int - fill a bytearray of length pythonBytes with 0
		iterable - fill bytearray with an iterable of integers
	
"
	(pythonObject isKindOf: int) ifTrue: [
		^self basicNew ___value: (self ___containerClass new fillFrom: 1 resizeTo: pythonObject ___value with: 0) immediateInvariant
	].
	" TODO should throw error if iterable contains non-int value "
	((pythonObject isKindOf: range) | (pythonObject isKindOf: list) | (pythonObject isKindOf: set) | (pythonObject isKindOf: tuple)) ifTrue: [
		^self basicNew ___value: (pythonObject ___value asArray) immediateInvariant
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
			^self basicNew ___value: (self ___containerClass new addAll: (pythonString ___value asArray collect: [:each | each codePoint])) immediateInvariant
		].
	].
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

	^self __new__: pythonBytes _: encoding.
%
set compile_env: 0
category: 'Smalltalk'
classmethod: bytes
___containerClass

	^Array
%
! ------------------- Instance methods for bytes
set compile_env: 0
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
__getitem__: anIndex
	^(super __getitem__: anIndex) asCharacter asString
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
__mod__: anArgument
	TypeError signal: 'not all arguments converted during bytes formatting'.
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
	container do: [ :each |
		(each >= 32 and: [ each <= 127 ]) ifTrue: [
			stream nextPut: (Character codePoint: each).
		] ifFalse: [
			| index |
			index := code1 indexOf: each.
			index > 0 ifTrue: [ stream nextPut: $\; nextPut: (code2 at: index) ] ifFalse: [
				stream nextPutAll: '\x'.
				each < 16 ifTrue: [ stream nextPut: $0 ].
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
	| contents |
	contents := (String withAll: self ___value copy) asLowercase.
	contents at: 1 put: contents first asUppercase.

	^self class ___value: contents asArray.
%
category: 'Python'
method: bytes
center: with
	^self center: with _: $ .
%
category: 'Python'
method: bytes
center: width _: fillchar
	| leftPad leftPadSize rightPad rightPadSize oddLen |
	oddLen := self __len__ + (self __len__ \\ 2).

	rightPadSize := (((width - oddLen)//2)+oddLen) - self __len__.
	rightPad := (String new: rightPadSize) replaceFrom: 1 to: rightPadSize withObject: fillchar; yourself.
	leftPadSize := width - self __len__ - rightPadSize.
	leftPad := (String new: leftPadSize) replaceFrom: 1 to: leftPadSize withObject: fillchar; yourself.

	^self class basicNew ___value: (String new add: leftPad; add: (String withAll: self ___container); add: rightPad; yourself) asArray.
%
category: 'Python'
method: bytes
copy

	^self class new ___value: self ___container
%
category: 'Python'
method: bytes
count: aSublist
	^self count: aSublist _: 0
%
category: 'Python'
method: bytes
count: aSublist _: aStart


	^self count: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
count: aSublist _: aStart _: anEnd

	| count start idx |
	count := 0.
	start := aStart.
	[(idx := self find: aSublist _: start _: anEnd) >= 0] whileTrue: [
		count := count + 1.
		start := idx + aSublist size.
	].

	^count
%
category: 'Python'
method: bytes
endswith: aSublist

	^self endswith: aSublist _: 0
%
category: 'Python'
method: bytes
endswith: aSublist _: aStart

	^self endswith: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
endswith: aSublist _: aStart _: anEnd
	| idx |
	idx := anEnd - aSublist size.
	^(self find: aSublist _: idx _:anEnd) = idx
%
category: 'Python'
method: bytes
expandtabs
	^self expandtabs: (int ___value: 8)
%
category: 'Python'
method: bytes
expandtabs: pythonInt
	| columnIndex new tabsize|
	tabsize := pythonInt ___value.
	new := WriteStream on: container class new.
	columnIndex := 0.
	container do: [ :each | 
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
			(each == 10 or: [ each == 13 ]) ifTrue: [
				columnIndex := 0.
			] ifFalse: [
				columnIndex := columnIndex + 1.
			].
		]
	].

	^bytes ___value: new contents
%
category: 'Python'
method: bytes
find: aSublist

	^self find: aSublist _: 0
%
category: 'Python'
method: bytes
find: aSublist _: aStart

	^self find: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
find: aSublist _: aStart _: anEnd

	^(((String withAll: self ___container) copyFrom: 1 to: anEnd) indexOfSubCollection: aSublist startingAt: aStart + 1) - 1
%
category: 'Python'
method: bytes
index: aSublist

	^self index: aSublist _: 0
%
category: 'Python'
method: bytes
index: aSublist _: aStart

	^self index: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
index: aSublist _: aStart _: anEnd
	| idx |

	idx := self find: aSublist _: aStart _: anEnd.
	idx > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal]
%
category: 'Python'
method: bytes
isalnum
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e isAlphaNumeric]
	]
%
category: 'Python'
method: bytes
isalpha
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e isLetter]
	]
%
category: 'Python'
method: bytes
isascii
	^self __len__ = 0 or: [
		self ___container allSatisfy: [ :each | each <= 127 ]
	]
%
category: 'Python'
method: bytes
isdigit
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e isDigit]
	]
%
category: 'Python'
method: bytes
islower
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e isLowercase]
	]
%
category: 'Python'
method: bytes
isspace
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e codePoint = 32 ]
	]
%
category: 'Python'
method: bytes
istitle
	^self __len__ > 0 and: [
		self = self title
	]
%
category: 'Python'
method: bytes
isupper
	^self __len__ > 0 and: [
		(String withAll: self ___container) allSatisfy: [:e | e isUppercase]
	]
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
	" TODO put pyByte type in error not just 'bytes'"
	(pyByte class ~= bytes or: [pyByte ___value size > 1]) ifTrue: [TypeError signal: 'ljust() argument 2 must be a byte string of length 1, not bytes'].
	
	new := Array withAll: container.
	(1 to: (pyIntWidth ___value - container size)) do: [ :each | new add: pyByte ___value first].
	^bytes ___value: new.
%
category: 'Python'
method: bytes
lower
	^self class basicNew ___value: (String withAll: self ___container) asLowercase
%
category: 'Python'
method: bytes
lstrip
	^self lstrip: Character separators
%
category: 'Python'
method: bytes
lstrip: stripset

	^self class new ___initialize:
		(self ___container asString trimLeft: [:char | stripset includes: char])
%
category: 'Python'
method: bytes
partition: sep
	| idx |
	idx := self find: sep.
	idx < 0 ifTrue: [
		^tuple ___value: { self copy. self class new. self class new }
	].

	^tuple ___value: {
		self class new ___initialize: (self ___container asString  takeFirst: idx).
		self class new ___initialize: sep.
		self class new ___initialize: (self ___container asString  last: (self __len__ - idx - sep size))
	}
%
category: 'Python'
method: bytes
removeprefix: heading
	^self class new ___initialize: (self ___container asString withoutPrefix: heading)
%
category: 'Python'
method: bytes
removesuffix: leading
	^self class new ___initialize: (self ___container asString withoutSuffix: leading)
%
category: 'Python'
method: bytes
replace: old _: new
	^self class basicNew ___value:
		((String withAll: self ___container) copyReplaceAll: old with: new)
%
category: 'Python'
method: bytes
rfind: aSublist

	^self rfind: aSublist _: 0
%
category: 'Python'
method: bytes
rfind: aSublist _: start

	^self rfind: aSublist _: start _: self __len__
%
category: 'Python'
method: bytes
rfind: aSublist _: aStart _: anEnd
	| idx |
	idx := ((self ___container asString takeFirst: anEnd)
				reverse takeFirst: (anEnd - aStart))
					indexOfSubCollection: aSublist reverse.

	idx = 0 ifTrue: [^-1].

	^anEnd - idx - aSublist size + 1
%
category: 'Python'
method: bytes
rindex: aSublist

	^self rindex: aSublist _: 0
%
category: 'Python'
method: bytes
rindex: aSublist _: aStart

	^self rindex: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
rindex: aSublist _: aStart _: anEnd
	| idx |

	idx := self rfind: aSublist _: aStart _: anEnd.
	idx > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal]
%
category: 'Python'
method: bytes
rjust: width
	^self rjust: width _: Character space
%
category: 'Python'
method: bytes
rjust: width _: fillchar
	^self class new ___initialize:
		(self ___container asString padLeftTo: width with: fillchar)
%
category: 'Python'
method: bytes
rpartition: sep
	| idx |
	idx := self rfind: sep.
	idx < 0 ifTrue: [
		^tuple ___value: { self class new. self class new. self copy }
	].

	^tuple ___value: {
		self class new ___initialize: (self ___container asString  takeFirst: idx).
		self class new ___initialize: sep.
		self class new ___initialize: (self ___container asString  last: (self __len__ - idx - sep size))
	}
%
category: 'Python'
method: bytes
rsplit: sep
	^self rsplit: sep _: -1
%
category: 'Python'
method: bytes
rsplit: sep _: limit
	| idx splits |
	idx := self rfind: sep.
	idx < 0 ifTrue: [
		^tuple __call__: { self copy }
	].
	limit == 0 ifTrue: [
		^tuple __call__: { self copy }
	].

	splits := OrderedCollection new.
	splits addAll: ((self class new ___initialize:
	  						(self ___container asString  takeFirst: idx)) rsplit: sep _: limit - 1) ___container.
	splits add: (self ___container asString  last: (self __len__ - idx - sep size)).


	^tuple ___value: (splits collect: [:each | self class new ___initialize: each])
%
category: 'Python'
method: bytes
rstrip
	^self rstrip: Character separators
%
category: 'Python'
method: bytes
rstrip: stripset
	^self class new ___initialize:
		(self ___container asString trimRight: [:char | stripset includes: char])
%
category: 'Python'
method: bytes
split: sep
	^self split: sep _: -1
%
category: 'Python'
method: bytes
split: sep _: limit
	| idx splits |
	idx := self find: sep.
	idx < 0 ifTrue: [
		^tuple __call__: { self copy }
	].
	limit == 0 ifTrue: [
		^tuple __call__: { self copy }
	].

	splits := OrderedCollection new.
	splits add: (self ___container asString  takeFirst: idx).
	splits addAll: ((self class new ___initialize:
	  						(self ___container asString  last: (self __len__ - idx - sep size))) split: sep _: limit - 1) ___container.


	^tuple ___value: (splits collect: [:each | self class new ___initialize: each])
%
category: 'Python'
method: bytes
startswith: aSublist

	^self startswith: aSublist _: 0
%
category: 'Python'
method: bytes
startswith: aSublist _: aStart

	^self startswith: aSublist _: aStart _: self __len__
%
category: 'Python'
method: bytes
startswith: aSublist _: aStart _: anEnd

	^(self find: aSublist _: aStart _:anEnd) = aStart
%
category: 'Python'
method: bytes
strip
	^self strip: String space
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

	answer := (String withAll: self ___container).
	1 to: answer size do: [:i |
		(answer at: i) isUppercase ifTrue: [answer at: i put: (answer at: i)asLowercase
		] ifFalse: [(answer at: i) isLowercase ifTrue: [answer at: i put: (answer at: i) asUppercase]
			]
		].

	^self class basicNew ___value: answer.
%
category: 'Python'
method: bytes
title
	| new previous |
	new := Array new.
	previous := -1.
	container do: [ :each |
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
	^bytes ___value: new.
%
category: 'Python'
method: bytes
upper
	^self class new ___initialize: self ___container asString asUppercase
%
set compile_env: 0
category: 'Smalltalk'
method: bytes
___initArgs: args

	args isEmpty ifTrue: [
		container := ByteArray new.
		^self
	].
	((args first isKindOf: Integer) or: [ args first isKindOf: int]) ifTrue: [
		container := ByteArray new asByteArrayOfSize: args first.
		^self
	].

	container := args first asByteArray.
	^self
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
