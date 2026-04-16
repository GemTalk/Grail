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
'Python builtins module — root class for all Python built-in functions.

In the current dispatch model (see docs/Rewrite_Dispatch_Model.md),
every Python builtin lives as a real env-1 method on this class. The
codegen in CallAst emits direct sends — `((builtins instance) abs: x)`
for fixed-arity calls and `((builtins instance) _print: { … } kw: …)`
for varargs calls — so there is no symbol-list walk, no block
indirection, and no positional-array allocation in the common case.

Method shapes:
  * Fixed-arity: `name`, `name:`, `name:_:`, `name:_:_:`, …
    The Python call `name(arg1, arg2)` compiles to `name: arg1 _: arg2`.
    Used for builtins with a known fixed signature: `abs:`, `len:`,
    `pow:_:`, `divmod:_:`, etc.
  * Varargs: `_name:kw:` taking (positionalArray, kwargDict).
    Used for builtins that need to handle varying arity, kwargs, or
    have multiple supported call shapes: `_print:kw:`, `_zip:kw:`,
    `_pow:kw:` (3-arg case), `_round:kw:` (2-arg case),
    `_input:kw:` (0-arg/1-arg overload), `_quit:kw:`, `___import__:kw:`.

First-class function values:
  * `f = abs; f(-5)` materializes a `BoundMethod` at compile time
    that holds `(builtins instance, #abs)`. The BoundMethod''s
    `value:value:` dispatches to the arity-resolved selector at call
    time, falling back to `_name:kw:` if no fixed-arity match exists.
  * `callable(boundMethod)` returns True because BoundMethod defines
    `__call__:` (forwarding to `value:value:`).

Per Python semantics, `type(builtins) is type(math)` — both report as
`<class ''module''>`. The Smalltalk subclass relationship between
`builtins` and `module` is an implementation detail, not a Python type
relationship.

See https://docs.python.org/3/library/functions.html for the complete
list of Python built-in functions.
'
%

expectvalue /Class
doit
builtins category: 'Modules'
%

! ===============================================================================
! builtins Methods (Python 'builtins' type)
! ===============================================================================

! ------------------- Remove existing Python methods from builtins
expectvalue /Metaclass3
doit
builtins removeAllMethods.
builtins class removeAllMethods.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Python-Initialization'
method: builtins
initialize
	"No-op. The `module>>instance` class method still calls `initialize`
	on the newly-created instance, so this no-op stub keeps that contract.
	Subclasses with real per-instance state should override this method."
%

! ===============================================================================
! Fixed-arity fast-path methods (1 positional argument)
! ===============================================================================

category: 'Python-Built-in Functions'
method: builtins
abs: aNumber
	"Python builtin abs(x) — fixed-arity fast path."

	^ [aNumber __abs__] ___on___: MessageNotUnderstood do: [:ex | TypeError ___signal___]
%

category: 'Python-Built-in Functions'
method: builtins
all: anIterable
	"Python builtin all(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := true.
	done := false.
	[done] ___whileFalse___: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				___on___: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifFalse: [
				result := false.
				done := true
			]
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Python-Built-in Functions'
method: builtins
any: anIterable
	"Python builtin any(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := false.
	done := false.
	[done] ___whileFalse___: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				___on___: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifTrue: [
				result := true.
				done := true
			]
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Python-Built-in Functions'
method: builtins
bin: aNumber
	"Python builtin bin(x) — fixed-arity fast path."

	| result |
	result := aNumber ___printStringRadix___: 2.
	^ '0b' ___concat___: result
%

