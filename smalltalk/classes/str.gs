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

set compile_env: 2

! ------------------- Class methods for str

category: 'Python-Initialization'
classmethod: str
__new__
	"Create a new empty str instance.
	In Python: str() or str.__new__(str)"

	^ '' ___copy___
%

category: 'Python-Initialization'
classmethod: str
__new__: obj
	"Create a new str instance from an object.
	In Python: str(obj) or str.__new__(str, obj)"

	| result |
	obj ifNil: [ ^ '' ___copy___ ].

	"If already a str return it"
	(obj ___isKindOf___: str) ifTrue: [
		^ obj
	].

	"Try to call __str__ on the object"
	result := obj perform: #__str__ env: 2.
	^ result
%

! ------------------- Instance methods for str

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

	^ self ___concat___: other
%

category: 'Python-String Operations'
method: str
__mul__: n
	"Repeat string n times. In Python: str * n"

	| count result stream |
	count := n ___asInteger___.
	(count ___le___: 0) ifTrue: [ ^ '' ___copy___ ].

	stream := WriteStream ___on___: (str ___new___).
	count ___timesRepeat___: [
		stream ___nextPutAll___: self
	].
	result := stream ___contents___.
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

	self ___error___: 'Not yet implemented: __mod__'
%

category: 'Python-String Operations'
method: str
__rmod__: args
	"String formatting (reverse). Not typically used."

	self ___error___: 'Not yet implemented: __rmod__'
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

	^ self ___eq___: other
%

category: 'Python-Comparison'
method: str
__ne__: other
	"Return self != other"

	^ self ___ne___: other
%

category: 'Python-Sequence Operations'
method: str
__len__
	"Return the length of the string. In Python: len(str)"

	^ self ___size___
%

category: 'Python-Sequence Operations'
method: str
__getitem__: index
	"Get character at index. In Python: str[index]
	Returns a single-character string.
	Supports negative indices (counting from end)."

	| size idx char charString |
	size := self ___size___.
	idx := index.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx ___lt___: 0) or: [
		idx ___ge___: size
	]) ifTrue: [
		IndexError ___signal___: 'string index out of range'
	].

	"Get character at 1-based Smalltalk index"
	char := self ___at___: (idx ___plus___: 1).

	"Convert character to a single-character string"
	charString := str ___new___: 1.
	charString ___at___: 1 put: char.

	^ charString
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
	stream := WriteStream ___on___: (str ___new___).
	stream ___nextPut___: $'.
	self ___do___: [:char |
		| cp |
		cp := char ___codePoint___.
		(cp ___eq___: 39) ifTrue: [  "apostrophe"
			stream ___nextPutAll___: '\'.
			stream ___nextPut___: $'.
		] ifFalse: [
			(cp ___eq___: 92) ifTrue: [  "backslash"
				stream ___nextPutAll___: '\\'.
			] ifFalse: [
				stream ___nextPut___: char.
			]
		]
	].
	stream ___nextPut___: $'.
	^ stream ___contents___
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

	self ___error___: 'Not yet implemented: __format__'
%

category: 'Python-Hashing & Identity'
method: str
__hash__
	"Return hash value for this string"

	^ self ___hash___
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
	(self ___isEmpty___) ifTrue: [ ^ self ].

	stream := WriteStream ___on___: (str ___new___).
	first := self ___first___.
	rest := self perform: #allButFirst env: 0.

	stream ___nextPut___: (first ___asUppercase___).
	stream ___nextPutAll___: (rest ___asLowercase___).

	^ stream ___contents___
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

	^ self ___beginsWith___: prefix
%

category: 'Python-String Methods'
method: str
endswith: suffix
	"Test whether string ends with the specified suffix."

	^ self ___endsWith___: suffix
%

category: 'Python-String Methods'
method: str
find: sub
	"Return the lowest index where substring sub is found, or -1 if not found."

	| index |
	index := self ___findString___: sub startingAt: 1.
	(index ___eq___: 0) ifTrue: [ ^ -1 ].
	^ (index ___minus___: (1))  "Convert to 0-based indexing"
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
	stream := WriteStream ___on___: (str ___new___).
	first := true.

	iterable ___do___: [:each |
		first ifFalse: [
			stream ___nextPutAll___: self
		].
		stream ___nextPutAll___: each.
		first := false.
	].

	^ stream ___contents___
