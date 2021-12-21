! ------------------- Remove existing behavior from bytes
removeAllMethods bytes
removeAllClassMethods bytes
! ------------------- Class methods for bytes
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
capitalize
	^self class new ___initialize: self ___container asString asLowercase capitalized
%
category: 'Python'
method: bytes
center: with
	^self center: with _: $ .
%
category: 'Python'
method: bytes
center: width _: fillchar
	| oddLen |
	oddLen := self __len__ + (self __len__ \\ 2).

	^self class  new ___initialize:
		((self ___container asString padRightTo: (((width - oddLen)//2)+oddLen) with: fillchar)
		          padLeftTo: width with: fillchar) .
%
category: 'Python'
method: bytes
copy

	^self class new ___initialize: self ___container
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
	^self expandtabs: 8
%
category: 'Python'
method: bytes
expandtabs: tabsize
	^self replace: String tab _: (String space repeat: tabsize)
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

	^((self ___container asString takeFirst: anEnd)
			indexOfSubCollection: aSublist startingAt: aStart + 1) - 1
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
		self ___container asString allSatisfy: [:e | e isAlphaNumeric]
	]
%
category: 'Python'
method: bytes
isalpha
	^self __len__ > 0 and: [
		self ___container asString allSatisfy: [:e | e isLetter]
	]
%
category: 'Python'
method: bytes
isascii
	^self __len__ = 0 or: [
		self ___container asString isAsciiString
	]
%
category: 'Python'
method: bytes
isdigit
	^self __len__ > 0 and: [
		self ___container asString allSatisfy: [:e | e isDigit]
	]
%
category: 'Python'
method: bytes
islower
	^self __len__ > 0 and: [
		self ___container asString allSatisfy: [:e | e isLowercase]
	]
%
category: 'Python'
method: bytes
isspace
	^self __len__ > 0 and: [
		self ___container asString allSatisfy: [:e | e isSpaceSeparator]
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
		self ___container asString allSatisfy: [:e | e isUppercase]
	]
%
category: 'Python'
method: bytes
ljust: width
	^self ljust: width _: Character space
%
category: 'Python'
method: bytes
ljust: width _: fillchar
	^self class new ___initialize:
		(self ___container asString padRightTo: width with: fillchar)
%
category: 'Python'
method: bytes
lower
	^self class new ___initialize: self ___container asString asLowercase
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
	^self class new ___initialize:
		(self ___container asString copyReplaceAll: old with: new)
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

	answer := self ___container asString.
	1 to: answer size do: [:i |
		(answer at: i) isUppercase ifTrue: [answer at: i put: (answer at: i)asLowercase
		] ifFalse: [(answer at: i) isLowercase ifTrue: [answer at: i put: (answer at: i) asUppercase]
			]
		].

	^self class new ___initialize: answer.
%
category: 'Python'
method: bytes
title
	^self class new ___initialize:
	(String streamContents: [:stream |
               self ___container asString substrings do: [:sub |
                       stream nextPutAll: sub capitalized]
					separatedBy: [stream space] ])
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
