! ===============================================================================
! CharacterCollection Methods (Python 'str' type)
! ===============================================================================
! This file contains method implementations for CharacterCollection, the common
! superclass of both String (→ Unicode7) and MultiByteString (→ Unicode16,
! Unicode32). Installing here makes all Python string methods available on
! every string subclass automatically.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from CharacterCollection
expectvalue /Metaclass3
doit
"Remove from CharacterCollection (the target) and from String/Unicode7
 (old targets, in case of reinstall)."
CharacterCollection removeAllMethods: 1.
CharacterCollection class removeAllMethods: 1.
String removeAllMethods: 1.
String class removeAllMethods: 1.
Unicode7 removeAllMethods: 1.
Unicode7 class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: CharacterCollection
__new__
	"Create a new empty str instance.
	In Python: str() or str.__new__(str)"

	^ '' @env0:copy
%

category: 'Python-Initialization'
classmethod: CharacterCollection
__new__: obj
	"Create a new str instance from an object.
	In Python: str(obj) or str.__new__(str, obj)"

	| result |
	obj ifNil: [ ^ '' @env0:copy ].

	"If already a string return it"
	(obj @env0:isKindOf: CharacterCollection) ifTrue: [
		^ obj
	].

	"Try to call __str__ on the object"
	result := obj @env1:__str__.
	^ result
%

category: 'Python-String Methods'
classmethod: CharacterCollection
maketrans
	"Create a translation table. Not yet implemented."

	self @env0:error: 'Not yet implemented: maketrans'
%

category: 'Python-String Operations'
method: CharacterCollection
__add__: other
	"Concatenate two strings. In Python: str1 + str2"

	^ self @env0:, other
%

category: 'Python-Sequence Operations'
method: CharacterCollection
__contains__: item
	"Test if item is in string. In Python: item in str"

	| result |
	result := self @env0:includesString: item.
	^ result
%

category: 'Python-Comparison'
method: CharacterCollection
__eq__: other
	"Return self == other"

	^ self @env0:= other
%

category: 'Python-String Representation'
method: CharacterCollection
__format__: formatSpec
	"Return a formatted string representation"

	self @env0:error: 'Not yet implemented: __format__'
%

category: 'Python-Comparison'
method: CharacterCollection
__ge__: other
	"Return self >= other"

	^ self @env0:>= other
%

category: 'Python-Sequence Operations'
method: CharacterCollection
__getitem__: index
	"Get character at index. In Python: str[index]
	Returns a single-character string.
	Supports negative indices (counting from end)."

	| size idx char charString |
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'string index out of range'
	].

	"Get character at 1-based Smalltalk index"
	char := self @env0:at: (idx @env0:+ 1).

	"Convert character to a single-character string"
	charString := Unicode7 ___new___: 1.
	charString @env0:at: 1 put: char.

	^ charString
%

category: 'Python-Comparison'
method: CharacterCollection
__gt__: other
	"Return self > other"

	^ self @env0:> other
%

category: 'Python-Hashing & Identity'
method: CharacterCollection
__hash__
	"Return hash value for this string"

	^ self @env0:hash
%

category: 'Python-Initialization'
method: CharacterCollection
__init__: obj
	"Initialize a str instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ nil
%

category: 'Python-Sequence Operations'
method: CharacterCollection
__iter__
	"Return an iterator over the string characters."

	^ str_iterator ___on: self
%

category: 'Python-Comparison'
method: CharacterCollection
__le__: other
	"Return self <= other"

	^ self @env0:<= other
%

category: 'Python-Sequence Operations'
method: CharacterCollection
__len__
	"Return the length of the string. In Python: len(str)"

	^ self @env0:size
%

category: 'Python-Comparison'
method: CharacterCollection
__lt__: other
	"Return self < other"

	^ self @env0:< other
%

category: 'Python-String Operations'
method: CharacterCollection
__mod__: args
	"String formatting using % operator. In Python: 'format %s' % args"

	self @env0:error: 'Not yet implemented: __mod__'
