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
builtins category: 'Grail-Modules'
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

category: 'Grail-Initialization'
method: builtins
initialize
	"No-op. The `module>>instance` class method still calls `initialize`
	on the newly-created instance, so this no-op stub keeps that contract.
	Subclasses with real per-instance state should override this method."
%

! ===============================================================================
! Fixed-arity fast-path methods (1 positional argument)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: builtins
abs: aNumber
	"Python builtin abs(x) — fixed-arity fast path."

	^ [aNumber __abs__] @env0:on: MessageNotUnderstood do: [:ex | TypeError @env0:signal]
%

category: 'Grail-Built-in Functions'
method: builtins
all: anIterable
	"Python builtin all(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := true.
	done := false.
	[done] @env0:whileFalse: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				@env0:on: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifFalse: [
				result := false.
				done := true
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
any: anIterable
	"Python builtin any(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := false.
	done := false.
	[done] @env0:whileFalse: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				@env0:on: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifTrue: [
				result := true.
				done := true
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
bin: aNumber
	"Python builtin bin(x) — fixed-arity fast path."

	| result |
	result := aNumber @env0:printStringRadix: 2.
	^ '0b' @env0:, result
%

category: 'Grail-Built-in Functions'
method: builtins
callable: anObject
	"Python builtin callable(x) — fixed-arity fast path."

	| objClass |
	objClass := anObject @env0:class.
	^ (objClass @env0:whichClassIncludesSelector: (#__call__:) environmentId: 1) notNil
%

category: 'Grail-Built-in Functions'
method: builtins
chr: anInteger
	"Python builtin chr(i) — fixed-arity fast path."

	^ (Character @env0:codePoint: anInteger) @env0:asString
%

category: 'Grail-Built-in Functions'
method: builtins
dir: anObject
	"Python builtin dir(x) — fixed-arity fast path."

	^ anObject __dir__
%

category: 'Grail-Built-in Functions'
method: builtins
enumerate: anIterable
	"Python builtin enumerate(iterable) — fixed-arity fast path."

	| iter lst index done |
	lst := list ___new___.
	index := 0.
	iter := anIterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		| item pair |
		[
			item := iter __next__.
			pair := tuple @env0:withAll: {index. item}.
			lst append: pair.
			index := index @env0:+ 1
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ lst __iter__
%

category: 'Grail-Built-in Functions'
method: builtins
hash: anObject
	"Python builtin hash(x) — fixed-arity fast path."

	^ [anObject __hash__] @env0:on: MessageNotUnderstood do: [:ex |
		TypeError ___signal___: 'unhashable type'
	]
%

category: 'Grail-Built-in Functions'
method: builtins
hex: aNumber
	"Python builtin hex(x) — fixed-arity fast path."

	| result |
	result := aNumber @env0:printStringRadix: 16.
	^ '0x' @env0:, (result @env0:asLowercase)
%

category: 'Grail-Built-in Functions'
method: builtins
id: anObject
	"Python builtin id(x) — fixed-arity fast path."

	^ anObject @env0:identityHash
%

category: 'Grail-Built-in Functions'
method: builtins
len: anObject
	"Python builtin len(x) — fixed-arity fast path."

	| className errorMsg |
	^ [anObject __len__] @env0:on: MessageNotUnderstood do: [:ex |
		className := (anObject @env0:class) @env0:name.
		errorMsg := 'object of type ''' @env0:, className.
		errorMsg := errorMsg @env0:, ''' has no len()'.
		TypeError ___signal___: errorMsg
	]
%

category: 'Grail-Built-in Functions'
method: builtins
max: anIterable
	"Python builtin max(iterable) — fixed-arity fast path."

	| iter maxVal first done |
	iter := anIterable __iter__.
	first := true.
	maxVal := nil.
	done := false.
	[done] @env0:whileFalse: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				maxVal := item.
				first := false
			] ifFalse: [
				(item __gt__: maxVal) ifTrue: [maxVal := item]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ maxVal
%

category: 'Grail-Built-in Functions'
method: builtins
min: anIterable
	"Python builtin min(iterable) — fixed-arity fast path."

	| iter minVal first done |
	iter := anIterable __iter__.
	first := true.
	minVal := nil.
	done := false.
	[done] @env0:whileFalse: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				minVal := item.
				first := false
			] ifFalse: [
				(item __lt__: minVal) ifTrue: [minVal := item]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ minVal
%

category: 'Grail-Built-in Functions'
method: builtins
oct: aNumber
	"Python builtin oct(x) — fixed-arity fast path."

	| result |
	result := aNumber @env0:printStringRadix: 8.
	^ '0o' @env0:, result
%

category: 'Grail-Built-in Functions'
method: builtins
ord: aString
	"Python builtin ord(c) — fixed-arity fast path."

	| size char errorMsg sizeStr |
	size := aString @env0:size.
	(size == 1) ifFalse: [
		sizeStr := size @env0:asString.
		errorMsg := 'ord() expected a character, but string of length ' @env0:, sizeStr.
		errorMsg := errorMsg @env0:, ' found'.
		TypeError ___signal___: errorMsg
	].
	char := aString @env0:at: 1.
	^ char @env0:codePoint
%

category: 'Grail-Built-in Functions'
method: builtins
repr: anObject
	"Python builtin repr(x) — fixed-arity fast path."

	^ anObject __repr__
%

category: 'Grail-Built-in Functions'
method: builtins
reversed: aSequence
	"Python builtin reversed(seq) — fixed-arity fast path."

	| lst |
	lst := list ___new___.
	aSequence @env0:reverseDo: [:item | lst append: item].
	^ lst __iter__
%

category: 'Grail-Built-in Functions'
method: builtins
round: aNumber
	"Python builtin round(x) — fixed-arity fast path (1-arg form).
	The 2-arg form `round(x, ndigits)` lives at `_round:kw:`."

	^ aNumber @env0:rounded
%

category: 'Grail-Built-in Functions'
method: builtins
sorted: anIterable
	"Python builtin sorted(iterable) — fixed-arity fast path."

	| lst iter done |
	lst := list ___new___.
	iter := anIterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			lst append: item
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ lst @env0:sort: [:a :b | a __lt__: b]
%

category: 'Grail-Built-in Functions'
method: builtins
str: anObject
	"Python builtin str(x) — fixed-arity fast path."

	^ [anObject __str__] @env0:on: MessageNotUnderstood do: [:ex | anObject __repr__]
%

category: 'Grail-Built-in Functions'
method: builtins
sum: anIterable
	"Python builtin sum(iterable) — fixed-arity fast path."

	| iter total done |
	total := 0.
	iter := anIterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			total := total __add__: item
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ total
%

category: 'Grail-Built-in Functions'
method: builtins
type: anObject
	"Python builtin type(x) — fixed-arity fast path."

	^ anObject __class__
%

! ===============================================================================
! Fixed-arity fast-path methods (2 positional arguments)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: builtins
divmod: x _: y
	"Python builtin divmod(x, y) — fixed-arity fast path.
	Returns (x // y, x % y) as a tuple."

	| quotient remainder |
	quotient := x __floordiv__: y.
	remainder := x __mod__: y.
	^ tuple @env0:withAll: {quotient. remainder}
%

category: 'Grail-Built-in Functions'
method: builtins
isinstance: anObject _: aClassOrTuple
	"Python builtin isinstance(obj, classinfo) — fixed-arity fast path.
	Supports Abstract Base Classes (ABCs) via __instancecheck__."

	| result theMetaclass |
	result := anObject @env0:isKindOf: aClassOrTuple.
	result ifFalse: [
		theMetaclass := aClassOrTuple @env0:class.
		(theMetaclass @env0:includesSelector: #'__instancecheck__:' environmentId: 1) ifTrue: [
			result := aClassOrTuple __instancecheck__: anObject
		]
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
pow: x _: y
	"Python builtin pow(x, y) — fixed-arity fast path (2-arg form).
	The 3-arg form `pow(x, y, z)` lives at `_pow:kw:`."

	^ x __pow__: y
%

! ===============================================================================
! Varargs fast-path methods (`_name:kw:` shape)
! ===============================================================================

category: 'Grail-Built-in Functions'
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

category: 'Grail-Built-in Functions'
method: builtins
_input: positional kw: kwargs
	"Python builtin input([prompt]) — varargs fast path. 0-arg form reads
	from stdin; 1-arg form writes the prompt to stdout first."

	| nargs prompt stdout stdin |
	nargs := positional @env0:size.
	(nargs @env0:>= 1) ifTrue: [
		prompt := positional @env0:at: 1.
		stdout := System @env0:stdout.
		stdout @env0:nextPutAll: prompt.
		stdout @env0:flush
	].
	stdin := System @env0:stdin.
	^ stdin @env0:nextLine
%

category: 'Grail-Built-in Functions'
method: builtins
_pow: positional kw: kwargs
	"Python builtin pow(x, y[, z]) — varargs fast path. 2-arg case
	computes x**y; 3-arg case computes (x**y) % z. The 2-arg form also
	has a fixed-arity fast path at `pow:_:` (used for direct call sites
	with two arguments); this method is the fallback for 3-arg and
	BoundMethod indirect calls."

	| nargs x y z result |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [
		x := positional @env0:at: 1.
		y := positional @env0:at: 2.
		^ x __pow__: y
	].
	(nargs == 3) ifTrue: [
		x := positional @env0:at: 1.
		y := positional @env0:at: 2.
		z := positional @env0:at: 3.
		result := x __pow__: y.
		^ result __mod__: z
	].
	TypeError ___signal___: 'pow expected 2 or 3 arguments'
%

category: 'Grail-Built-in Functions'
method: builtins
_print: positional kw: kwargs
	"Python builtin print(*objects, sep, end, file, flush) — varargs fast
	path. Currently only honors positional args; sep/end/file/flush
	kwargs are silently ignored, matching the legacy behavior."

	positional @env0:do: [:obj |
		| strRep |
		[strRep := obj __str__]
			@env0:on: MessageNotUnderstood do: [:ex | strRep := obj __repr__].
		Transcript @env0:nextPutAll: strRep.
		Transcript @env0:space
	].
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
_exit: positional kw: kwargs
	"Python builtin exit() — varargs fast path. Alias for quit(); in
	CPython both are added by site.py as instances of `_sitebuiltins.Quitter`
	and are interchangeable. Ignores any positional/keyword args."

	^ ExitClientError @env0:signal: 'exit()' status: 0
%

category: 'Grail-Built-in Functions'
method: builtins
_quit: positional kw: kwargs
	"Python builtin quit() — varargs fast path. Exits the interpreter
	cleanly. Ignores any positional/keyword args."

	^ ExitClientError @env0:signal: 'quit()' status: 0
%

category: 'Grail-Built-in Functions'
method: builtins
_round: positional kw: kwargs
	"Python builtin round(number[, ndigits]) — varargs fast path.
	The 1-arg case has a fixed-arity fast path (`round:`); this method
	handles 2-arg calls and the kwarg form `round(x, ndigits=n)`."

	| number ndigits multiplier |
	number := positional @env0:at: 1.
	ndigits := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: #ndigits ifAbsent: [nil]]
		].
	ndigits ifNil: [^ number @env0:rounded].
	multiplier := 10 @env0:raisedTo: ndigits.
	^ ((number @env0:* multiplier) @env0:rounded) @env0:/ multiplier
%

category: 'Grail-Built-in Functions'
method: builtins
_zip: positional kw: kwargs
	"Python builtin zip(*iterables) — varargs fast path. Each positional
	element is an iterable; the result is an iterator yielding tuples
	drawn from each one in lockstep, stopping at the shortest."

	| iterators result allDone |
	iterators := list ___new___.
	positional @env0:do: [:iterable | iterators append: iterable __iter__].
	result := list ___new___.
	allDone := false.
	[allDone] @env0:whileFalse: [
		| items |
		items := list ___new___.
		iterators @env0:do: [:iter |
			[
				| item |
				item := iter __next__.
				items append: item
			] @env0:on: StopIteration do: [:ex | allDone := true]
		].
		allDone ifFalse: [
			| itemsArray tup |
			itemsArray := items @env0:asArray.
			tup := tuple @env0:withAll: itemsArray.
			result append: tup
		]
	].
	^ result __iter__
%

set compile_env: 0
