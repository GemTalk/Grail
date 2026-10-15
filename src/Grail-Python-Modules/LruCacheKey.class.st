"The key an LruCacheWrapper stores a result under: the call's arguments
(plus the keyword and type sections ___cacheKeyFor___:kw: appends), hashed
and compared the way CPython's lru_cache does it -- with PYTHON semantics.

CPython builds a _HashedSeq: a tuple that computes its hash once, and a dict
probe compares it with tuple ==, which is each element's __eq__, identity
first and NotImplemented falling back to identity.  The key used to be a
bare Array in a KeyValueDictionary, so a bucket collision compared the
elements with SMALLTALK =.  That is not Python equality and it does not
always answer a Boolean: SmallFraction = complex is a doesNotUnderstand, and
a Python __eq__ that answers NotImplemented became the uncatchable
``Expected NotImplemented to be a Boolean'.  Collisions depend on object
hashes, so test_typing lost a different test on different runs
(LiteralTests.test_illegal_parameters_do_not_raise_runtime_errors about one
run in eight) and a plain lru_cache over a few thousand mixed complex and
float keys failed outright.

= and hash are the only protocol the cache's KeyValueDictionary and its
recency list use, so defining them here fixes both."
Class {
	#name : 'LruCacheKey',
	#superclass : 'Object',
	#instVars : [
		'parts',
		'pyHash'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
LruCacheKey class >> parts: anArray [
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

]

{ #category : 'Grail-Private' }
LruCacheKey >> _setParts: anArray hash: anInteger [

	parts := anArray.
	pyHash := anInteger

]

{ #category : 'Comparing' }
LruCacheKey >> = other [
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

]

{ #category : 'Comparing' }
LruCacheKey >> hash [

	^ pyHash

]

{ #category : 'Grail-Private' }
LruCacheKey >> parts [

	^ parts

]
