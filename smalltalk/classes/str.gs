! ===============================================================================
! Unicode7 Methods (Python 'str' type)
! ===============================================================================
! This file contains method implementations for the Unicode7 class when used
! as the Python 'str' type. Since Unicode7 is a fundamental GemStone Smalltalk
! class, we only add Python-specific methods here.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from str
expectvalue /Metaclass3
doit
str removeAllMethods: 2.
str class removeAllMethods: 2.
%

! ------------------- Class methods for str
set compile_env: 2

category: 'Python-Initialization'
classmethod: str
__new__
	"Create a new empty str instance.
	In Python: str() or str.__new__(str)"

	^ '' perform: #yourself env: 0
%

category: 'Python-Initialization'
classmethod: str
__new__: obj
	"Create a new str instance from an object.
	In Python: str(obj) or str.__new__(str, obj)"

	| result |
	obj ifNil: [ ^ '' perform: #yourself env: 0 ].

	"If already a str return it"
	(obj perform: #isKindOf: env: 0 withArguments: { str }) ifTrue: [
		^ obj
	].

	"Try to call __str__ on the object"
	result := obj perform: #__str__ env: 2.
	^ result
%

! ------------------- Instance methods for str
set compile_env: 2

category: 'Python-Initialization'
method: str
__init__: obj
	"Initialize a str instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ nil
%

category: 'Python-String Operations'
method: str
__add__: other
	"Concatenate two strings. In Python: str1 + str2"

	^ self perform: #, env: 0 withArguments: { other }
%

category: 'Python-String Operations'
method: str
__mul__: n
	"Repeat string n times. In Python: str * n"

	| count result stream |
	count := n perform: #asInteger env: 0.
	(count perform: #<= env: 0 withArguments: {0}) ifTrue: [ ^ '' perform: #yourself env: 0 ].

	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	count perform: #timesRepeat: env: 0 withArguments: { [
		stream with: self perform: #nextPutAll: env: 0
	] }.
	result := stream perform: #contents env: 0.
	^ result
%

category: 'Python-String Operations'
method: str
__rmul__: n
	"Repeat string n times (reverse). In Python: n * str"

	^ self __mul__: n
%

category: 'Python-String Operations'
method: str
__mod__: args
	"String formatting using % operator. In Python: 'format %s' % args"

	self with: 'Not yet implemented: __mod__' perform: #error: env: 0
%

category: 'Python-String Operations'
method: str
__rmod__: args
	"String formatting (reverse). Not typically used."

	self with: 'Not yet implemented: __rmod__' perform: #error: env: 0
%

category: 'Python-Comparison'
method: str
__lt__: other
	"Return self < other"

	^ self with: other perform: #< env: 0
%

category: 'Python-Comparison'
method: str
__le__: other
	"Return self <= other"

	^ self with: other perform: #<= env: 0
%

category: 'Python-Comparison'
method: str
__gt__: other
	"Return self > other"

	^ self with: other perform: #> env: 0
%

category: 'Python-Comparison'
method: str
__ge__: other
	"Return self >= other"

	^ self with: other perform: #>= env: 0
%

category: 'Python-Comparison'
method: str
__eq__: other
	"Return self == other"

	^ self with: other perform: #= env: 0
%

category: 'Python-Comparison'
method: str
__ne__: other
	"Return self != other"

	^ self with: other perform: #~= env: 0
%

category: 'Python-Sequence Operations'
method: str
__len__
	"Return the length of the string. In Python: len(str)"

	^ self perform: #size env: 0
%

category: 'Python-Sequence Operations'
method: str
__getitem__: index
	"Get character at index. In Python: str[index]"

	self with: 'Not yet implemented: __getitem__' perform: #error: env: 0
%

category: 'Python-Sequence Operations'
method: str
__contains__: item
	"Test if item is in string. In Python: item in str"

	| result |
	result := self perform: #includesString: env: 0 withArguments: { item }.
	^ result
%

