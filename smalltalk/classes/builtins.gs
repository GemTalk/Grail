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

category: 'Python-Singleton'
classmethod: builtins
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for builtins module'
%

category: 'Python-Singleton'
classmethod: builtins
instance
	"Return the singleton instance of builtins.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance perform: #initialize env: 2
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: builtins
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

set compile_env: 0

category: 'Convenience Methods'
classmethod: builtins
___instance___
	"Convenience method: self perform: #instance env: 2"
	^ self perform: #instance env: 2
%

set compile_env: 2

! ------------------- Instance methods for builtins

category: 'Python-Initialization'
method: builtins
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_abs;
		initialize_len;
		initialize_type;
		initialize_repr;
		initialize_str;
		initialize_hash;
		initialize_hex;
		initialize_oct;
		initialize_bin;
		initialize_chr;
		initialize_ord;
		initialize_min;
		initialize_max;
		initialize_sum;
		initialize_all;
		initialize_any;
		initialize_isinstance;
		initialize_callable;
		initialize_dir;
		initialize_id;
		initialize_pow;
		initialize_powWithMod;
		initialize_round;
		initialize_roundWithDigits;
		initialize_divmod;
		initialize_print;
		initialize_input;
		initialize_inputWithPrompt;
		initialize_sorted;
		initialize_reversed;
		initialize_enumerate;
		initialize_zip;
		yourself
%

