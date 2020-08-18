! ------------------- Remove existing behavior from str
expectvalue /Metaclass3       
doit
str removeAllMethods.
str class removeAllMethods.
%
! ------------------- Class methods for str
set compile_env: 0
category: 'other'
classmethod: str
consumeFrom: anArray stream: aStream

	| temp |
	anArray do: [ :each | 
		(((temp := (each size = 1) ifTrue: [ aStream peek ] ifFalse: [ aStream peekN: each size ]) asString) = each) 
			ifTrue: [ 
				aStream next: each size. 
				^ each 
			]
	].
	^ nil
%
category: 'other'
classmethod: str
consumeFrom: anArray string: aString

	| temp |
	anArray do: [ :each | 
		(((temp := aString copyFrom: 1 to: each size) asString) = each) 
			ifTrue: [ 
				^ each 
			]
	].
	^ nil
%
category: 'other'
classmethod: str
consumeRules: anArray stream: aStream

	| stream result |
	stream := aStream.
	result := String new.
	anArray do: [ :each | 
		| temp |
		temp := each value: stream copy upToEnd.
		temp ifNil: [ ^ nil ].
		(temp == _remoteNil) ifTrue: [ stream atEnd ifTrue: [ ^ result ] ifFalse: [ ^ nil ] ].
		temp := temp asString.
		stream next: temp size.
		result := result, temp.
	].
	^ result
%
category: 'other'
classmethod: str
containerClass

	^Unicode7
%
category: 'other'
classmethod: str
encode: aStr withEncoding: anEncodingString error: anErrorString

	| result |
	(anEncodingString = 'utf-8') ifFalse: [ self halt ].
	result := ByteArray new.
	aStr ___container do: [:each | 
		| value |
		value := each codePoint.
		value > 255 ifTrue: [self error: 'Cannot represent string as bytearray'].
		result add: value.
	].
	^result
%
category: 'other'
classmethod: str
getDigits

	^ (0 to: 9) collect: [ :each | each asString ]
%
category: 'other'
classmethod: str
parseDigitPart: aString
	"digitpart     ::=  digit (['_'] digit)*"

	| stream temp result |
	stream := ReadStream on: aString.
	result := String new.
	temp := self consumeFrom: self getDigits stream: stream.
	temp ifNil: [ ^ nil ].
	result := result, temp.
	[ 
		stream peekFor: $_.
		temp := self consumeFrom: self getDigits stream: stream.
		temp isNil not.
	] whileTrue: [
		result := result, temp.
	].
	^ result
%
category: 'other'
classmethod: str
parseExponent: aString
	"exponent      ::=  ('e' | 'E') ['+' | '-'] digitpart"

	| stream temp sign |
	stream := ReadStream on: aString.
	sign := '+'.
	temp := self consumeFrom: { 'e' . 'E' } stream: stream.
	temp ifNil: [ ^ nil ].
	temp := self consumeFrom: { '+' . '-' } stream: stream. 
	temp isNil not ifTrue: [ sign := temp ].
	temp := (self parseDigitPart: stream upToEnd) asString.
	^ 'e', sign, temp
%
category: 'other'
classmethod: str
parseExponentFloat: string
	"exponentfloat ::=  (digitpart | pointfloat) exponent"

	| stream temp | 
	stream := ReadStream on: string.
	temp := self consumeRules: { [ :aString | self parseDigitPart: aString ] . [ :aString | self parseExponent: aString ] } stream: stream copy. 
	temp ifNotNil: [ ^ temp ].
	temp := self consumeRules: { [ :aString | self parsePointFloat: aString ] . [ :aString | self parseExponent: aString ] } stream: stream copy. 
	temp ifNotNil: [ ^ temp ].
