! ------------------- Remove existing behavior from str
removeallmethods str
removeallclassmethods str
! ------------------- Class methods for str
category: 'other'
classmethod: str
___value: aString

	^self basicNew
		___value: aString;
		yourself
%
! ------------------- Instance methods for str
category: 'Python'
method: str
__add__: pythonObject


	pythonObject class ~= str ifTrue: [TypeError signal: 'must a string, not ', pythonObject class name].

	^str ___value: value , pythonObject ___value
%
category: 'Python'
method: str
__bool__

	^bool ___value: value ~= ''
%
category: 'Python'
method: str
__contains__: aPyStr

	^bool ___value: (value includesString: aPyStr ___value)
%
category: 'Python'
method: str
__doc__

	^str ___value: 'str(object='''') -> str\n' ,
		'str(bytes_or_buffer[, encoding[, errors]]) -> str\n' ,
		'\n' ,
		'Create a new string object from the given object. If encoding or\n' ,
		'errors is specified, then the object must expose a data buffer\n' ,
		'that will be decoded using the given encoding and error handler.\n' ,
		'Otherwise, returns the result of object.__str__() (if defined)\n' ,
		'or repr(object).\n' ,
		'encoding defaults to ''utf-8''.\n' ,
		'errors defaults to ''strict''.'
%
category: 'Python'
method: str
__eq__: anObject

	^bool ___value: ((anObject isKindOf: str) and: [value = anObject ___value])
%
category: 'Python'
method: str
__float__

	
	^float ___value: self ___value asNumber
%
category: 'Python'
method: str
__ge__: other

	(1 to: value size) do: [:i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue > otherValue ifTrue: [
			^True
		] ifFalse: [
			myValue < otherValue ifTrue: [
				^False
			].
		].
	].

	^True
%
category: 'Python'
method: str
__getitem__: pyInt

	"Handle slice object"
	(pyInt isKindOf: slice) ifTrue: [
		^self ___getslice: pyInt start _: pyInt stop _: pyInt step
	].

	"Handle integer index"
	^str ___value: (value at: pyInt ___value + 1) asString
%
category: 'Python'
method: str
__getnewargs__
	" Not well-documented. Implementation based on what is output from Python."

	^tuple ___value: { str ___value: value. }
%
category: 'Python'
method: str
__gt__: other

	(1 to: value size) do: [:i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue > otherValue ifTrue: [
			^True
		] ifFalse: [
			myValue < otherValue ifTrue: [
				^False
			].
		].
	].

	^False
%
category: 'Python'
method: str
__hash__

	^int ___value: value hash
%
category: 'Python'
method: str
__init__: aString

	value := aString.
%
category: 'Python'
method: str
__le__: other

	(1 to: value size) do: [:i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue < otherValue ifTrue: [
			^True
		] ifFalse: [
			myValue > otherValue ifTrue: [
				^False
			].
		].
	].

	^True
%
category: 'Python'
method: str
__len__

	^int ___value: value size
%
category: 'Python'
method: str
__lt__: other

	(1 to: value size) do: [:i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue < otherValue ifTrue: [
			^True
		] ifFalse: [
			myValue > otherValue ifTrue: [
				^False
			].
		].
	].

	^False
%
category: 'Python'
method: str
__mod__: anObject

	| stringOutput |

	stringOutput := value asString.

	^str ___value: (anObject ___modString: stringOutput)
%
category: 'Python'
method: str
__mul__: pyInt

	| stream |
	stream := WriteStream on: String new.

	(1 to: pyInt ___value) do: [:_|
		stream nextPutAll: value.
	].

	^str ___value: stream contents
%
category: 'Python'
method: str
__ne__: anObject

	^bool ___value: ((anObject isKindOf: str) and: [value = anObject ___value]) not
%
category: 'Python'
method: str
__repr__

	
	^str ___value: self ___value printString
%
category: 'Python'
method: str
__rmod__: any

	^any __mod__: self
%
category: 'Python'
method: str
__str__

	
	^self
%
category: 'Python'
method: str
capitalize

	| stream |
	
	stream := WriteStream on: String new.
	stream nextPut: (value at: 1) asUppercase.
	(value copyFrom: 2 to: value size) do: [:elem | 
		stream nextPut: elem asLowercase.
	].

	^str ___value: stream contents
%
category: 'Python'
method: str
center: pyIntWidth

	^self center: pyIntWidth _: (str ___value: ' ')
%
category: 'Python'
method: str
center: pyIntWidth _: pyFillChar

	| leftPad leftPadSize rightPad rightPadSize oddLen fillChar |

	(pyFillChar class ~= str or: [pyFillChar ___value size ~= 1]) ifTrue: [TypeError signal: 'The fill character must be exactly one character long'].

	fillChar := pyFillChar ___value first.
	oddLen := value size + (value size \\ 2).

	rightPadSize := (((pyIntWidth ___value - oddLen)//2)+oddLen) - value size.
	rightPadSize < 0 ifTrue: [rightPadSize := 0].
	rightPad := String new: rightPadSize.
	rightPad atAllPut: fillChar.

	leftPadSize := pyIntWidth ___value - value size - rightPadSize.
	leftPadSize < 0 ifTrue: [leftPadSize := 0].
	leftPad := String new: leftPadSize.
	leftPad atAllPut: fillChar.

	^str ___value: leftPad, value, rightPad
%
category: 'Python'
method: str
count: aPyStr

	^self count: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
count: aPyStr _: aPyIntStart

	^self count: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
count: aPyStr _: aPyIntStart _: aPyIntEnd

	| count start idx substr |

	(aPyStr class == str) ifFalse: [TypeError signal: 'must be str, not ', aPyStr class name].

	count := 0.
	start := aPyIntStart ___value.
	substr := aPyStr ___value.
	[(idx := (self find: aPyStr _: (int ___value: start) _: aPyIntEnd) ___value) >= 0] whileTrue: [
		count := count + 1.
		start := idx + substr size.
	].

	^int ___value: count
%
category: 'Python'
method: str
encode

	^self encode: (str ___value: 'utf-8') _: (str ___value: 'strict')
%
category: 'Python'
method: str
encode: pyStrEncoding

	^self encode: pyStrEncoding _: (str ___value: 'strict')
%
category: 'Python'
method: str
encode: pyStrEncoding _: pyStrErrors

	"For now, only support ASCII encoding"
	(pyStrEncoding ___value = 'ascii' or: [pyStrEncoding ___value = 'utf-8']) ifTrue: [
		^bytes ___value: (value asArray collect: [:each | each codePoint])
	].
	LookupError signal: 'unknown encoding: ', pyStrEncoding ___value
%
category: 'Python'
method: str
endswith: aPyStr

	^self endswith: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
endswith: aPyStr _: aPyIntStart

	^self endswith: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
endswith: aPyStr _: aPyIntStart _: aPyIntEnd

	| idx |

	(aPyStr class == str or: [aPyStr class == tuple]) ifFalse: [TypeError signal: 'endswith first arg must be str or a tuple of str, not ', aPyStr class name].

	aPyStr class == str ifTrue: [
		idx := aPyIntEnd ___value - aPyStr ___value size.
		^bool ___value: (self find: aPyStr _: (int ___value: idx) _: aPyIntEnd) ___value = idx
	].

	aPyStr class == tuple ifTrue: [
		aPyStr ___value do: [:each |
			(self endswith: each _: aPyIntStart _: aPyIntEnd) ___value ifTrue: [
				^True
			].
		].
		^False
	]
%
category: 'Python'
method: str
expandtabs

	^self expandtabs: (int ___value: 8)
%
category: 'Python'
method: str
expandtabs: pythonInt

	| columnIndex stream tabsize |
	tabsize := pythonInt ___value.
	stream := WriteStream on: String new.
	columnIndex := 0.
	value do: [:each |
		each == Character tab ifTrue: [
			| gap |
			gap := tabsize - (columnIndex \\ tabsize).
			gap == 0 ifTrue: [gap := tabsize].
			gap timesRepeat: [
				stream nextPut: Character space.
				columnIndex := columnIndex + 1.
			].
		] ifFalse: [
			stream nextPut: each.
			(each == Character lf or: [each == Character cr]) ifTrue: [
				columnIndex := 0.
			] ifFalse: [
				columnIndex := columnIndex + 1.
			].
		].
	].
	^str ___value: stream contents
%
category: 'Python'
method: str
find: aPyStr

	^self find: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
find: aPyStr _: aPyIntStart

	^self find: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
find: aPyStr _: aPyIntStart _: aPyIntEnd

	| searchBounds searchResult start |
	start := aPyIntStart ___value.

	aPyStr class == str ifFalse: [
		TypeError signal: 'must be str, not ', aPyStr class name.
	].

	start < 0 ifTrue: [start := (value size + start) max: 0].

	searchBounds := (self ___getslice: (int ___value: 0) _: aPyIntEnd) ___value.
	searchResult := (searchBounds findString: aPyStr ___value startingAt: start + 1) - 1.

	^int ___value: searchResult
%
category: 'Python'
method: str
hash

	^value hash
%
category: 'Python'
method: str
index: aPyStr

	^self index: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
index: aPyStr _: aPyIntStart

	^self index: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
index: aPyStr _: aPyIntStart _: aPyIntEnd

	| idx |

	aPyStr class == str ifFalse: [TypeError signal: 'must be str, not ', aPyStr class name].

	idx := self find: aPyStr _: aPyIntStart _: aPyIntEnd.
	idx ___value > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal: 'substring not found']
%
category: 'Python'
method: str
isalnum

	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isAlphaNumeric]])
%
category: 'Python'
method: str
isalpha

	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isLetter]])
%
category: 'Python'
method: str
isascii

	^bool ___value: (value size == 0 or: [value allSatisfy: [:each | each codePoint <= 127]])
%
category: 'Python'
method: str
isdecimal

	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isDigit]])
%
category: 'Python'
method: str
isdigit

	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isDigit]])
%
category: 'Python'
method: str
isidentifier

	| first |
	value isEmpty ifTrue: [^False].
	first := value first.
	(first isLetter or: [first == $_]) ifFalse: [^False].
	^bool ___value: ((value copyFrom: 2 to: value size) allSatisfy: [:e | e isAlphaNumeric or: [e == $_]])
%
category: 'Python'
method: str
islower

	^bool ___value: (value size > 0 and: [(value select: [:e | e isLetter]) allSatisfy: [:e | e isLowercase]])
%
category: 'Python'
method: str
isnumeric

	"For basic ASCII, isnumeric is same as isdigit"
	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isDigit]])
%
category: 'Python'
method: str
isprintable

	^bool ___value: (value size == 0 or: [value allSatisfy: [:each | each codePoint >= 32 and: [each codePoint <= 126]]])
%
category: 'Python'
method: str
isspace

	^bool ___value: (value size > 0 and: [value allSatisfy: [:e | e isSeparator]])
%
category: 'Python'
method: str
istitle

	^bool ___value: (value size > 0 and: [value = self title ___value])
%
category: 'Python'
method: str
isupper

	^bool ___value: (value size > 0 and: [(value select: [:e | e isLetter]) allSatisfy: [:e | e isUppercase]])
%
category: 'Python'
method: str
join: pyIterable

	| stream first |
	stream := WriteStream on: String new.
	first := true.
	pyIterable ___container do: [:each |
		each class == str ifFalse: [TypeError signal: 'sequence item: expected str instance, ', each class name, ' found'].
		first ifTrue: [first := false] ifFalse: [stream nextPutAll: value].
		stream nextPutAll: each ___value.
	].
	^str ___value: stream contents
%
category: 'Python'
method: str
ljust: pyIntWidth

	^self ljust: pyIntWidth _: (str ___value: ' ')
%
category: 'Python'
method: str
ljust: pyIntWidth _: pyFillChar

	| padSize pad |
	(pyFillChar class ~= str or: [pyFillChar ___value size ~= 1]) ifTrue: [TypeError signal: 'The fill character must be exactly one character long'].

	padSize := pyIntWidth ___value - value size.
	padSize <= 0 ifTrue: [^str ___value: value copy].
	pad := String new: padSize.
	pad atAllPut: pyFillChar ___value first.
	^str ___value: value, pad
%
category: 'Python'
method: str
lower

	^str ___value: value asLowercase
%
category: 'Python'
method: str
lstrip

	^self lstrip: (str ___value: ' ', Character tab asString, Character lf asString, Character cr asString)
%
category: 'Python'
method: str
lstrip: aPyStrChars

	| left |
	left := 1.

	1 to: value size do: [:i |
		(aPyStrChars ___value includes: (value at: i)) ifFalse: [
			^str ___value: (value copyFrom: left to: value size)
		].
		left := left + 1.
	].
	^str ___value: ''
%
category: 'Python'
method: str
partition: sep

	| idx |
	idx := self find: sep.
	idx ___value < 0 ifTrue: [
		^tuple ___value: { self copy. str ___value: ''. str ___value: '' }
	].

	^tuple ___value: {
		str ___value: (value copyFrom: 1 to: idx ___value).
		sep.
		str ___value: (value copyFrom: idx ___value + 1 + sep ___value size to: value size).
	}
%
category: 'Python'
method: str
removeprefix: pyStrPrefix

	| new |
	pyStrPrefix class == str ifFalse: [TypeError signal: 'removeprefix arg must be str, not ', pyStrPrefix class name].

	new := value copy.
	(value beginsWith: pyStrPrefix ___value) ifTrue: [new := value copyFrom: 1 + pyStrPrefix ___value size to: value size].

	^str ___value: new
%
category: 'Python'
method: str
removesuffix: pyStrSuffix

	| new |
	pyStrSuffix class == str ifFalse: [TypeError signal: 'removesuffix arg must be str, not ', pyStrSuffix class name].

	new := value copy.
	(self endswith: pyStrSuffix) ___value ifTrue: [new := value copyFrom: 1 to: value size - pyStrSuffix ___value size].

	^str ___value: new
%
category: 'Python'
method: str
replace: pyStrOld _: pyStrNew

	^str ___value: (value copyReplaceAll: pyStrOld ___value with: pyStrNew ___value)
%
category: 'Python'
method: str
rfind: aPyStr

	^self rfind: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
rfind: aPyStr _: aPyIntStart

	^self rfind: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
rfind: aPyStr _: aPyIntStart _: aPyIntEnd

	| searchResult start end |

	aPyStr class == str ifFalse: [
		TypeError signal: 'must be str, not ', aPyStr class name.
	].

	start := value size - aPyIntEnd ___value.
	end := value size - aPyIntStart ___value.

	searchResult := value reverse findString: aPyStr ___value reverse startingAt: start + 1.
	searchResult == 0 ifTrue: [^int ___value: -1].
	^int ___value: value size - aPyStr ___value size - searchResult + 1
%
category: 'Python'
method: str
rindex: aPyStr

	^self rindex: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
rindex: aPyStr _: aPyIntStart

	^self rindex: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
rindex: aPyStr _: aPyIntStart _: aPyIntEnd

	| idx |

	idx := self rfind: aPyStr _: aPyIntStart _: aPyIntEnd.
	idx ___value > -1
		ifTrue: [^idx]
		ifFalse: [ValueError signal: 'substring not found']
%
category: 'Python'
method: str
rjust: pyIntWidth

	^self rjust: pyIntWidth _: (str ___value: ' ')
%
category: 'Python'
method: str
rjust: pyIntWidth _: pyFillChar

	| padSize pad |
	(pyFillChar class ~= str or: [pyFillChar ___value size ~= 1]) ifTrue: [TypeError signal: 'The fill character must be exactly one character long'].

	padSize := pyIntWidth ___value - value size.
	padSize <= 0 ifTrue: [^str ___value: value copy].
	pad := String new: padSize.
	pad atAllPut: pyFillChar ___value first.
	^str ___value: pad, value
%
category: 'Python'
method: str
rpartition: sep

	| idx |
	idx := self rfind: sep.
	idx ___value < 0 ifTrue: [
		^tuple ___value: { str ___value: ''. str ___value: ''. self copy }
	].

	^tuple ___value: {
		str ___value: (value copyFrom: 1 to: idx ___value).
		sep.
		str ___value: (value copyFrom: idx ___value + 1 + sep ___value size to: value size).
	}
%
category: 'Python'
method: str
rsplit: sep

	^self rsplit: sep _: (int ___value: -1)
%
category: 'Python'
method: str
rsplit: pyStrSep _: pyIntLimit

	| idx newLimit remaining splits splitsIndex |
	idx := (self rfind: pyStrSep) ___value + 1.
	idx < 1 ifTrue: [
		^list ___value: { self copy }
	].
	pyIntLimit ___value == 0 ifTrue: [
		^list ___value: { self copy }
	].

	splits := OrderedCollection new.
	splitsIndex := idx + pyStrSep ___value size.
	splitsIndex > value size ifTrue: [
		splits add: (str ___value: '').
	] ifFalse: [
		splits add: (str ___value: (value copyFrom: splitsIndex to: value size)).
	].
	remaining := value copyFrom: 1 to: idx - 1.
	newLimit := int ___value: pyIntLimit ___value - 1.
	splits addAllFirst: ((str ___value: remaining) rsplit: pyStrSep _: newLimit) ___container.

	^list ___value: (Array withAll: splits)
%
category: 'Python'
method: str
rstrip

	^self rstrip: (str ___value: ' ', Character tab asString, Character lf asString, Character cr asString)
%
category: 'Python'
method: str
rstrip: aPyStrChars

	| right |
	right := value size.

	value size to: 1 by: -1 do: [:i |
		(aPyStrChars ___value includes: (value at: i)) ifFalse: [
			^str ___value: (value copyFrom: 1 to: right)
		].
		right := right - 1.
	].
	^str ___value: ''
%
category: 'Python'
method: str
split: sep

	^self split: sep _: (int ___value: -1)
%
category: 'Python'
method: str
split: pyStrSep _: pyIntLimit

	| idx newLimit remaining splits |
	idx := (self find: pyStrSep) ___value + 1.
	idx < 1 ifTrue: [
		^list ___value: { self copy }
	].
	pyIntLimit ___value == 0 ifTrue: [
		^list ___value: { self copy }
	].

	splits := OrderedCollection new.
	splits add: (str ___value: (value copyFrom: 1 to: idx - 1)).
	remaining := value copyFrom: (idx + pyStrSep ___value size) to: value size.
	newLimit := int ___value: pyIntLimit ___value - 1.
	splits addAll: ((str ___value: remaining) split: pyStrSep _: newLimit) ___container.

	^list ___value: (Array withAll: splits)
%
category: 'Python'
method: str
splitlines

	^self splitlines: False
%
category: 'Python'
method: str
splitlines: keepends

	| lines stream currentLine |
	lines := OrderedCollection new.
	stream := ReadStream on: value.
	currentLine := WriteStream on: String new.

	[stream atEnd] whileFalse: [
		| char |
		char := stream next.
		(char == Character cr or: [char == Character lf]) ifTrue: [
			keepends == True ifTrue: [currentLine nextPut: char].
			"Handle CRLF"
			(char == Character cr and: [stream peek == Character lf]) ifTrue: [
				keepends == True ifTrue: [currentLine nextPut: stream next] ifFalse: [stream next].
			].
			lines add: (str ___value: currentLine contents).
			currentLine := WriteStream on: String new.
		] ifFalse: [
			currentLine nextPut: char.
		].
	].

	currentLine contents isEmpty ifFalse: [
		lines add: (str ___value: currentLine contents).
	].

	^list ___value: lines asArray
%
category: 'Python'
method: str
startswith: aPyStr

	^self startswith: aPyStr _: (int ___value: 0)
%
category: 'Python'
method: str
startswith: aPyStr _: aPyIntStart

	^self startswith: aPyStr _: aPyIntStart _: self __len__
%
category: 'Python'
method: str
startswith: aPyStr _: aPyIntStart _: aPyIntEnd

	(aPyStr class == str or: [aPyStr class == tuple]) ifFalse: [TypeError signal: 'startswith first arg must be str or a tuple of str, not ', aPyStr class name].

	aPyStr class == str ifTrue: [
		^bool ___value: (self find: aPyStr _: aPyIntStart _: aPyIntEnd) = aPyIntStart
	].

	aPyStr class == tuple ifTrue: [
		aPyStr ___value do: [:each |
			(self startswith: each _: aPyIntStart _: aPyIntEnd) ___value ifTrue: [
				^True
			].
		].
		^False
	]
%
category: 'Python'
method: str
strip

	^self strip: (str ___value: ' ', Character tab asString, Character lf asString, Character cr asString)
%
category: 'Python'
method: str
strip: stripset

	^(self rstrip: stripset) lstrip: stripset
%
category: 'Python'
method: str
swapcase

	| stream |
	stream := WriteStream on: String new.
	value do: [:each |
		each isUppercase ifTrue: [stream nextPut: each asLowercase]
		ifFalse: [each isLowercase ifTrue: [stream nextPut: each asUppercase]
			ifFalse: [stream nextPut: each]].
	].
	^str ___value: stream contents
%
category: 'Python'
method: str
tagFrom: aReadStream

	^FormatTag new initializeFrom: aReadStream
%
category: 'Python'
method: str
title

	| stream previous |
	stream := WriteStream on: String new.
	previous := Character space.
	value do: [:each |
		previous isLetter ifTrue: [
			stream nextPut: each asLowercase.
		] ifFalse: [
			stream nextPut: each asUppercase.
		].
		previous := each.
	].
	^str ___value: stream contents
%
category: 'Python'
method: str
upper

	^str ___value: value asUppercase
%
category: 'Python'
method: str
zfill: pyIntWidth

	| padSize result pad |
	padSize := pyIntWidth ___value - value size.
	padSize <= 0 ifTrue: [^str ___value: value copy].

	pad := String new: padSize.
	pad atAllPut: $0.
	result := pad, value.

	"Handle sign characters"
	(value size > 0 and: [(value first == $+ or: [value first == $-])]) ifTrue: [
		result at: 1 put: value first.
		result at: padSize + 1 put: $0.
	].

	^str ___value: result
%
category: 'Smalltalk'
method: str
___convertWithFlags: aSet precision: anObject andType: aCharacter
	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	| invalidTypes return |

	invalidTypes := {
			$d->[TypeError signal: 'TypeError: %d format: a real number is required, not str'].
			$i->[TypeError signal: 'TypeError: %i format: a real number is required, not str'].
			$u->[TypeError signal: 'TypeError: %u format: a real number is required, not str'].
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$f->[TypeError signal: 'TypeError: must be real number, not str'].
			$F->[TypeError signal: 'TypeError: must be real number, not str'].
			$e->[TypeError signal: 'TypeError: must be real number, not str'].
			$E->[TypeError signal: 'TypeError: must be real number, not str'].
			$g->[TypeError signal: 'TypeError: must be real number, not str'].
			$G->[TypeError signal: 'TypeError: must be real number, not str'].
		} asDictionary.

	(invalidTypes includes: aCharacter) ifTrue: [
		(invalidTypes at: aCharacter) value.
	].

	return := value.
	(aCharacter == $r or: [aCharacter == $a]) ifTrue: [
		return := self __repr__ ___value
	].
	
	((aCharacter == $c) and: [return size > 1]) ifTrue: [
		TypeError signal: 'TypeError: %c requires int or char'
	].

	(anObject ~= '' and: [anObject < return size]) ifTrue: [return := return copyFrom: 1 to: anObject].
	^return
%
category: 'Smalltalk'
method: str
___getslice: aPyIntStart _: aPyIntEnd

	"Delegate to 3-argument version with None step"
	^self ___getslice: aPyIntStart _: aPyIntEnd _: None
%
category: 'Smalltalk'
method: str
___getslice: aPyIntStart _: aPyIntEnd _: aPyIntStep

	| start stop step stream size |
	size := value size.

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
	stream := WriteStream on: String new.
	step > 0 ifTrue: [
		| i |
		i := start.
		[i < stop] whileTrue: [
			stream nextPut: (value at: i + 1).
			i := i + step.
		].
	] ifFalse: [
		| i |
		i := start.
		[i > stop] whileTrue: [
			stream nextPut: (value at: i + 1).
			i := i + step.
		].
	].

	^str ___value: stream contents
%
category: 'Smalltalk'
method: str
___string

	^value
%
category: 'Smalltalk'
method: str
___value

	^value
%
category: 'Smalltalk'
method: str
___value: aString

	value := aString.
%
category: 'Smalltalk'
method: str
printOn: aStream

	aStream
		nextPutAll: 'str(';
		print: value;
		nextPut: $);
		yourself.
%
