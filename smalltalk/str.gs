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