%

category: 'Python-String Operations'
method: CharacterCollection
__mul__: n
	"Repeat string n times. In Python: str * n"

	| count result stream |
	count := n @env0:asInteger.
	(count @env0:<= 0) ifTrue: [ ^ '' @env0:copy ].

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	count @env0:timesRepeat: [
		stream @env0:nextPutAll: self
	].
	result := stream @env0:contents.
	^ result
%

category: 'Python-Comparison'
method: CharacterCollection
__ne__: other
	"Return self != other"

	^ self @env0:~= other
%

category: 'Python-String Representation'
method: CharacterCollection
__repr__
	"Return a string representation for debugging. In Python: repr(str)"

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $'.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		(cp == 39) ifTrue: [  "apostrophe"
			stream @env0:nextPutAll: '\'.
			stream @env0:nextPut: $'.
		] ifFalse: [
			(cp == 92) ifTrue: [  "backslash"
				stream @env0:nextPutAll: '\\'.
			] ifFalse: [
				stream @env0:nextPut: char.
			]
		]
	].
	stream @env0:nextPut: $'.
	^ stream @env0:contents
%

category: 'Python-String Operations'
method: CharacterCollection
__rmod__: args
	"String formatting (reverse). Not typically used."

	self @env0:error: 'Not yet implemented: __rmod__'
%

category: 'Python-String Operations'
method: CharacterCollection
__rmul__: n
	"Repeat string n times (reverse). In Python: n * str"

	^ self __mul__: n
%

category: 'Python-String Representation'
method: CharacterCollection
__str__
	"Return a string representation for display. In Python: str(obj)"

	^ self
%

category: 'Python-String Methods'
method: CharacterCollection
capitalize
	"Return a copy of the string with its first character capitalized and the rest lowercased."

	| stream first rest |
	(self @env0:isEmpty) ifTrue: [ ^ self ].

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	first := self @env0:first.
	rest := self @env0:allButFirst.

	stream @env0:nextPut: (first @env0:asUppercase).
	stream @env0:nextPutAll: (rest @env0:asLowercase).

	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
casefold
	"Return a casefolded copy of the string. Similar to lowercase but more aggressive."

	^ self @env0:asLowercase
%

category: 'Python-String Methods'
method: CharacterCollection
center: width
	"Return a centered string of length width, padded with spaces."

	| totalPad leftPad rightPad stream mySize |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	totalPad := (width @env0:- (mySize)).
	leftPad := totalPad @env0:// 2.
	rightPad := (totalPad @env0:- (leftPad)).

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	leftPad @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	stream @env0:nextPutAll: self.
	rightPad @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
count: sub
	"Return the number of non-overlapping occurrences of substring sub."

	| count index start |
	count := 0.
	start := 1.
	[ index := self @env0:findString: sub startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		count := (count @env0:+ 1).
		start := (index @env0:+ sub @env0:size).
	].
	^ count
%

category: 'Python-String Methods'
method: CharacterCollection
encode
	"Encode the string to bytes. Not yet implemented."

	self @env0:error: 'Not yet implemented: encode'
%

category: 'Python-String Methods'
method: CharacterCollection
endswith: suffix
	"Test whether string ends with the specified suffix."

	^ self @env0:endsWith: suffix
%

category: 'Python-String Methods'
method: CharacterCollection
expandtabs
	"Return a copy where all tab characters are replaced by spaces."

	^ self @env0:copyReplaceAll: (Character @env0:tab) @env0:asString with: '        '
%

category: 'Python-String Methods'
method: CharacterCollection
find: sub
	"Return the lowest index where substring sub is found, or -1 if not found."

	| index |
	index := self @env0:findString: sub startingAt: 1.
	(index == 0) ifTrue: [ ^ -1 ].
	^ (index @env0:- (1))  "Convert to 0-based indexing"
%

category: 'Python-String Methods'
method: CharacterCollection
format
	"String formatting using {} placeholders. Not yet implemented."

	self @env0:error: 'Not yet implemented: format'
