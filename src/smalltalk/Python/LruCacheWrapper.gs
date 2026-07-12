! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- LruCacheWrapper class definition
expectvalue /Class
doit
Object subclass: 'LruCacheWrapper'
  instVarNames: #( wrapped cache hits misses maxsize )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LruCacheWrapper comment:
'Wrapper returned by ``functools.lru_cache``.  REAL memoization:
results intern in a dictionary keyed by the positional args plus
sorted keyword pairs.  The cache is UNBOUNDED (maxsize / typed are
accepted and ignored) -- eviction is a perf refinement, but the
memoization itself is semantic: CPython test_functools''s
test_lru_recursion is exponential without it.'
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

	wrapped := aFunction.
	"Normalize maxsize like CPython: None -> unbounded; a non-negative
	integer -> that bound (not enforced -- the cache is effectively
	unbounded, an acceptable perf-only deviation); a NEGATIVE integer
	-> 0, which DOES change behavior (0 disables caching entirely, so
	every call is a miss).  cache_info reports the normalized value."
	maxsize := (aMaxsize @env0:== nil or: [aMaxsize @env0:== None])
		ifTrue: [None]
		ifFalse: [(aMaxsize @env0:isKindOf: Integer)
			ifTrue: [aMaxsize @env0:< 0 ifTrue: [0] ifFalse: [aMaxsize]]
			ifFalse: [None]]
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

	| inst |
	inst := self @env0:new.
	inst @env0:_setWrapped: aFunction maxsize: aMaxsize.
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
	maxsize @env0:== 0 ifTrue: [
		misses := (misses @env0:== nil ifTrue: [0] ifFalse: [misses]) @env0:+ 1.
		^ wrapped @env1:value: positional value: kwargs].
	key := (positional @env0:== nil ifTrue: [#()] ifFalse: [positional]) @env0:asArray.
	(kwargs @env0:~~ nil and: [kwargs @env0:isEmpty @env0:not]) ifTrue: [
		| pairs sortedKeys |
		pairs := OrderedCollection @env0:new.
		sortedKeys := kwargs @env0:keys @env0:asSortedCollection.
		sortedKeys @env0:do: [:k |
			pairs @env0:add: k.
			pairs @env0:add: (kwargs @env0:at: k)].
		key := key @env0:, pairs @env0:asArray].
	cache @env0:== nil ifTrue: [cache := KeyValueDictionary @env0:new].
	result := cache @env0:at: key ifAbsent: [nil].
	result @env0:== nil ifFalse: [
		hits := (hits @env0:== nil ifTrue: [0] ifFalse: [hits]) @env0:+ 1.
		^ result].
	result := wrapped @env1:value: positional value: kwargs.
	misses := (misses @env0:== nil ifTrue: [0] ifFalse: [misses]) @env0:+ 1.
	cache @env0:at: key put: result.
	^ result
%

category: 'Grail-Calling'
method: LruCacheWrapper
___call___: positional kw: kwargs
	"Same dispatch via the Python varargs convention — Grail's
	CallAst fast path tries ``___call___:kw:`` when the receiver
	doesn't match a simpler shape."

	^ self @env1:value: positional value: kwargs
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

	^ self @env1:value: positional value: kwargs
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_clear
	"``functools.lru_cache``: drop every interned result."

	cache := nil.
	hits := nil.
	misses := nil.
	^ None
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_info
	"``functools.lru_cache``: return the ``_CacheInfo`` named 4-tuple
	(hits, misses, maxsize, currsize).  maxsize is the normalized
	requested bound (None = unbounded); currsize is the live entry
	count."

	^ functools_CacheInfo
		hits: (hits @env0:== nil ifTrue: [0] ifFalse: [hits])
		misses: (misses @env0:== nil ifTrue: [0] ifFalse: [misses])
		maxsize: (maxsize @env0:== nil ifTrue: [None] ifFalse: [maxsize])
		currsize: (cache @env0:== nil ifTrue: [0] ifFalse: [cache @env0:size])
%

category: 'Grail-Attributes'
method: LruCacheWrapper
__wrapped__
	"CPython exposes the wrapped function via ``__wrapped__``."

	^ wrapped
%

set compile_env: 0