category: 'Python-String Representation'
method: str
__repr__
	"Return a string representation for debugging. In Python: repr(str)"

	| stream |
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	stream with: $' perform: #nextPut: env: 0.
	self perform: #do: env: 0 withArguments: { [:char |
		| cp |
		cp := char perform: #codePoint env: 0.
		(cp perform: #= env: 0 withArguments: {39}) ifTrue: [  "apostrophe"
			stream with: '\' perform: #nextPutAll: env: 0.
			stream with: $' perform: #nextPut: env: 0.
		] ifFalse: [
			(cp perform: #= env: 0 withArguments: {92}) ifTrue: [  "backslash"
				stream with: '\\' perform: #nextPutAll: env: 0.
			] ifFalse: [
				stream with: char perform: #nextPut: env: 0.
			]
		]
	] }.
	stream with: $' perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-String Representation'
method: str
__str__
	"Return a string representation for display. In Python: str(obj)"

	^ self
%

category: 'Python-String Representation'
method: str
__format__: formatSpec
	"Return a formatted string representation"

	self with: 'Not yet implemented: __format__' perform: #error: env: 0
%

category: 'Python-Hashing & Identity'
method: str
__hash__
	"Return hash value for this string"

	^ self perform: #hash env: 0
%

category: 'Python-String Methods'
method: str
upper
	"Return a copy of the string with all characters converted to uppercase."

	^ self perform: #asUppercase env: 0
%

category: 'Python-String Methods'
method: str
lower
	"Return a copy of the string with all characters converted to lowercase."

	^ self perform: #asLowercase env: 0
%

