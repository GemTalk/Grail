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

	[^ aNumber __abs__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex | TypeError perform: #signal env: 0]}
%

category: 'Python-Built-in Functions'
method: builtins
len: anObject
	"Return the length (the number of items) of an object"

	| className errorMsg |
	[^ anObject __len__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
		className := (anObject perform: #class env: 0) perform: #name env: 0.
		errorMsg := 'object of type ''' perform: #, env: 0 withArguments: {className}.
		errorMsg := errorMsg perform: #, env: 0 withArguments: {''' has no len()'}.
		TypeError perform: #signal: env: 0 withArguments: {errorMsg}
	]}
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

	[^ anObject __str__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
		^ anObject __repr__
	]}
%

category: 'Python-Built-in Functions'
method: builtins
hash: anObject
	"Return the hash value of the object"

	[^ anObject __hash__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
		TypeError perform: #signal: env: 0 withArguments: {'unhashable type'}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
hex: aNumber
	"Convert an integer number to a lowercase hexadecimal string"

	| result |
	result := aNumber perform: #printStringRadix: env: 0 withArguments: {16}.
	^ '0x' perform: #, env: 0 withArguments: {result perform: #asLowercase env: 0}
%

category: 'Python-Built-in Functions'
method: builtins
oct: aNumber
	"Convert an integer number to an octal string"

	| result |
	result := aNumber perform: #printStringRadix: env: 0 withArguments: {8}.
	^ '0o' perform: #, env: 0 withArguments: {result}
%

category: 'Python-Built-in Functions'
method: builtins
bin: aNumber
	"Convert an integer number to a binary string"

	| result |
	result := aNumber perform: #printStringRadix: env: 0 withArguments: {2}.
	^ '0b' perform: #, env: 0 withArguments: {result}
%

category: 'Python-Built-in Functions'
method: builtins
chr: anInteger
	"Return a string representing a character whose Unicode code point is the integer"

	^ (Character perform: #codePoint: env: 0 withArguments: {anInteger})
		perform: #asString env: 0
%

category: 'Python-Built-in Functions'
method: builtins
ord: aString
	"Return an integer representing the Unicode code point of a character"

	| char size errorMsg sizeStr |
	size := aString perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {1}) ifFalse: [
		sizeStr := size perform: #asString env: 0.
		errorMsg := 'ord() expected a character, but string of length ' perform: #, env: 0 withArguments: {sizeStr}.
		errorMsg := errorMsg perform: #, env: 0 withArguments: {' found'}.
		TypeError perform: #signal: env: 0 withArguments: {errorMsg}
	].
	char := aString perform: #at: env: 0 withArguments: {1}.
	^ char perform: #codePoint env: 0
%

category: 'Python-Built-in Functions'
method: builtins
min: iterable
	"Return the smallest item in an iterable"

	| iter minVal first |
	iter := iterable __iter__.
	first := true.
	minVal := nil.

	[true] perform: #whileTrue: env: 0 withArguments: {[
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
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ minVal]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
max: iterable
	"Return the largest item in an iterable"

	| iter maxVal first |
	iter := iterable __iter__.
	first := true.
	maxVal := nil.

	[true] perform: #whileTrue: env: 0 withArguments: {[
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
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ maxVal]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
sum: iterable
	"Return the sum of all items in an iterable"

	| iter total |
	total := 0.
	iter := iterable __iter__.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item |
		[
			item := iter __next__.
			total := total __add__: item
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ total]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
all: iterable
	"Return True if all elements of the iterable are true"

	| iter |
	iter := iterable __iter__.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item isTruthy |
		[
			item := iter __next__.
			[
				isTruthy := item __bool__
			] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
				isTruthy := true
			]}.
			isTruthy ifFalse: [^ false]
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ true]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
any: iterable
	"Return True if any element of the iterable is true"

	| iter |
	iter := iterable __iter__.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item isTruthy |
		[
			item := iter __next__.
			[
				isTruthy := item __bool__
			] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
				isTruthy := true
			]}.
			isTruthy ifTrue: [^ true]
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ false]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
isinstance: anObject _: aClassOrTuple
	"Return True if object is an instance of classinfo"

	^ anObject perform: #isKindOf: env: 0 withArguments: {aClassOrTuple}
%

