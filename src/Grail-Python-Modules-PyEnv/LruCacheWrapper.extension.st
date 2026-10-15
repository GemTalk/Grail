Extension { #name : 'LruCacheWrapper' }

{ #category : 'Grail-Instance Creation' }
LruCacheWrapper class >> ___wrap___: aFunction [
	"Back-compat entry: wrap with an unbounded cache (maxsize None)."

	^ self ___wrap___: aFunction maxsize: None

]

{ #category : 'Grail-Instance Creation' }
LruCacheWrapper class >> ___wrap___: aFunction maxsize: aMaxsize [
	"Build a wrapper around aFunction with the requested maxsize.
	``functools.lru_cache`` uses this as the decoration step."

	^ self ___wrap___: aFunction maxsize: aMaxsize typed: false

]

{ #category : 'Grail-Instance Creation' }
LruCacheWrapper class >> ___wrap___: aFunction maxsize: aMaxsize typed: aTyped [
	"Decoration step honoring both lru_cache parameters."

	| inst |
	inst := self @env0:new.
	inst @env0:_setWrapped: aFunction maxsize: aMaxsize typed: aTyped.
	^ inst

]

{ #category : 'Grail-Class Attrs' }
LruCacheWrapper class >> __module__ [
	"``type(functools.cache(f)).__module__'', 'functools' as in CPython (whose
	type is functools._lru_cache_wrapper).  Missing, the read raised
	AttributeError, and pydantic -- which asks it of every class-body value
	to recognise ignored types -- failed on a model with an ``@cache'' method."

	^ 'functools'

]

{ #category : 'Grail-Private' }
LruCacheWrapper >> ___cacheKeyFor___: positional kw: kwargs [
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
	"Hashed and compared with PYTHON semantics (LruCacheKey's comment says
	why a bare Array was not).  Building it asks every element for its Python
	hash, so an unhashable argument raises the TypeError CPython raises --
	lru_cache hashes the key it builds, so ``cached([])'' fails there
	(issue #28653, test_lru_type_error)."
	^ LruCacheKey @env0:parts: key

]

{ #category : 'Grail-Calling' }
LruCacheWrapper >> ___call___: positional kw: kwargs [
	"Same dispatch via the Python varargs convention — Grail's
	CallAst fast path tries ``___call___:kw:`` when the receiver
	doesn't match a simpler shape."

	^ self value: positional value: kwargs

]

{ #category : 'Grail-Attribute Access' }
LruCacheWrapper >> ___pyBindsSelf___ [
	"Marker read by object >> ___isDescriptorCallable___:.  An lru_cache-wrapped
	METHOD is a class attribute, and reading it off an instance has to bind that
	instance -- CPython gets there because the wrapper is a plain function and so
	a descriptor.

	Without this, ``a.f(1)'' called the wrapper with just (1): the first argument
	became the receiver, so the wrapped UnboundMethod was invoked with 1 as self
	and raised ``descriptor 'f' for 'Plain' objects does not apply to a 'int'
	object'' -- an error naming int for a class that has nothing to do with
	integers.  ``Plain.f(a, 1)'' worked all along, which is what made it look
	like an int-subclass problem rather than a missing binding.

	Safe for the non-method uses.  A module-level ``@lru_cache def f()'' is not
	a class attribute, so nothing consults this.  An lru-wrapped @staticmethod is
	wrapped AGAIN by the staticmethod descriptor (decorators apply innermost
	first), and that outer wrapper decides the binding, so a static one still
	receives no receiver."

	^ true

]

{ #category : 'Grail-Calling' }
LruCacheWrapper >> ___pyCallValue___: positional kw: kwargs [
	"Indirect call protocol — ``f = lru_cached_fn; f(x)`` and any
	call site that reaches the object through a variable dispatches
	here (object>>___pyCallValue___ otherwise raises ``not
	callable'').  django.utils.inspect._get_func_parameters is
	@lru_cache-decorated and invoked indirectly through
	_get_callable_parameters."

	^ self value: positional value: kwargs

]

{ #category : 'Grail-Copy' }
LruCacheWrapper >> __copy__ [
	"An lru_cache wrapper stands in for what CPython makes a plain FUNCTION,
	and copy treats functions as atoms -- ``copy.copy(f) is f''.  Grail's
	wrapper is an ordinary instance, so without this it would be reconstructed
	attribute-by-attribute into a second wrapper that is not the original and
	carries a shared cache (test_functools TestLRU test_copy/test_deepcopy).
	CPython declares the same atomicity for its own function objects."

	^ self

]

{ #category : 'Grail-Copy' }
LruCacheWrapper >> __deepcopy__: memo [
	"See __copy__: function-like, so a deep copy is the wrapper itself."

	^ self

]

{ #category : 'Grail-Attributes' }
LruCacheWrapper >> __dict__ [
	"``cached_fn.__dict__'' — a LIVE view of the dynamic-instVar store,
	the same shape PythonInstance uses.

	Needed because ``lru_cache'' now runs its wrapper through
	``functools.update_wrapper'', whose merge phase does
	``getattr(wrapper, '__dict__').update(...)''.  Liveness matters for the
	same reason it does on ExecBlock: a snapshot would absorb the merge and
	leave the wrapper's own attributes untouched."

	^ PyInstanceDict @env0:on: self

]

{ #category : 'Grail-Attributes' }
LruCacheWrapper >> __wrapped__ [
	"CPython exposes the wrapped function via ``__wrapped__``."

	^ wrapped

]

{ #category : 'Grail-Attributes' }
LruCacheWrapper >> cache_clear [
	"``functools.lru_cache``: forget this session's results and counts --
	CPython's cache_clear clears the calling process's cache, and this is that
	process."

	self @env0:___forgetSessionState___.
	^ None

]

{ #category : 'Grail-Attributes' }
LruCacheWrapper >> cache_info [
	"``functools.lru_cache``: return the ``_CacheInfo`` named 4-tuple
	(hits, misses, maxsize, currsize).  maxsize is the normalized
	requested bound (None = unbounded); currsize is the live entry
	count."

	| state |
	state := self @env0:___sessionState___.
	^ functools_CacheInfo
		hits: state @env0:hits
		misses: state @env0:misses
		maxsize: (maxsize == nil ifTrue: [None] ifFalse: [maxsize])
		currsize: state @env0:size

]

{ #category : 'Grail-Attributes' }
LruCacheWrapper >> cache_parameters [
	"``functools.lru_cache``: the decoration parameters as a dict, added in
	CPython 3.9 so a cached function can be re-decorated identically
	(test_lru_cache_parameters).  maxsize is the NORMALIZED value, matching
	what cache_info reports."

	| d |
	d := dict ___new___.
	d @env0:at: 'maxsize' put: (maxsize == nil ifTrue: [None] ifFalse: [maxsize]).
	d @env0:at: 'typed' put: (typed == true).
	^ d

]

{ #category : 'Grail-Calling' }
LruCacheWrapper >> value: positional value: kwargs [
	"Memoizing call.  Python values never surface as Smalltalk nil (None is a
	singleton), so nil-as-absent is a safe miss marker.  The cache is THIS
	SESSION'S -- see ___sessionState___."

	| state key result |
	state := self @env0:___sessionState___.
	"maxsize 0 disables caching entirely -- every call misses and nothing is
	retained (test_lru_cache_size_zero / negative maxsize)."
	maxsize == 0 ifTrue: [
		state @env0:recordMiss.
		^ wrapped value: positional value: kwargs].
	key := self ___cacheKeyFor___: positional kw: kwargs.
	result := state @env0:resultAt: key ifAbsent: [nil].
	result == nil ifFalse: [
		state @env0:recordHitFor: key.
		^ result].
	result := wrapped value: positional value: kwargs.
	state @env0:recordMiss.
	state @env0:at: key put: result keepingAtMost: maxsize.
	^ result

]
