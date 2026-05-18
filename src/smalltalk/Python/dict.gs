! ===============================================================================
! dict Methods (Python 'dict' type - mutable mapping)
! ===============================================================================
! This file contains Python method implementations for the dict class.
! dict is mapped to GemStone's KeyValueDictionary class.
!
! dict is a mutable mapping type that maps hashable keys to arbitrary values.
! Dictionaries preserve insertion order (as of Python 3.7).
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from dict
expectvalue /Metaclass3
doit
dict removeAllMethods: 1.
dict class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: dict
__new__
	"dict() — create an empty dict. Receiver is the class."

	^ self ___new___
%

category: 'Grail-Initialization'
classmethod: dict
__new__: source
	"dict(source) — create a dict from another mapping or from an
	iterable of (key, value) pairs. Receiver is the class.

	If `source` is a mapping (responds to `keys` / `__getitem__`), copy
	its entries. Otherwise treat it as an iterable of 2-element
	sequences."

	| result iter done |
	result := self ___new___.

	"Mapping fast path: source is a dict (or KeyValueDictionary)"
	(source @env0:isKindOf: KeyValueDictionary) ifTrue: [
		source @env0:keysAndValuesDo: [:k :v |
			result @env0:at: k put: v
		].
		^ result
	].

	"Iterable of 2-element sequences"
	iter := source __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| pair |
			pair := iter __next__.
			(pair @env0:size @env0:= 2) ifFalse: [
				ValueError ___signal___:
					'dictionary update sequence element has wrong length'
			].
			result @env0:at: (pair @env0:at: 1) put: (pair @env0:at: 2)
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: dict
fromkeys: iterable
	"dict.fromkeys(iterable) — return a new dict with keys from
	iterable, each mapped to None.  Used by re._parser to dedupe
	a list while preserving insertion order (`list(dict.fromkeys(xs))`)."

	^ self @env1:fromkeys: iterable _: None
%

category: 'Grail-Initialization'
classmethod: dict
fromkeys: iterable _: value
	"dict.fromkeys(iterable, value) — return a new dict with keys
	from iterable, each mapped to ``value``."

	| result iter done |
	result := self ___new___.
	(iterable @env0:isKindOf: SequenceableCollection) ifTrue: [
		1 @env0:to: iterable @env0:size do: [:i |
			result @env0:at: (iterable @env0:at: i) put: value
		].
		^ result
	].
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[result @env0:at: iter __next__ put: value]
			@env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: dict
_new: positional kw: keywords
	"dict(**kwargs) and dict(source, **kwargs) varargs entry point.
	Builds a dict from any positional source plus keyword overrides.
	Used by the class-call varargs fast path when keyword arguments
	are passed (e.g. `dict(a=1, b=2)`)."

	| result |
	(positional @env0:size @env0:> 1) ifTrue: [
		TypeError ___signal___: 'dict expected at most 1 positional argument'
	].
	result := positional @env0:isEmpty
		ifTrue: [self ___new___]
		ifFalse: [self @env1:__new__: (positional @env0:at: 1)].
	keywords ifNotNil: [
		keywords @env0:keysAndValuesDo: [:k :v |
			result @env0:at: k put: v
		]
	].
	^ result
%

category: 'Grail-Generics'
classmethod: dict
__getitem__: item
	"`dict[K, V]` is a parameterized type alias.  Python's
	``dict.__class_getitem__`` returns a ``types.GenericAlias``
	wrapping ``dict`` with the type args, but for our purposes
	(class-statement bases, runtime annotation evaluation) the
	origin class is sufficient — code that subscripts a built-in
	collection at runtime is doing so for typing scaffolding, not
	for actual element lookup.  Returning the class lets
	``class Namespace(dict[str, Foo]):`` inherit from dict cleanly."

	^ self
%

category: 'Grail-Type'
method: dict
__class__
	"Return the Python type for dict"
	^ dict
%

category: 'Grail-Collection Protocol'
method: dict
__contains__: key
	"Return True if key is in the dictionary, else False"
	^ self @env0:includesKey: key
%

category: 'Grail-Subscript Protocol'
method: dict
__delitem__: key
	"Remove d[key] from dictionary. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	self @env0:removeKey: key
%

category: 'Grail-Comparison'
method: dict
__eq__: other
	"Return True if dictionaries have the same (key, value) pairs"

	| mySize otherSize |
	(other @env0:isKindOf: dict) ifFalse: [
		^ false
	].
	
	mySize := self @env0:size.
	otherSize := other @env0:size.
	(mySize @env0:= otherSize) ifFalse: [
		^ false
	].
	
	self @env0:keysAndValuesDo: [:key :value |
		| otherHasKey otherValue |
		otherHasKey := other @env0:includesKey: key.
		otherHasKey ifFalse: [
			^ false
		].
		otherValue := other @env0:at: key.
		(value @env1:__eq__: otherValue) ifFalse: [
			^ false
		]
	].
	
	^ true
%

category: 'Grail-Subscript Protocol'
method: dict
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	^ self @env0:at: key
%

category: 'Grail-Subscript Protocol'
method: SymbolDictionary
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	^ super __getitem__: (key @env0:asSymbol)
%