category: 'Python-String Methods'
method: str
capitalize
	"Return a copy of the string with its first character capitalized and the rest lowercased."

	| stream first rest |
	(self perform: #isEmpty env: 0) ifTrue: [ ^ self ].

	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	first := self perform: #first env: 0.
	rest := self perform: #allButFirst env: 0.

	stream with: (first perform: #asUppercase env: 0) perform: #nextPut: env: 0.
	stream with: (rest perform: #asLowercase env: 0) perform: #nextPutAll: env: 0.

	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
strip
	"Return a copy of the string with leading and trailing whitespace removed."

	^ self perform: #trimBoth env: 0
%

category: 'Python-String Methods'
method: str
lstrip
	"Return a copy of the string with leading whitespace removed."

	^ self perform: #trimLeft env: 0
%

category: 'Python-String Methods'
method: str
rstrip
	"Return a copy of the string with trailing whitespace removed."

	^ self perform: #trimRight env: 0
%

category: 'Python-String Methods'
method: str
startswith: prefix
	"Test whether string starts with the specified prefix."

	^ self perform: #beginsWith: env: 0 withArguments: { prefix }
%

category: 'Python-String Methods'
method: str
endswith: suffix
	"Test whether string ends with the specified suffix."

	^ self perform: #endsWith: env: 0 withArguments: { suffix }
%

category: 'Python-String Methods'
method: str
find: sub
	"Return the lowest index where substring sub is found, or -1 if not found."

	| index |
	index := self perform: #findString:startingAt: env: 0 withArguments: { sub. 1 }.
	(index perform: #= env: 0 withArguments: {0}) ifTrue: [ ^ -1 ].
	^ (index perform: #- env: 0 withArguments: {1})  "Convert to 0-based indexing"
%

category: 'Python-String Methods'
method: str
replace: old _: new
	"Return a copy with all occurrences of substring old replaced by new."

	^ self perform: #copyReplaceAll:with: env: 0 withArguments: { old. new }
%

category: 'Python-String Methods'
method: str
split
	"Return a list of words in the string, using whitespace as the delimiter."

	| parts |
	parts := self perform: #subStrings env: 0.
	^ parts
%

category: 'Python-String Methods'
method: str
join: iterable
	"Concatenate any number of strings with self as separator."

	| stream first |
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	first := true.

	iterable perform: #do: env: 0 withArguments: { [:each |
		first ifFalse: [
			stream with: self perform: #nextPutAll: env: 0
		].
		stream with: each perform: #nextPutAll: env: 0.
		first := false.
	] }.

	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
count: sub
	"Return the number of non-overlapping occurrences of substring sub."

	| count index start |
	count := 0.
	start := 1.
	[ index := self perform: #findString:startingAt: env: 0 withArguments: { sub. start }.
	  (index perform: #> env: 0 withArguments: {0}) ] whileTrue: [
		count := (count perform: #+ env: 0 withArguments: {1}).
		start := (index perform: #+ env: 0 withArguments: {(sub perform: #size env: 0)}).
	].
	^ count
%

category: 'Python-String Methods'
method: str
index: sub
	"Return the lowest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self find: sub.
	(idx perform: #= env: 0 withArguments: {-1}) ifTrue: [
		self with: 'ValueError: substring not found' perform: #error: env: 0
	].
	^ idx
%

category: 'Python-String Methods'
method: str
rfind: sub
	"Return the highest index where substring sub is found, or -1 if not found."

	| index lastIndex start |
	lastIndex := 0.
	start := 1.
	[ index := self perform: #findString:startingAt: env: 0 withArguments: { sub. start }.
	  (index perform: #> env: 0 withArguments: {0}) ] whileTrue: [
		lastIndex := index.
		start := (index perform: #+ env: 0 withArguments: {1}).
	].
	(lastIndex perform: #= env: 0 withArguments: {0}) ifTrue: [ ^ -1 ].
	^ (lastIndex perform: #- env: 0 withArguments: {1})  "Convert to 0-based indexing"
%

category: 'Python-String Methods'
method: str
rindex: sub
	"Return the highest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self rfind: sub.
	(idx perform: #= env: 0 withArguments: {-1}) ifTrue: [
		self with: 'ValueError: substring not found' perform: #error: env: 0
	].
	^ idx
%

category: 'Python-String Methods'
method: str
swapcase
	"Return a copy with uppercase characters converted to lowercase and vice versa."

	| stream |
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	self perform: #do: env: 0 withArguments: { [:char |
		| isUpper |
		isUpper := char perform: #isUppercase env: 0.
		isUpper ifTrue: [
			stream with: (char perform: #asLowercase env: 0) perform: #nextPut: env: 0
		] ifFalse: [
			stream with: (char perform: #asUppercase env: 0) perform: #nextPut: env: 0
		]
	] }.
	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
title
	"Return a titlecased version of the string where words start with uppercase."

	| stream inWord |
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	inWord := false.
	self perform: #do: env: 0 withArguments: { [:char |
		| isAlpha |
		isAlpha := char perform: #isLetter env: 0.
		isAlpha ifTrue: [
			inWord ifTrue: [
				stream with: (char perform: #asLowercase env: 0) perform: #nextPut: env: 0
			] ifFalse: [
				stream with: (char perform: #asUppercase env: 0) perform: #nextPut: env: 0.
				inWord := true.
			]
		] ifFalse: [
			stream with: char perform: #nextPut: env: 0.
			inWord := false.
		]
	] }.
	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
casefold
	"Return a casefolded copy of the string. Similar to lowercase but more aggressive."

	^ self perform: #asLowercase env: 0
%

category: 'Python-String Methods'
method: str
center: width
	"Return a centered string of length width, padded with spaces."

	| totalPad leftPad rightPad stream mySize |
	mySize := self perform: #size env: 0.
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [ ^ self ].

	totalPad := (width perform: #- env: 0 withArguments: {mySize}).
	leftPad := totalPad perform: #// env: 0 withArguments: { 2 }.
	rightPad := (totalPad perform: #- env: 0 withArguments: {leftPad}).

	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	leftPad perform: #timesRepeat: env: 0 withArguments: { [
		stream with: $  perform: #nextPut: env: 0
	] }.
	stream with: self perform: #nextPutAll: env: 0.
	rightPad perform: #timesRepeat: env: 0 withArguments: { [
		stream with: $  perform: #nextPut: env: 0
	] }.
	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
ljust: width
	"Return a left-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self perform: #size env: 0.
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [ ^ self ].

	padding := (width perform: #- env: 0 withArguments: {mySize}).
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	stream with: self perform: #nextPutAll: env: 0.
	padding perform: #timesRepeat: env: 0 withArguments: { [
		stream with: $  perform: #nextPut: env: 0
	] }.
	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
rjust: width
	"Return a right-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self perform: #size env: 0.
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [ ^ self ].

	padding := (width perform: #- env: 0 withArguments: {mySize}).
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.
	padding perform: #timesRepeat: env: 0 withArguments: { [
		stream with: $  perform: #nextPut: env: 0
	] }.
	stream with: self perform: #nextPutAll: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-String Methods'
method: str
zfill: width
	"Pad a numeric string with zeros on the left, to fill a field of the given width."

	| stream mySize padding hasSign firstChar |
	mySize := self perform: #size env: 0.
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [ ^ self ].

	"Check if string starts with + or -"
	hasSign := false.
	(mySize perform: #> env: 0 withArguments: {0}) ifTrue: [
		firstChar := self perform: #first env: 0.
		hasSign := ((firstChar perform: #= env: 0 withArguments: {$+}) perform: #| env: 0 withArguments: {(firstChar perform: #= env: 0 withArguments: {$-})}).
	].

	padding := (width perform: #- env: 0 withArguments: {mySize}).
	stream := WriteStream perform: #on: env: 0 withArguments: { str perform: #new env: 0 }.

	hasSign ifTrue: [
		stream with: firstChar perform: #nextPut: env: 0.
		padding perform: #timesRepeat: env: 0 withArguments: { [
			stream with: $0 perform: #nextPut: env: 0
		] }.
		stream with: (self perform: #allButFirst env: 0) perform: #nextPutAll: env: 0.
	] ifFalse: [
		padding perform: #timesRepeat: env: 0 withArguments: { [
			stream with: $0 perform: #nextPut: env: 0
		] }.
		stream with: self perform: #nextPutAll: env: 0.
	].
	^ stream perform: #contents env: 0
%

category: 'Python-String Test Methods'
method: str
isalnum
	"Return True if all characters are alphanumeric and there is at least one character."

	| isEmpty allAlnum |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	allAlnum := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isAlnum |
		isAlnum := char perform: #isAlphaNumeric env: 0.
		isAlnum ifFalse: [ allAlnum := false ].
	] }.
	^ allAlnum
%

category: 'Python-String Test Methods'
method: str
isalpha
	"Return True if all characters are alphabetic and there is at least one character."

	| isEmpty allAlpha |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	allAlpha := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isAlpha |
		isAlpha := char perform: #isLetter env: 0.
		isAlpha ifFalse: [ allAlpha := false ].
	] }.
	^ allAlpha
%

category: 'Python-String Test Methods'
method: str
isdigit
	"Return True if all characters are digits and there is at least one character."

	| isEmpty allDigit |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	allDigit := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isDigit |
		isDigit := char perform: #isDigit env: 0.
		isDigit ifFalse: [ allDigit := false ].
	] }.
	^ allDigit