category: 'Python-Built-in Functions'
method: builtins
callable: anObject
	"Return True if the object appears callable (responds to __call__)"

	| objClass |
	objClass := anObject perform: #class env: 0.
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

	^ anObject perform: #identityHash env: 0
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

	^ number perform: #rounded env: 0
%

category: 'Python-Built-in Functions'
method: builtins
round: number _: ndigits
	"Round a number to ndigits precision after the decimal point"

	| multiplier |
	ndigits ifNil: [^ number perform: #rounded env: 0].
	multiplier := 10 perform: #** env: 0 withArguments: {ndigits}.
	^ (number perform: #* env: 0 withArguments: {multiplier}) perform: #rounded env: 0
		perform: #/ env: 0 withArguments: {multiplier}
%

category: 'Python-Built-in Functions'
method: builtins
divmod: x _: y
	"Return the tuple (x//y, x%y)"

	| quotient remainder |
	quotient := x __floordiv__: y.
	remainder := x __mod__: y.
	^ tuple perform: #withAll: env: 0 withArguments: {{quotient. remainder}}
%

category: 'Python-Built-in Functions'
method: builtins
print: args
	"Print objects to stdout"

	| stream |
	stream := System perform: #stdout env: 0.
	args perform: #do: env: 0 withArguments: {[:obj |
		| strRep |
		[
			strRep := obj __str__
		] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
			strRep := obj __repr__
		]}.
		stream perform: #nextPutAll: env: 0 withArguments: {strRep}.
		stream perform: #space env: 0
	]}.
	stream perform: #cr env: 0.
	^ nil
%

category: 'Python-Built-in Functions'
method: builtins
input
	"Read a line from input"

	| stream line |
	stream := System perform: #stdin env: 0.
	line := stream perform: #nextLine env: 0.
	^ line
%

category: 'Python-Built-in Functions'
method: builtins
input: prompt
	"Read a line from input, displaying a prompt first"

	| stream line |
	stream := System perform: #stdout env: 0.
	stream perform: #nextPutAll: env: 0 withArguments: {prompt}.
	stream perform: #flush env: 0.

	stream := System perform: #stdin env: 0.
	line := stream perform: #nextLine env: 0.
	^ line
%

category: 'Python-Built-in Functions'
method: builtins
sorted: iterable
	"Return a new sorted list from the items in iterable"

	| lst iter sorted |
	lst := list perform: #new env: 0.
	iter := iterable __iter__.

	"Collect all items from the iterable"
	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item |
		[
			item := iter __next__.
			lst append: item
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex |
			"Use Smalltalk sort: to get a new sorted collection"
			sorted := lst perform: #sort: env: 0 withArguments: {[:a :b | a __lt__: b]}.
			^ sorted
		]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
reversed: sequence
	"Return a reverse iterator"

	| lst |
	lst := list perform: #new env: 0.
	sequence perform: #reverseDo: env: 0 withArguments: {[:item |
		lst append: item
	]}.
	^ lst __iter__
%

category: 'Python-Built-in Functions'
method: builtins
enumerate: iterable
	"Return an enumerate object"

	| lst index iter |
	lst := list perform: #new env: 0.
	index := 0.
	iter := iterable __iter__.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item pair |
		[
			item := iter __next__.
			pair := tuple perform: #withAll: env: 0 withArguments: {{index. item}}.
			lst append: pair.
			index := index perform: #+ env: 0 withArguments: {1}
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ lst __iter__]}
	]}
%

category: 'Python-Built-in Functions'
method: builtins
zip: iterables
	"Return an iterator of tuples"

	| iterators result allDone |
	iterators := list perform: #new env: 0.
	iterables perform: #do: env: 0 withArguments: {[:iterable |
		iterators append: iterable __iter__
	]}.

	result := list perform: #new env: 0.
	allDone := false.

	[allDone] perform: #whileFalse: env: 0 withArguments: {[
		| items |
		items := list perform: #new env: 0.
		iterators perform: #do: env: 0 withArguments: {[:iter |
			[
				| item |
				item := iter __next__.
				items append: item
			] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex |
				allDone := true.
				^ result __iter__
			]}
		]}.
		allDone ifFalse: [
			| itemsArray tup |
			itemsArray := items perform: #asArray env: 0.
			tup := tuple perform: #withAll: env: 0 withArguments: {itemsArray}.
			result append: tup
		]
	]}.

	^ result __iter__
%

set compile_env: 0
