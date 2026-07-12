! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- functools class (Python 'functools' module)
expectvalue /Class
doit
module subclass: 'functools'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools comment:
'Python functools module.

Provides higher-order functions and operations on callable objects.
Currently implements lru_cache as a pass-through (no caching) and reduce.
See https://docs.python.org/3/library/functools.html
'
%

expectvalue /Class
doit
functools category: 'Grail-Modules'
%

! ------- functools_cmpkey class (functools.cmp_to_key wrapper)
expectvalue /Class
doit
PythonInstance subclass: 'functools_cmpkey'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_cmpkey category: 'Grail-Modules'
%

! ------- functools_singledispatch: the wrapper returned by singledispatch()
expectvalue /Class
doit
PythonInstance subclass: 'functools_singledispatch'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_singledispatch category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
functools_singledispatch removeAllMethods: 1.
functools_singledispatch class removeAllMethods: 1.
%

! ------- functools_partial class (Python functools.partial)
expectvalue /Class
doit
PythonInstance subclass: 'functools_partial'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_partial comment:
'Python functools.partial as a REAL class (CPython test_functools
subclasses it at import time; the previous closure-returning module
function could not be subclassed).  State lives in dynamic instVars
func / args / keywords, so attribute reads resolve through the
standard PythonInstance probe.  Construction is implemented as the
instance-side __new__ protocol (___new__:kw:) so ClassDefAst-emitted
subclass instantiation and direct partial(...) calls share it.'
%

expectvalue /Class
doit
functools_partial category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
functools removeAllMethods: 1.
functools class removeAllMethods: 1.
functools_partial removeAllMethods: 1.
functools_partial class removeAllMethods: 1.
functools_cmpkey removeAllMethods: 1.
functools_cmpkey class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: functools
initialize
	"Bind the partial class.  The module attribute load falls through
	to SymbolDictionary storage once no partial:/-varargs methods
	shadow it, so ``functools.partial`` / ``from functools import
	partial`` yield the CLASS."

	self @env0:at: #partial put: functools_partial
%

category: 'Grail-Built-in Functions'
method: functools
cmp_to_key: mycmp
	"cmp_to_key(cmp) -> a key factory: key(x) wraps x so comparisons
	route through cmp (sorted/min/max with old-style comparators --
	test_functools exercises it directly)."

	^ [:___p___ :___k___ |
		| w o |
		o := (___p___ @env0:~~ nil and: [___p___ @env0:size @env0:>= 1])
			ifTrue: [___p___ @env0:at: 1]
			ifFalse: [
				(___k___ @env0:~~ nil and: [___k___ @env0:includesKey: 'obj'])
					ifTrue: [___k___ @env0:at: 'obj']
					ifFalse: [TypeError ___signal___: 'K() missing required argument: obj']].
		w := functools_cmpkey @env0:new.
		w @env0:dynamicInstVarAt: #obj put: o.
		w @env0:dynamicInstVarAt: #cmp put: mycmp.
		w]
%

category: 'Grail-Built-in Functions'
method: functools
_cmp_to_key: positional kw: kwargs
	"Varargs companion: cmp_to_key(mycmp=f) keyword form and
	argument-count errors (test_cmp_to_key)."

	| f |
	f := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs @env0:~~ nil and: [kwargs @env0:includesKey: 'mycmp'])
				ifTrue: [kwargs @env0:at: 'mycmp']
				ifFalse: [TypeError ___signal___: 'cmp_to_key() missing required argument: mycmp']].
	^ self @env1:cmp_to_key: f
%

category: 'Grail-Comparison'
method: functools_cmpkey
__lt__: other
	(other @env0:isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) @env1:value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:< 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__gt__: other
	(other @env0:isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) @env1:value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:> 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__le__: other
	(other @env0:isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) @env1:value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:<= 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__ge__: other
	(other @env0:isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) @env1:value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:>= 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__eq__: other
	(other @env0:isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) @env1:value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:= 0
%

category: 'Grail-Instantiation'
classmethod: functools_partial
value: positional value: keywords
	"partial(fn, *args, **kw) -- class-call entry.  Route through the
	__new__ protocol so subclass instantiation (ClassDefAst-emitted
	value:value: uses ___allocateInstance___) and direct calls share
	one constructor."

	^ self @env1:___allocateInstance___: positional kw: keywords
%