%

category: 'Python-String Test Methods'
method: str
islower
	"Return True if all cased characters are lowercase and there is at least one cased character."

	| hasCased allLower |
	hasCased := false.
	allLower := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isLetter isLower |
		isLetter := char perform: #isLetter env: 0.
		isLetter ifTrue: [
			hasCased := true.
			isLower := char perform: #isLowercase env: 0.
			isLower ifFalse: [ allLower := false ].
		].
	] }.
	^ hasCased perform: #& env: 0 withArguments: {allLower}
%

category: 'Python-String Test Methods'
method: str
isupper
	"Return True if all cased characters are uppercase and there is at least one cased character."

	| hasCased allUpper |
	hasCased := false.
	allUpper := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isLetter isUpper |
		isLetter := char perform: #isLetter env: 0.
		isLetter ifTrue: [
			hasCased := true.
			isUpper := char perform: #isUppercase env: 0.
			isUpper ifFalse: [ allUpper := false ].
		].
	] }.
	^ hasCased perform: #& env: 0 withArguments: {allUpper}
%

category: 'Python-String Test Methods'
method: str
isspace
	"Return True if all characters are whitespace and there is at least one character."

	| isEmpty allSpace |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	allSpace := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isSpace |
		isSpace := char perform: #isSeparator env: 0.
		isSpace ifFalse: [ allSpace := false ].
	] }.
	^ allSpace
