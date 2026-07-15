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
	"Python builtin callable(x) — fixed-arity fast path.  Classes are
	always callable (instantiation); everything else by the presence of
	``__call__`` (or the Grail call protocol on BoundMethod/closures,
	which both compile ``__call__:``-shaped entries or value:value:)."

	| objClass |
	(anObject @env0:isKindOf: Behavior) ifTrue: [^ true].
	(anObject @env0:isKindOf: BoundMethod) ifTrue: [^ true].
	(anObject @env0:isKindOf: ExecBlock) ifTrue: [^ true].
	objClass := anObject @env0:class.
	^ (objClass @env0:whichClassIncludesSelector: (#__call__:) environmentId: 1) notNil
%

category: 'Grail-Built-in Functions'
method: builtins
chr: anInteger
	"Python builtin chr(i) — fixed-arity fast path.

	DELIBERATE DEVIATION: CPython's chr() accepts lone surrogates
	(0xD800-0xDFFF), but a GemStone Unicode string cannot hold one —
	downstream string construction dies with the UNCATCHABLE 'receiver
	contains a codePoint not valid for Unicode' error (it killed the
	whole test_re module run via test_bigcharset).  Raise a catchable
	ValueError at the source instead."

	(anInteger @env0:>= 16rD800 and: [anInteger @env0:<= 16rDFFF]) ifTrue: [
		ValueError ___signal___: 'chr() arg is a lone surrogate, which Grail strings cannot represent'].
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
	in try/except or use the two-arg form below.

	Grail compiles a generator EXPRESSION ``(x for x in ...)'' to an
	eager OrderedCollection rather than a lazy iterator, so a receiver
	that answers ``__iter__'' but not ``__next__'' is materialised to
	its iterator first — ``next(genexp)'' then yields its first
	element (the ``first match'' idiom in django's accepted_type)."

	^ (self @env1:___asIterator___: anIterator) @env1:__next__
%

category: 'Grail-Built-in Functions'
method: builtins
___asIterator___: anIterator
	"Return anIterator itself when it is already an iterator (answers
	``__next__''), else its ``__iter__''.  Bridges Grail's eager
	generator-expression collections into the next()/StopIteration
	protocol."

	((anIterator @env0:class @env0:whichClassIncludesSelector: #'__next__' environmentId: 1) isNil
		and: [(anIterator @env0:class @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) notNil])
		ifTrue: [^ anIterator @env1:__iter__].
	^ anIterator
%

category: 'Grail-Built-in Functions'
method: builtins
next: anIterator _: aDefault
	"Python builtin next(it, default) — return default instead of
	propagating StopIteration when the iterator is exhausted.
	Used by re/__init__.py's `next(iter(_cache))` LRU pop pattern
	(though that one always pops a real key, so the default path
	is the safety net)."

	^ [(self @env1:___asIterator___: anIterator) @env1:__next__]
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
	"Explicit key=None means no key (CPython)."
	keyFn @env0:== None ifTrue: [keyFn := nil].
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
___buildLocals___: pairsArray
	"Backing for the compile-time locals() rewrite (CallAst >>
	printLocalsCallOn:).  pairsArray holds {nameString. value} pairs
	for every name in the enclosing function scope; entries whose
	value is Smalltalk nil are locals that are unbound at the call
	moment and are omitted (nil ≡ absent — Python None is the None
	singleton, never nil).  Answers a fresh dict, like CPython's
	function-scope locals() snapshot."

	| d |
	d := dict @env1:___new___.
	pairsArray @env0:do: [:pair |
		(pair @env0:at: 2) @env0:== nil ifFalse: [
			d @env1:__setitem__: ((pair @env0:at: 1) @env0:asUnicodeString) _: (pair @env0:at: 2)]].
	^ d
%

category: 'Grail-Built-in Functions'
method: builtins
open: file
	"Python builtin open(file) — fixed-arity fast path; text read mode.
	Implementation lives in FileIO class >> ___open___:mode:encoding:."

	^ FileIO @env1:___open___: file mode: nil encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode
	"Python builtin open(file, mode) — fixed-arity fast path."

	^ FileIO @env1:___open___: file mode: mode encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode _: buffering
	"Python builtin open(file, mode, buffering) — fixed-arity fast path.
	buffering is accepted and ignored (GsFile buffers internally)."

	^ FileIO @env1:___open___: file mode: mode encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode _: buffering _: encoding
	"Python builtin open(file, mode, buffering, encoding) — fixed-arity
	fast path.  buffering is accepted and ignored."

	^ FileIO @env1:___open___: file mode: mode encoding: encoding
%

category: 'Grail-Built-in Functions'
method: builtins
_open: positional kw: kwargs
	"Python builtin open(file, mode='r', buffering=-1, encoding=None,
	errors=None, newline=None, closefd=True, opener=None) — varargs fast
	path for kwarg call shapes like open(p, encoding='utf-8').
	buffering / errors / newline / closefd / opener are accepted and
	ignored (no newline translation; GsFile buffers internally)."

	| nargs file mode encoding |
	nargs := positional @env0:size.
	file := (nargs @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs @env0:== nil) ifTrue: [
				TypeError ___signal___: 'open() missing required argument: ''file'''].
			kwargs @env0:at: 'file' ifAbsent: [
				TypeError ___signal___: 'open() missing required argument: ''file''']].
	mode := (nargs @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs @env0:== nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: 'mode' ifAbsent: [nil]]].
	encoding := (nargs @env0:>= 4)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [
			(kwargs @env0:== nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: 'encoding' ifAbsent: [nil]]].
	^ FileIO @env1:___open___: file mode: mode encoding: encoding
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

