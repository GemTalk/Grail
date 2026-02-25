! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- builtins class (Python 'builtins' module)
expectvalue /Class
doit
module subclass: 'builtins'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
builtins comment:
'Python builtins module.

This class provides access to Python''s built-in functions like abs(), len(), print(), etc.
Each method in this class corresponds to a Python built-in function.

See https://docs.python.org/3/library/functions.html for the complete list.
'
%

expectvalue /Class
doit
builtins category: 'Modules'
%

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
builtins removeAllMethods.
builtins class removeAllMethods.
%

set compile_env: 1

category: 'Python-Built-in Functions'
method: builtins
__import__
	"Return the __import__ function"
	^ self ___at___: #__import__
%

category: 'Python-Built-in Functions'
method: builtins
__import__: aBlock
	"Set the __import__ function (for monkey patching)"
	self ___at___: #__import__ put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
abs
	"Return the absolute value function"
	^ self ___at___: #abs
%

category: 'Python-Built-in Functions'
method: builtins
abs: aBlock
	"Set the abs function (for monkey patching)"
	self ___at___: #abs put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
all
	"Return the all function"
	^ self ___at___: #all
%

category: 'Python-Built-in Functions'
method: builtins
all: aBlock
	"Set the all function (for monkey patching)"
	self ___at___: #all put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
any
	"Return the any function"
	^ self ___at___: #any
%

category: 'Python-Built-in Functions'
method: builtins
any: aBlock
	"Set the any function (for monkey patching)"
	self ___at___: #any put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
bin
	"Return the bin function"
	^ self ___at___: #bin
%

category: 'Python-Built-in Functions'
method: builtins
bin: aBlock
	"Set the bin function (for monkey patching)"
	self ___at___: #bin put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
callable
	"Return the callable function"
	^ self ___at___: #callable
%

category: 'Python-Built-in Functions'
method: builtins
callable: aBlock
	"Set the callable function (for monkey patching)"
	self ___at___: #callable put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
chr
	"Return the chr function"
	^ self ___at___: #chr
%

category: 'Python-Built-in Functions'
method: builtins
chr: aBlock
	"Set the chr function (for monkey patching)"
	self ___at___: #chr put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
dir
	"Return the dir function"
	^ self ___at___: #dir
%

category: 'Python-Built-in Functions'
method: builtins
dir: aBlock
	"Set the dir function (for monkey patching)"
	self ___at___: #dir put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
divmod
	"Return the divmod function"
	^ self ___at___: #divmod
%

category: 'Python-Built-in Functions'
method: builtins
divmod: aBlock
	"Set the divmod function (for monkey patching)"
	self ___at___: #divmod put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
enumerate
	"Return the enumerate function"
	^ self ___at___: #enumerate
%

category: 'Python-Built-in Functions'
method: builtins
enumerate: aBlock
	"Set the enumerate function (for monkey patching)"
	self ___at___: #enumerate put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
hash
	"Return the hash function"
	^ self ___at___: #hash
%

category: 'Python-Built-in Functions'
method: builtins
hash: aBlock
	"Set the hash function (for monkey patching)"
	self ___at___: #hash put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
hex
	"Return the hex function"
	^ self ___at___: #hex
%

category: 'Python-Built-in Functions'
method: builtins
hex: aBlock
	"Set the hex function (for monkey patching)"
	self ___at___: #hex put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
id
	"Return the id function"
	^ self ___at___: #id
%

category: 'Python-Built-in Functions'
method: builtins
id: aBlock
	"Set the id function (for monkey patching)"
	self ___at___: #id put: aBlock
%

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
		initialize___import__;
		initialize_quit;
		yourself
%

category: 'Python-Initialization'
method: builtins
initialize___import__
	"Import a module.
	__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module

	This function is invoked by the import statement.
	It delegates to importlib.__import__."
	self ___at___: #__import__ put: [:positional :keywords |
		| importlibInstance importFunc |
		importlibInstance := importlib instance.
		importFunc := importlibInstance __import__.
		importFunc value: positional value: keywords
	]
%

category: 'Python-Initialization'
method: builtins
initialize_abs
	"Return the absolute value of a number"
	self ___at___: #abs put: [:positional :keywords | 
		| aNumber |
		aNumber := positional ___at___: 1.
		[aNumber __abs__] ___on___: MessageNotUnderstood do: [:ex | TypeError ___signal___]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_all
	"Return True if all elements of the iterable are true"
	self ___at___: #all put: [:positional :keywords |
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
	self ___at___: #any put: [:positional :keywords |
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
initialize_bin
	"Convert an integer number to a binary string"
	self ___at___: #bin put: [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 2.
		'0b' ___concat___: result
	]
%

category: 'Python-Initialization'
method: builtins
initialize_callable
	"Return True if the object appears callable (responds to __call__)"
	self ___at___: #callable put: [:positional :keywords |
		| anObject objClass |
		anObject := positional ___at___: 1.
		objClass := anObject ___class___.
		(objClass perform: #whichClassIncludesSelector:environmentId: env: 0 withArguments: {#__call__:. 2}) notNil
	]