%

category: 'Python-String Methods'
method: CharacterCollection
format_map: mapping
	"String formatting using a mapping. Not yet implemented."

	self @env0:error: 'Not yet implemented: format_map'
%

category: 'Python-String Methods'
method: CharacterCollection
index: sub
	"Return the lowest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self find: sub.
	(idx == -1) ifTrue: [
		ValueError @env0:signal: 'substring not found'
	].
	^ idx
%

category: 'Python-String Test Methods'
method: CharacterCollection
isalnum
	"Return True if all characters are alphanumeric and there is at least one character."

	| isEmpty allAlnum |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allAlnum := true.
	self @env0:do: [:char |
		| isAlnum |
		isAlnum := char @env0:isAlphaNumeric.
		isAlnum ifFalse: [ allAlnum := false ].
	].
	^ allAlnum
%

category: 'Python-String Test Methods'
method: CharacterCollection
isalpha
	"Return True if all characters are alphabetic and there is at least one character."

	| isEmpty allAlpha |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allAlpha := true.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifFalse: [ allAlpha := false ].
	].
	^ allAlpha
%

category: 'Python-String Test Methods'
method: CharacterCollection
isascii
	"Return True if all characters are ASCII (code point < 128)."

	| allAscii |
	allAscii := true.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		(cp @env0:>= 128) ifTrue: [ allAscii := false ].
	].
	^ allAscii
%

category: 'Python-String Test Methods'
method: CharacterCollection
isdecimal
	"Return True if all characters are decimal characters."

	| isEmpty allDecimal |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allDecimal := true.
	self @env0:do: [:char |
		| isDigit |
		isDigit := char @env0:isDigit.
		isDigit ifFalse: [ allDecimal := false ].
	].
	^ allDecimal
%

category: 'Python-String Test Methods'
method: CharacterCollection
isdigit
	"Return True if all characters are digits and there is at least one character."

	| isEmpty allDigit |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allDigit := true.
	self @env0:do: [:char |
		| isDigit |
		isDigit := char @env0:isDigit.
		isDigit ifFalse: [ allDigit := false ].
	].
	^ allDigit
%

category: 'Python-String Test Methods'
method: CharacterCollection
isidentifier
	"Return True if string is a valid Python identifier."

	| isEmpty firstChar |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	"First character must be letter or underscore"
	firstChar := self @env0:first.
	((firstChar @env0:isLetter) @env0:| (firstChar == $_)) ifFalse: [ ^ false ].

	"Rest must be letters, digits, or underscores"
	(self @env0:allButFirst) @env0:do: [:char |
		| valid |
		valid := ((char @env0:isAlphaNumeric) @env0:| (char == $_)).
		valid ifFalse: [ ^ false ].
	].
	^ true
%

category: 'Python-String Test Methods'
method: CharacterCollection
islower
	"Return True if all cased characters are lowercase and there is at least one cased character."

	| hasCased allLower |
	hasCased := false.
	allLower := true.
	self @env0:do: [:char |
		| isLetter isLower |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isLower := char @env0:isLowercase.
			isLower ifFalse: [ allLower := false ].
		].
	].
	^ hasCased @env0:& allLower
%

category: 'Python-String Test Methods'
method: CharacterCollection
isnumeric
	"Return True if all characters are numeric characters."

	^ self isdecimal
%

category: 'Python-String Test Methods'
method: CharacterCollection
isprintable
	"Return True if all characters are printable."

	| allPrintable |
	allPrintable := true.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		"Control characters and some special characters are not printable"
		((cp @env0:< 32) @env0:| ((cp @env0:>= 127) @env0:& (cp @env0:< 160))) ifTrue: [ allPrintable := false ].
	].
	^ allPrintable
%

category: 'Python-String Test Methods'
method: CharacterCollection
isspace
	"Return True if all characters are whitespace and there is at least one character."

	| isEmpty allSpace |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allSpace := true.
	self @env0:do: [:char |
		| isSpace |
		isSpace := char @env0:isSeparator.
		isSpace ifFalse: [ allSpace := false ].
	].
	^ allSpace