%

category: 'Python-String Test Methods'
method: str
istitle
	"Return True if string is titlecased."

	| inWord expectUpper |
	inWord := false.
	expectUpper := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isLetter isUpper isLower |
		isLetter := char perform: #isLetter env: 0.
		isLetter ifTrue: [
			isUpper := char perform: #isUppercase env: 0.
			isLower := char perform: #isLowercase env: 0.
			inWord ifTrue: [
				isUpper ifTrue: [ ^ false ].
			] ifFalse: [
				isLower ifTrue: [ ^ false ].
				inWord := true.
			].
		] ifFalse: [
			inWord := false.
		].
	] }.
	^ true
%

category: 'Python-String Test Methods'
method: str
isascii
	"Return True if all characters are ASCII (code point < 128)."

	| allAscii |
	allAscii := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| cp |
		cp := char perform: #codePoint env: 0.
		(cp perform: #>= env: 0 withArguments: {128}) ifTrue: [ allAscii := false ].
	] }.
	^ allAscii
%

category: 'Python-String Test Methods'
method: str
isdecimal
	"Return True if all characters are decimal characters."

	| isEmpty allDecimal |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	allDecimal := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| isDigit |
		isDigit := char perform: #isDigit env: 0.
		isDigit ifFalse: [ allDecimal := false ].
	] }.
	^ allDecimal
%

category: 'Python-String Test Methods'
method: str
isnumeric
	"Return True if all characters are numeric characters."

	^ self isdecimal
%

