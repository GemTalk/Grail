Extension { #name : 'mappingproxy' }

{ #category : 'Grail-Initialization' }
mappingproxy class >> ___on: aMapping [
	"Wrap aMapping (the LIVE backing dict) — a mutation to it is visible
	through this proxy, matching CPython's read-only view semantics."

	| v |
	v := self ___new___.
	v ___setMapping: aMapping.
	^ v

]

{ #category : 'Grail-Initialization' }
mappingproxy class >> __new__: aMapping [
	"``types.MappingProxyType(d)'' -- the PUBLIC constructor, as distinct from
	___on: beside it, which is the internal one Grail's own __dict__ accessors
	use.  Both wrap the live mapping; only this one validates, because only
	this one can be handed anything.

	Reached because types.py now names this class (``MappingProxyType =
	type(type.__dict__)'', CPython's own spelling) instead of stubbing the
	constructor to answer its argument.  Without a __new__: here that call
	fell through the generic instantiation path and died with ``a PyDict does
	not understand #'new''', an uncatchable Smalltalk error."

	"CPython's mappingproxy_check_mapping (Objects/descrobject.c): anything
	PyMapping_Check admits -- anything with a __getitem__ -- but a list or a
	tuple.  A ChainMap, a UserDict, a user Mapping qualify; only dicts did."
	((aMapping @env0:isKindOf: AbstractDictionary)
		@env0:or: [(aMapping @env0:isKindOf: KeyValueDictionary)
		@env0:or: [((aMapping @env0:isKindOf: list) @env0:or: [aMapping @env0:isKindOf: tuple]) @env0:not
			@env0:and: [(aMapping ___matchDefinesOwnSelector___: #'__getitem__:')
			@env0:and: [aMapping ___grailDirListsSelector___: #'__getitem__:' in: aMapping @env0:class]]]]) ifFalse: [
		^ TypeError ___signal___: 'mappingproxy() argument must be a mapping, not '
			@env0:, (aMapping ___pyTypeNameForError___) @env0:asString].
	^ self ___on: aMapping

]

{ #category : 'Grail-Initialization' }
mappingproxy class >> _new: positional kw: keywords [
	"``mappingproxy(mapping=d)'' -- its one parameter is nameable in CPython
	(Objects/descrobject.c mappingproxy_new), and a keyword call used to reach
	the generic refusal, which said it took no keyword at all."

	| arguments |
	arguments := TypeError @env0:___argumentsOf___: positional keywords: keywords
		named: #('mapping') positionalOnly: 0 required: 1 for: 'mappingproxy'.
	^ self __new__: (arguments @env0:at: 1)

]

{ #category : 'Grail-Private' }
mappingproxy >> ___setMapping: aMapping [
	mapping := aMapping

]

{ #category : 'Grail-Introspection' }
mappingproxy >> __class_getitem__: item [
	"``types.MappingProxyType[int]'' -- a types.GenericAlias, as for set (see
	set >> __class_getitem__:)."

	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> __contains__: key [
	"The mapping's own ``in'' (mappingproxy_contains): a dict subclass's
	__contains__ override answers, as it does in CPython."

	^ mapping __contains__: key

]

{ #category : 'Grail-Mutation' }
mappingproxy >> __delitem__: key [
	<grailProtocolRefusal>
	"CPython's mappingproxy has no item deletion at all; this only raises its
	TypeError, and is no attribute of the type."

	^ TypeError ___signal___: '''mappingproxy'' object does not support item deletion'

]

{ #category : 'Grail-Comparison' }
mappingproxy >> __eq__: other [
	| o |
	o := (other @env0:isKindOf: mappingproxy) ifTrue: [other @env1:mapping] ifFalse: [other].
	^ mapping @env1:__eq__: o

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> __getitem__: key [
	^ mapping @env1:__getitem__: key

]

{ #category : 'Grail-Hashing' }
mappingproxy >> __hash__ [
	"CPython DELEGATES a proxy's hash to the mapping it wraps -- mappingproxy
	does not set __hash__ = None, it forwards.  The observable tell is the
	error message: ``hash(types.MappingProxyType({}))'' raises

	    TypeError: unhashable type: 'dict'

	naming the WRAPPED type, not 'mappingproxy'.  So a proxy over a dict is
	unhashable because dicts are, and a proxy over a hashable mapping would
	hash.  Forwarding reproduces both, and the message, for free.

	Needed because __eq__ above is defined without a matching __hash__, so the
	proxy inherited object's IDENTITY hash: it was silently hashable, and two
	proxies over equal dicts compared equal while hashing differently."

	^ mapping __hash__

]

{ #category : 'Grail-Merge Operators' }
mappingproxy >> __ior__: other [
	"CPython's mappingproxy_ior: a read-only view cannot be updated in place."

	^ TypeError ___signal___: '''|='' is not supported by mappingproxy; use ''|'' instead'

]

{ #category : 'Grail-Iterator Protocol' }
mappingproxy >> __iter__ [
	"iter() of the mapping itself (mappingproxy_getiter), so a mapping's own
	__iter__ answers -- not its keys()."

	^ mapping __iter__

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> __len__ [
	"len() of the mapping (mappingproxy_len), so a __len__ override answers."

	^ mapping __len__

]

{ #category : 'Grail-Comparison' }
mappingproxy >> __ne__: other [
	"Forward a PUNT instead of negating it: __eq__ delegates to the wrapped
	dict, whose __eq__ now answers NotImplemented for a non-mapping,
	and ``not'' on that symbol is a doesNotUnderstand."

	| r |
	r := self __eq__: other.
	r == true ifTrue: [^ false].
	r == false ifTrue: [^ true].
	^ r

]

{ #category : 'Grail-Merge Operators' }
mappingproxy >> __or__: other [
	"PEP 584 ``mp | other''.  CPython's mappingproxy does not merge anything
	itself -- it runs the operator against the WRAPPED MAPPING and lets the
	ordinary binary protocol decide, which is why ``mp | UserDict'' answers a
	UserDict and ``mp | dict'' a plain dict.

	Reproduced here as the two steps the protocol makes, because Grail's dict
	refuses a non-AbstractDictionary operand and so returns NotImplemented for
	the interesting half: without the reflected step, ``mp | UserDict'' would
	answer NotImplemented instead of a UserDict.

	This did not need to exist while types.MappingProxyType was a stub that
	answered its argument -- every ``|'' in test_userdict was running against
	a plain dict, three times over, and the mappingproxy third of
	test_mixed_or and test_mixed_ior was passing VACUOUSLY."

	| r ni |
	ni := Python @env0:at: #'NotImplemented' otherwise: nil.
	r := [mapping @env1:__or__: other]
		@env0:on: (MessageNotUnderstood @env0:, AttributeError)
		do: [:ex | ex @env0:return: ni].
	(r @env0:== ni) ifFalse: [^ r].
	^ [other @env1:__ror__: mapping]
		@env0:on: (MessageNotUnderstood @env0:, AttributeError)
		do: [:ex | ex @env0:return: ni]

]

{ #category : 'Grail-String Representation' }
mappingproxy >> __repr__ [
	^ 'mappingproxy(' @env0:, (mapping __repr__) @env0:, ')'

]

{ #category : 'Grail-Iterator Protocol' }
mappingproxy >> __reversed__ [
	"The mapping's own reversed iterator (mappingproxy_reversed calls its
	__reversed__).  Without one, reversed() fell back to indexing the proxy
	by position, which for a dict is a KeyError."

	^ mapping __reversed__

]

{ #category : 'Grail-Merge Operators' }
mappingproxy >> __ror__: other [
	"PEP 584 reflected merge ``other | mp'' -- the proxy's entries win.

	The path that matters is ``UserDict | mp'': UserDict's own __or__ accepts
	only a UserDict or a dict, so it answers NotImplemented and this is what
	runs, with the wrapped mapping standing in for the proxy.  That is how
	CPython keeps the result a UserDict rather than a dict."

	| r ni |
	ni := Python @env0:at: #'NotImplemented' otherwise: nil.
	r := [other @env1:__or__: mapping]
		@env0:on: (MessageNotUnderstood @env0:, AttributeError)
		do: [:ex | ex @env0:return: ni].
	(r @env0:== ni) ifFalse: [^ r].
	^ [mapping @env1:__ror__: other]
		@env0:on: (MessageNotUnderstood @env0:, AttributeError)
		do: [:ex | ex @env0:return: ni]

]

{ #category : 'Grail-Mutation' }
mappingproxy >> __setitem__: key _: value [
	<grailProtocolRefusal>
	"CPython's mappingproxy has no item assignment at all; this only raises
	its TypeError, and is no attribute of the type."

	^ TypeError ___signal___: '''mappingproxy'' object does not support item assignment'

]

{ #category : 'Grail-String Representation' }
mappingproxy >> __str__ [
	"str() of the mapping itself (mappingproxy_str); repr() keeps the
	``mappingproxy(...)'' wrapper."

	^ mapping __str__

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> copy [
	"CPython ``mappingproxy.copy()'' returns a shallow copy of the
	underlying mapping (a plain dict), not another proxy."
	^ mapping copy

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> get: key [
	^ mapping get: key

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> get: key _: default [
	^ mapping get: key _: default

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> items [
	^ mapping items

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> keys [
	^ mapping keys

]

{ #category : 'Grail-Accessors' }
mappingproxy >> mapping [
	"CPython 3.12+ ``mappingproxy.mapping'' — the wrapped mapping."
	^ mapping

]

{ #category : 'Grail-Collection Protocol' }
mappingproxy >> values [
	^ mapping values

]