%

category: 'Python-String Test Methods'
method: CharacterCollection
istitle
	"Return True if string is titlecased."

	| inWord expectUpper |
	inWord := false.
	expectUpper := true.
	self @env0:do: [:char |
		| isLetter isUpper isLower |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			isUpper := char @env0:isUppercase.
			isLower := char @env0:isLowercase.
			inWord ifTrue: [
				isUpper ifTrue: [ ^ false ].
			] ifFalse: [
				isLower ifTrue: [ ^ false ].
				inWord := true.
			].
		] ifFalse: [
			inWord := false.
		].
	].
	^ true
%

category: 'Python-String Test Methods'
method: CharacterCollection
isupper
	"Return True if all cased characters are uppercase and there is at least one cased character."

	| hasCased allUpper |
	hasCased := false.
	allUpper := true.
	self @env0:do: [:char |
		| isLetter isUpper |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isUpper := char @env0:isUppercase.
			isUpper ifFalse: [ allUpper := false ].
		].
	].
	^ hasCased @env0:& allUpper
%

category: 'Python-String Methods'
method: CharacterCollection
join: iterable
	"Concatenate any number of strings with self as separator."

	| stream first |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	first := true.

	iterable @env0:do: [:each |
		first ifFalse: [
			stream @env0:nextPutAll: self
		].
		stream @env0:nextPutAll: each.
		first := false.
	].

	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
ljust: width
	"Return a left-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: self.
	padding @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
lower
	"Return a copy of the string with all characters converted to lowercase."

	^ self @env0:asLowercase
%

category: 'Python-String Methods'
method: CharacterCollection
lstrip
	"Return a copy of the string with leading whitespace removed."

	^ self @env0:trimLeft
%

category: 'Python-String Methods'
method: CharacterCollection
partition: sep
	"Split the string at the first occurrence of sep, return (before, sep, after)."

	| index before after |
	index := self @env0:findString: sep startingAt: 1.
	(index == 0) ifTrue: [
		^ tuple @env0:with: self with: '' with: ''
	].

	before := self @env0:copyFrom: 1 to: (index @env0:- 1).
	after := self @env0:copyFrom: (index @env0:+ sep @env0:size) to: self @env0:size.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Python-String Methods'
method: CharacterCollection
removeprefix: prefix
	"If the string starts with prefix, return string[len(prefix):], otherwise return a copy."

	| starts |
	starts := self @env0:beginsWith: prefix.
	starts ifTrue: [
		^ self @env0:copyFrom: ((prefix @env0:size) @env0:+ 1) to: self @env0:size
	].
	^ self
%

category: 'Python-String Methods'
method: CharacterCollection
removesuffix: suffix
	"If the string ends with suffix, return string[:-len(suffix)], otherwise return a copy."

	| ends |
	ends := self @env0:endsWith: suffix.
	ends ifTrue: [
		^ self @env0:copyFrom: 1 to: ((self @env0:size) @env0:- suffix @env0:size)
	].
	^ self
%

category: 'Python-String Methods'
method: CharacterCollection
replace: old _: new
	"Return a copy with all occurrences of substring old replaced by new."

	^ self @env0:copyReplaceAll: old with: new
%

category: 'Python-String Methods'
method: CharacterCollection
rfind: sub
	"Return the highest index where substring sub is found, or -1 if not found."

	| index lastIndex start |
	lastIndex := 0.
	start := 1.
	[ index := self @env0:findString: sub startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		lastIndex := index.
		start := (index @env0:+ 1).
	].
	(lastIndex == 0) ifTrue: [ ^ -1 ].
	^ (lastIndex @env0:- (1))  "Convert to 0-based indexing"
%

category: 'Python-String Methods'
method: CharacterCollection
rindex: sub
	"Return the highest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self rfind: sub.
	(idx == -1) ifTrue: [
		ValueError @env0:signal: 'substring not found'
	].
	^ idx
