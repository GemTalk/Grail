! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- LruCacheWrapper class definition
expectvalue /Class
doit
Object subclass: 'LruCacheWrapper'
  instVarNames: #( wrapped cache hits misses maxsize typed order )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LruCacheWrapper comment:
'Wrapper returned by ``functools.lru_cache``.  Results intern in a
dictionary keyed by the positional args plus the keyword pairs, with
a companion recency list so the cache is a real bounded LRU.

maxsize is ENFORCED: on inserting past the bound the least-recently
used entry is evicted, and a hit moves its key to the most-recent
end.  It used to be unbounded ("eviction is a perf refinement"),
which is observably wrong rather than merely slower -- currsize kept
growing past maxsize, and the hit/miss split differed from CPython
because entries that should have been evicted still answered
(test_lru: 25 distinct keys into a maxsize=20 cache).

typed is HONORED: with typed=True the argument types join the key, so
square(3) and square(3.0) are separate entries.  Without it they
collide -- Smalltalk 1 = 1.0 -- and the cached int result came back
for the float call (test_lru_with_types).

Keyword pairs enter the key in CALL order, NOT sorted: PEP 468 makes
f(a=1, b=2) and f(b=2, a=1) distinct cache entries, and sorting
merged them so the second call wrongly hit and returned the first
call''s answer (test_kwargs_order).'
%

expectvalue /Class
doit
LruCacheWrapper category: 'Grail-Modules'
%

removeallmethods LruCacheWrapper
removeallclassmethods LruCacheWrapper

set compile_env: 0

category: 'Grail-Private'
method: LruCacheWrapper
_setWrapped: aFunction maxsize: aMaxsize

	^ self _setWrapped: aFunction maxsize: aMaxsize typed: false
%

category: 'Grail-Private'
method: LruCacheWrapper
_setWrapped: aFunction maxsize: aMaxsize typed: aTyped

	wrapped := aFunction.
	"Normalize maxsize like CPython: None -> unbounded; a non-negative
	integer -> that bound, now ENFORCED by eviction in value:value:; a
	NEGATIVE integer -> 0, which disables caching entirely so every call
	is a miss.  cache_info reports the normalized value."
	maxsize := (aMaxsize == nil or: [aMaxsize == None])
		ifTrue: [None]
		ifFalse: [(aMaxsize isKindOf: Integer)
			ifTrue: [aMaxsize < 0 ifTrue: [0] ifFalse: [aMaxsize]]
			ifFalse: [None]].
	"Python True maps to Smalltalk true, so identity against true is the
	whole test; nil (the back-compat entry) and None both mean false."
	typed := aTyped == true
%

set compile_env: 1

! ------- Class-side construction (env-1 entry from functools)

category: 'Grail-Instance Creation'
classmethod: LruCacheWrapper
___wrap___: aFunction
	"Back-compat entry: wrap with an unbounded cache (maxsize None)."

	^ self ___wrap___: aFunction maxsize: None
%

category: 'Grail-Instance Creation'
classmethod: LruCacheWrapper
___wrap___: aFunction maxsize: aMaxsize
	"Build a wrapper around aFunction with the requested maxsize.
	``functools.lru_cache`` uses this as the decoration step."

	^ self ___wrap___: aFunction maxsize: aMaxsize typed: false
%

category: 'Grail-Instance Creation'
classmethod: LruCacheWrapper
___wrap___: aFunction maxsize: aMaxsize typed: aTyped
	"Decoration step honoring both lru_cache parameters."

	| inst |
	inst := self @env0:new.
	inst @env0:_setWrapped: aFunction maxsize: aMaxsize typed: aTyped.
	^ inst
%

! ------- Instance-side dispatch (env-1)

category: 'Grail-Calling'
method: LruCacheWrapper
value: positional value: kwargs
	"Memoizing call: intern the result keyed by positional args +
	sorted keyword pairs.  Python values never surface as Smalltalk
	nil (None is a singleton), so nil-as-absent is a safe cache miss
	marker."

	| key result |
	"maxsize 0 disables caching entirely -- every call misses and
	nothing is retained (test_lru_cache_size_zero / negative maxsize)."
	maxsize == 0 ifTrue: [
		misses := (misses == nil ifTrue: [0] ifFalse: [misses]) @env0:+ 1.
		^ wrapped value: positional value: kwargs].
	key := self ___cacheKeyFor___: positional kw: kwargs.
	cache == nil ifTrue: [
		cache := KeyValueDictionary @env0:new.
		order := OrderedCollection @env0:new].
	result := cache @env0:at: key ifAbsent: [nil].
	result == nil ifFalse: [
		hits := (hits == nil ifTrue: [0] ifFalse: [hits]) @env0:+ 1.
		"Touch: this key is now the most recently used."
		order @env0:remove: key ifAbsent: [].
		order @env0:add: key.
		^ result].
	result := wrapped value: positional value: kwargs.
	misses := (misses == nil ifTrue: [0] ifFalse: [misses]) @env0:+ 1.
	"The wrapped call may have re-entered and cached this very key (a
	recursive memoized function does exactly that), so only extend the
	recency list when the key is genuinely new."
	(cache @env0:includesKey: key) ifFalse: [order @env0:add: key].
	cache @env0:at: key put: result.
	"Evict least-recently-used past the bound.  A while loop, not a single
	removal: maxsize can shrink relative to an existing cache only via
	re-decoration, but a loop is correct either way."
	maxsize == None ifFalse: [
		[cache @env0:size @env0:> maxsize] @env0:whileTrue: [
			| oldest |
			oldest := order @env0:removeFirst.
			cache @env0:removeKey: oldest ifAbsent: []]].
	^ result