%
category: 'other'
classmethod: str
parseFloat: aString

	| stream sign numeric_value |
	stream := ReadStream on: aString.
	sign := 1.
	sign := self consumeFrom: { '+' . '-' } stream: stream.
	(sign = '+') ifTrue: [ sign := 1 ].
	(sign = '-') ifTrue: [ sign := -1 ].
	sign ifNil: [ sign := 1 ].
	numeric_value := self consumeFrom: { 'Infinity' . 'inf' . 'nan' } stream: stream.
	numeric_value ifNil: [ ^ str parseFloatNumber: stream upToEnd ].
	"otherwise float is nan or inf"
	(numeric_value = 'Infinity' or: [ numeric_value = 'inf' ]) ifTrue: [ ^ float inf ].
	(numeric_value = 'nan') ifTrue: [ ^ float nan ].
	self halt.
%
category: 'other'
classmethod: str
parseFloatNumber: string
	"floatnumber   ::=  pointfloat | exponentfloat"

	| stream temp | 
	stream := ReadStream on: string.
	temp := self consumeRules: { [ :aString | self parsePointFloat: aString ] . [ :aString | _remoteNil ] } stream: stream copy. "e_e i found a use for _remoteNil lol"
	temp ifNotNil: [ ^ temp ].
	temp := self consumeRules: { [ :aString | self parseExponentFloat: aString ] . [ :aString | _remoteNil ] } stream: stream copy.
	temp ifNotNil: [ ^ temp ].
%
category: 'other'
classmethod: str
parseFraction: aString
	"fraction      ::=  '.' digitpart"

	| stream temp result |
	stream := ReadStream on: aString.
	result := String new.
	(stream peekFor: $.) ifFalse: [ ^ nil ].
	temp := self parseDigitPart: stream upToEnd.
	temp ifNil: [ ^ nil ].
	^ '.', temp asString
%
category: 'other'
classmethod: str
parsePointFloat: string
	"pointfloat    ::=  [digitpart] fraction | digitpart '.'"

	| stream temp | 
	stream := ReadStream on: string.
	temp := self consumeRules: { [ :aString | self parseDigitPart: aString ] . [ :aString | self parseFraction: aString ] } stream: stream copy.
	temp ifNotNil: [ ^ temp ].
	temp := self consumeRules: { [ :aString | self parseDigitPart: aString ] . [ :aString | self consumeFrom: { '.' } string: aString ] } stream: stream copy.
	temp ifNotNil: [ ^ temp ].
	temp := self consumeRules: { [ :aString | self parseFraction: aString ] } stream: stream copy.
	temp ifNotNil: [ ^ temp ].
	temp := self consumeRules: { [ :aString | self parseDigitPart: aString ] . [ :aString | self consumeFrom: { '.' } string: aString ] } stream: stream copy.
	temp ifNotNil: [ ^ temp ].
%
category: 'other'
classmethod: str
removeLeadingZero: aString

	^ aString copyFrom: 2 to: aString size.
%
! ------------------- Instance methods for str
set compile_env: 0
category: 'other'
method: str
+ other

	^str withAll: container + other.container
%
category: 'other'
method: str
asByteArray

	| result |
	result := ByteArray new.
	container do: [:each | 
		| value |
		value := each codePoint.
		value > 255 ifTrue: [self error: 'Cannot represent string as bytearray'].
		result add: value.
	].
	^result
%
category: 'other'
method: str
asInteger

	^container asInteger
%
category: 'other'
method: str
asSymbol

	^container asSymbol
%
category: 'other'
method: str
copyFrom: i to: j

	^str withAll: (container copyFrom: i to: j)
%
category: 'other'
method: str
printOn: aStream

	super printOn: aStream.
	aStream
		nextPutAll: '("';
		nextPutAll: container;
		nextPutAll: '")';
		yourself.
