! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- LruCacheKey class definition

expectvalue /Class
doit
Object subclass: 'LruCacheKey'
  instVarNames: #( parts pyHash )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LruCacheKey comment:
'The key an LruCacheWrapper stores a result under: the call''s arguments
(plus the keyword and type sections ___cacheKeyFor___:kw: appends), hashed
and compared the way CPython''s lru_cache does it -- with PYTHON semantics.

CPython builds a _HashedSeq: a tuple that computes its hash once, and a dict
probe compares it with tuple ==, which is each element''s __eq__, identity
first and NotImplemented falling back to identity.  The key used to be a
bare Array in a KeyValueDictionary, so a bucket collision compared the
elements with SMALLTALK =.  That is not Python equality and it does not
always answer a Boolean: SmallFraction = complex is a doesNotUnderstand, and
a Python __eq__ that answers NotImplemented became the uncatchable
``Expected NotImplemented to be a Boolean''.  Collisions depend on object
hashes, so test_typing lost a different test on different runs
(LiteralTests.test_illegal_parameters_do_not_raise_runtime_errors about one
run in eight) and a plain lru_cache over a few thousand mixed complex and
float keys failed outright.

= and hash are the only protocol the cache''s KeyValueDictionary and its
recency list use, so defining them here fixes both.'
%

expectvalue /Class
doit
LruCacheKey category: 'Grail-Modules'
%

removeallmethods LruCacheKey
removeallclassmethods LruCacheKey

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: LruCacheKey
parts: anArray
	"The key for anArray's elements.  Each one is asked for its Python hash
	here, once, as CPython's _HashedSeq does; an unhashable element raises
	the TypeError CPython raises (test_lru_type_error).

	A CLASS hashes by identity, as PyDict >> ___pythonHashOf___: explains: its
	own ``__hash__'' describes its INSTANCES, and reading it off the class can
	answer None.  Classes are the type section of every typed key."

	| h |
	h := anArray size.
	anArray do: [:each | | eh |
		eh := (each isKindOf: Behavior)
			ifTrue: [each identityHash]
			ifFalse: [each @env1:__hash__].
		"Masked to 40 bits before the multiply so the product stays a SmallInteger."
		h := (((h bitAnd: 16rFFFFFFFFFF) * 1000003) bitXor: eh) bitAnd: 16r0FFFFFFFFFFFFFFF].
	^ self new _setParts: anArray hash: h
%

category: 'Grail-Private'
method: LruCacheKey
_setParts: anArray hash: anInteger

	parts := anArray.
	pyHash := anInteger
%

category: 'Grail-Private'
method: LruCacheKey
parts

	^ parts
%

category: 'Comparing'
method: LruCacheKey
hash

	^ pyHash
%

category: 'Comparing'
method: LruCacheKey
= other
	"Tuple == over the elements: identity first, then the element's Python
	__eq__ (reflected, NotImplemented falling back to identity), always a
	Boolean.  The hashes are compared first, as CPython compares the stored
	hash before it will call __eq__ at all -- two keys sharing a bucket agree
	only modulo the table size."

	| otherParts |
	self == other ifTrue: [^ true].
	(other isKindOf: LruCacheKey) ifFalse: [^ false].
	pyHash = other hash ifFalse: [^ false].
	otherParts := other parts.
	parts size = otherParts size ifFalse: [^ false].
	1 to: parts size do: [:i | | a b |
		a := parts at: i.
		b := otherParts at: i.
		(a == b or: [a @env1:___pyRichEqBool___: b]) ifFalse: [^ false]].
	^ true
%

! ------- LruCacheState: one session's cache for one wrapper
expectvalue /Class
doit
Object subclass: 'LruCacheState'
  instVarNames: #( results recency hits misses )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LruCacheState comment:
'What one lru_cache wrapper has remembered IN THIS SESSION: the results by
key, the keys from least to most recently used, and the hit / miss counts.

