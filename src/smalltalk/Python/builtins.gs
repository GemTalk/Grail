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
_exec: positional kw: kwargs
	"Python builtin exec(source_or_code, globals=None, locals=None).
	Grail implementation: parse ``source`` as a module body, evaluate
	it in a fresh module scope pre-populated with ``globals``, then
	reflect every binding produced by the body back into the
	``globals`` mapping.  ``locals`` is ignored (the Python contract
	already permits aliasing globals==locals at module-level exec).

	The load-bearing caller is jinja2's
	``Template.from_code(env, code, ...)`` which compiles the
	generated template-render source and exec's it into a fresh
	dict so the dict ends up populated with ``root``, ``blocks``,
	``name``, ``debug_info`` etc.

	Without exec, jinja2 template rendering can't progress past the
	from_code step regardless of how much of the compiler runs."

	| source globalsDict scope sym k |
	source := positional @env0:at: 1.
	globalsDict := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	(globalsDict @env0:isNil) ifTrue: [
		globalsDict := KeyValueDictionary @env0:new
	].
	"Build a SymbolDictionary seeded from the globals mapping; module
	scope must use Symbol keys."
	scope := SymbolDictionary @env0:new.
	(globalsDict @env0:isKindOf: KeyValueDictionary) ifTrue: [
		globalsDict @env0:keysAndValuesDo: [:key :value |
			sym := key @env0:isSymbol ifTrue: [key] ifFalse: [key @env0:asString @env0:asSymbol].
			scope @env0:at: sym put: value]
	].
	"Run the source as a module body in the seeded scope.  Tag the
	debug capture as #exec so the .tpz / .ir files under /tmp/grail/
	carry the ___exec_N___ prefix."
	ModuleAst @env0:evaluateSource: source usingModuleScope: scope as: #exec.
	"Reflect every binding back into the original globals dict using
	string keys (Python convention)."
	scope @env0:keysAndValuesDo: [:key :value |
		k := key @env0:asString.
		globalsDict @env0:at: k put: value].
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
_eval: positional kw: kwargs
	"Python builtin eval(expression, globals=None, locals=None) —
	parse ``expression'' as a SINGLE Python expression, evaluate it
	in the supplied ``globals'' scope, return the value.  Raises
	SyntaxError if the source is anything other than a bare
	expression (assignments / multiple statements belong to exec()).
	``locals'' is currently ignored — matches the approximation
	_exec uses (Python permits aliasing globals==locals at module
	level, and a finer-grained Locals shadow isn't yet wired up).

	Walrus-expression bindings (``(x := 5) + 1'') and any other
	side-effect bindings inside the expression land in ``globals''
	via the same reflect-back loop _exec uses."

	| source globalsDict scope sym k result |
	source := positional @env0:at: 1.
	globalsDict := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	globalsDict @env0:isNil ifTrue: [
		globalsDict := KeyValueDictionary @env0:new].
	"Seed a fresh SymbolDictionary scope from globals."
	scope := SymbolDictionary @env0:new.
	(globalsDict @env0:isKindOf: KeyValueDictionary) ifTrue: [
		globalsDict @env0:keysAndValuesDo: [:key :value |
			sym := key @env0:isSymbol
				ifTrue: [key]
				ifFalse: [key @env0:asString @env0:asSymbol].
			scope @env0:at: sym put: value]].
	result := ModuleAst @env0:evaluateExpressionSource: source usingModuleScope: scope.
	"Reflect any bindings produced inside the expression (walrus, etc.)
	back into globals using string keys."
	scope @env0:keysAndValuesDo: [:key :value |
		k := key @env0:asString.
		globalsDict @env0:at: k put: value].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
_compile: positional kw: kwargs
	"Python builtin compile(source, filename, mode, ...).  Grail has
	no real bytecode compiler, so return the source string unchanged
	— exec() on a string already runs through the Python AST loader.
	Jinja2's Environment._compile is the load-bearing caller here:
	it compiles the generated template-render source to a code
	object and exec's it into a fresh namespace.  Returning the
	source string lets the namespace setup succeed; subsequent
	exec(source, ns) is the actual work."

	^ positional @env0:at: 1
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
iter: anObject
	"Python builtin iter(x) — return an iterator over x by calling
	x.__iter__().  Raises TypeError if x has no __iter__ method.

	The two-arg sentinel form ``iter(callable, sentinel)`` is not
	implemented yet (see TODO.md) — none of the current Flask-path
	modules use it."

	"`whichClassIncludesSelector:environmentId:` walks the
	inheritance chain — needed because ``__iter__`` lives on
	CharacterCollection for strings, on SetProtocol for sets, etc.,
	not on the leaf class."
	(anObject @env0:class @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1)
		ifNil: [
			TypeError @env0:signal: ('''' @env0:,
				(anObject @env0:class @env0:name) @env0:,
				''' object is not iterable')
		].
	^ anObject @env1:__iter__
%

category: 'Grail-Built-in Functions'
method: builtins
next: anIterator
	"Python builtin next(it) — call it.__next__().  Propagates
	StopIteration when the iterator is exhausted; caller can wrap
	in try/except or use the two-arg form below."

	^ anIterator @env1:__next__
%

category: 'Grail-Built-in Functions'
method: builtins
next: anIterator _: aDefault
	"Python builtin next(it, default) — return default instead of
	propagating StopIteration when the iterator is exhausted.
	Used by re/__init__.py's `next(iter(_cache))` LRU pop pattern
	(though that one always pops a real key, so the default path
	is the safety net)."

	^ [anIterator @env1:__next__]
		@env0:on: StopIteration
		do: [:ex | aDefault]
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
min: a _: b
	"Python builtin min(a, b) — 2-arg fast path."

	^ (a __lt__: b) ifTrue: [a] ifFalse: [b]
%

category: 'Python-Built-in Functions'
method: builtins
max: a _: b
	"Python builtin max(a, b) — 2-arg fast path."

	^ (a __gt__: b) ifTrue: [a] ifFalse: [b]
%

category: 'Grail-Built-in Functions'
method: builtins
_min: positional kw: kwargs
	"Python ``min(iterable, *, key=None, default=...)'' varargs form.
	Single positional → reduce iterable; multiple positionals →
	pick smallest by ``key'' (if given) or natural comparison.
	``default'' only consulted when iterable is empty."

	^ self @env1:___minOrMax___: positional kw: kwargs lessThan: true
%

category: 'Grail-Built-in Functions'
method: builtins
_max: positional kw: kwargs
	"Python ``max(iterable, *, key=None, default=...)'' varargs form."

	^ self @env1:___minOrMax___: positional kw: kwargs lessThan: false
%

category: 'Grail-Built-in Functions'
method: builtins
___minOrMax___: positional kw: kwargs lessThan: pickSmaller
	"Shared helper for the varargs forms of min and max."

	| iterable keyFn default iter best done bestKey hasDefault gotAny |
	keyFn := (kwargs @env0:notNil and: [kwargs @env0:includesKey: 'key'])
		@env0:ifTrue: [kwargs @env0:at: 'key']
		@env0:ifFalse: [nil].
	hasDefault := kwargs @env0:notNil and: [kwargs @env0:includesKey: 'default'].
	default := hasDefault @env0:ifTrue: [kwargs @env0:at: 'default'] @env0:ifFalse: [nil].
	iterable := (positional @env0:size) @env0:= 1
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [positional].
	iter := iterable @env1:__iter__.
	gotAny := false.
	done := false.
	best := nil.
	bestKey := nil.
	[done] @env0:whileFalse: [
		[
			| item itemKey isBetter |
			item := iter @env1:__next__.
			itemKey := keyFn @env0:isNil @env0:ifTrue: [item] @env0:ifFalse: [
				keyFn @env1:___pyCallValue___: { item } kw: nil].
			gotAny @env0:ifFalse: [
				best := item.
				bestKey := itemKey.
				gotAny := true
			] @env0:ifTrue: [
				isBetter := pickSmaller
					@env0:ifTrue: [itemKey @env1:__lt__: bestKey]
					@env0:ifFalse: [itemKey @env1:__gt__: bestKey].
				isBetter @env0:ifTrue: [best := item. bestKey := itemKey]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	gotAny @env0:ifFalse: [
		hasDefault @env0:ifTrue: [^ default].
		ValueError ___signal___: 'arg is an empty sequence'].
	^ best
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
format: aValue
	"Python builtin format(value) — defaults to format-spec ''''."

	^ aValue @env1:__format__: ''
%

category: 'Grail-Built-in Functions'
method: builtins
format: aValue _: aFormatSpec
	"Python builtin format(value, spec) — fixed-arity fast path.
	Delegates to value.__format__(spec).  Emitted by f-string codegen
	for placeholders that carry a format spec (e.g. ``f''{x:>4d}''``)."

	^ aValue @env1:__format__: aFormatSpec
%

category: 'Grail-Built-in Functions'
method: builtins
reversed: aSequence
	"Python builtin reversed(seq) — fixed-arity fast path.  Prefer
	the receiver's own __reversed__ (the Python protocol); fall back
	to reverseDo: for native Smalltalk SequenceableCollections that
	don't override.  Without the __reversed__ branch, Python user
	classes like collections.deque (which has __reversed__ but no
	env-0 reverseDo:) hit MNU."

	| cls lst |
	cls := aSequence @env0:class.
	((cls @env0:whichClassIncludesSelector: #'__reversed__' environmentId: 1) notNil)
		ifTrue: [^ aSequence @env1:__reversed__].
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
memoryview: aBytesObject
	"Python builtin memoryview(b) — stub.
	Returns the argument unchanged.  Used by re/_compiler.py only in
	`_bytes_to_codes`, which optimizes character-class bytecode and
	is not on the path for plain regex compile.  Patterns that hit
	that path need a real memoryview with .cast()/.itemsize/.tolist();
	revisit when something actually trips this."

	^ aBytesObject
%

category: 'Python-Built-in Functions'
method: builtins
map: aFunction _: anIterable
	"Python builtin map(func, iter) — fixed-arity fast path.
	Materialize eagerly into a list; CPython returns a lazy iterator,
	but Grail has no first-class generator type yet (see GeneratorExpAst
	for the same trade-off)."

	| lst iter done |
	lst := list ___new___.
	iter := anIterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			lst append: (aFunction value: { item } value: nil)
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ lst
%

category: 'Python-Built-in Functions'
method: builtins
sorted: anIterable
	"Python builtin sorted(iterable) — fixed-arity fast path."

	| lst iter done sortedArray |
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
	"GemStone's sort: returns a fresh sorted Array, not the receiver; copy it
	back over the list's slots so sorted() returns a Python list (not an Array,
	which is not a list: isinstance/== against a list literal would fail)."
	sortedArray := lst @env0:sort: [:a :b | a __lt__: b].
	lst @env0:replaceFrom: 1 to: lst @env0:size with: sortedArray startingAt: 1.
	^ lst
%

category: 'Python-Built-in Functions'
method: builtins
_sorted: positional kw: kwargs
	"Python builtin sorted(iterable, *, key=None, reverse=False) —
	varargs entry handling ``key=`` and ``reverse=`` kwargs that
	the fixed-arity sorted: can't accept.  Jinja2's compiler iterates
	``sorted(self.extensions.values(), key=lambda x: x.priority)``
	at template-load time."

	| iterable keyFn reverse lst iter done sortBlock sortedArray |
	iterable := positional @env0:at: 1.
	keyFn := kwargs isNil
		ifTrue: [nil]
		ifFalse: [kwargs @env0:at: 'key' ifAbsent: [nil]].
	reverse := kwargs isNil
		ifTrue: [false]
		ifFalse: [kwargs @env0:at: 'reverse' ifAbsent: [false]].
	lst := list ___new___.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			lst append: item
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	sortBlock := keyFn isNil
		ifTrue: [
			reverse ___isTruthy___
				ifTrue: [[:a :b | b __lt__: a]]
				ifFalse: [[:a :b | a __lt__: b]]]
		ifFalse: [
			reverse ___isTruthy___
				ifTrue: [[:a :b |
					(keyFn @env1:value: { b } value: nil)
						__lt__: (keyFn @env1:value: { a } value: nil)]]
				ifFalse: [[:a :b |
					(keyFn @env1:value: { a } value: nil)
						__lt__: (keyFn @env1:value: { b } value: nil)]]].
	"GemStone's sort: returns a fresh sorted Array, not the receiver; copy it
	back over the list's slots so sorted() returns a Python list (not an Array)."
	sortedArray := lst @env0:sort: sortBlock.
	lst @env0:replaceFrom: 1 to: lst @env0:size with: sortedArray startingAt: 1.
	^ lst
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

	^ self @env1:sum: anIterable _: 0
%

category: 'Grail-Built-in Functions'
method: builtins
sum: anIterable _: start
	"Python ``sum(iterable, start=0)'' two-positional form."

	| iter total done |
	total := start.
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
_sum: positional kw: kwargs
	"Python ``sum(iterable, /, start=0)'' varargs form — covers the
	keyword call ``sum(items, start=0)'' used by jinja2's
	sync_do_sum once the @pass_environment shim injects environment."

	| iterable start |
	iterable := positional @env0:at: 1.
	start := positional @env0:size >= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs notNil and: [kwargs includesKey: 'start'])
			ifTrue: [kwargs at: 'start']
			ifFalse: [0]].
	^ self @env1:sum: iterable _: start
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
	Supports Abstract Base Classes (ABCs) via __instancecheck__.

	`classinfo` may be either a single class or a tuple of classes.  Codegen
	emits builtin class names like ``str`` / ``int`` as a BoundMethod on
	``builtins`` (because they have a fast-path keyword form), so when we
	see a BoundMethod here we unwrap to the underlying Smalltalk class via
	``Python at: selector``.  Tuples are handled by recursing on each
	element until a match is found."

	| cls |
	cls := self @env1:___resolveClassRef___: aClassOrTuple.
	"Tuple-of-classes form: recurse, OR together."
	(cls @env0:isKindOf: tuple) ifTrue: [
		cls @env0:do: [:eachCls | (self isinstance: anObject _: eachCls) ifTrue: [^ true]].
		^ false
	].
	^ self @env1:___isInstanceSingle___: anObject of: cls
%

category: 'Python-Built-in Functions'
method: builtins
___resolveClassRef___: aRef
	"Helper for isinstance/issubclass: unwrap a BoundMethod wrapping a
	builtin class name (e.g. BoundMethod(builtins, #str)) to the
	underlying Smalltalk class.  Other inputs pass through unchanged."

	(aRef @env0:isKindOf: BoundMethod) ifTrue: [
		^ Python @env0:at: aRef @env0:selector ifAbsent: [aRef]
	].
	^ aRef
%

category: 'Python-Built-in Functions'
method: builtins
___isInstanceSingle___: anObject of: aClass
	"isinstance with a single class argument (post-tuple-expansion)."

	| result theMetaclass |
	result := anObject @env0:isKindOf: aClass.
	result ifFalse: [
		theMetaclass := aClass @env0:class.
		(theMetaclass @env0:includesSelector: #'__instancecheck__:' environmentId: 1) ifTrue: [
			result := aClass __instancecheck__: anObject
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

category: 'Grail-Built-in Functions'
method: builtins
staticmethod: fn
	"Python @staticmethod / staticmethod(fn) - Grail doesn't honor
	decorators at codegen, so this is the identity: return the
	function unchanged.  Calling sites that do `Cls(args)` on a
	'static method'-named attribute work because Grail's attribute
	access already returns the function/value."

	^ fn
%

category: 'Grail-Built-in Functions'
method: builtins
classmethod: fn
	"Python @classmethod / classmethod(fn) - same identity treatment
	as staticmethod.  Grail doesn't yet thread cls through method
	dispatch, but the stored attribute is still callable."

	^ fn
%

category: 'Grail-Built-in Functions'
method: builtins
property: fn
	"Python @property / property(fn) - identity stub.  Grail can't
	transparently call the getter on attribute reads (no descriptor
	protocol yet), but callers can still invoke the function
	explicitly via `obj.prop()`."

	^ fn
%

category: 'Grail-Built-in Functions'
method: builtins
delattr: anObject _: aName
	"Python builtin delattr(obj, name).  Dispatches through the
	``__delattr__'' protocol so user overrides intercept.  Default
	``object>>__delattr__:'' falls through to ``___pyAttrDelete___:''
	which removes the dynamic-instVar slot (raising AttributeError
	if it was never bound).  Returns None per CPython."

	anObject @env1:__delattr__: aName.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
hasattr: anObject _: aName
	"Python builtin hasattr(obj, name) — return True if obj has an
	attribute named `name`, False if accessing the attribute raises
	any exception (CPython 3 behavior: only AttributeError, but
	Grail collapses ``except (TypeError, AttributeError):`` paths
	through env-1 dispatch errors that show up as MNUs here too).

	Catch both the Smalltalk ``Error`` family (covers MNUs and other
	GS-side faults) and Python ``AttributeError`` (which inherits
	from AbstractException, not Error — ``___pyAttrLoad___`` now
	raises a real AttributeError on miss rather than DNU-ing).

	Used heavily by MarkupSafe, itsdangerous, and Werkzeug to detect
	``__html__`` / ``__call__`` / duck-typed protocols."

	^ [[anObject @env1:___pyAttrLoad___: aName @env0:asSymbol.
	    true]
		@env0:on: AttributeError do: [:___ex___ | false]]
		@env0:on: Error do: [:___ex___ | false]
%

category: 'Grail-Built-in Functions'
method: builtins
getattr: anObject _: aName
	"Python builtin getattr(obj, name) — 2-arg form.  Raises
	AttributeError on miss; the 3-arg form (with default) lives at
	``_getattr:kw:``."

	^ anObject @env1:___pyAttrLoad___: aName @env0:asSymbol
%

category: 'Grail-Built-in Functions'
method: builtins
_getattr: positional kw: kwargs
	"Python builtin getattr(obj, name, default=MISSING) — varargs
	entry covering the 3-arg form (default), invoked when a Smalltalk
	call site sees ``getattr(obj, name, default)`` from Python.
	Returns ``default`` instead of raising AttributeError on miss."

	| anObject aName |
	anObject := positional @env0:at: 1.
	aName := positional @env0:at: 2.
	(positional @env0:size) @env0:>= 3 ifTrue: [
		| default |
		default := positional @env0:at: 3.
		^ [anObject @env1:___pyAttrLoad___: aName @env0:asSymbol]
			@env0:on: AttributeError do: [:ex | ex @env0:return: default]
	].
	^ anObject @env1:___pyAttrLoad___: aName @env0:asSymbol
%

category: 'Grail-Built-in Functions'
method: builtins
issubclass: aClass _: aClassOrTuple
	"Python builtin issubclass(cls, classinfo) — True if `cls` is a
	subclass of `classinfo` (or any class in the tuple form).  Mirrors
	the BoundMethod-unwrap + tuple-recursion shape of `isinstance:_:`.
	When `cls` is a BoundMethod wrapping a builtin class name (Grail
	emits ``str`` / ``int`` as such), unwrap to the underlying class
	before walking the hierarchy."

	| sub target |
	sub := self @env1:___resolveClassRef___: aClass.
	target := self @env1:___resolveClassRef___: aClassOrTuple.
	(target @env0:isKindOf: tuple) ifTrue: [
		target @env0:do: [:eachCls |
			(sub @env0:== eachCls) ifTrue: [^ true].
			(sub @env0:inheritsFrom: eachCls) ifTrue: [^ true]
		].
		^ false
	].
	(sub @env0:== target) ifTrue: [^ true].
	^ sub @env0:inheritsFrom: target
%

category: 'Grail-Built-in Functions'
method: builtins
setattr: anObject _: aName _: aValue
	"Python builtin setattr(obj, name, value).  Dispatches through the
	``__setattr__'' protocol so user overrides intercept (see
	AttributeProtocolTestCase).  Default ``object>>__setattr__:_:''
	falls through to ``___pyAttrStore___:put:'' (instance →
	dynamicInstVarAt:put:; class → env-1 class-side setter).

	Per CPython, setattr returns None regardless of the underlying
	store's internal return — discard whatever __setattr__ yields."

	anObject @env1:__setattr__: aName _: aValue.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
type: className _: bases _: namespace
	"Python builtin type(name, bases, namespace) — the 3-argument
	metaclass form that builds a class dynamically.  Mirrors the
	compile-time path in ClassDefAst: pick the storage base from
	``bases'' as the Smalltalk superclass, create an anonymous subclass,
	then merge the other Python bases' methods (importlib
	___selectStorageBase___ / ___mergeSecondaryBases___).  An EMPTY
	namespace is supported — e.g. werkzeug's
	``type('WrapperTestResponse', (TestResponse, wrapper), {})''.  A
	non-empty namespace would need runtime method / attribute
	compilation (re-running ClassDefAst's body emit) and is not modeled
	yet, so it raises rather than silently dropping the bindings."

	| il baseArray storageBase nameSym newClass |
	il := Python @env0:at: #importlib.
	baseArray := Array @env0:withAll: bases.
	baseArray @env0:isEmpty ifTrue: [ baseArray := { PythonInstance } ].
	(namespace @env0:isNil @env0:not and: [namespace @env0:isEmpty @env0:not])
		ifTrue: [ ^ NotImplementedError ___signal___:
			'type(name, bases, namespace) with a non-empty namespace is not yet supported' ].
	storageBase := il @env0:___selectStorageBase___: baseArray.
	nameSym := (il @env0:___asSmalltalkClassName___: className @env0:asString) @env0:asSymbol.
	newClass := storageBase @env1:___subclass___: nameSym instVarNames: #() classInstVarNames: #().
	il @env0:___mergeSecondaryBases___: newClass bases: baseArray.
	"Copy inherited class-body data attributes (``X = v'') from the storage
	base into newClass's per-class slots — the same step ClassDefAst runs at
	compile time.  Smalltalk class-side instVars are per-class storage, so
	without this an unredeclared inherited Python class attr stays nil on the
	dynamically built class.  werkzeug's ``type('WrapperTestResponse',
	(TestResponse, Response), {})'' otherwise lost ``Response.
	implicit_sequence_conversion = True'', so ``test_client'' responses read
	it as nil and ``get_data()'' raised ``RuntimeError: the response object
	required the iterable to be a sequence''.  Namespace is empty here (the
	non-empty case is rejected above), so nothing of newClass's own to
	exclude."
	il @env0:___inheritClassAttrs___: newClass exclude: #().
	^ newClass
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
___reload__: positional kw: kwargs
	"Helper builtin behind ``importlib.reload(module)``.  Delegates to the
	Smalltalk importlib loader's ``reload:'', which re-reads the module's
	source (``__file__'') and re-compiles it in place.  Named ``__reload__''
	(two leading + two trailing underscores) so the Python facade's
	``importlib.reload'' can call it the way ``import_module'' calls
	``__import__''."

	^ (importlib instance) reload: (positional @env0:at: 1)
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
				ifFalse: [kwargs @env0:at: 'ndigits' ifAbsent: [nil]]
		].
	ndigits ifNil: [^ number @env0:rounded].
	multiplier := 10 @env0:raisedTo: ndigits.
	"Match CPython: ``round(1.234, 2)'' returns the Float 1.23.
	Smalltalk's ``Integer / Integer'' returns a Fraction, so divide
	by the Float form of the multiplier when the input is a Float."
	^ (number @env0:isKindOf: Float)
		@env0:ifTrue: [
			((number @env0:* multiplier) @env0:rounded @env0:asFloat)
				@env0:/ multiplier @env0:asFloat]
		@env0:ifFalse: [
			((number @env0:* multiplier) @env0:rounded) @env0:/ multiplier]
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
