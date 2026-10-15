"Wrapper returned by ``functools.lru_cache``.  Results intern in a
dictionary keyed by the positional args plus the keyword pairs, with
a companion recency list so the cache is a real bounded LRU.

maxsize is ENFORCED: on inserting past the bound the least-recently
used entry is evicted, and a hit moves its key to the most-recent
end.  It used to be unbounded (""eviction is a perf refinement""),
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
call's answer (test_kwargs_order)."
Class {
	#name : 'LruCacheWrapper',
	#superclass : 'Object',
	#instVars : [
		'wrapped',
		'cache',
		'hits',
		'misses',
		'maxsize',
		'typed',
		'order'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
LruCacheWrapper class >> ___pythonValueAttrs___ [
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

]

{ #category : 'Grail-Private' }
LruCacheWrapper >> ___forgetSessionState___ [

	(SessionTemps current at: #'GrailLruCacheStates' otherwise: nil)
		ifNotNil: [:states | states removeKey: self ifAbsent: []]

]

{ #category : 'Grail-Private' }
LruCacheWrapper >> ___sessionState___ [
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

]

{ #category : 'Grail-Private' }
LruCacheWrapper >> _setWrapped: aFunction maxsize: aMaxsize [

	^ self _setWrapped: aFunction maxsize: aMaxsize typed: false

]

{ #category : 'Grail-Private' }
LruCacheWrapper >> _setWrapped: aFunction maxsize: aMaxsize typed: aTyped [

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

]