category: 'Python-String Test Methods'
method: str
isidentifier
	"Return True if string is a valid Python identifier."

	| isEmpty firstChar |
	isEmpty := self perform: #isEmpty env: 0.
	isEmpty ifTrue: [ ^ false ].

	"First character must be letter or underscore"
	firstChar := self perform: #first env: 0.
	((firstChar perform: #isLetter env: 0) perform: #| env: 0 withArguments: {(firstChar perform: #= env: 0 withArguments: {$_})}) ifFalse: [ ^ false ].

	"Rest must be letters, digits, or underscores"
	(self perform: #allButFirst env: 0) perform: #do: env: 0 withArguments: { [:char |
		| valid |
		valid := ((char perform: #isAlphaNumeric env: 0) perform: #| env: 0 withArguments: {(char perform: #= env: 0 withArguments: {$_})}).
		valid ifFalse: [ ^ false ].
	] }.
	^ true
%

category: 'Python-String Test Methods'
method: str
isprintable
	"Return True if all characters are printable."

	| allPrintable |
	allPrintable := true.
	self perform: #do: env: 0 withArguments: { [:char |
		| cp |
		cp := char perform: #codePoint env: 0.
		"Control characters and some special characters are not printable"
		((cp perform: #< env: 0 withArguments: {32}) perform: #| env: 0 withArguments: {((cp perform: #>= env: 0 withArguments: {127}) perform: #& env: 0 withArguments: {(cp perform: #< env: 0 withArguments: {160})})}) ifTrue: [ allPrintable := false ].
	] }.
	^ allPrintable
%

category: 'Python-String Methods'
method: str
splitlines
	"Return a list of lines in the string, breaking at line boundaries."

	| lines lf |
	lf := Character perform: #lf env: 0.
	lines := self perform: #subStrings: env: 0 withArguments: {lf}.
	^ lines
%

category: 'Python-String Methods'
method: str
partition: sep
	"Split the string at the first occurrence of sep, return (before, sep, after)."

	| index before after |
	index := self perform: #findString:startingAt: env: 0 withArguments: { sep. 1 }.
	(index perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ Array perform: #with:with:with: env: 0 withArguments: { self. ''. '' }
	].

	before := self perform: #copyFrom:to: env: 0 withArguments: { 1. (index perform: #- env: 0 withArguments: {1}) }.
	after := self perform: #copyFrom:to: env: 0 withArguments: { (index perform: #+ env: 0 withArguments: {(sep perform: #size env: 0)}). self perform: #size env: 0 }.
	^ Array perform: #with:with:with: env: 0 withArguments: { before. sep. after }
%

category: 'Python-String Methods'
method: str
rpartition: sep
	"Split the string at the last occurrence of sep, return (before, sep, after)."

	| index before after start lastIndex |
	lastIndex := 0.
	start := 1.
	[ index := self perform: #findString:startingAt: env: 0 withArguments: { sep. start }.
	  (index perform: #> env: 0 withArguments: {0}) ] whileTrue: [
		lastIndex := index.
		start := (index perform: #+ env: 0 withArguments: {1}).
	].

	(lastIndex perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ Array perform: #with:with:with: env: 0 withArguments: { ''. ''. self }
	].

	before := self perform: #copyFrom:to: env: 0 withArguments: { 1. (lastIndex perform: #- env: 0 withArguments: {1}) }.
	after := self perform: #copyFrom:to: env: 0 withArguments: { (lastIndex perform: #+ env: 0 withArguments: {(sep perform: #size env: 0)}). self perform: #size env: 0 }.
	^ Array perform: #with:with:with: env: 0 withArguments: { before. sep. after }
%

category: 'Python-String Methods'
method: str
rsplit
	"Return a list of words in the string, using whitespace as the delimiter (from right)."

	"For now, same as split since we don't have maxsplit parameter"
	^ self split
%

category: 'Python-String Methods'
method: str
removeprefix: prefix
	"If the string starts with prefix, return string[len(prefix):], otherwise return a copy."

	| starts |
	starts := self perform: #beginsWith: env: 0 withArguments: { prefix }.
	starts ifTrue: [
		^ self perform: #copyFrom:to: env: 0 withArguments: { ((prefix perform: #size env: 0) perform: #+ env: 0 withArguments: {1}). self perform: #size env: 0 }
	].
	^ self
%

category: 'Python-String Methods'
method: str
removesuffix: suffix
	"If the string ends with suffix, return string[:-len(suffix)], otherwise return a copy."

	| ends |
	ends := self perform: #endsWith: env: 0 withArguments: { suffix }.
	ends ifTrue: [
		^ self perform: #copyFrom:to: env: 0 withArguments: { 1. ((self perform: #size env: 0) perform: #- env: 0 withArguments: {(suffix perform: #size env: 0)}) }
	].
	^ self
%

category: 'Python-String Methods'
method: str
expandtabs
	"Return a copy where all tab characters are replaced by spaces."

	^ self perform: #copyReplaceAll:with: env: 0 withArguments: { (Character perform: #tab env: 0) perform: #asString env: 0. '        ' }
%

category: 'Python-String Methods'
method: str
format
	"String formatting using {} placeholders. Not yet implemented."

	self with: 'Not yet implemented: format' perform: #error: env: 0
%

category: 'Python-String Methods'
method: str
format_map: mapping
	"String formatting using a mapping. Not yet implemented."

	self with: 'Not yet implemented: format_map' perform: #error: env: 0
%

category: 'Python-String Methods'
method: str
encode
	"Encode the string to bytes. Not yet implemented."

	self with: 'Not yet implemented: encode' perform: #error: env: 0
%

category: 'Python-String Methods'
method: str
translate: table
	"Return a copy with each character mapped through the translation table. Not yet implemented."

	self with: 'Not yet implemented: translate' perform: #error: env: 0
%

category: 'Python-String Methods'
classmethod: str
maketrans
	"Create a translation table. Not yet implemented."

	self with: 'Not yet implemented: maketrans' perform: #error: env: 0
%

category: 'Python-Sequence Operations'
method: str
__iter__
	"Return an iterator over the string characters."

	^ str_iterator perform: #___on: env: 2 withArguments: {self}
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0