category: 'Grail-Iterator Protocol'
method: dict
__iter__
	"Return an iterator over the keys of the dictionary"
	^ dict_keyiterator @env1:___on: self
%

category: 'Grail-Collection Protocol'
method: dict
__len__
	"Return the number of items in the dictionary"
	^ self @env0:size
%

category: 'Grail-Comparison'
method: dict
__ne__: other
	"Return True if dictionaries do not have the same (key, value) pairs"
	^ (self @env1:__eq__: other) @env0:not
%

category: 'Grail-String Representation'
method: dict
__repr__
	"Return a string representation of the dictionary"

	| stream isEmpty |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [
		^ '{}'
	].

	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '{'.

	self @env0:keysAndValuesDo: [:key :value |
		| keyRepr valueRepr |
		keyRepr := key @env1:__repr__.
		valueRepr := value @env1:__repr__.
		stream @env0:nextPutAll: keyRepr.
		stream @env0:nextPutAll: ': '.
		stream @env0:nextPutAll: valueRepr.
		stream @env0:nextPutAll: ', '
	].

	"Remove the trailing ', '"
	stream @env0:skip: -2.
	stream @env0:nextPutAll: '}'.

	^ stream @env0:contents
%

category: 'Grail-Subscript Protocol'
method: dict
__setitem__: key _: value
	"Set d[key] to value"
	self @env0:at: key put: value.
	^ None
%

category: 'Grail-Subscript Protocol'
method: SymbolDictionary
__setitem__: key _: value
	"Set d[key] to value"

	super __setitem__: (key @env0:asSymbol) _: value.
	^ None
%

category: 'Grail-Mutation Methods'
method: dict
clear
	"Remove all items from the dictionary"
	self @env0:removeAllKeys: (self @env0:keys)
%

category: 'Grail-Mutation Methods'
method: dict
copy
	"Return a shallow copy of the dictionary"
	^ self @env0:copy
%

category: 'Grail-Access Methods'
method: dict
get: key
	"Return the value for key if key is in the dictionary, else None"
	^ self @env1:get: key _: None
%

category: 'Grail-Access Methods'
method: dict
get: key _: default
	"Return the value for key if key is in the dictionary, else default"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifTrue: [
		^ self @env0:at: key
	].
	^ default
%

category: 'Grail-View Methods'
method: dict
items
	"Return a new view of the dictionary's (key, value) pairs"

	| itemsArray |
	itemsArray := list ___new___.
	self @env0:keysAndValuesDo: [:key :value |
		| pair |
		pair := tuple @env0:with: key with: value.
		itemsArray append: pair
	].
	^ itemsArray
%

category: 'Grail-View Methods'
method: dict
keys
	"Return a new view of the dictionary's keys"

	| keysArray |
	keysArray := list ___new___.
	self @env0:keysDo: [:key |
		keysArray append: key
	].
	^ keysArray
%

category: 'Grail-Mutation Methods'
method: dict
pop: key
	"If key is in the dictionary, remove it and return its value, else raise KeyError"

	| hasKey value |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
		value := self @env0:at: key.
	self @env0:removeKey: key.
	^ value
%

category: 'Grail-Mutation Methods'
method: dict
pop: key _: default
	"If key is in the dictionary, remove it and return its value, else return default"

	| hasKey value |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		^ default
	].
		value := self @env0:at: key.
	self @env0:removeKey: key.
	^ value
%

category: 'Grail-Mutation Methods'
method: dict
popitem
	"Remove and return a (key, value) pair from the dictionary in LIFO order.
	Raises KeyError if the dictionary is empty"

	| isEmpty lastKey lastValue pair |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [
		KeyError ___signal___: 'popitem(): dictionary is empty'
	].

	lastKey := nil.
	lastValue := nil.
	self @env0:keysAndValuesDo: [:key :value |
		lastKey := key.
		lastValue := value
	].

	self @env0:removeKey: lastKey.
	pair := tuple @env0:with: lastKey with: lastValue.
	^ pair
%

category: 'Grail-Mutation Methods'
method: dict
setdefault: key
	"If key is in the dictionary, return its value. If not, insert key with value None and return None"
	^ self @env1:setdefault: key _: nil
%

category: 'Grail-Mutation Methods'
method: dict
setdefault: key _: default
	"If key is in the dictionary, return its value. If not, insert key with value default and return default"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifTrue: [
		^ self @env0:at: key
	].
	self @env0:at: key put: default.
	^ default
%

category: 'Grail-Mutation Methods'
method: dict
update: other
	"Update the dictionary with key/value pairs from other, overwriting existing keys"

	| isDict |
	isDict := other @env0:isKindOf: dict.
	isDict ifTrue: [
		other @env0:keysAndValuesDo: [:key :value |
			self @env0:at: key put: value
		]
	] ifFalse: [
		"Assume other is an iterable of (key, value) pairs"
		other @env0:do: [:pair |
			| key value |
			key := pair @env0:at: 1.
			value := pair @env0:at: 2.
			self @env0:at: key put: value
		]
	]
%

category: 'Grail-View Methods'
method: dict
values
	"Return a new view of the dictionary's values"

	| valuesArray |
	valuesArray := list ___new___.
	self @env0:valuesDo: [:value |
		valuesArray append: value
	].
	^ valuesArray
%

set compile_env: 0