It lives in SessionTemps, keyed by the wrapper (LruCacheWrapper >>
___sessionState___), never in the wrapper itself.  CPython''s lru_cache is
process memory; a wrapper made at module level in a DEPLOYED module is a
committed object, and holding the cache in it made every hit a write to a
shared object (two gems serving one app conflicted over typing''s _tp_cache)
and every miss a way for the caller''s arguments and results to reach the
repository with the next commit (#1229).'
%

expectvalue /Class
doit
LruCacheState category: 'Grail-Modules'
%

removeallmethods LruCacheState
removeallclassmethods LruCacheState

set compile_env: 0

category: 'Instance Creation'
classmethod: LruCacheState
empty

	^ self new initializeEmpty
%

category: 'Initialization'
method: LruCacheState
initializeEmpty

	results := KeyValueDictionary new.
	recency := OrderedCollection new.
	hits := 0.
	misses := 0
%

category: 'Accessing'
method: LruCacheState
hits

	^ hits
%

category: 'Accessing'
method: LruCacheState
misses

	^ misses
%

category: 'Accessing'
method: LruCacheState
size

	^ results size
%

category: 'Accessing'
method: LruCacheState
resultAt: aKey ifAbsent: aBlock

	^ results at: aKey ifAbsent: aBlock
%

category: 'Recording'
method: LruCacheState
recordHitFor: aKey

	hits := hits + 1.
	recency remove: aKey ifAbsent: [].
	recency add: aKey
%

category: 'Recording'
method: LruCacheState
recordMiss

	misses := misses + 1
%

category: 'Recording'
method: LruCacheState
at: aKey put: aResult keepingAtMost: aMaxsize
	"The wrapped call may have re-entered and cached this very key -- a
	recursive memoized function does exactly that -- so the key joins the
	recency list only when it is genuinely new.  aMaxsize None is unbounded."

	(results includesKey: aKey) ifFalse: [recency add: aKey].
	results at: aKey put: aResult.
	aMaxsize == None ifTrue: [^ self].
	[results size > aMaxsize] whileTrue: [
		results removeKey: recency removeFirst ifAbsent: []]
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
	"Hashed and compared with PYTHON semantics (LruCacheKey's comment says
	why a bare Array was not).  Building it asks every element for its Python
	hash, so an unhashable argument raises the TypeError CPython raises --
	lru_cache hashes the key it builds, so ``cached([])'' fails there
	(issue #28653, test_lru_type_error)."
	^ LruCacheKey @env0:parts: key
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
	"``functools.lru_cache``: forget this session's results and counts --
	CPython's cache_clear clears the calling process's cache, and this is that
	process."

	self @env0:___forgetSessionState___.
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

	| state |
	state := self @env0:___sessionState___.
	^ functools_CacheInfo
		hits: state @env0:hits
		misses: state @env0:misses
		maxsize: (maxsize == nil ifTrue: [None] ifFalse: [maxsize])
		currsize: state @env0:size
%

category: 'Grail-Attributes'
method: LruCacheWrapper
__wrapped__
	"CPython exposes the wrapped function via ``__wrapped__``."

	^ wrapped
%

category: 'Grail-Attributes'
method: LruCacheWrapper
__dict__
	"``cached_fn.__dict__'' — a LIVE view of the dynamic-instVar store,
	the same shape PythonInstance uses.

	Needed because ``lru_cache'' now runs its wrapper through
	``functools.update_wrapper'', whose merge phase does
	``getattr(wrapper, '__dict__').update(...)''.  Liveness matters for the
	same reason it does on ExecBlock: a snapshot would absorb the merge and
	leave the wrapper's own attributes untouched."

	^ PyInstanceDict @env0:on: self
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
	wrapped value were indistinguishable by type alone.

	``__dict__'' is here for the same reason and was found the same way:
	lru_cache now runs its wrapper through functools.update_wrapper, whose
	merge phase does ``getattr(wrapper, '__dict__').update(...)''.  Without
	the entry that read answered a BoundMethod around the accessor, so the
	update landed on the WRAPPER handle -- ``AttributeError: BoundMethod
	object has no attribute 'update'''."

	^ IdentitySet new
		add: #'__wrapped__';
		add: #'__dict__';
		yourself
%

set compile_env: 1

category: 'Grail-Attribute Access'
method: LruCacheWrapper
___pyBindsSelf___
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
%

set compile_env: 0

set compile_env: 1

category: 'Grail-Copy'
method: LruCacheWrapper
__copy__
	"An lru_cache wrapper stands in for what CPython makes a plain FUNCTION,
	and copy treats functions as atoms -- ``copy.copy(f) is f''.  Grail's
	wrapper is an ordinary instance, so without this it would be reconstructed
	attribute-by-attribute into a second wrapper that is not the original and
	carries a shared cache (test_functools TestLRU test_copy/test_deepcopy).
	CPython declares the same atomicity for its own function objects."

	^ self
%

category: 'Grail-Copy'
method: LruCacheWrapper
__deepcopy__: memo
	"See __copy__: function-like, so a deep copy is the wrapper itself."

	^ self
%

set compile_env: 0

category: 'Grail-Private'
method: LruCacheWrapper
___sessionState___
	"This wrapper's cache in THIS session, made empty on first use.

	Held in SessionTemps, keyed by the wrapper, and never in the wrapper's own
	slots, as #1176 did for decimal's context and GrailSrePatternPointers for
	compiled patterns.  A module-level @lru_cache in a DEPLOYED module is a
	committed object, so a cache kept in it made every hit a write to a shared
	object -- two gems serving one Flask app conflicted Write-Write over
	typing's _tp_cache -- and every miss left the caller's arguments and
	results hanging off a committed object for the next commit to store (#1229).

	The cache / order / hits / misses slots are still DECLARED, so the class
	keeps its shape and the wrappers already committed in deployed modules stay
	instances of it; nothing reads or writes them any more."

	^ (SessionTemps current at: #'GrailLruCacheStates'
		ifAbsentPut: [IdentityKeyValueDictionary new])
			at: self
			ifAbsentPut: [LruCacheState empty]
%

category: 'Grail-Private'
method: LruCacheWrapper
___forgetSessionState___

	(SessionTemps current at: #'GrailLruCacheStates' otherwise: nil)
		ifNotNil: [:states | states removeKey: self ifAbsent: []]
%

set compile_env: 0