%

category: 'Python-Initialization'
method: builtins
initialize_chr
	"Return a string representing a character whose Unicode code point is the integer"
	self ___at___: #chr put: [:positional :keywords |
		| anInteger |
		anInteger := positional ___at___: 1.
		(Character ___codePoint___: anInteger)
			___asString___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_dir
	"Return the list of names in the current local scope or attributes of an object"
	self ___at___: #dir put: [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __dir__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_divmod
	"Return the tuple (x//y, x%y)"
	self ___at___: #divmod put: [:positional :keywords |
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
initialize_enumerate
	"Return an enumerate object"
	self ___at___: #enumerate put: [:positional :keywords |
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
initialize_hash
	"Return the hash value of the object"
	self ___at___: #hash put: [:positional :keywords |
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
	self ___at___: #hex put: [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 16.
		'0x' ___concat___: (result perform: #asLowercase env: 0)
	]
%

category: 'Python-Initialization'
method: builtins
initialize_id
	"Return the identity of an object"
	self ___at___: #id put: [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject ___identityHash___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_input
	"Read a line from input"
	self ___at___: #input put: [:positional :keywords |
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
	self ___at___: #inputWithPrompt put: [:positional :keywords |
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
initialize_isinstance
	"Return True if object is an instance of classinfo.
	Supports Abstract Base Classes (ABCs) via __instancecheck__."
	self ___at___: #isinstance put: [:positional :keywords |
		| anObject aClassOrTuple result theMetaclass |
		anObject := positional ___at___: 1.
		aClassOrTuple := positional ___at___: 2.

		"First try normal isinstance check"
		result := anObject ___isKindOf___: aClassOrTuple.

		"If normal check fails, try ABC's __instancecheck__ if it exists"
		result ifFalse: [
			theMetaclass := aClassOrTuple ___class___.
			(theMetaclass perform: #includesSelector:environmentId: env: 0
				withArguments: {#'__instancecheck__:'. 2}) ifTrue: [
					result := aClassOrTuple __instancecheck__: anObject
				]
		].

		result
	]
%

category: 'Python-Initialization'
method: builtins
initialize_len
	"Return the length (the number of items) of an object"
	self ___at___: #len put: [:positional :keywords |
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
initialize_max
	"Return the largest item in an iterable"
	self ___at___: #max put: [:positional :keywords |
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
initialize_min
	"Return the smallest item in an iterable"
	self ___at___: #min put: [:positional :keywords |
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
initialize_oct
	"Convert an integer number to an octal string"
	self ___at___: #oct put: [:positional :keywords |
		| aNumber result |
		aNumber := positional ___at___: 1.
		result := aNumber ___printStringRadix___: 8.
		'0o' ___concat___: result
	]
%

category: 'Python-Initialization'
method: builtins
initialize_ord
	"Return an integer representing the Unicode code point of a character"
	self ___at___: #ord put: [:positional :keywords |
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
initialize_pow
	"Return x to the power y, optionally modulo z"
	self ___at___: #pow put: [:positional :keywords |
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
	self ___at___: #powWithMod put: [:positional :keywords |
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
initialize_print
	"Print objects to stdout"
	self ___at___: #print put: [:positional :keywords |
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
initialize_quit
	"Exit the interpreter"
	self ___at___: #quit put: [:positional :keywords |
		ExitClientError perform: #signal:status: env: 0 withArguments: {  'quit()'. 0 }
	]
%

category: 'Python-Initialization'
method: builtins
initialize_repr
	"Return a string containing a printable representation of an object"
	self ___at___: #repr put: [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __repr__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_reversed
	"Return a reverse iterator"
	self ___at___: #reversed put: [:positional :keywords |
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
initialize_round
	"Round a number to the nearest integer"
	self ___at___: #round put: [:positional :keywords |
		| number |
		number := positional ___at___: 1.
		number ___rounded___
	]
%

category: 'Python-Initialization'
method: builtins
initialize_roundWithDigits
	"Round a number to ndigits precision after the decimal point"
	self ___at___: #roundWithDigits put: [:positional :keywords |
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
initialize_sorted
	"Return a new sorted list from the items in iterable"
	self ___at___: #sorted put: [:positional :keywords |
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
initialize_str
	"Return a string version of object"
	self ___at___: #str put: [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		[anObject __str__] ___on___: MessageNotUnderstood do: [:ex |
			anObject __repr__
		]
	]
%

category: 'Python-Initialization'
method: builtins
initialize_sum
	"Return the sum of all items in an iterable"
	self ___at___: #sum put: [:positional :keywords |
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
initialize_type
	"Return the type of an object"
	self ___at___: #type put: [:positional :keywords |
		| anObject |
		anObject := positional ___at___: 1.
		anObject __class__
	]
%

category: 'Python-Initialization'
method: builtins
initialize_zip
	"Return an iterator of tuples"
	self ___at___: #zip put: [:positional :keywords |
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
input
	"Return the input function"
	^ self ___at___: #input