category: 'Grail-Format Spec Engine'
method: builtins
___parseFormatSpec___: spec
	"Parse Python's format-spec mini-language
	    [[fill]align][sign][#][0][width][,|_][.precision][type]
	into an 8-slot Array: {fill. align. sign. alt. width. grouping.
	precision. type}.  align/grouping/precision/type are nil when
	absent; raises ValueError on trailing junk or empty precision."

	| fill align sign alt width grouping precision type i n c |
	fill := $ . align := nil. sign := $-. alt := false.
	width := 0. grouping := nil. precision := nil. type := nil.
	i := 1. n := spec @env0:size.
	(n @env0:>= 2 and: [#($< $> $^ $=) @env0:includes: (spec @env0:at: 2)])
		ifTrue: [
			fill := spec @env0:at: 1.
			align := spec @env0:at: 2.
			i := 3]
		ifFalse: [
			(n @env0:>= 1 and: [#($< $> $^ $=) @env0:includes: (spec @env0:at: 1)])
				ifTrue: [
					align := spec @env0:at: 1.
					i := 2]].
	(i @env0:<= n and: [#($+ $- $ ) @env0:includes: (spec @env0:at: i)]) ifTrue: [
		sign := spec @env0:at: i. i := i @env0:+ 1].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $#]) ifTrue: [
		alt := true. i := i @env0:+ 1].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $0]) ifTrue: [
		align @env0:== nil ifTrue: [align := $=. fill := $0].
		i := i @env0:+ 1].
	[i @env0:<= n and: [(spec @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
		width := (width @env0:* 10) @env0:+ (spec @env0:at: i) @env0:digitValue.
		i := i @env0:+ 1].
	(i @env0:<= n and: [#($, $_) @env0:includes: (spec @env0:at: i)]) ifTrue: [
		grouping := spec @env0:at: i. i := i @env0:+ 1].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $.]) ifTrue: [
		i := i @env0:+ 1.
		(i @env0:> n or: [(spec @env0:at: i) @env0:isDigit @env0:not]) ifTrue: [
			ValueError ___signal___: 'Format specifier missing precision'].
		precision := 0.
		[i @env0:<= n and: [(spec @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
			precision := (precision @env0:* 10) @env0:+ (spec @env0:at: i) @env0:digitValue.
			i := i @env0:+ 1]].
	i @env0:<= n ifTrue: [
		c := spec @env0:at: i.
		(#($b $c $d $e $E $f $F $g $G $n $o $s $x $X $%) @env0:includes: c) ifFalse: [
			ValueError ___signal___: ('Invalid format specifier ''' @env0:, spec @env0:asString @env0:, '''')].
		type := c.
		i := i @env0:+ 1].
	i @env0:<= n ifTrue: [
		ValueError ___signal___: ('Invalid format specifier ''' @env0:, spec @env0:asString @env0:, '''')].
	^ { fill. align. sign. alt. width. grouping. precision. type }
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatPadBody___: body fill: fill align: align width: width signLength: signLength
	"Pad body to width.  align $= keeps the first signLength chars
	(sign and/or 0x prefix) on the left and pads between them and the
	digits."

	| padCount pad left lp rp leftPad |
	width @env0:<= body @env0:size ifTrue: [^ body @env0:asString].
	padCount := width @env0:- body @env0:size.
	"atAllPut: answers its ARGUMENT, not the receiver — assign first."
	pad := String @env0:new: padCount.
	pad @env0:atAllPut: fill.
	align @env0:= $< ifTrue: [^ (body @env0:, pad) @env0:asString].
	align @env0:= $^ ifTrue: [
		leftPad := padCount @env0:// 2.
		lp := String @env0:new: leftPad.
		lp @env0:atAllPut: fill.
		rp := String @env0:new: padCount @env0:- leftPad.
		rp @env0:atAllPut: fill.
		^ (lp @env0:, body @env0:, rp) @env0:asString].
	align @env0:= $= ifTrue: [
		left := body @env0:copyFrom: 1 to: signLength.
		^ (left @env0:, pad @env0:, (body @env0:copyFrom: signLength @env0:+ 1 to: body @env0:size)) @env0:asString].
	^ (pad @env0:, body) @env0:asString
%

category: 'Grail-Format Spec Engine'
method: builtins
___groupDigits___: digits separator: sep every: groupSize
	"Insert sep into a digit string every groupSize digits from the
	right: '1234567' -> '1,234,567'."

	| out count i |
	digits @env0:size @env0:<= groupSize ifTrue: [^ digits].
	out := ''.
	count := 0.
	i := digits @env0:size.
	[i @env0:>= 1] @env0:whileTrue: [
		out := (String @env0:with: (digits @env0:at: i)) @env0:, out.
		count := count @env0:+ 1.
		(count @env0:\\ groupSize @env0:= 0 and: [i @env0:> 1]) ifTrue: [
			out := (String @env0:with: sep) @env0:, out].
		i := i @env0:- 1].
	^ out
%

category: 'Grail-Format Spec Engine'
method: builtins
___signString___: negative sign: sign
	negative ifTrue: [^ '-'].
	sign @env0:= $+ ifTrue: [^ '+'].
	sign @env0:= $  ifTrue: [^ ' '].
	^ ''
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatIntValue___: value parsed: p
	"Format an Integer per a parsed spec.  Float-ish types delegate
	to the float formatter (CPython allows format(3, '.2f'))."

	| fill align sign alt width grouping type digits prefix signStr body groupSize |
	fill := p @env0:at: 1. align := p @env0:at: 2. sign := p @env0:at: 3.
	alt := p @env0:at: 4. width := p @env0:at: 5. grouping := p @env0:at: 6.
	type := p @env0:at: 8.
	(#($e $E $f $F $g $G $%) @env0:includes: type) ifTrue: [
		^ self @env1:___formatFloatValue___: value @env0:asFloat parsed: p].
	type @env0:= $c ifTrue: [
		body := String @env0:with: (Character @env0:codePoint: value).
		align @env0:== nil ifTrue: [align := $<].
		^ self @env1:___formatPadBody___: body fill: fill align: align width: width signLength: 0].
	type @env0:= $s ifTrue: [
		ValueError ___signal___: 'Unknown format code ''s'' for object of type ''int'''].
	prefix := ''.
	(type @env0:== nil or: [type @env0:= $d or: [type @env0:= $n]]) ifTrue: [
		digits := value @env0:abs @env0:printString]
	ifFalse: [
		type @env0:= $b ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 2.
			alt ifTrue: [prefix := '0b']].
		type @env0:= $o ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 8.
			alt ifTrue: [prefix := '0o']].
		type @env0:= $x ifTrue: [
			digits := (value @env0:abs @env0:printStringRadix: 16) @env0:asLowercase.
			alt ifTrue: [prefix := '0x']].
		type @env0:= $X ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 16.
			alt ifTrue: [prefix := '0X']]].
	grouping @env0:== nil ifFalse: [
		groupSize := (type @env0:== nil or: [type @env0:= $d or: [type @env0:= $n]])
			ifTrue: [3] ifFalse: [4].
		digits := self @env1:___groupDigits___: digits separator: grouping every: groupSize].
	signStr := self @env1:___signString___: value @env0:< 0 sign: sign.
	body := signStr @env0:, prefix @env0:, digits.
	align @env0:== nil ifTrue: [align := $>].
	^ self @env1:___formatPadBody___: body fill: fill align: align
		width: width signLength: signStr @env0:size @env0:+ prefix @env0:size
%

category: 'Grail-Format Spec Engine'
method: builtins
___fixedDigits___: absValue precision: precision
	"Fixed-point digit string for a non-negative Float: 'II.FFF' with
	exactly `precision` fraction digits ('II' when precision = 0)."

	| factor scaled ip fp frac |
	factor := 10 @env0:raisedTo: precision.
	scaled := (absValue @env0:* factor) @env0:rounded.
	ip := scaled @env0:// factor.
	fp := scaled @env0:\\ factor.
	precision @env0:= 0 ifTrue: [^ ip @env0:printString].
	frac := fp @env0:printString.
	[frac @env0:size @env0:< precision] @env0:whileTrue: [frac := '0' @env0:, frac].
	^ (ip @env0:printString) @env0:, '.' @env0:, frac
%

category: 'Grail-Format Spec Engine'
method: builtins
___sciDigits___: absValue precision: precision upper: upper
	"Scientific-notation digit string for a non-negative Float:
	'M.MMMe+EE'."

	| m exp mstr estr marker |
	m := absValue.
	exp := 0.
	m @env0:= 0 ifFalse: [
		[m @env0:>= 10] @env0:whileTrue: [m := m @env0:/ 10. exp := exp @env0:+ 1].
		[m @env0:< 1] @env0:whileTrue: [m := m @env0:* 10. exp := exp @env0:- 1]].
	mstr := self @env1:___fixedDigits___: m precision: precision.
	"Rounding can push the mantissa to 10.000...; renormalize."
	(mstr @env0:size @env0:>= 2 and: [(mstr @env0:at: 1) @env0:= $1 and: [(mstr @env0:at: 2) @env0:= $0]]) ifTrue: [
		(mstr @env0:copyFrom: 1 to: 2) @env0:= '10' ifTrue: [
			m := m @env0:/ 10. exp := exp @env0:+ 1.
			mstr := self @env1:___fixedDigits___: m precision: precision]].
	estr := exp @env0:abs @env0:printString.
	estr @env0:size @env0:< 2 ifTrue: [estr := '0' @env0:, estr].
	estr := (exp @env0:< 0 ifTrue: ['-'] ifFalse: ['+']) @env0:, estr.
	marker := upper ifTrue: ['E'] ifFalse: ['e'].
	^ mstr @env0:, marker @env0:, estr
%

category: 'Grail-Format Spec Engine'
method: builtins
___stripTrailingZeros___: digitString
	"For %g: drop trailing fraction zeros and a bare trailing dot."

	| s |
	s := digitString.
	(s @env0:includes: $.) ifFalse: [^ s].
	[s @env0:size @env0:> 0 and: [(s @env0:at: s @env0:size) @env0:= $0]]
		@env0:whileTrue: [s := s @env0:copyFrom: 1 to: s @env0:size @env0:- 1].
	(s @env0:size @env0:> 0 and: [(s @env0:at: s @env0:size) @env0:= $.]) ifTrue: [
		s := s @env0:copyFrom: 1 to: s @env0:size @env0:- 1].
	^ s
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatFloatValue___: value parsed: p
	"Format a Float per a parsed spec (types f F e E g G % and the
	bare-precision form)."

	| fill align sign width grouping precision type neg a digits signStr body suffix exp10 probe |
	fill := p @env0:at: 1. align := p @env0:at: 2. sign := p @env0:at: 3.
	width := p @env0:at: 5. grouping := p @env0:at: 6.
	precision := p @env0:at: 7. type := p @env0:at: 8.
	(#($b $o $x $X $c $d $n $s) @env0:includes: type) ifTrue: [
		ValueError ___signal___: ('Unknown format code for object of type ''float''')].
	"Non-finite values format as their str with sign/width only."
	(value @env0:= value) ifFalse: [
		digits := 'nan'. neg := false]
	ifTrue: [
		neg := value @env0:< 0.
		a := value @env0:abs.
		a @env0:> 1e300 ifTrue: [
			a @env0:* 0 @env0:= 0 ifFalse: [digits := 'inf']]].
	digits @env0:== nil ifTrue: [
		suffix := ''.
		type @env0:= $% ifTrue: [
			a := a @env0:* 100.
			suffix := '%'.
			type := $f].
		(type @env0:= $f or: [type @env0:= $F]) ifTrue: [
			digits := self @env1:___fixedDigits___: a
				precision: (precision @env0:== nil ifTrue: [6] ifFalse: [precision])]
		ifFalse: [
		(type @env0:= $e or: [type @env0:= $E]) ifTrue: [
			digits := self @env1:___sciDigits___: a
				precision: (precision @env0:== nil ifTrue: [6] ifFalse: [precision])
				upper: type @env0:= $E]
		ifFalse: [
			"g / G / bare precision / bare float."
			(type @env0:== nil and: [precision @env0:== nil]) ifTrue: [
				digits := a @env0:printString]
			ifFalse: [
				precision @env0:== nil ifTrue: [precision := 6].
				precision @env0:= 0 ifTrue: [precision := 1].
				exp10 := 0.
				probe := a.
				probe @env0:= 0 ifFalse: [
					[probe @env0:>= 10] @env0:whileTrue: [probe := probe @env0:/ 10. exp10 := exp10 @env0:+ 1].
					[probe @env0:< 1] @env0:whileTrue: [probe := probe @env0:* 10. exp10 := exp10 @env0:- 1]].
				((exp10 @env0:>= -4) @env0:and: [exp10 @env0:< precision])
					ifTrue: [
						digits := self @env1:___stripTrailingZeros___:
							(self @env1:___fixedDigits___: a precision: (precision @env0:- 1 @env0:- exp10 @env0:max: 0))]
					ifFalse: [
						digits := self @env1:___stripTrailingZeros___:
							(self @env1:___sciDigits___: a precision: precision @env0:- 1 upper: type @env0:= $G)]]]].
		digits := digits @env0:, suffix].
	grouping @env0:== nil ifFalse: [
		| dot ip rest |
		dot := digits @env0:indexOf: $..
		dot @env0:= 0
			ifTrue: [ip := digits. rest := '']
			ifFalse: [ip := digits @env0:copyFrom: 1 to: dot @env0:- 1.
				rest := digits @env0:copyFrom: dot to: digits @env0:size].
		digits := (self @env1:___groupDigits___: ip separator: grouping every: 3) @env0:, rest].
	signStr := self @env1:___signString___: neg sign: sign.
	body := signStr @env0:, digits.
	align @env0:== nil ifTrue: [align := $>].
	^ self @env1:___formatPadBody___: body fill: fill align: align
		width: width signLength: signStr @env0:size
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatStrValue___: value parsed: p
	"Format a string per a parsed spec: optional .precision truncation,
	then fill/align/width.  Default alignment is left."

	| fill align width precision type body |
	fill := p @env0:at: 1. align := p @env0:at: 2. width := p @env0:at: 5.
	precision := p @env0:at: 7. type := p @env0:at: 8.
	(type @env0:== nil or: [type @env0:= $s]) ifFalse: [
		ValueError ___signal___: ('Unknown format code for object of type ''str''')].
	body := value.
	((precision @env0:== nil) @env0:not and: [body @env0:size @env0:> precision]) ifTrue: [
		body := body @env0:copyFrom: 1 to: precision].
	align @env0:== nil ifTrue: [align := $<].
	align @env0:= $= ifTrue: [
		ValueError ___signal___: '''='' alignment not allowed in string format specifier'].
	^ self @env1:___formatPadBody___: body fill: fill align: align width: width signLength: 0
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatValue___: value spec: spec
	"Shared entry point behind int/float/str __format__.  Empty spec
	is str(value); otherwise parse once and dispatch by type."

	| p |
	(spec @env0:== nil or: [spec @env0:isEmpty]) ifTrue: [^ value @env1:__str__].
	p := self @env1:___parseFormatSpec___: spec.
	(value @env0:isKindOf: Float) ifTrue: [
		^ self @env1:___formatFloatValue___: value parsed: p].
	(value @env0:isKindOf: Integer) ifTrue: [
		^ self @env1:___formatIntValue___: value parsed: p].
	(value @env0:isKindOf: CharacterCollection) ifTrue: [
		^ self @env1:___formatStrValue___: value @env0:asString parsed: p].
	^ self @env1:___formatStrValue___: (value @env1:__str__) parsed: p
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
	The 2-arg form `round(x, ndigits)` lives at `_round:kw:`.
	__round__ first (CPython protocol): vendored fractions.Fraction
	implements banker's rounding there; the kernel #rounded was an
	uncatchable MNU on PythonInstances."

	((aNumber @env0:class @env0:whichClassIncludesSelector: #'___round__:kw:' environmentId: 1) @env0:~~ nil)
		ifTrue: [^ aNumber @env1:___round__: { } kw: nil].
	((aNumber @env0:class @env0:whichClassIncludesSelector: #'__round__' environmentId: 1) @env0:~~ nil)
		ifTrue: [^ aNumber @env0:perform: #'__round__' env: 1].
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
	"Python builtin map(func, iter) — LAZY, as in CPython.  Eager
	materialization looped forever (then OOM-killed the session) on
	infinite sources: take(4, map(f, itertools.count()))."

	^ map_iterator @env1:___on: aFunction source: anIterable __iter__
%

category: 'Grail-Built-in Functions'
method: builtins
filter: aFunction _: anIterable
	"Python builtin filter(func, iter) — keep items where func(item)
	is truthy; filter(None, iter) keeps truthy items.  LAZY, as in
	CPython (see map:_:)."

	^ filter_iterator @env1:___on: aFunction source: anIterable __iter__
%

category: 'Grail-Built-in Functions'
method: builtins
_filter: positional kw: kwargs
	"Varargs form of filter() for BoundMethod indirect calls."

	^ self @env1:filter: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-Built-in Functions'
method: builtins
vars: anObject
	"Python builtin vars(obj) — the instance namespace as a fresh
	dict: dynamic instVars plus non-nil named instVars (nil means
	unbound in Grail); module/dict-backed receivers also contribute
	their dict entries.  The zero-arg vars() is rewritten to locals()
	at compile time (CallAst), matching CPython's equivalence."

	| d |
	"Reject receivers that cannot carry attributes BEFORE touching the
	dynamic-instVar API — signaling from inside an on:Error handler
	around dynamicInstVarPairs on a special (immediate) object loops
	the signal machinery into AlmostOutOfStack."
	((anObject @env0:== nil)
		or: [(anObject @env0:== None)
		or: [(anObject @env0:isKindOf: Number)
		or: [(anObject @env0:isKindOf: Boolean)
		or: [(anObject @env0:isKindOf: CharacterCollection)
		or: [(anObject @env0:class @env0:isPointers) @env0:not]]]]]) ifTrue: [
		TypeError ___signal___: 'vars() argument must have __dict__ attribute'].
	d := dict @env1:___new___.
	(anObject @env0:isKindOf: SymbolDictionary) ifTrue: [
		anObject @env0:keysDo: [:k |
			d @env1:__setitem__: k @env0:asString @env0:asUnicodeString _: (anObject @env0:at: k)]].
	(anObject @env0:dynamicInstanceVariables) @env0:do: [:nm |
		d @env1:__setitem__: (nm @env0:asString @env0:asUnicodeString)
			_: (anObject @env0:dynamicInstVarAt: nm)].
	(anObject @env0:class @env0:allInstVarNames) @env0:doWithIndex: [:nm :i |
		| v |
		v := anObject @env0:instVarAt: i.
		v @env0:== nil ifFalse: [
			d @env1:__setitem__: (nm @env0:asString @env0:asUnicodeString) _: v]].
	^ d
%

category: 'Grail-Built-in Functions'
method: builtins
ascii: anObject
	"Python builtin ascii(x) — repr() with non-ASCII characters
	escaped as \\xHH / \\uHHHH / \\UHHHHHHHH."

	| r ws cp hex |
	r := anObject __repr__.
	ws := WriteStream @env0:on: String @env0:new.
	r @env0:do: [:ch |
		cp := ch @env0:codePoint.
		cp @env0:<= 126
			ifTrue: [ws @env0:nextPut: ch]
			ifFalse: [
				hex := (cp @env0:printStringRadix: 16) @env0:asLowercase.
				cp @env0:<= 255
					ifTrue: [
						[hex @env0:size @env0:< 2] @env0:whileTrue: [hex := '0' @env0:, hex].
						ws @env0:nextPutAll: '\x'.
						ws @env0:nextPutAll: hex]
					ifFalse: [
						cp @env0:<= 16rFFFF
							ifTrue: [
								[hex @env0:size @env0:< 4] @env0:whileTrue: [hex := '0' @env0:, hex].
								ws @env0:nextPutAll: '\u'.
								ws @env0:nextPutAll: hex]
							ifFalse: [
								[hex @env0:size @env0:< 8] @env0:whileTrue: [hex := '0' @env0:, hex].
								ws @env0:nextPutAll: '\U'.
								ws @env0:nextPutAll: hex]]]].
	^ ws @env0:contents
%

category: 'Grail-Built-in Functions'
method: builtins
help
	"Python builtin help() — Grail has no interactive help system."

	Transcript @env0:nextPutAll: 'Grail: call help(obj) to print obj.__doc__.'.
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
help: anObject
	"Python builtin help(obj) — minimal: print the docstring."

	| doc |
	doc := [anObject @env1:__doc__] @env0:on: Error do: [:ex | nil].
	(doc @env0:== nil or: [doc @env0:== None]) ifTrue: [
		doc := 'No documentation available.'].
	Transcript @env0:nextPutAll: doc @env0:asString.
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
_help: positional kw: kwargs
	positional @env0:isEmpty ifTrue: [^ self @env1:help].
	^ self @env1:help: (positional @env0:at: 1)
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

	"isNil must be @env0:-annotated here: isNil is a configurable
	optimized selector, and a host extent that removed it from
	GsNMethod optimizedSelectors compiles a bare isNil as a real
	send — which nothing implements in env 1."
	| iterable keyFn reverse lst iter done sortBlock sortedArray |
	iterable := positional @env0:at: 1.
	keyFn := kwargs @env0:isNil
		ifTrue: [nil]
		ifFalse: [kwargs @env0:at: 'key' ifAbsent: [nil]].
	"An EXPLICIT key=None means no key (CPython) -- test_heapq passes
	key in [None, itemgetter(0), ...]; calling the None killed the
	test with 'NoneType' object is not callable."
	keyFn @env0:== None ifTrue: [keyFn := nil].
	reverse := kwargs @env0:isNil
		ifTrue: [false]
		ifFalse: [kwargs @env0:at: 'reverse' ifAbsent: [false]].
	reverse @env0:== None ifTrue: [reverse := false].
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
	sortBlock := keyFn @env0:isNil
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
	underlying Smalltalk class.  Other inputs pass through unchanged.

	``type'' is special: referenced as a value it is the builtins ``type''
	callable (a BoundMethod selector #type), not a Smalltalk class, and
	there is no ``type'' class in the Python dict.  Per Python,
	``isinstance(x, type)'' / ``issubclass(c, type)'' ask whether x / c is
	a class — which in GemStone is ``isKindOf: Behavior'' /
	``inheritsFrom: Behavior''.  Mapping the type callable to Behavior lets
	both checks run through the normal isKindOf:/inheritsFrom: path instead
	of raising an uncatchable ArgumentTypeError from isKindOf: on a
	non-class second argument.  (numpy._utils.set_module does
	``isinstance(func, type)'' to tell a decorated class from a function.)"

	(aRef @env0:isKindOf: BoundMethod) ifTrue: [
		(aRef @env0:selector == #'type') ifTrue: [^ Behavior].
		^ Python @env0:at: aRef @env0:selector ifAbsent: [aRef]
	].
	^ aRef
%

category: 'Python-Built-in Functions'
method: builtins
___isInstanceSingle___: anObject of: aClass
	"isinstance with a single class argument (post-tuple-expansion)."

	| result theMetaclass |
	"Non-class classinfo (isinstance(x, functools.cached_property)
	where the attr resolved to a BoundMethod): raise CPython's
	catchable TypeError -- isKindOf: on a non-Behavior dies with an
	UNCATCHABLE ArgumentTypeError (killed test_functools)."
	(aClass @env0:isKindOf: Behavior) ifFalse: [
		TypeError ___signal___: 'isinstance() arg 2 must be a type, a tuple of types, or a union'].
	result := anObject @env0:isKindOf: aClass.
	(result not and: [aClass @env0:== Unicode7]) ifTrue: [
		"str maps to Unicode7 for construction, but CPython counts EVERY
		text string as str: Grail literals may come back Unicode16 /
		QuadByteString (wide content) and GemStone APIs hand back String /
		DoubleByteString.  Without this, isinstance(cyrillic, str) was
		False and re.compile rejected wide-string patterns
		(test_word_boundaries).  bytes stays distinct: ByteArray is not a
		CharacterCollection."
		result := anObject @env0:isKindOf: CharacterCollection].
	(result not and: [aClass @env0:== (Python @env0:at: #'PyDict' otherwise: nil)]) ifTrue: [
		"dict maps to PyDict (the insertion-ordered subclass) for
		construction, but CPython counts EVERY dict as a dict: internal
		plain KeyValueDictionaries surfaced to Python (module namespaces,
		some builtins) must still read as dict.  PyDict is-a KVD, so this
		only widens the check to the superclass (docs/Ordered_Dict.md).
		PyDict resolved late -- builtins.gs compiles before PyDict.gs."
		result := anObject @env0:isKindOf: KeyValueDictionary].
	result ifFalse: [
		"Secondary (multiple-inheritance) bases are not on the Smalltalk
		chain isKindOf: walks -- consult the instance class's registered
		C3 MRO."
		| il |
		il := Python @env0:at: #importlib otherwise: nil.
		il @env0:== nil ifFalse: [
			result := (il @env0:___mroOf___: anObject @env0:class) @env0:includes: aClass]].
	result ifFalse: [
		theMetaclass := aClass @env0:class.
		"Walk the metaclass chain (not just the own method dict) for
		``__instancecheck__:'' — ABCs define it once on a base
		(``numbers.Number'', ``collections.abc._ABCStub'') and the
		concrete ABC names inherit it.  An own-dict-only check
		(``includesSelector:'') misses ``isinstance(x, numbers.Integral)''
		and every ``isinstance(x, collections.abc.Mapping/Sequence/...)''
		because those classes carry the method only by inheritance.
		Matches CPython, where the hook lives on the (shared) metaclass
		``type(cls).__instancecheck__''."
		((theMetaclass @env0:whichClassIncludesSelector: #'__instancecheck__:' environmentId: 1) notNil) ifTrue: [
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
			(self @env1:___isSubclassSingle___: sub of: eachCls) ifTrue: [^ true]
		].
		^ false
	].
	^ self @env1:___isSubclassSingle___: sub of: target
%

category: 'Grail-Built-in Functions'
method: builtins
___hasProtocol___: anObject _: aName
	"Grail-internal builtin bridging collections.abc's structural checks to
	object >> ___hasProtocol___: (method OWNERSHIP below the
	PythonInstance/Object fallback level).  A separate builtin because the
	Python attribute-call path on a CLASS receiver doesn't reach Object's
	env-1 instance methods -- a direct Smalltalk env-1 send does, for
	instance and class receivers alike."

	^ anObject @env1:___hasProtocol___: aName
%

category: 'Grail-Built-in Functions'
method: builtins
___isSubclassSingle___: sub of: target
	"issubclass with a single class argument.  The Smalltalk chain
	covers single inheritance; a multiple-inheritance class's secondary
	bases are visible only through its registered C3 MRO."

	| il |
	((sub @env0:isKindOf: Behavior) and: [target @env0:isKindOf: Behavior]) ifFalse: [
		TypeError ___signal___: 'issubclass() arg must be a type'].
	(sub @env0:== target) ifTrue: [^ true].
	(sub @env0:inheritsFrom: target) ifTrue: [^ true].
	"Mirror isinstance's str widening: every text string class is a
	subclass of str (see ___isInstanceSingle___:of:)."
	(target @env0:== Unicode7 and: [(sub @env0:== CharacterCollection)
		or: [sub @env0:inheritsFrom: CharacterCollection]]) ifTrue: [^ true].
	"int-subclass widening: a class routed onto AbstractPyInt by
	___subclass___'s sealed-Integer substitution IS a subclass of int."
	(target @env0:== Integer and: [(sub @env0:== AbstractPyInt)
		or: [sub @env0:inheritsFrom: AbstractPyInt]]) ifTrue: [^ true].
	"float-subclass widening -- same substitution story."
	(target @env0:== Float and: [(sub @env0:== AbstractPyFloat)
		or: [sub @env0:inheritsFrom: AbstractPyFloat]]) ifTrue: [^ true].
	il := Python @env0:at: #importlib otherwise: nil.
	il @env0:== nil ifFalse: [
		((il @env0:___mroOf___: sub) @env0:includes: target) ifTrue: [^ true]].
	"``__subclasscheck__:'' hook -- the issubclass analog of isinstance's
	``__instancecheck__:'' probe above.  ABCs (collections.abc, numbers)
	define it once on a shared base and every concrete ABC inherits it, so
	walk the METACLASS chain, mirroring CPython's
	``type(cls).__subclasscheck__''.  Reached only after the real chain,
	the widenings, and the C3 MRO all missed."
	((target @env0:class @env0:whichClassIncludesSelector: #'__subclasscheck__:' environmentId: 1) notNil) ifTrue: [
		^ (target __subclasscheck__: sub) @env0:== true].
	^ false
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
	storageBase := il @env0:___selectStorageBase___: baseArray.
	nameSym := (il @env0:___asSmalltalkClassName___: className @env0:asString) @env0:asSymbol.
	newClass := storageBase @env1:___subclass___: nameSym instVarNames: #() classInstVarNames: #().
	il @env0:___mergeSecondaryBases___: newClass bases: baseArray.
	"Non-empty namespace: store each binding as a class attribute via
	the polymorphic attribute store (values land in the per-class
	dynInstVars holder, where ___pyAttrLoad___'s class branch finds
	them).  Callables become class attrs too — enough for django's
	``BaseManager.from_queryset(QuerySet)'' (its copied queryset
	methods are invoked through instance attribute dispatch)."
	(namespace @env0:isNil @env0:not and: [namespace @env0:isEmpty @env0:not])
		ifTrue: [
			namespace @env0:keysAndValuesDo: [:k :v |
				newClass @env1:___pyAttrStore___: k @env0:asSymbol put: v
			]
		].
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
	"__round__ first (CPython protocol) -- see round: for the 1-arg
	rationale; the kernel arithmetic below MNUs on PythonInstances."
	((number @env0:class @env0:whichClassIncludesSelector: #'___round__:kw:' environmentId: 1) @env0:~~ nil)
		ifTrue: [^ number @env1:___round__:
			(ndigits @env0:== nil ifTrue: [{ }] ifFalse: [{ ndigits }]) kw: nil].
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

	| iterators |
	iterators := Array @env0:new: positional @env0:size.
	1 @env0:to: positional @env0:size do: [:i |
		iterators @env0:at: i put: (positional @env0:at: i) __iter__].
	"LAZY, as in CPython -- an eager zip looped forever (then
	OOM-killed the session) on infinite sources like
	zip(count(), count(1))."
	^ zip_iterator @env1:___on: iterators
%

set compile_env: 0
