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
abs
	"Return the absolute value of a number"

	^ [:aNumber | [aNumber __abs__] ___on___: MessageNotUnderstood do: [:ex | TypeError ___signal___]]
%

category: 'Python-Built-in Functions'
method: builtins
len
	"Return the length (the number of items) of an object"

	^ [:anObject |
		| className errorMsg |
		[anObject __len__] ___on___: MessageNotUnderstood do: [:ex |
			className := (anObject ___class___) ___name___.
			errorMsg := 'object of type ''' ___concat___: className.
			errorMsg := errorMsg ___concat___: ''' has no len()'.
			TypeError ___signal___: errorMsg
		]
	]
%

category: 'Python-Built-in Functions'
method: builtins
type
	"Return the type of an object"

	^ [:anObject | anObject __class__]
%

category: 'Python-Built-in Functions'
method: builtins
repr
	"Return a string containing a printable representation of an object"

	^ [:anObject | anObject __repr__]
%

category: 'Python-Built-in Functions'
method: builtins
str
	"Return a string version of object"

	^ [:anObject |
		[anObject __str__] ___on___: MessageNotUnderstood do: [:ex |
			anObject __repr__
		]
	]
%

category: 'Python-Built-in Functions'
method: builtins
hash
	"Return the hash value of the object"

	^ [:anObject |
		[anObject __hash__] ___on___: MessageNotUnderstood do: [:ex |
			TypeError ___signal___: 'unhashable type'
		]
	]
%

category: 'Python-Built-in Functions'
method: builtins
hex
	"Convert an integer number to a lowercase hexadecimal string"

	^ [:aNumber |
		| result |
		result := aNumber ___printStringRadix___: 16.
		'0x' ___concat___: (result perform: #asLowercase env: 0)
	]
%

category: 'Python-Built-in Functions'
method: builtins
oct
	"Convert an integer number to an octal string"

	^ [:aNumber |
		| result |
		result := aNumber ___printStringRadix___: 8.
		'0o' ___concat___: result
	]
%

category: 'Python-Built-in Functions'
method: builtins
bin
	"Convert an integer number to a binary string"

	^ [:aNumber |
		| result |
		result := aNumber ___printStringRadix___: 2.
		'0b' ___concat___: result
	]
%

category: 'Python-Built-in Functions'
method: builtins
chr
	"Return a string representing a character whose Unicode code point is the integer"

	^ [:anInteger |
		(Character ___codePoint___: anInteger)
			___asString___
	]
%

category: 'Python-Built-in Functions'
method: builtins
ord
	"Return an integer representing the Unicode code point of a character"

	^ [:aString |
		| char size errorMsg sizeStr |
		size := aString ___size___.
		(size ___eq___: 1) ifFalse: [
			sizeStr := size ___asString___.
			errorMsg := 'ord() expected a character, but string of length ' ___concat___: sizeStr.
			errorMsg := errorMsg ___concat___: ' found'.
			TypeError ___signal___: errorMsg
		].
		char := aString ___at___: 1.
		char ___codePoint___
	]
%

category: 'Python-Built-in Functions'
method: builtins
min
	"Return the smallest item in an iterable"

	^ [:iterable |
		| iter minVal first done |
		iter := iterable __iter__.
		first := true.
		minVal := nil.
		done := false.

		[done] ___whileFalse___: [
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
			] ___on___: StopIteration do: [:ex | done := true]
		].
		minVal
	]
%

category: 'Python-Built-in Functions'
method: builtins
max
	"Return the largest item in an iterable"

	^ [:iterable |
		| iter maxVal first done |
		iter := iterable __iter__.
		first := true.
		maxVal := nil.
		done := false.

		[done] ___whileFalse___: [
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
			] ___on___: StopIteration do: [:ex | done := true]
		].
		maxVal
	]
%

category: 'Python-Built-in Functions'
method: builtins
sum
	"Return the sum of all items in an iterable"

	^ [:iterable |
		| iter total done |
		total := 0.
		iter := iterable __iter__.
		done := false.

		[done] ___whileFalse___: [
			| item |
			[
				item := iter __next__.
				total := total __add__: item
			] ___on___: StopIteration do: [:ex | done := true]
		].
		total
	]
%

category: 'Python-Built-in Functions'
method: builtins
all
	"Return True if all elements of the iterable are true"

	^ [:iterable |
		| iter result done |
		iter := iterable __iter__.
		result := true.
		done := false.

		[done] ___whileFalse___: [
			| item isTruthy |
			[
				item := iter __next__.
				[
					isTruthy := item __bool__
				] ___on___: MessageNotUnderstood do: [:ex |
					isTruthy := true
				].
				isTruthy ifFalse: [
					result := false.
					done := true  "Short-circuit: stop on first false"
				]
			] ___on___: StopIteration do: [:ex | done := true]
		].
		result
	]
%

category: 'Python-Built-in Functions'
method: builtins
any
	"Return True if any element of the iterable is true"

	^ [:iterable |
		| iter result done |
		iter := iterable __iter__.
		result := false.
		done := false.

		[done] ___whileFalse___: [
			| item isTruthy |
			[
				item := iter __next__.
				[
					isTruthy := item __bool__
				] ___on___: MessageNotUnderstood do: [:ex |
					isTruthy := true
				].
				isTruthy ifTrue: [
					result := true.
					done := true  "Short-circuit: stop on first true"
				]
			] ___on___: StopIteration do: [:ex | done := true]
		].
		result
	]
%

category: 'Python-Built-in Functions'
method: builtins
isinstance
	"Return True if object is an instance of classinfo"

	^ [:anObject :aClassOrTuple | anObject ___isKindOf___: aClassOrTuple]
%

category: 'Python-Built-in Functions'
method: builtins
callable
	"Return True if the object appears callable (responds to __call__)"

	^ [:anObject |
		| objClass |
		objClass := anObject ___class___.
		(objClass perform: #whichClassIncludesSelector:environmentId: env: 0 withArguments: {#__call__:. 2}) notNil
	]
%

category: 'Python-Built-in Functions'
method: builtins
dir
	"Return the list of names in the current local scope or attributes of an object"

	^ [:anObject | anObject __dir__]
%

category: 'Python-Built-in Functions'
method: builtins
id
	"Return the identity of an object"

	^ [:anObject | anObject ___identityHash___]
%

category: 'Python-Built-in Functions'
method: builtins
pow
	"Return x to the power y, optionally modulo z"

	^ [:x :y | x __pow__: y]
%

category: 'Python-Built-in Functions'
method: builtins
powWithMod
	"Return (x to the power y) modulo z"

	^ [:x :y :z |
		| result |
		result := x __pow__: y.
		result __mod__: z
	]
%

category: 'Python-Built-in Functions'
method: builtins
round
	"Round a number to the nearest integer"

	^ [:number | number ___rounded___]
%

category: 'Python-Built-in Functions'
method: builtins
roundWithDigits
	"Round a number to ndigits precision after the decimal point"

	^ [:number :ndigits |
		| multiplier |
		ndigits ifNil: [number ___rounded___] ifNotNil: [
			multiplier := 10 perform: #** env: 0 withArguments: {ndigits}.
			((number ___times___: multiplier) ___rounded___)
				___divide___: multiplier
		]
	]
%

category: 'Python-Built-in Functions'
method: builtins
divmod
	"Return the tuple (x//y, x%y)"

	^ [:x :y |
		| quotient remainder |
		quotient := x __floordiv__: y.
		remainder := x __mod__: y.
		tuple ___withAll___: {quotient. remainder}
	]
%

category: 'Python-Built-in Functions'
method: builtins
print
	"Print objects to stdout"

	^ [:args |
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
		nil
	]
%

category: 'Python-Built-in Functions'
method: builtins
input
	"Read a line from input"

	^ [
		| stream line |
		stream := System ___stdin___.
		line := stream ___nextLine___.
		line
	]
%

category: 'Python-Built-in Functions'
method: builtins
inputWithPrompt
	"Read a line from input, displaying a prompt first"

	^ [:prompt |
		| stream line |
		stream := System ___stdout___.
		stream ___nextPutAll___: prompt.
		stream ___flush___.

		stream := System ___stdin___.
		line := stream ___nextLine___.
		line
	]
%

category: 'Python-Built-in Functions'
method: builtins
sorted
	"Return a new sorted list from the items in iterable"

	^ [:iterable |
		| lst iter sorted done |
		lst := list ___new___.
		iter := iterable __iter__.
		done := false.

		"Collect all items from the iterable"
		[done] ___whileFalse___: [
			| item |
			[
				item := iter __next__.
				lst append: item
			] ___on___: StopIteration do: [:ex | done := true]
		].
		"Use Smalltalk sort: to get a new sorted collection"
		sorted := lst ___sort___: [:a :b | a __lt__: b].
		sorted
	]
%

category: 'Python-Built-in Functions'
method: builtins
reversed
	"Return a reverse iterator"

	^ [:sequence |
		| lst |
		lst := list ___new___.
		sequence ___reverseDo___: [:item |
			lst append: item
		].
		lst __iter__
	]
%

category: 'Python-Built-in Functions'
method: builtins
enumerate
	"Return an enumerate object"

	^ [:iterable |
		| lst index iter done |
		lst := list ___new___.
		index := 0.
		iter := iterable __iter__.
		done := false.

		[done] ___whileFalse___: [
			| item pair |
			[
				item := iter __next__.
				pair := tuple ___withAll___: {index. item}.
				lst append: pair.
				index := index ___plus___: 1
			] ___on___: StopIteration do: [:ex | done := true]
		].
		lst __iter__
	]
%

category: 'Python-Built-in Functions'
method: builtins
zip
	"Return an iterator of tuples"

	^ [:iterables |
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
					allDone := true
				]
			].
			allDone ifFalse: [
				| itemsArray tup |
				itemsArray := items ___asArray___.
				tup := tuple ___withAll___: itemsArray.
				result append: tup
			]
		].
		result __iter__
	]
%

category: 'Python-Utility'
method: builtins
asSymbolDictionary
	"Return a SymbolDictionary populated with keys and values equivalent to the methods in builtins.
	Each method name (as a Symbol) is a key, and its value (the block/function it returns) is the value."
	| dict selectors myClass methodName methodValue definingClass |
	dict := SymbolDictionary perform: #new env: 0.
	myClass := self ___class___.
	selectors := myClass perform: #allSelectorsForEnvironment: env: 0 withArguments: { 2 }.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors perform: #reject: env: 0 withArguments: { [:selector |
		| selectorStr prefix |
		selectorStr := selector ___asString___.
		((selectorStr ___size___) ___ge___: 3) ifTrue: [
			prefix := selectorStr ___copyFrom___: 1 to: 3.
			prefix ___eq___: '___'
		] ifFalse: [false]
	] }.
	"Also filter out asSymbolDictionary itself and any methods with colons (keyword methods)"
	selectors := selectors perform: #reject: env: 0 withArguments: { [:selector |
		(selector ___eq___: #asSymbolDictionary) or: [
			(selector perform: #indexOf: env: 0 withArguments: { $: }) ~~ 0
		]
	] }.
	"Filter out inherited methods - only include methods defined directly in builtins"
	selectors := selectors perform: #select: env: 0 withArguments: { [:selector |
		definingClass := myClass perform: #whichClassIncludesSelector:environmentId: env: 0 withArguments: { selector. 2 }.
		definingClass == myClass
	] }.
	"Get method values and populate dictionary"
	selectors ___do___: [:selector |
		"Call the method to get its value (the block)"
		methodValue := self perform: selector env: 2.
		dict perform: #at:put: env: 0 withArguments: { selector. methodValue }
	].
	^ dict
%

set compile_env: 0
