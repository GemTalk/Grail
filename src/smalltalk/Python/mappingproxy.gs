! ===============================================================================
! mappingproxy — read-only view of a mapping (CPython ``types.MappingProxyType'')
! ===============================================================================
! ``type.__dict__'' and ``dict_keys/values/items .mapping'' are read-only
! mappingproxy objects in CPython: a live view of the underlying dict that
! forbids mutation, iterates/compares like the dict, and reprs as
! ``mappingproxy({...})''.  Grail previously handed back the raw dict; a real
! wrapper class makes ``type(type.__dict__)'' a distinct type that the view
! ``.mapping'' objects are instances of (test_dict test_views_mapping).
! ===============================================================================

run
dict ifNil: [self error: 'dict is not defined. Check file ordering.'].
%

expectvalue /Class
doit
object subclass: 'mappingproxy'
  instVarNames: #( mapping )
  classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
mappingproxy category: 'Grail-Collections'
%

expectvalue /Metaclass3
doit
mappingproxy removeAllMethods: 1. mappingproxy class removeAllMethods: 1.
mappingproxy removeAllMethods: 0. mappingproxy class removeAllMethods: 0.
%

set compile_env: 1

! ------------------- construction (env-1)
category: 'Grail-Initialization'
classmethod: mappingproxy
___on: aMapping
	"Wrap aMapping (the LIVE backing dict) — a mutation to it is visible
	through this proxy, matching CPython's read-only view semantics."

	| v |
	v := self ___new___.
	v ___setMapping: aMapping.
	^ v
%

category: 'Grail-Private'
method: mappingproxy
___setMapping: aMapping
	mapping := aMapping
%

category: 'Grail-Accessors'
method: mappingproxy
mapping
	"CPython 3.12+ ``mappingproxy.mapping'' — the wrapped mapping."
	^ mapping
%

! ------------------- read mapping protocol (delegate to the backing dict)
category: 'Grail-Collection Protocol'
method: mappingproxy
__getitem__: key
	^ mapping @env1:__getitem__: key
%

category: 'Grail-Collection Protocol'
method: mappingproxy
__len__
	^ mapping @env0:size
%

category: 'Grail-Collection Protocol'
method: mappingproxy
__contains__: key
	^ mapping @env0:includesKey: key
%

category: 'Grail-Iterator Protocol'
method: mappingproxy
__iter__
	^ (mapping keys) __iter__
%

category: 'Grail-Collection Protocol'
method: mappingproxy
keys
	^ mapping keys
%

category: 'Grail-Collection Protocol'
method: mappingproxy
values
	^ mapping values
%

category: 'Grail-Collection Protocol'
method: mappingproxy
items
	^ mapping items
%

category: 'Grail-Collection Protocol'
method: mappingproxy
get: key
	^ mapping get: key
%

category: 'Grail-Collection Protocol'
method: mappingproxy
get: key _: default
	^ mapping get: key _: default
%

category: 'Grail-Collection Protocol'
method: mappingproxy
copy
	"CPython ``mappingproxy.copy()'' returns a shallow copy of the
	underlying mapping (a plain dict), not another proxy."
	^ mapping copy
%

! ------------------- comparison (a proxy equals what its dict equals)
category: 'Grail-Comparison'
method: mappingproxy
__eq__: other
	| o |
	o := (other @env0:isKindOf: mappingproxy) ifTrue: [other @env1:mapping] ifFalse: [other].
	^ mapping @env1:__eq__: o
%

category: 'Grail-Comparison'
method: mappingproxy
__ne__: other
	"Forward a PUNT instead of negating it: __eq__ delegates to the wrapped
	dict, whose __eq__ now answers #'___NotImplemented___' for a non-mapping,
	and ``not'' on that symbol is a doesNotUnderstand."

	| r |
	r := self __eq__: other.
	r == true ifTrue: [^ false].
	r == false ifTrue: [^ true].
	^ r
%

category: 'Grail-Hashing'
method: mappingproxy
__hash__
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
%

! ------------------- string representation
category: 'Grail-String Representation'
method: mappingproxy
__repr__
	^ 'mappingproxy(' @env0:, (mapping __repr__) @env0:, ')'
%

! ------------------- read-only: mutation raises TypeError
category: 'Grail-Mutation'
method: mappingproxy
__setitem__: key _: value
	^ TypeError ___signal___: '''mappingproxy'' object does not support item assignment'
%

category: 'Grail-Mutation'
method: mappingproxy
__delitem__: key
	^ TypeError ___signal___: '''mappingproxy'' object does not support item deletion'
%

set compile_env: 0

! ------------------- Smalltalk-collection compatibility (env-0)
category: 'Grail-Compat'
method: mappingproxy
size
	^ mapping size
%

category: 'Grail-Compat'
method: mappingproxy
includesKey: aKey
	^ mapping includesKey: aKey
%

category: 'Grail-Compat'
method: mappingproxy
at: aKey
	^ mapping at: aKey
%

category: 'Grail-Compat'
method: mappingproxy
keysAndValuesDo: aBlock
	mapping keysAndValuesDo: aBlock
%