category: 'Grail-Instantiation'
method: functools_partial
___new__: positional kw: keywords
	"Constructor body.  self is the CLASS: ___allocateInstance___ runs a
	class-body __new__ non-virtually with the class as receiver, which
	also makes ``class Sub(partial): pass`` construct Sub instances."

	| inst fn rest kw |
	(positional @env0:== nil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___: 'partial expected at least 1 argument, got 0'].
	fn := positional @env0:at: 1.
	rest := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	kw := keywords @env0:== nil
		ifTrue: [KeyValueDictionary @env0:new]
		ifFalse: [keywords @env0:copy].
	"CPython flattens partial-of-partial: adopt the inner func, prepend
	its bound args, and let the OUTER keywords override the inner."
	(fn @env0:isKindOf: functools_partial) ifTrue: [
		| merged |
		rest := (fn @env0:dynamicInstVarAt: #args) @env0:asArray @env0:, rest.
		merged := (fn @env0:dynamicInstVarAt: #keywords) @env0:copy.
		kw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
		kw := merged.
		fn := fn @env0:dynamicInstVarAt: #func].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #func put: fn.
	inst @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: rest).
	inst @env0:dynamicInstVarAt: #keywords put: kw.
	^ inst
%

category: 'Grail-Calling'
method: functools_partial
value: morePositional value: moreKw
	"Invoke: fn(*bound, *more, **{**boundKw, **moreKw}) -- later
	keywords override the bound ones (CPython semantics)."

	| fn allArgs bk allKw |
	fn := self @env0:dynamicInstVarAt: #func.
	allArgs := (self @env0:dynamicInstVarAt: #args) @env0:asArray
		@env0:, (morePositional @env0:== nil ifTrue: [#()] ifFalse: [morePositional]).
	bk := self @env0:dynamicInstVarAt: #keywords.
	allKw := (bk @env0:== nil or: [bk @env0:isEmpty])
		ifTrue: [moreKw]
		ifFalse: [
			(moreKw @env0:== nil or: [moreKw @env0:isEmpty])
				ifTrue: [bk]
				ifFalse: [
					| merged |
					merged := bk @env0:copy.
					moreKw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
					merged]].
	"value:value: is the universal call protocol -- BoundMethod, class
	objects (partial(int, base=2)), blocks, and nested partials all
	dispatch through it; ___pyCallValue___ rejects classes."
	^ fn @env1:value: allArgs value: allKw
%

category: 'Grail-String Representation'
method: functools_partial
__repr__
	"functools.partial(<func repr>, args..., k=v...)"

	| stream |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 'functools.partial('.
	stream @env0:nextPutAll:
		((self @env0:dynamicInstVarAt: #func) @env1:__repr__) @env0:asString.
	(self @env0:dynamicInstVarAt: #args) @env0:do: [:a |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: (a @env1:__repr__) @env0:asString].
	(self @env0:dynamicInstVarAt: #keywords) @env0:keysAndValuesDo: [:k :v |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: k @env0:asString.
		stream @env0:nextPutAll: '='.
		stream @env0:nextPutAll: (v @env1:__repr__) @env0:asString].
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_ASSIGNMENTS
	"Tuple of attribute names ``functools.update_wrapper`` copies
	from wrapped to wrapper.  Matches CPython 3.x.  Grail's
	update_wrapper stub doesn't actually copy anything, but the
	constant is exported for callers that read it (jinja2.compiler
	splices it into a decorator's signature)."

	^ tuple @env0:withAll: #('__module__' '__name__' '__qualname__' '__annotations__' '__type_params__' '__doc__')
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_UPDATES
	"Tuple of attribute names ``functools.update_wrapper`` MERGES
	from wrapped into wrapper (default: just ``__dict__``)."

	^ tuple @env0:withAll: #('__dict__')
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: functools
lru_cache: maxsize
	"lru_cache(maxsize) -> decorator.
	The decorator wraps the user function in a LruCacheWrapper that
	is callable (delegates to the wrapped function) and exposes the
	``cache_clear`` / ``cache_info`` attributes Jinja2 + downstream
	consumers expect.  Caching itself is a no-op for now — every
	call re-invokes the wrapped function.  Adequate for Flask
	hello-world; revisit when render perf matters."

	"``@lru_cache`` (bare, no parens) passes the function directly as
	the sole argument — CPython supports both that and
	``@lru_cache(maxsize=N)''.  ``maxsize'' is normally an Integer or
	None; anything else is the bare-decorator function, so wrap it
	immediately.  django.views.debug uses the bare form."
	((maxsize @env0:isKindOf: Integer)
		or: [maxsize @env0:== nil or: [maxsize @env0:== None]]) ifFalse: [
		^ LruCacheWrapper @env1:___wrap___: maxsize].
	^ [:positional2 :keywords2 |
		LruCacheWrapper @env1:___wrap___: (positional2 @env0:at: 1)]
%

category: 'Grail-Built-in Functions'
method: functools
_lru_cache: positional kw: kwargs
	"Varargs entry — ``lru_cache(maxsize=128, typed=False)`` from
	user code.  Ignores the keyword args; returns the same wrapper-
	emitting decorator the fixed-arity form does."

	^ [:positional2 :keywords2 |
		LruCacheWrapper @env1:___wrap___: (positional2 @env0:at: 1)]
%

category: 'Grail-Built-in Functions'
method: functools
cache: aFunction
	"``@cache'' (Python 3.9+) — shorthand for ``@lru_cache(maxsize=None)''
	with unbounded cache.  Grail wraps the function in a LruCacheWrapper
	the same way ``lru_cache(...)'' does — no caching today (every call
	re-invokes), but the wrapper is callable and exposes
	``cache_clear'' / ``cache_info''."

	^ LruCacheWrapper @env1:___wrap___: aFunction
%

category: 'Grail-Built-in Functions'
method: functools
cached_property: aFunction
	"cached_property(fn) — CPython decorator that turns a unary
	method into a lazily-computed, per-instance cached attribute.
	Grail stub: pass the function through as-is.  Callers that
	read `obj.attr` get a BoundMethod they can call; nothing
	gets cached.  Replace with real semantics if we start
	hitting hot-path attribute reads."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
wraps: wrapped
	"wraps(wrapped) → decorator that copies metadata from wrapped
	onto the wrapper.  Stub: identity decorator."

	^ [:positional :keywords | positional @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
_wraps: positional kw: kwargs
	"Varargs form of wraps for the ``assigned=...'' / ``updated=...''
	keyword variants used by jinja2.async_utils and CPython
	decorator chains.  Same identity-decorator stub — the kwargs
	carry attribute-list tuples that the real implementation would
	copy through; Grail's BoundMethod / closure shapes don't honour
	user-stamped ``__name__'' / ``__doc__'' anyway, so dropping them
	matches the behaviour of the 1-arg form."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
update_wrapper: wrapper _: wrapped
	"functools.update_wrapper(wrapper, wrapped[, ...]) — copy
	identifying metadata (``__module__``, ``__name__``, ``__doc__``,
	``__dict__``, ``__wrapped__``) from wrapped onto wrapper.  Used
	by Jinja2's ``optimizeconst`` (and the rest of the decorator
	ecosystem) at module-init time.  Stub: return wrapper
	unchanged.  Grail's BoundMethod / closure shapes don't honor
	user-stamped ``__name__`` anyway, so the copy is a no-op until
	there's a real need."

	^ wrapper
%

category: 'Grail-Built-in Functions'
method: functools
_update_wrapper: positional kw: kwargs
	"Varargs form of update_wrapper for the ``assigned=`` /
	``updated=`` keyword variants — same identity stub."

	^ positional @env0:at: 1
%

category: 'Grail-Built-in Functions'
method: functools
partialmethod: aFunction
	"partialmethod(fn) with nothing bound — the descriptor behaves
	like the function itself."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
_partialmethod: positional kw: kwargs
	"functools.partialmethod(fn, *bound, **boundKw).  CPython returns
	a descriptor that, accessed through an instance, prepends self
	before the bound args.  Grail class attrs holding closures are
	invoked unbound, so the closure takes the receiver explicitly as
	its first call argument: ``inst.m(*more)`` arrives here as
	``(inst, *more)`` and is forwarded as ``fn(inst, *bound, *more)''.
	Django's ORM (_get_FIELD_display, model deferred loading) only
	CONSTRUCTS these at class-definition time on the hello-world
	path."

	| fn boundArgs boundKw |
	(positional @env0:isNil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError @env1:___signal___: 'partialmethod expected at least 1 argument, got 0'
	].
	fn := positional @env0:at: 1.
	boundArgs := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	boundKw := kwargs.
	^ [:morePositional :moreKwargs |
		| callArgs rest allKw |
		callArgs := morePositional @env0:ifNil: [#()].
		callArgs @env0:isEmpty
			ifTrue: [rest := boundArgs]
			ifFalse: [
				"receiver first, then the partialmethod-bound args, then
				the remaining call args."
				rest := (Array @env0:with: (callArgs @env0:at: 1)) @env0:, boundArgs.
				callArgs @env0:size @env0:> 1 ifTrue: [
					rest := rest @env0:, (callArgs @env0:copyFrom: 2 to: callArgs @env0:size)]].
		allKw := (boundKw @env0:isNil or: [boundKw @env0:isEmpty])
			ifTrue: [moreKwargs]
			ifFalse: [
				(moreKwargs @env0:isNil or: [moreKwargs @env0:isEmpty])
					ifTrue: [boundKw]
					ifFalse: [
						| merged |
						merged := boundKw @env0:copy.
						moreKwargs @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
						merged]].
		fn @env1:___pyCallValue___: rest kw: allKw]
%

category: 'Grail-Built-in Functions'
method: functools
total_ordering: cls
	"functools.total_ordering(cls) — upstream synthesises the missing
	rich comparisons from __eq__ + one ordering method.  Grail's
	comparison dispatch already falls back pairwise (__lt__/__gt__
	swap), so pass the class through unchanged."

	^ cls
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable
	"reduce(function, iterable) -> value.
	Apply function of two arguments cumulatively to the items of
	iterable, from left to right."

	| result iter item |
	iter := iterable __iter__.
	result := iter __next__.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable _: initial
	"reduce(function, iterable, initial) -> value.
	Like reduce/2 but uses initial as the starting value."

	| result iter item |
	iter := iterable __iter__.
	result := initial.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Grail-Single Dispatch'
method: functools
singledispatch: aFunc
	"functools.singledispatch(func) -- generic-function decorator.
	Returns a wrapper that dispatches on the TYPE of its first
	positional argument, walking that type's __mro__ (C3-aware for MI
	classes) for the most specific registered implementation and
	falling back to func."

	^ functools_singledispatch ___on: aFunc
%

category: 'Grail-Instance Creation'
classmethod: functools_singledispatch
___on: aFunc
	| inst |
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #default put: aFunc.
	inst @env0:dynamicInstVarAt: #registry put: IdentityKeyValueDictionary @env0:new.
	^ inst
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
value: positional value: keywords
	"Calling the generic function: dispatch on type(args[0])."

	| impl |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'singledispatch function requires at least 1 positional argument'].
	impl := self dispatch: (positional @env0:at: 1) @env0:class.
	^ impl value: positional value: keywords
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
dispatch: cls
	"First registered implementation along cls's __mro__, else the
	default.  Behavior>>__mro__ covers kernel classes (superclass
	chain) and MI user classes (C3 linearization) alike."

	| reg mro key |
	reg := self @env0:dynamicInstVarAt: #registry.
	"g.dispatch(int): bare builtin-type names arrive as BoundMethod
	wrappers here too -- normalize, tolerating non-classes."
	key := (self ___registryKey___: cls) @env0:ifNil: [cls].
	mro := key @env1:__mro__.
	mro @env0:do: [:c |
		(reg @env0:includesKey: c) ifTrue: [^ reg @env0:at: c]].
	"Python-semantics widenings the Smalltalk chain can't see:
	isinstance(x, str) is true for EVERY CharacterCollection (str maps
	to Unicode7 but a plain String's chain never passes it), and int
	subclasses are AbstractPyInt siblings of Integer."
	((key @env0:== CharacterCollection)
		or: [key @env0:inheritsFrom: CharacterCollection]) ifTrue: [
		(reg @env0:includesKey: Unicode7) ifTrue: [^ reg @env0:at: Unicode7]].
	((key @env0:== AbstractPyInt)
		or: [key @env0:inheritsFrom: AbstractPyInt]) ifTrue: [
		(reg @env0:includesKey: Integer) ifTrue: [^ reg @env0:at: Integer]].
	^ self @env0:dynamicInstVarAt: #default
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
___registryKey___: aKey
	"Normalize a registration key to a CLASS.  Bare builtin-type names
	(str, int, ...) reach here as first-class BoundMethods wrapping the
	builtins constructor; map the selector back through the Python
	symbol dictionary to the class it names."

	| sel resolved |
	(aKey @env0:isKindOf: Behavior) ifTrue: [^ aKey].
	(aKey @env0:isKindOf: BoundMethod) ifTrue: [
		sel := aKey @env0:selector.
		resolved := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #Python) @env0:at: sel @env0:asSymbol otherwise: nil.
		(resolved @env0:notNil and: [resolved @env0:isKindOf: Behavior]) ifTrue: [
			^ resolved]].
	^ nil
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
register: clsOrFunc
	"@g.register(cls) decorator form: returns a decorator that
	registers the decorated function for cls and hands it back."

	| key |
	key := self ___registryKey___: clsOrFunc.
	key @env0:isNil ifTrue: [
		TypeError ___signal___: 'Invalid first argument to `register()`: not a class'].
	^ [:positional2 :keywords2 |
		| fn |
		fn := positional2 @env0:at: 1.
		(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: fn.
		fn]
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
register: cls _: aFunc
	"g.register(cls, impl) direct form."

	| key |
	key := self ___registryKey___: cls.
	key @env0:isNil ifTrue: [
		TypeError ___signal___: 'Invalid first argument to `register()`: not a class'].
	(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: aFunc.
	^ aFunc
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
_register: positional kw: kwargs
	positional @env0:size @env0:>= 2 ifTrue: [
		^ self register: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	^ self register: (positional @env0:at: 1)
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
registry
	^ self @env0:dynamicInstVarAt: #registry
%

set compile_env: 0