%
category: 'other'
method: str
split: arguments keywords: keywords
	"string.split(separator, max)

		The split() method splits a string into a list.

		You can specify the separator, default separator is any whitespace.

		Note: When max is specified, the list will contain the specified number of elements plus one.

		separator	Optional. Specifies the separator to use when splitting the string. Default value is a whitespace
		max	Optional. Specifies how many splits to do. Default value is -1, which is ""all occurrences"""

	| result |
	result := list new.
	container subStrings do: [:each | result add: (str withAll: each)].
	^result
%
category: 'other'
method: str
value: anObject

	self halt
%
set compile_env: 0
category: 'Python'
method: str
__add__

	^[:lhs :rhs | 
		(lhs isKindOf: str) ifFalse: [TypeError signal: 'descriptor ''__add__'' requires a ''str'' object but received a ' , lhs class name].
		(rhs isKindOf: str) ifFalse: [TypeError signal: 'descriptor ''__add__'' requires a ''str'' object but received a ' , rhs class name].
		str withAll: lhs.container , rhs.container]
%
category: 'Python'
method: str
__contains__

	self halt.
%
category: 'Python'
method: str
__float__

	^ [ :anObject | float with: anObject ]
%
category: 'Python'
method: str
__getitem__

	self halt.
%
category: 'Python'
method: str
__getnewargs__

	self halt.
%
category: 'Python'
method: str
__iter__

	self halt.
%
category: 'Python'
method: str
__mod__

	self halt.
%
category: 'Python'
method: str
__mul__

	self halt.
%
category: 'Python'
method: str
__rmod__

	self halt.
%
category: 'Python'
method: str
__rmul__

	self halt.
%
category: 'Python'
method: str
__str__

	^ [ :rhs | rhs ]
%
category: 'Python'
method: str
capitalize

	self halt.
%
category: 'Python'
method: str
casefold

	self halt.
%
category: 'Python'
method: str
center

	self halt.
%
category: 'Python'
method: str
count

	self halt.
%
category: 'Python'
method: str
encode

	self halt.
%
category: 'Python'
method: str
endswith

	self halt.
%
category: 'Python'
method: str
expandtabs

	self halt.
%
category: 'Python'
method: str
find

	self halt.
%
category: 'Python'
method: str
format

	self halt.
%
category: 'Python'
method: str
format_map

	self halt.
%
category: 'Python'
method: str
index

	self halt.
%
category: 'Python'
method: str
isalnum

	self halt.
%
category: 'Python'
method: str
isalpha

	self halt.
%
category: 'Python'
method: str
isascii

	self halt.
%
category: 'Python'
method: str
isdecimal

	self halt.
%
category: 'Python'
method: str
isdigit

	self halt.
%
category: 'Python'
method: str
isidentifier

	self halt.
%
category: 'Python'
method: str
islower

	self halt.
%
category: 'Python'
method: str
isnumeric

	self halt.
%
category: 'Python'
method: str
isprintable

	self halt.
%
category: 'Python'
method: str
isspace

	self halt.
%
category: 'Python'
method: str
istitle

	self halt.
%
category: 'Python'
method: str
isupper

	self halt.
%
category: 'Python'
method: str
join

	self halt.
%
category: 'Python'
method: str
ljust

	self halt.
%
category: 'Python'
method: str
lower

	self halt.
%
category: 'Python'
method: str
lstrip

	self halt.
%
category: 'Python'
method: str
maketrans

	self halt.
%
category: 'Python'
method: str
partition

	self halt.
%
category: 'Python'
method: str
replace

	self halt.
%
category: 'Python'
method: str
rfind

	self halt.
%
category: 'Python'
method: str
rindex

	self halt.
%
category: 'Python'
method: str
rjust

	self halt.
%
category: 'Python'
method: str
rpartition

	self halt.
%
category: 'Python'
method: str
rsplit

	self halt.
%
category: 'Python'
method: str
rstrip

	self halt.
%
category: 'Python'
method: str
split

	self halt.
%
category: 'Python'
method: str
splitlines

	self halt.
%
category: 'Python'
method: str
startswith

	self halt.
%
category: 'Python'
method: str
strip

	self halt.
%
category: 'Python'
method: str
swapcase

	self halt.
%
category: 'Python'
method: str
title

	self halt.
%
category: 'Python'
method: str
translate

	self halt.
%
category: 'Python'
method: str
upper

	self halt.
%
category: 'Python'
method: str
zfill

	self halt.
%
