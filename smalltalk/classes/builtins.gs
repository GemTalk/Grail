! ===============================================================================
! builtins Methods (Python 'builtins' type)
! ===============================================================================
! This file contains Python method implementations for the builtins class.
! See https://docs.python.org/3/library/functions.html#built-in-functions
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from builtins
expectvalue /Metaclass3
doit
builtins removeAllMethods: 2.
builtins class removeAllMethods: 2.
%

set compile_env: 2
! ------------------- Class methods for builtins
! ------------------- Instance methods for builtins

category: 'Python-Built-in Functions'
method: builtins
abs: aNumber
	"Return the absolute value of a number"

	[^ aNumber __abs__] ___on___: MessageNotUnderstood do: [:ex | TypeError ___signal___]
%

category: 'Python-Built-in Functions'
method: builtins
len: anObject
	"Return the length (the number of items) of an object"

	| className errorMsg |
	[^ anObject __len__] ___on___: MessageNotUnderstood do: [:ex |
		className := (anObject ___class___) ___name___.
		errorMsg := 'object of type ''' ___concat___: className.
		errorMsg := errorMsg ___concat___: ''' has no len()'.
		TypeError ___signal___: errorMsg
	]
%

category: 'Python-Built-in Functions'
method: builtins
type: anObject
	"Return the type of an object"

	^ anObject __class__
%

category: 'Python-Built-in Functions'
method: builtins
repr: anObject
	"Return a string containing a printable representation of an object"

	^ anObject __repr__
%

category: 'Python-Built-in Functions'
method: builtins
str: anObject
	"Return a string version of object"

	[^ anObject __str__] ___on___: MessageNotUnderstood do: [:ex |
		^ anObject __repr__
	]
%

category: 'Python-Built-in Functions'
method: builtins
hash: anObject
	"Return the hash value of the object"

	[^ anObject __hash__] ___on___: MessageNotUnderstood do: [:ex |
		TypeError ___signal___: 'unhashable type'
	]
%

category: 'Python-Built-in Functions'
method: builtins
hex: aNumber
	"Convert an integer number to a lowercase hexadecimal string"

	| result |
	result := aNumber ___printStringRadix___: 16.
	^ '0x' ___concat___: (result perform: #asLowercase env: 0)
%

category: 'Python-Built-in Functions'
method: builtins
oct: aNumber
	"Convert an integer number to an octal string"

	| result |
	result := aNumber ___printStringRadix___: 8.
	^ '0o' ___concat___: result
%

category: 'Python-Built-in Functions'
method: builtins
bin: aNumber
	"Convert an integer number to a binary string"

	| result |
	result := aNumber ___printStringRadix___: 2.
	^ '0b' ___concat___: result
%

category: 'Python-Built-in Functions'
method: builtins
chr: anInteger
	"Return a string representing a character whose Unicode code point is the integer"

	^ (Character ___codePoint___: anInteger)
		___asString___
%

category: 'Python-Built-in Functions'
method: builtins
ord: aString
	"Return an integer representing the Unicode code point of a character"

	| char size errorMsg sizeStr |
	size := aString ___size___.
	(size ___eq___: 1) ifFalse: [
		sizeStr := size ___asString___.
		errorMsg := 'ord() expected a character, but string of length ' ___concat___: sizeStr.
		errorMsg := errorMsg ___concat___: ' found'.
		TypeError ___signal___: errorMsg
	].
	char := aString ___at___: 1.
	^ char ___codePoint___
%

category: 'Python-Built-in Functions'
method: builtins
min: iterable
	"Return the smallest item in an iterable"

	| iter minVal first |
	iter := iterable __iter__.
	first := true.
	minVal := nil.

	[true] ___whileTrue___: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				minVal := item.
				first := false
			] ifFalse: [
				(item __lt__: minVal) ifTrue: [
					minVal := item
				]
			]
		] ___on___: StopIteration do: [:ex | ^ minVal]
	]
%

category: 'Python-Built-in Functions'
method: builtins
max: iterable
	"Return the largest item in an iterable"

	| iter maxVal first |
	iter := iterable __iter__.
	first := true.
	maxVal := nil.

	[true] ___whileTrue___: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				maxVal := item.
				first := false
			] ifFalse: [
				(item __gt__: maxVal) ifTrue: [
					maxVal := item
				]
			]
		] ___on___: StopIteration do: [:ex | ^ maxVal]
	]
%

category: 'Python-Built-in Functions'
method: builtins
sum: iterable
	"Return the sum of all items in an iterable"

	| iter total |
	total := 0.
	iter := iterable __iter__.

	[true] ___whileTrue___: [
		| item |
		[
			item := iter __next__.
			total := total __add__: item
		] ___on___: StopIteration do: [:ex | ^ total]
	]
%

category: 'Python-Built-in Functions'
method: builtins
all: iterable
	"Return True if all elements of the iterable are true"

	| iter |
	iter := iterable __iter__.

	[true] ___whileTrue___: [
		| item isTruthy |
		[
			item := iter __next__.
			[
				isTruthy := item __bool__
			] ___on___: MessageNotUnderstood do: [:ex |
				isTruthy := true
			].
			isTruthy ifFalse: [^ false]
		] ___on___: StopIteration do: [:ex | ^ true]
	]
%

category: 'Python-Built-in Functions'
method: builtins
any: iterable
	"Return True if any element of the iterable is true"

	| iter |
	iter := iterable __iter__.

	[true] ___whileTrue___: [
		| item isTruthy |
		[
			item := iter __next__.
			[
				isTruthy := item __bool__
			] ___on___: MessageNotUnderstood do: [:ex |
				isTruthy := true
			].
			isTruthy ifTrue: [^ true]
		] ___on___: StopIteration do: [:ex | ^ false]
	]
%

category: 'Python-Built-in Functions'
method: builtins
isinstance: anObject _: aClassOrTuple
	"Return True if object is an instance of classinfo"

	^ anObject ___isKindOf___: aClassOrTuple
%

category: 'Python-Built-in Functions'
method: builtins
callable: anObject
	"Return True if the object appears callable (responds to __call__)"

	| objClass |
	objClass := anObject ___class___.
	^ (objClass perform: #whichClassIncludesSelector:environmentId: env: 0 withArguments: {#__call__:. 2}) notNil
%

category: 'Python-Built-in Functions'
method: builtins
dir: anObject
	"Return the list of names in the current local scope or attributes of an object"

	^ anObject __dir__
%

category: 'Python-Built-in Functions'
method: builtins
id: anObject
	"Return the identity of an object"

	^ anObject ___identityHash___
%

category: 'Python-Built-in Functions'
method: builtins
pow: x _: y
	"Return x to the power y"

	^ x __pow__: y
%

category: 'Python-Built-in Functions'
method: builtins
pow: x _: y _: z
	"Return (x to the power y) modulo z"

	| result |
	result := x __pow__: y.
	^ result __mod__: z
%

category: 'Python-Built-in Functions'
method: builtins
round: number
	"Round a number to the nearest integer"

	^ number ___rounded___
%

category: 'Python-Built-in Functions'
method: builtins
round: number _: ndigits
	"Round a number to ndigits precision after the decimal point"

	| multiplier |
	ndigits ifNil: [^ number ___rounded___].
	multiplier := 10 perform: #** env: 0 withArguments: {ndigits}.
	^ ((number ___times___: multiplier) ___rounded___)
		___divide___: multiplier
%

category: 'Python-Built-in Functions'
method: builtins
divmod: x _: y
	"Return the tuple (x//y, x%y)"

	| quotient remainder |
	quotient := x __floordiv__: y.
	remainder := x __mod__: y.
	^ tuple ___withAll___: {quotient. remainder}
%

category: 'Python-Built-in Functions'
method: builtins
print: args
	"Print objects to stdout"

	| stream |
	stream := WriteStream ___on___: (String ___new___).
	"GsFile perform: #stdout env: 0."
	args ___do___: [:obj |
		| strRep |
		[
			strRep := obj __str__
		] ___on___: MessageNotUnderstood do: [:ex |
			strRep := obj __repr__
		].
		stream ___nextPutAll___: strRep.
		stream ___space___
	].
	stream ___cr___.
	UserGlobals ___at___: #'James' put: (stream ___contents___).
	^ nil
%

category: 'Python-Built-in Functions'
method: builtins
input
	"Read a line from input"

	| stream line |
	stream := System ___stdin___.
	line := stream ___nextLine___.
	^ line
%

category: 'Python-Built-in Functions'
method: builtins
input: prompt
	"Read a line from input, displaying a prompt first"

	| stream line |
	stream := System ___stdout___.
	stream ___nextPutAll___: prompt.
	stream ___flush___.

	stream := System ___stdin___.
	line := stream ___nextLine___.
	^ line
%

category: 'Python-Built-in Functions'
method: builtins
sorted: iterable
	"Return a new sorted list from the items in iterable"

	| lst iter sorted |
	lst := list ___new___.
	iter := iterable __iter__.

	"Collect all items from the iterable"
	[true] ___whileTrue___: [
		| item |
		[
			item := iter __next__.
			lst append: item
		] ___on___: StopIteration do: [:ex |
			"Use Smalltalk sort: to get a new sorted collection"
			sorted := lst ___sort___: [:a :b | a __lt__: b].
			^ sorted
		]
	]
%

category: 'Python-Built-in Functions'
method: builtins
reversed: sequence
	"Return a reverse iterator"

	| lst |
	lst := list ___new___.
	sequence ___reverseDo___: [:item |
		lst append: item
	].
	^ lst __iter__
%

category: 'Python-Built-in Functions'
method: builtins
enumerate: iterable
	"Return an enumerate object"

	| lst index iter |
	lst := list ___new___.
	index := 0.
	iter := iterable __iter__.

	[true] ___whileTrue___: [
		| item pair |
		[
			item := iter __next__.
			pair := tuple ___withAll___: {index. item}.
			lst append: pair.
			index := index ___plus___: 1
		] ___on___: StopIteration do: [:ex | ^ lst __iter__]
	]
%

category: 'Python-Built-in Functions'
method: builtins
zip: iterables
	"Return an iterator of tuples"

	| iterators result allDone |
	iterators := list ___new___.
	iterables ___do___: [:iterable |
		iterators append: iterable __iter__
	].

	result := list ___new___.
	allDone := false.

	[allDone] ___whileFalse___: [
		| items |
		items := list ___new___.
		iterators ___do___: [:iter |
			[
				| item |
				item := iter __next__.
				items append: item
			] ___on___: StopIteration do: [:ex |
				allDone := true.
				^ result __iter__
			]
		].
		allDone ifFalse: [
			| itemsArray tup |
			itemsArray := items ___asArray___.
			tup := tuple ___withAll___: itemsArray.
			result append: tup
		]
	].

	^ result __iter__
%

set compile_env: 0