%

category: 'Python-Built-in Functions'
method: builtins
input: aBlock
	"Set the input function (for monkey patching)"
	self ___at___: #input put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
inputWithPrompt
	"Return the inputWithPrompt function"
	^ self ___at___: #inputWithPrompt
%

category: 'Python-Built-in Functions'
method: builtins
inputWithPrompt: aBlock
	"Set the inputWithPrompt function (for monkey patching)"
	self ___at___: #inputWithPrompt put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
isinstance
	"Return the isinstance function"
	^ self ___at___: #isinstance
%

category: 'Python-Built-in Functions'
method: builtins
isinstance: aBlock
	"Set the isinstance function (for monkey patching)"
	self ___at___: #isinstance put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
len
	"Return the length function"
	^ self ___at___: #len
%

category: 'Python-Built-in Functions'
method: builtins
len: aBlock
	"Set the len function (for monkey patching)"
	self ___at___: #len put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
max
	"Return the max function"
	^ self ___at___: #max
%

category: 'Python-Built-in Functions'
method: builtins
max: aBlock
	"Set the max function (for monkey patching)"
	self ___at___: #max put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
min
	"Return the min function"
	^ self ___at___: #min
%

category: 'Python-Built-in Functions'
method: builtins
min: aBlock
	"Set the min function (for monkey patching)"
	self ___at___: #min put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
oct
	"Return the oct function"
	^ self ___at___: #oct
%

category: 'Python-Built-in Functions'
method: builtins
oct: aBlock
	"Set the oct function (for monkey patching)"
	self ___at___: #oct put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
ord
	"Return the ord function"
	^ self ___at___: #ord
%

category: 'Python-Built-in Functions'
method: builtins
ord: aBlock
	"Set the ord function (for monkey patching)"
	self ___at___: #ord put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
pow
	"Return the pow function"
	^ self ___at___: #pow
%

category: 'Python-Built-in Functions'
method: builtins
pow: aBlock
	"Set the pow function (for monkey patching)"
	self ___at___: #pow put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
powWithMod
	"Return the powWithMod function"
	^ self ___at___: #powWithMod
%

category: 'Python-Built-in Functions'
method: builtins
powWithMod: aBlock
	"Set the powWithMod function (for monkey patching)"
	self ___at___: #powWithMod put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
print
	"Return the print function"
	^ self ___at___: #print
%

category: 'Python-Built-in Functions'
method: builtins
print: aBlock
	"Set the print function (for monkey patching)"
	self ___at___: #print put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
quit
	"Return the quit function"
	^ self ___at___: #quit
%

category: 'Python-Built-in Functions'
method: builtins
quit: aBlock
	"Set the quit function (for monkey patching)"
	self ___at___: #quit put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
repr
	"Return the repr function"
	^ self ___at___: #repr
%

category: 'Python-Built-in Functions'
method: builtins
repr: aBlock
	"Set the repr function (for monkey patching)"
	self ___at___: #repr put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
reversed
	"Return the reversed function"
	^ self ___at___: #reversed
%

category: 'Python-Built-in Functions'
method: builtins
reversed: aBlock
	"Set the reversed function (for monkey patching)"
	self ___at___: #reversed put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
round
	"Return the round function"
	^ self ___at___: #round
%

category: 'Python-Built-in Functions'
method: builtins
round: aBlock
	"Set the round function (for monkey patching)"
	self ___at___: #round put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
roundWithDigits
	"Return the roundWithDigits function"
	^ self ___at___: #roundWithDigits
%

category: 'Python-Built-in Functions'
method: builtins
roundWithDigits: aBlock
	"Set the roundWithDigits function (for monkey patching)"
	self ___at___: #roundWithDigits put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
sorted
	"Return the sorted function"
	^ self ___at___: #sorted
%

category: 'Python-Built-in Functions'
method: builtins
sorted: aBlock
	"Set the sorted function (for monkey patching)"
	self ___at___: #sorted put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
str
	"Return the str function"
	^ self ___at___: #str
%

category: 'Python-Built-in Functions'
method: builtins
str: aBlock
	"Set the str function (for monkey patching)"
	self ___at___: #str put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
sum
	"Return the sum function"
	^ self ___at___: #sum
%

category: 'Python-Built-in Functions'
method: builtins
sum: aBlock
	"Set the sum function (for monkey patching)"
	self ___at___: #sum put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
type
	"Return the type function"
	^ self ___at___: #type
%

category: 'Python-Built-in Functions'
method: builtins
type: aBlock
	"Set the type function (for monkey patching)"
	self ___at___: #type put: aBlock
%

category: 'Python-Built-in Functions'
method: builtins
zip
	"Return the zip function"
	^ self ___at___: #zip
%

category: 'Python-Built-in Functions'
method: builtins
zip: aBlock
	"Set the zip function (for monkey patching)"
	self ___at___: #zip put: aBlock
%

set compile_env: 0