category: 'Python-Initialization'
method: builtins
initialize_abs
	"Return the absolute value of a number"
	abs := [:positional :keywords | 
		| aNumber |
		aNumber := positional ___at___: 1.
		[aNumber __abs__] ___on___: MessageNotUnderstood do: [:ex | TypeError ___signal___]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_len
	"Return the length (the number of items) of an object"
	len := [:positional :keywords |
		| anObject className errorMsg |
		anObject := positional ___at___: 1.
		[anObject __len__] ___on___: MessageNotUnderstood do: [:ex |
			className := (anObject ___class___) ___name___.
			errorMsg := 'object of type ''' ___concat___: className.
			errorMsg := errorMsg ___concat___: ''' has no len()'.
			TypeError ___signal___: errorMsg
		]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_type
	"Return the type of an object"
	type := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __class__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_repr
	"Return a string containing a printable representation of an object"
	repr := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __repr__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_str
	"Return a string version of object"
	str := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		[anObject __str__] ___on___: MessageNotUnderstood do: [:ex |
			anObject __repr__
		]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_hash
	"Return the hash value of the object"
	hash := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		[anObject __hash__] ___on___: MessageNotUnderstood do: [:ex |
			TypeError ___signal___: 'unhashable type'
		]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_hex
	"Convert an integer number to a lowercase hexadecimal string"
	hex := [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 16.
		'0x' ___concat___: (result perform: #asLowercase env: 0)
	]
%

category: 'Python-Initialization'
method: builtins
initialize_oct
	"Convert an integer number to an octal string"
	oct := [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 8.
		'0o' ___concat___: result
	]
%

category: 'Python-Initialization'
method: builtins
initialize_bin
	"Convert an integer number to a binary string"
	bin := [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 2.
		'0b' ___concat___: result
	]
%

category: 'Python-Initialization'
method: builtins
initialize_chr
	"Return a string representing a character whose Unicode code point is the integer"
	chr := [:positional :keywords |
		| anInteger |
		anInteger := positional ___at___: 1.
		(Character ___codePoint___: anInteger)
			___asString___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_ord
	"Return an integer representing the Unicode code point of a character"
	ord := [:positional :keywords |
		| aString char size errorMsg sizeStr |
		aString := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_min
	"Return the smallest item in an iterable"
	min := [:positional :keywords |
		| iterable iter minVal first done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_max
	"Return the largest item in an iterable"
	max := [:positional :keywords |
		| iterable iter maxVal first done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_sum
	"Return the sum of all items in an iterable"
	sum := [:positional :keywords |
		| iterable iter total done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_all
	"Return True if all elements of the iterable are true"
	all := [:positional :keywords |
		| iterable iter result done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_any
	"Return True if any element of the iterable is true"
	any := [:positional :keywords |
		| iterable iter result done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_isinstance
	"Return True if object is an instance of classinfo"
	isinstance := [:positional :keywords |
		| anObject aClassOrTuple |
		anObject := positional ___at___: 1.
		aClassOrTuple := positional ___at___: 2.
		anObject ___isKindOf___: aClassOrTuple
	]
%

category: 'Python-Initialization'
method: builtins
initialize_callable
	"Return True if the object appears callable (responds to __call__)"
	callable := [:positional :keywords |
		| anObject objClass |
		anObject := positional ___at___: 1.
		objClass := anObject ___class___.
		(objClass perform: #whichClassIncludesSelector:environmentId: env: 0 withArguments: {#__call__:. 2}) notNil
	]
%

category: 'Python-Initialization'
method: builtins
initialize_dir
	"Return the list of names in the current local scope or attributes of an object"
	dir := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __dir__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_id
	"Return the identity of an object"
	id := [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject ___identityHash___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_pow
	"Return x to the power y, optionally modulo z"
	pow := [:positional :keywords |
		| x y |
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		x __pow__: y
	]
%

category: 'Python-Initialization'
method: builtins
initialize_powWithMod
	"Return (x to the power y) modulo z"
	powWithMod := [:positional :keywords |
		| x y z result |
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		z := positional ___at___: 3.
		result := x __pow__: y.
		result __mod__: z
	]
%

category: 'Python-Initialization'
method: builtins
initialize_round
	"Round a number to the nearest integer"
	round := [:positional :keywords |
		| number |
		number := positional ___at___: 1.
		number ___rounded___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_roundWithDigits
	"Round a number to ndigits precision after the decimal point"
	roundWithDigits := [:positional :keywords |
		| number ndigits multiplier |
		number := positional ___at___: 1.
		ndigits := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [keywords ___at___: #ndigits ifAbsent: [nil]].
		ndigits ifNil: [number ___rounded___] ifNotNil: [
			multiplier := 10 perform: #** env: 0 withArguments: {ndigits}.
			((number ___times___: multiplier) ___rounded___)
				___divide___: multiplier
		]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_divmod
	"Return the tuple (x//y, x%y)"
	divmod := [:positional :keywords |
		| x y quotient remainder |
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		quotient := x __floordiv__: y.
		remainder := x __mod__: y.
		tuple ___withAll___: {quotient. remainder}
	]
%

category: 'Python-Initialization'
method: builtins
initialize_print
	"Print objects to stdout"
	print := [:positional :keywords |
		positional ___do___: [:obj |
			| strRep |
			[
				strRep := obj __str__
			] ___on___: MessageNotUnderstood do: [:ex |
				strRep := obj __repr__
			].
			Transcript ___nextPutAll___: strRep.
			Transcript ___space___
		].
		Transcript ___cr___.
		nil
	]
%

category: 'Python-Initialization'
method: builtins
initialize_input
	"Read a line from input"
	input := [:positional :keywords |
		| stream line |
		stream := System ___stdin___.
		line := stream ___nextLine___.
		line
	]
%

category: 'Python-Initialization'
method: builtins
initialize_inputWithPrompt
	"Read a line from input, displaying a prompt first"
	inputWithPrompt := [:positional :keywords |
		| prompt stream line |
		prompt := positional ___at___: 1.
		stream := System ___stdout___.
		stream ___nextPutAll___: prompt.
		stream ___flush___.

		stream := System ___stdin___.
		line := stream ___nextLine___.
		line
	]
%

category: 'Python-Initialization'
method: builtins
initialize_sorted
	"Return a new sorted list from the items in iterable"
	sorted := [:positional :keywords |
		| iterable lst iter sortedResult done |
		iterable := positional ___at___: 1.
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
		sortedResult := lst ___sort___: [:a :b | a __lt__: b].
		sortedResult
	]
%

category: 'Python-Initialization'
method: builtins
initialize_reversed
	"Return a reverse iterator"
	reversed := [:positional :keywords |
		| sequence lst |
		sequence := positional ___at___: 1.
		lst := list ___new___.
		sequence ___reverseDo___: [:item |
			lst append: item
		].
		lst __iter__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_enumerate
	"Return an enumerate object"
	enumerate := [:positional :keywords |
		| iterable lst index iter done |
		iterable := positional ___at___: 1.
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

category: 'Python-Initialization'
method: builtins
initialize_zip
	"Return an iterator of tuples"
	zip := [:positional :keywords |
		| iterables iterators result allDone |
		iterables := positional ___at___: 1.
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

category: 'Python-Built-in Functions'
method: builtins
abs
	"Return the absolute value function"
	^ abs
%

category: 'Python-Built-in Functions'
method: builtins
abs: aBlock
	"Set the abs function (for monkey patching)"
	abs := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
len
	"Return the length function"
	^ len
%

category: 'Python-Built-in Functions'
method: builtins
len: aBlock
	"Set the len function (for monkey patching)"
	len := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
type
	"Return the type function"
	^ type
%

category: 'Python-Built-in Functions'
method: builtins
type: aBlock
	"Set the type function (for monkey patching)"
	type := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
repr
	"Return the repr function"
	^ repr
%

category: 'Python-Built-in Functions'
method: builtins
repr: aBlock
	"Set the repr function (for monkey patching)"
	repr := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
str
	"Return the str function"
	^ str
%

category: 'Python-Built-in Functions'
method: builtins
str: aBlock
	"Set the str function (for monkey patching)"
	str := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
hash
	"Return the hash function"
	^ hash
%

category: 'Python-Built-in Functions'
method: builtins
hash: aBlock
	"Set the hash function (for monkey patching)"
	hash := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
hex
	"Return the hex function"
	^ hex
%

category: 'Python-Built-in Functions'
method: builtins
hex: aBlock
	"Set the hex function (for monkey patching)"
	hex := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
oct
	"Return the oct function"
	^ oct
%

category: 'Python-Built-in Functions'
method: builtins
oct: aBlock
	"Set the oct function (for monkey patching)"
	oct := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
bin
	"Return the bin function"
	^ bin
%

category: 'Python-Built-in Functions'
method: builtins
bin: aBlock
	"Set the bin function (for monkey patching)"
	bin := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
chr
	"Return the chr function"
	^ chr
%

category: 'Python-Built-in Functions'
method: builtins
chr: aBlock
	"Set the chr function (for monkey patching)"
	chr := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
ord
	"Return the ord function"
	^ ord
%

category: 'Python-Built-in Functions'
method: builtins
ord: aBlock
	"Set the ord function (for monkey patching)"
	ord := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
min
	"Return the min function"
	^ min
%

category: 'Python-Built-in Functions'
method: builtins
min: aBlock
	"Set the min function (for monkey patching)"
	min := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
max
	"Return the max function"
	^ max
%

category: 'Python-Built-in Functions'
method: builtins
max: aBlock
	"Set the max function (for monkey patching)"
	max := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
sum
	"Return the sum function"
	^ sum
%

category: 'Python-Built-in Functions'
method: builtins
sum: aBlock
	"Set the sum function (for monkey patching)"
	sum := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
all
	"Return the all function"
	^ all
%

category: 'Python-Built-in Functions'
method: builtins
all: aBlock
	"Set the all function (for monkey patching)"
	all := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
any
	"Return the any function"
	^ any
%

category: 'Python-Built-in Functions'
method: builtins
any: aBlock
	"Set the any function (for monkey patching)"
	any := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
isinstance
	"Return the isinstance function"
	^ isinstance
%

category: 'Python-Built-in Functions'
method: builtins
isinstance: aBlock
	"Set the isinstance function (for monkey patching)"
	isinstance := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
callable
	"Return the callable function"
	^ callable
%

category: 'Python-Built-in Functions'
method: builtins
callable: aBlock
	"Set the callable function (for monkey patching)"
	callable := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
dir
	"Return the dir function"
	^ dir
%

category: 'Python-Built-in Functions'
method: builtins
dir: aBlock
	"Set the dir function (for monkey patching)"
	dir := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
id
	"Return the id function"
	^ id
%

category: 'Python-Built-in Functions'
method: builtins
id: aBlock
	"Set the id function (for monkey patching)"
	id := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
pow
	"Return the pow function"
	^ pow
%

category: 'Python-Built-in Functions'
method: builtins
pow: aBlock
	"Set the pow function (for monkey patching)"
	pow := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
powWithMod
	"Return the powWithMod function"
	^ powWithMod
%

category: 'Python-Built-in Functions'
method: builtins
powWithMod: aBlock
	"Set the powWithMod function (for monkey patching)"
	powWithMod := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
round
	"Return the round function"
	^ round
%

category: 'Python-Built-in Functions'
method: builtins
round: aBlock
	"Set the round function (for monkey patching)"
	round := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
roundWithDigits
	"Return the roundWithDigits function"
	^ roundWithDigits
%

category: 'Python-Built-in Functions'
method: builtins
roundWithDigits: aBlock
	"Set the roundWithDigits function (for monkey patching)"
	roundWithDigits := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
divmod
	"Return the divmod function"
	^ divmod
%

category: 'Python-Built-in Functions'
method: builtins
divmod: aBlock
	"Set the divmod function (for monkey patching)"
	divmod := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
print
	"Return the print function"
	^ print
%

category: 'Python-Built-in Functions'
method: builtins
print: aBlock
	"Set the print function (for monkey patching)"
	print := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
input
	"Return the input function"
	^ input
%

category: 'Python-Built-in Functions'
method: builtins
input: aBlock
	"Set the input function (for monkey patching)"
	input := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
inputWithPrompt
	"Return the inputWithPrompt function"
	^ inputWithPrompt
%

category: 'Python-Built-in Functions'
method: builtins
inputWithPrompt: aBlock
	"Set the inputWithPrompt function (for monkey patching)"
	inputWithPrompt := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
sorted
	"Return the sorted function"
	^ sorted
%

category: 'Python-Built-in Functions'
method: builtins
sorted: aBlock
	"Set the sorted function (for monkey patching)"
	sorted := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
reversed
	"Return the reversed function"
	^ reversed
%

category: 'Python-Built-in Functions'
method: builtins
reversed: aBlock
	"Set the reversed function (for monkey patching)"
	reversed := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
enumerate
	"Return the enumerate function"
	^ enumerate
%

category: 'Python-Built-in Functions'
method: builtins
enumerate: aBlock
	"Set the enumerate function (for monkey patching)"
	enumerate := aBlock
%

category: 'Python-Built-in Functions'
method: builtins
zip
	"Return the zip function"
	^ zip
%

category: 'Python-Built-in Functions'
method: builtins
zip: aBlock
	"Set the zip function (for monkey patching)"
	zip := aBlock
%
set compile_env: 0

category: 'Python-Utility'
method: builtins
asSymbolDictionary
	"Return a SymbolDictionary populated with keys and values equivalent to the instance variables in builtins.
	Each instance variable name (as a Symbol) is a key, and its value (the block/function) is the value."
	| dict varNames |
	dict := SymbolDictionary new.
	varNames := self class instVarNames.
	"Populate dictionary with instance variable names and values"
	1 to: varNames size do: [:i |
		dict 
			at: (varNames at: i) 
			put: (self instVarAt: i).
	].
	^ dict
%