%

category: 'Grail-Private'
method: LruCacheWrapper
___cacheKeyFor___: positional kw: kwargs
	"Build the cache key: positional args, then the keyword pairs in CALL
	order, then -- when typed -- the argument types.

	Keyword order is PRESERVED, not sorted.  PEP 468 keeps **kwargs in call
	order, so f(a=1, b=2) and f(b=2, a=1) are DIFFERENT cache entries in
	CPython; sorting made them one key, so the second call hit and returned
	the first call's answer (test_kwargs_order).  A marker separates the
	positional section from the keyword section so f(1) and f(x=1) cannot
	collide.

	With typed=True the types join the key, because the raw values do not
	distinguish them: Smalltalk 1 = 1.0 and both hash alike, so square(3)
	and square(3.0) shared an entry and the float call got the int result
	(test_lru_with_types, test_lru_cache_typed_is_not_recursive)."

	| key pairs |
	key := (positional == nil ifTrue: [#()] ifFalse: [positional]) @env0:asArray.
	(kwargs ~~ nil and: [kwargs @env0:isEmpty @env0:not]) ifTrue: [
		pairs := OrderedCollection @env0:new.
		pairs @env0:add: #'___kwMark___'.
		kwargs @env0:keysAndValuesDo: [:k :v |
			pairs @env0:add: k.
			pairs @env0:add: v].
		key := key @env0:, pairs @env0:asArray].
	typed == true ifTrue: [
		| types |
		types := OrderedCollection @env0:new.
		types @env0:add: #'___typeMark___'.
		(positional == nil ifTrue: [#()] ifFalse: [positional]) @env0:do: [:a |
			types @env0:add: a @env0:class].
		(kwargs ~~ nil and: [kwargs @env0:isEmpty @env0:not]) ifTrue: [
			kwargs @env0:keysAndValuesDo: [:k :v | types @env0:add: v @env0:class]].
		key := key @env0:, types @env0:asArray].
	^ key
%

category: 'Grail-Calling'
method: LruCacheWrapper
___call___: positional kw: kwargs
	"Same dispatch via the Python varargs convention — Grail's
	CallAst fast path tries ``___call___:kw:`` when the receiver
	doesn't match a simpler shape."

	^ self value: positional value: kwargs
%

category: 'Grail-Calling'
method: LruCacheWrapper
___pyCallValue___: positional kw: kwargs
	"Indirect call protocol — ``f = lru_cached_fn; f(x)`` and any
	call site that reaches the object through a variable dispatches
	here (object>>___pyCallValue___ otherwise raises ``not
	callable'').  django.utils.inspect._get_func_parameters is
	@lru_cache-decorated and invoked indirectly through
	_get_callable_parameters."

	^ self value: positional value: kwargs
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_clear
	"``functools.lru_cache``: drop every interned result."

	cache := nil.
	order := nil.
	hits := nil.
	misses := nil.
	^ None
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_parameters
	"``functools.lru_cache``: the decoration parameters as a dict, added in
	CPython 3.9 so a cached function can be re-decorated identically
	(test_lru_cache_parameters).  maxsize is the NORMALIZED value, matching
	what cache_info reports."

	| d |
	d := dict ___new___.
	d @env0:at: 'maxsize' put: (maxsize == nil ifTrue: [None] ifFalse: [maxsize]).
	d @env0:at: 'typed' put: (typed == true).
	^ d
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_info
	"``functools.lru_cache``: return the ``_CacheInfo`` named 4-tuple
	(hits, misses, maxsize, currsize).  maxsize is the normalized
	requested bound (None = unbounded); currsize is the live entry
	count."

	^ functools_CacheInfo
		hits: (hits == nil ifTrue: [0] ifFalse: [hits])
		misses: (misses == nil ifTrue: [0] ifFalse: [misses])
		maxsize: (maxsize == nil ifTrue: [None] ifFalse: [maxsize])
		currsize: (cache == nil ifTrue: [0] ifFalse: [cache @env0:size])
%

category: 'Grail-Attributes'
method: LruCacheWrapper
__wrapped__
	"CPython exposes the wrapped function via ``__wrapped__``."

	^ wrapped
%

set compile_env: 0

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >>
! ___pyAttrLoad___ consults it through an env-0 ``respondsTo:'', so an
! env-1 definition is invisible to the probe and the hook silently does
! nothing (the same trap Bytes.gs documents).

category: 'Grail-Python Attribute Hook'
classmethod: LruCacheWrapper
___pythonValueAttrs___
	"``__wrapped__'' is a VALUE attribute -- the wrapped function itself --
	not a callable to be wrapped.

	Without this, reading ``f.__wrapped__'' from Python answered a
	BoundMethod around the ACCESSOR rather than invoking it, so
	``f.__wrapped__ is orig'' was false and ``f.__wrapped__(x, y)'' called
	the accessor instead of bypassing the cache (test_lru).

	This looked like a function-identity bug and is not one: the stored
	instVar, the Smalltalk accessor result and the module attribute are all
	the SAME oop.  It was purely the attribute-load wrapping, and it hid
	behind the type name -- type(f.__wrapped__) reported 'BoundMethod',
	which is also what a module-level function is, so the wrapper and the
	wrapped value were indistinguishable by type alone."

	^ IdentitySet new
		add: #'__wrapped__';
		yourself
%