%

category: 'Python-String Methods'
method: CharacterCollection
rjust: width
	"Return a right-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	padding @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	stream @env0:nextPutAll: self.
	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
rpartition: sep
	"Split the string at the last occurrence of sep, return (before, sep, after)."

	| index before after start lastIndex |
	lastIndex := 0.
	start := 1.
	[ index := self @env0:findString: sep startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		lastIndex := index.
		start := (index @env0:+ 1).
	].

	(lastIndex == 0) ifTrue: [
		^ tuple @env0:with: '' with: '' with: self
	].

	before := self @env0:copyFrom: 1 to: (lastIndex @env0:- 1).
	after := self @env0:copyFrom: (lastIndex @env0:+ sep @env0:size) to: self @env0:size.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Python-String Methods'
method: CharacterCollection
rsplit
	"Return a list of words in the string, using whitespace as the delimiter (from right)."

	"For now, same as split since we don't have maxsplit parameter"
	^ self split
%

category: 'Python-String Methods'
method: CharacterCollection
rstrip
	"Return a copy of the string with trailing whitespace removed."

	^ self @env0:trimRight
%

category: 'Python-String Methods'
method: CharacterCollection
split
	"Return a list of words in the string, using whitespace as the delimiter."

	| parts |
	parts := self @env0:subStrings.
	^ parts
%

category: 'Python-String Methods'
method: CharacterCollection
splitlines
	"Return a list of lines in the string, breaking at line boundaries."

	| lines lf |
	lf := Character @env0:lf.
	lines := self @env0:subStrings: lf.
	^ lines
%

category: 'Python-String Methods'
method: CharacterCollection
startswith: prefix
	"Test whether string starts with the specified prefix."

	^ self @env0:beginsWith: prefix
%

category: 'Python-String Methods'
method: CharacterCollection
strip
	"Return a copy of the string with leading and trailing whitespace removed."

	^ self @env0:trimBoth
%

category: 'Python-String Methods'
method: CharacterCollection
swapcase
	"Return a copy with uppercase characters converted to lowercase and vice versa."

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	self @env0:do: [:char |
		| isUpper |
		isUpper := char @env0:isUppercase.
		isUpper ifTrue: [
			stream @env0:nextPut: (char @env0:asLowercase)
		] ifFalse: [
			stream @env0:nextPut: (char @env0:asUppercase)
		]
	].
	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
title
	"Return a titlecased version of the string where words start with uppercase."

	| stream inWord |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	inWord := false.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifTrue: [
			inWord ifTrue: [
				stream @env0:nextPut: (char @env0:asLowercase)
			] ifFalse: [
				stream @env0:nextPut: (char @env0:asUppercase).
				inWord := true.
			]
		] ifFalse: [
			stream @env0:nextPut: char.
			inWord := false.
		]
	].
	^ stream @env0:contents
%

category: 'Python-String Methods'
method: CharacterCollection
translate: table
	"Return a copy with each character mapped through the translation table. Not yet implemented."

	self @env0:error: 'Not yet implemented: translate'
%

category: 'Python-String Methods'
method: CharacterCollection
upper
	"Return a copy of the string with all characters converted to uppercase."

	^ self @env0:asUppercase
%

category: 'Python-String Methods'
method: CharacterCollection
zfill: width
	"Pad a numeric string with zeros on the left, to fill a field of the given width."

	| stream mySize padding hasSign firstChar |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	"Check if string starts with + or -"
	hasSign := false.
	(mySize @env0:> 0) ifTrue: [
		firstChar := self @env0:first.
		hasSign := ((firstChar == $+) @env0:| (firstChar == $-)).
	].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).

	hasSign ifTrue: [
		stream @env0:nextPut: firstChar.
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: (self @env0:allButFirst).
	] ifFalse: [
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: self.
	].
	^ stream @env0:contents
%

set compile_env: 0