%

category: 'Python-String Methods'
method: str
count: sub
	"Return the number of non-overlapping occurrences of substring sub."

	| count index start |
	count := 0.
	start := 1.
	[ index := self ___findString___: sub startingAt: start.
	  (index ___gt___: 0) ] whileTrue: [
		count := (count ___plus___: 1).
		start := (index ___plus___: sub ___size___).
	].
	^ count
%

category: 'Python-String Methods'
method: str
index: sub
	"Return the lowest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self find: sub.
	(idx ___eq___: -1) ifTrue: [
		self ___error___: 'ValueError: substring not found'
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
	[ index := self ___findString___: sub startingAt: start.
	  (index ___gt___: 0) ] whileTrue: [
		lastIndex := index.
		start := (index ___plus___: 1).
	].
	(lastIndex ___eq___: 0) ifTrue: [ ^ -1 ].
	^ (lastIndex ___minus___: (1))  "Convert to 0-based indexing"
%

category: 'Python-String Methods'
method: str
rindex: sub
	"Return the highest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self rfind: sub.
	(idx ___eq___: -1) ifTrue: [
		self ___error___: 'ValueError: substring not found'
	].
	^ idx
%

category: 'Python-String Methods'
method: str
swapcase
	"Return a copy with uppercase characters converted to lowercase and vice versa."

	| stream |
	stream := WriteStream ___on___: (str ___new___).
	self ___do___: [:char |
		| isUpper |
		isUpper := char perform: #isUppercase env: 0.
		isUpper ifTrue: [
			stream ___nextPut___: (char ___asLowercase___)
		] ifFalse: [
			stream ___nextPut___: (char ___asUppercase___)
		]
	].
	^ stream ___contents___
%

category: 'Python-String Methods'
method: str
title
	"Return a titlecased version of the string where words start with uppercase."

	| stream inWord |
	stream := WriteStream ___on___: (str ___new___).
	inWord := false.
	self ___do___: [:char |
		| isAlpha |
		isAlpha := char perform: #isLetter env: 0.
		isAlpha ifTrue: [
			inWord ifTrue: [
				stream ___nextPut___: (char ___asLowercase___)
			] ifFalse: [
				stream ___nextPut___: (char ___asUppercase___).
				inWord := true.
			]
		] ifFalse: [
			stream ___nextPut___: char.
			inWord := false.
		]
	].
	^ stream ___contents___
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
	mySize := self ___size___.
	(width ___le___: mySize) ifTrue: [ ^ self ].

	totalPad := (width ___minus___: (mySize)).
	leftPad := totalPad ___divideInteger___: 2.
	rightPad := (totalPad ___minus___: (leftPad)).

	stream := WriteStream ___on___: (str ___new___).
	leftPad ___timesRepeat___: [
		stream ___nextPut___: $ 
	].
	stream ___nextPutAll___: self.
	rightPad ___timesRepeat___: [
		stream ___nextPut___: $ 
	].
	^ stream ___contents___
%

category: 'Python-String Methods'
method: str
ljust: width
	"Return a left-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self ___size___.
	(width ___le___: mySize) ifTrue: [ ^ self ].

	padding := (width ___minus___: (mySize)).
	stream := WriteStream ___on___: (str ___new___).
	stream ___nextPutAll___: self.
	padding ___timesRepeat___: [
		stream ___nextPut___: $ 
	].
	^ stream ___contents___
%

category: 'Python-String Methods'
method: str
rjust: width
	"Return a right-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self ___size___.
	(width ___le___: mySize) ifTrue: [ ^ self ].

	padding := (width ___minus___: (mySize)).
	stream := WriteStream ___on___: (str ___new___).
	padding ___timesRepeat___: [
		stream ___nextPut___: $ 
	].
	stream ___nextPutAll___: self.
	^ stream ___contents___
%

category: 'Python-String Methods'
method: str
zfill: width
	"Pad a numeric string with zeros on the left, to fill a field of the given width."

	| stream mySize padding hasSign firstChar |
	mySize := self ___size___.
	(width ___le___: mySize) ifTrue: [ ^ self ].

	"Check if string starts with + or -"
	hasSign := false.
	(mySize ___gt___: 0) ifTrue: [
		firstChar := self ___first___.
		hasSign := ((firstChar ___eq___: $+) perform: #| env: 0 withArguments: {(firstChar ___eq___: $-)}).
	].

	padding := (width ___minus___: (mySize)).
	stream := WriteStream ___on___: (str ___new___).

	hasSign ifTrue: [
		stream ___nextPut___: firstChar.
		padding ___timesRepeat___: [
			stream ___nextPut___: $0
		].
		stream ___nextPutAll___: (self perform: #allButFirst env: 0).
	] ifFalse: [
		padding ___timesRepeat___: [
			stream ___nextPut___: $0
		].
		stream ___nextPutAll___: self.
	].
	^ stream ___contents___
%

category: 'Python-String Test Methods'
method: str
isalnum
	"Return True if all characters are alphanumeric and there is at least one character."

	| isEmpty allAlnum |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	allAlnum := true.
	self ___do___: [:char |
		| isAlnum |
		isAlnum := char perform: #isAlphaNumeric env: 0.
		isAlnum ifFalse: [ allAlnum := false ].
	].
	^ allAlnum
%

category: 'Python-String Test Methods'
method: str
isalpha
	"Return True if all characters are alphabetic and there is at least one character."

	| isEmpty allAlpha |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	allAlpha := true.
	self ___do___: [:char |
		| isAlpha |
		isAlpha := char perform: #isLetter env: 0.
		isAlpha ifFalse: [ allAlpha := false ].
	].
	^ allAlpha
%

category: 'Python-String Test Methods'
method: str
isdigit
	"Return True if all characters are digits and there is at least one character."

	| isEmpty allDigit |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	allDigit := true.
	self ___do___: [:char |
		| isDigit |
		isDigit := char perform: #isDigit env: 0.
		isDigit ifFalse: [ allDigit := false ].
	].
	^ allDigit
%

category: 'Python-String Test Methods'
method: str
islower
	"Return True if all cased characters are lowercase and there is at least one cased character."

	| hasCased allLower |
	hasCased := false.
	allLower := true.
	self ___do___: [:char |
		| isLetter isLower |
		isLetter := char perform: #isLetter env: 0.
		isLetter ifTrue: [
			hasCased := true.
			isLower := char perform: #isLowercase env: 0.
			isLower ifFalse: [ allLower := false ].
		].
	].
	^ hasCased perform: #& env: 0 withArguments: {allLower}
%

category: 'Python-String Test Methods'
method: str
isupper
	"Return True if all cased characters are uppercase and there is at least one cased character."

	| hasCased allUpper |
	hasCased := false.
	allUpper := true.
	self ___do___: [:char |
		| isLetter isUpper |
		isLetter := char perform: #isLetter env: 0.
		isLetter ifTrue: [
			hasCased := true.
			isUpper := char perform: #isUppercase env: 0.
			isUpper ifFalse: [ allUpper := false ].
		].
	].
	^ hasCased perform: #& env: 0 withArguments: {allUpper}
%

category: 'Python-String Test Methods'
method: str
isspace
	"Return True if all characters are whitespace and there is at least one character."

	| isEmpty allSpace |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	allSpace := true.
	self ___do___: [:char |
		| isSpace |
		isSpace := char perform: #isSeparator env: 0.
		isSpace ifFalse: [ allSpace := false ].
	].
	^ allSpace
%

category: 'Python-String Test Methods'
method: str
istitle
	"Return True if string is titlecased."

	| inWord expectUpper |
	inWord := false.
	expectUpper := true.
	self ___do___: [:char |
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
	].
	^ true
%

category: 'Python-String Test Methods'
method: str
isascii
	"Return True if all characters are ASCII (code point < 128)."

	| allAscii |
	allAscii := true.
	self ___do___: [:char |
		| cp |
		cp := char ___codePoint___.
		(cp ___ge___: 128) ifTrue: [ allAscii := false ].
	].
	^ allAscii
%

category: 'Python-String Test Methods'
method: str
isdecimal
	"Return True if all characters are decimal characters."

	| isEmpty allDecimal |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	allDecimal := true.
	self ___do___: [:char |
		| isDigit |
		isDigit := char perform: #isDigit env: 0.
		isDigit ifFalse: [ allDecimal := false ].
	].
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
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [ ^ false ].

	"First character must be letter or underscore"
	firstChar := self ___first___.
	((firstChar perform: #isLetter env: 0) perform: #| env: 0 withArguments: {(firstChar ___eq___: $_)}) ifFalse: [ ^ false ].

	"Rest must be letters, digits, or underscores"
	(self perform: #allButFirst env: 0) ___do___: [:char |
		| valid |
		valid := ((char perform: #isAlphaNumeric env: 0) perform: #| env: 0 withArguments: {(char ___eq___: $_)}).
		valid ifFalse: [ ^ false ].
	].
	^ true
%

category: 'Python-String Test Methods'
method: str
isprintable
	"Return True if all characters are printable."

	| allPrintable |
	allPrintable := true.
	self ___do___: [:char |
		| cp |
		cp := char ___codePoint___.
		"Control characters and some special characters are not printable"
		((cp ___lt___: 32) perform: #| env: 0 withArguments: {((cp ___ge___: 127) perform: #& env: 0 withArguments: {(cp ___lt___: 160)})}) ifTrue: [ allPrintable := false ].
	].
	^ allPrintable
%

category: 'Python-String Methods'
method: str
splitlines
	"Return a list of lines in the string, breaking at line boundaries."

	| lines lf |
	lf := Character ___lf___.
	lines := self perform: #subStrings: env: 0 withArguments: {lf}.
	^ lines
%

category: 'Python-String Methods'
method: str
partition: sep
	"Split the string at the first occurrence of sep, return (before, sep, after)."

	| index before after |
	index := self ___findString___: sep startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		^ tuple ___with___: self with: '' with: ''
	].

	before := self ___copyFrom___: 1 to: (index ___minus___: 1).
	after := self ___copyFrom___: (index ___plus___: sep ___size___) to: self ___size___.
	^ tuple ___with___: before with: sep with: after
%

category: 'Python-String Methods'
method: str
rpartition: sep
	"Split the string at the last occurrence of sep, return (before, sep, after)."

	| index before after start lastIndex |
	lastIndex := 0.
	start := 1.
	[ index := self ___findString___: sep startingAt: start.
	  (index ___gt___: 0) ] whileTrue: [
		lastIndex := index.
		start := (index ___plus___: 1).
	].

	(lastIndex ___eq___: 0) ifTrue: [
		^ tuple perform: #with:with:with: env: 0 withArguments: { ''. ''. self }
	].

	before := self ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
	after := self ___copyFrom___: (lastIndex ___plus___: sep ___size___) to: self ___size___.
	^ tuple ___with___: before with: sep with: after
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
	starts := self ___beginsWith___: prefix.
	starts ifTrue: [
		^ self ___copyFrom___: ((prefix ___size___) ___plus___: 1) to: self ___size___
	].
	^ self
%

category: 'Python-String Methods'
method: str
removesuffix: suffix
	"If the string ends with suffix, return string[:-len(suffix)], otherwise return a copy."

	| ends |
	ends := self ___endsWith___: suffix.
	ends ifTrue: [
		^ self ___copyFrom___: 1 to: ((self ___size___) ___minus___: suffix ___size___)
	].
	^ self
%

category: 'Python-String Methods'
method: str
expandtabs
	"Return a copy where all tab characters are replaced by spaces."

	^ self perform: #copyReplaceAll:with: env: 0 withArguments: { (Character perform: #tab env: 0) ___asString___. '        ' }
%

category: 'Python-String Methods'
method: str
format
	"String formatting using {} placeholders. Not yet implemented."

	self ___error___: 'Not yet implemented: format'
%

category: 'Python-String Methods'
method: str
format_map: mapping
	"String formatting using a mapping. Not yet implemented."

	self ___error___: 'Not yet implemented: format_map'
%

category: 'Python-String Methods'
method: str
encode
	"Encode the string to bytes. Not yet implemented."

	self ___error___: 'Not yet implemented: encode'
%

category: 'Python-String Methods'
method: str
translate: table
	"Return a copy with each character mapped through the translation table. Not yet implemented."

	self ___error___: 'Not yet implemented: translate'
%

category: 'Python-String Methods'
classmethod: str
maketrans
	"Create a translation table. Not yet implemented."

	self ___error___: 'Not yet implemented: maketrans'
%

category: 'Python-Sequence Operations'
method: str
__iter__
	"Return an iterator over the string characters."

	^ str_iterator ___on: self
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0