category: 'Python-Built-in Functions'
method: builtins
callable: anObject
	"Python builtin callable(x) — fixed-arity fast path."

	| objClass |
	objClass := anObject ___class___.
	^ (objClass @env0:whichClassIncludesSelector: (#__call__:) environmentId: 1) notNil
%

category: 'Python-Built-in Functions'
method: builtins
chr: anInteger
	"Python builtin chr(i) — fixed-arity fast path."

	^ (Character ___codePoint___: anInteger) ___asString___
%

category: 'Python-Built-in Functions'
method: builtins
dir: anObject
	"Python builtin dir(x) — fixed-arity fast path."

	^ anObject __dir__
%

category: 'Python-Built-in Functions'
method: builtins
enumerate: anIterable
	"Python builtin enumerate(iterable) — fixed-arity fast path."

	| iter lst index done |
	lst := list ___new___.
	index := 0.
	iter := anIterable __iter__.
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
	^ lst __iter__
%

category: 'Python-Built-in Functions'
method: builtins
hash: anObject
	"Python builtin hash(x) — fixed-arity fast path."

	^ [anObject __hash__] ___on___: MessageNotUnderstood do: [:ex |
		TypeError ___signal___: 'unhashable type'
	]
%

category: 'Python-Built-in Functions'
method: builtins
hex: aNumber
	"Python builtin hex(x) — fixed-arity fast path."

	| result |
	result := aNumber ___printStringRadix___: 16.
	^ '0x' ___concat___: (result @env0:asLowercase)
%

category: 'Python-Built-in Functions'
method: builtins
id: anObject
	"Python builtin id(x) — fixed-arity fast path."

	^ anObject ___identityHash___
%

category: 'Python-Built-in Functions'
method: builtins
len: anObject
	"Python builtin len(x) — fixed-arity fast path."

	| className errorMsg |
	^ [anObject __len__] ___on___: MessageNotUnderstood do: [:ex |
		className := (anObject ___class___) ___name___.
		errorMsg := 'object of type ''' ___concat___: className.
		errorMsg := errorMsg ___concat___: ''' has no len()'.
		TypeError ___signal___: errorMsg
	]
%

category: 'Python-Built-in Functions'
method: builtins
max: anIterable
	"Python builtin max(iterable) — fixed-arity fast path."

	| iter maxVal first done |
	iter := anIterable __iter__.
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
				(item __gt__: maxVal) ifTrue: [maxVal := item]
			]
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ maxVal
%

category: 'Python-Built-in Functions'
method: builtins
min: anIterable
	"Python builtin min(iterable) — fixed-arity fast path."

	| iter minVal first done |
	iter := anIterable __iter__.
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
				(item __lt__: minVal) ifTrue: [minVal := item]
			]
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ minVal
%

category: 'Python-Built-in Functions'
method: builtins
oct: aNumber
	"Python builtin oct(x) — fixed-arity fast path."

	| result |
	result := aNumber ___printStringRadix___: 8.
	^ '0o' ___concat___: result
%

category: 'Python-Built-in Functions'
method: builtins
ord: aString
	"Python builtin ord(c) — fixed-arity fast path."

	| size char errorMsg sizeStr |
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
repr: anObject
	"Python builtin repr(x) — fixed-arity fast path."

	^ anObject __repr__
%

category: 'Python-Built-in Functions'
method: builtins
reversed: aSequence
	"Python builtin reversed(seq) — fixed-arity fast path."

	| lst |
	lst := list ___new___.
	aSequence ___reverseDo___: [:item | lst append: item].
	^ lst __iter__
%

category: 'Python-Built-in Functions'
method: builtins
round: aNumber
	"Python builtin round(x) — fixed-arity fast path (1-arg form).
	The 2-arg form `round(x, ndigits)` lives at `_round:kw:`."

	^ aNumber ___rounded___
%

category: 'Python-Built-in Functions'
method: builtins
sorted: anIterable
	"Python builtin sorted(iterable) — fixed-arity fast path."

	| lst iter done |
	lst := list ___new___.
	iter := anIterable __iter__.
	done := false.
	[done] ___whileFalse___: [
		[
			| item |
			item := iter __next__.
			lst append: item
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ lst ___sort___: [:a :b | a __lt__: b]
%

category: 'Python-Built-in Functions'
method: builtins
str: anObject
	"Python builtin str(x) — fixed-arity fast path."

	^ [anObject __str__] ___on___: MessageNotUnderstood do: [:ex | anObject __repr__]
%

category: 'Python-Built-in Functions'
method: builtins
sum: anIterable
	"Python builtin sum(iterable) — fixed-arity fast path."

	| iter total done |
	total := 0.
	iter := anIterable __iter__.
	done := false.
	[done] ___whileFalse___: [
		[
			| item |
			item := iter __next__.
			total := total __add__: item
		] ___on___: StopIteration do: [:ex | done := true]
	].
	^ total
%

category: 'Python-Built-in Functions'
method: builtins
type: anObject
	"Python builtin type(x) — fixed-arity fast path."

	^ anObject __class__
%

! ===============================================================================
! Fixed-arity fast-path methods (2 positional arguments)
! ===============================================================================

category: 'Python-Built-in Functions'
method: builtins
divmod: x _: y
	"Python builtin divmod(x, y) — fixed-arity fast path.
	Returns (x // y, x % y) as a tuple."

	| quotient remainder |
	quotient := x __floordiv__: y.
	remainder := x __mod__: y.
	^ tuple ___withAll___: {quotient. remainder}
%

category: 'Python-Built-in Functions'
method: builtins
isinstance: anObject _: aClassOrTuple
	"Python builtin isinstance(obj, classinfo) — fixed-arity fast path.
	Supports Abstract Base Classes (ABCs) via __instancecheck__."

	| result theMetaclass |
	result := anObject ___isKindOf___: aClassOrTuple.
	result ifFalse: [
		theMetaclass := aClassOrTuple ___class___.
		(theMetaclass @env0:includesSelector: #'__instancecheck__:' environmentId: 2) ifTrue: [
			result := aClassOrTuple __instancecheck__: anObject
		]
	].
	^ result
%

category: 'Python-Built-in Functions'
method: builtins
pow: x _: y
	"Python builtin pow(x, y) — fixed-arity fast path (2-arg form).
	The 3-arg form `pow(x, y, z)` lives at `_pow:kw:`."

	^ x __pow__: y
%

! ===============================================================================
! Varargs fast-path methods (`_name:kw:` shape)
! ===============================================================================

category: 'Python-Built-in Functions'
method: builtins
___import__: positional kw: kwargs
	"Python builtin __import__(name, globals, locals, fromlist, level)
	— varargs fast path. Delegates to importlib's ___import__:kw:
	method directly.

	Selector encoding: the Python name is `__import__` (two leading and
	two trailing underscores). The varargs rule prepends one underscore
	to the name and appends `:kw:`, giving `___import__:kw:` — three
	leading underscores, two trailing before `:kw:`."

	^ (importlib instance) ___import__: positional kw: kwargs
%

category: 'Python-Built-in Functions'
method: builtins
_input: positional kw: kwargs
	"Python builtin input([prompt]) — varargs fast path. 0-arg form reads
	from stdin; 1-arg form writes the prompt to stdout first."

	| nargs prompt stdout stdin |
	nargs := positional ___size___.
	(nargs ___ge___: 1) ifTrue: [
		prompt := positional ___at___: 1.
		stdout := System ___stdout___.
		stdout ___nextPutAll___: prompt.
		stdout ___flush___
	].
	stdin := System ___stdin___.
	^ stdin ___nextLine___
%

category: 'Python-Built-in Functions'
method: builtins
_pow: positional kw: kwargs
	"Python builtin pow(x, y[, z]) — varargs fast path. 2-arg case
	computes x**y; 3-arg case computes (x**y) % z. The 2-arg form also
	has a fixed-arity fast path at `pow:_:` (used for direct call sites
	with two arguments); this method is the fallback for 3-arg and
	BoundMethod indirect calls."

	| nargs x y z result |
	nargs := positional ___size___.
	(nargs ___eq___: 2) ifTrue: [
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		^ x __pow__: y
	].
	(nargs ___eq___: 3) ifTrue: [
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		z := positional ___at___: 3.
		result := x __pow__: y.
		^ result __mod__: z
	].
	TypeError ___signal___: 'pow expected 2 or 3 arguments'
%

category: 'Python-Built-in Functions'
method: builtins
_print: positional kw: kwargs
	"Python builtin print(*objects, sep, end, file, flush) — varargs fast
	path. Currently only honors positional args; sep/end/file/flush
	kwargs are silently ignored, matching the legacy behavior."

	positional ___do___: [:obj |
		| strRep |
		[strRep := obj __str__]
			___on___: MessageNotUnderstood do: [:ex | strRep := obj __repr__].
		Transcript ___nextPutAll___: strRep.
		Transcript ___space___
	].
	Transcript ___cr___.
	^ nil
%

category: 'Python-Built-in Functions'
method: builtins
_quit: positional kw: kwargs
	"Python builtin quit() — varargs fast path. Exits the interpreter
	cleanly. Ignores any positional/keyword args."

	^ ExitClientError @env0:signal: 'quit()' status: 0
%

category: 'Python-Built-in Functions'
method: builtins
_round: positional kw: kwargs
	"Python builtin round(number[, ndigits]) — varargs fast path.
	The 1-arg case has a fixed-arity fast path (`round:`); this method
	handles 2-arg calls and the kwarg form `round(x, ndigits=n)`."

	| number ndigits multiplier |
	number := positional ___at___: 1.
	ndigits := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [nil]
				ifFalse: [kwargs ___at___: #ndigits ifAbsent: [nil]]
		].
	ndigits ifNil: [^ number ___rounded___].
	multiplier := 10 @env0:raisedTo: ndigits.
	^ ((number ___times___: multiplier) ___rounded___) ___divide___: multiplier
%

category: 'Python-Built-in Functions'
method: builtins
_zip: positional kw: kwargs
	"Python builtin zip(*iterables) — varargs fast path. Each positional
	element is an iterable; the result is an iterator yielding tuples
	drawn from each one in lockstep, stopping at the shortest."

	| iterators result allDone |
	iterators := list ___new___.
	positional ___do___: [:iterable | iterators append: iterable __iter__].
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
			] ___on___: StopIteration do: [:ex | allDone := true]
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
