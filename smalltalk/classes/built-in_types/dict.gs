! ===============================================================================
! dict Methods (Python 'dict' type - mutable mapping)
! ===============================================================================
! This file contains Python method implementations for the dict class.
! dict is mapped to GemStone's KeyValueDictionary class.
!
! dict is a mutable mapping type that maps hashable keys to arbitrary values.
! Dictionaries preserve insertion order (as of Python 3.7).
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from dict
expectvalue /Metaclass3
doit
dict removeAllMethods: 2.
dict class removeAllMethods: 2.
%

set compile_env: 2

category: 'Python-Type'
method: dict
__class__
	"Return the Python type for dict"
	^ dict
%

category: 'Python-Collection Protocol'
method: dict
__contains__: key
	"Return True if key is in the dictionary, else False"
	^ self ___includesKey___: key
%

category: 'Python-Subscript Protocol'
method: dict
__delitem__: key
	"Remove d[key] from dictionary. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self ___includesKey___: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	self perform: #removeKey: env: 0 withArguments: {key}
%

category: 'Python-Comparison'
method: dict
__eq__: other
	"Return True if dictionaries have the same (key, value) pairs"

	| mySize otherSize |
	(other ___isKindOf___: dict) ifFalse: [
		^ false
	].
	
	mySize := self ___size___.
	otherSize := other ___size___.
	(mySize ___eq___: otherSize) ifFalse: [
		^ false
	].
	
	self ___keysAndValuesDo___: [:key :value |
		| otherHasKey otherValue |
		otherHasKey := other ___includesKey___: key.
		otherHasKey ifFalse: [
			^ false
		].
		otherValue := other ___at___: key.
		(value perform: #__eq__: env: 2 withArguments: {otherValue}) ifFalse: [
			^ false
		]
	].
	
	^ true
%

category: 'Python-Subscript Protocol'
method: dict
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self ___includesKey___: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	^ self ___at___: key
%

category: 'Python-Subscript Protocol'
method: SymbolDictionary
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	^ super __getitem__: (key perform: #'asSymbol' env: 0)
%

category: 'Python-Iterator Protocol'
method: dict
__iter__
	"Return an iterator over the keys of the dictionary"
	^ dict_keyiterator perform: #___on: env: 2 withArguments: {self}
%

category: 'Python-Collection Protocol'
method: dict
__len__
	"Return the number of items in the dictionary"
	^ self ___size___
%

category: 'Python-Comparison'
method: dict
__ne__: other
	"Return True if dictionaries do not have the same (key, value) pairs"
	^ (self perform: #__eq__: env: 2 withArguments: {other}) ___not___
%

category: 'Python-String Representation'
method: dict
__repr__
	"Return a string representation of the dictionary"

	| stream isEmpty |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [
		^ '{}'
	].

	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPutAll___: '{'.

	self ___keysAndValuesDo___: [:key :value |
		| keyRepr valueRepr |
		keyRepr := key perform: #__repr__ env: 2.
		valueRepr := value perform: #__repr__ env: 2.
		stream ___nextPutAll___: keyRepr.
		stream ___nextPutAll___: ': '.
		stream ___nextPutAll___: valueRepr.
		stream ___nextPutAll___: ', '
	].

	"Remove the trailing ', '"
	stream perform: #skip: env: 0 withArguments: {-2}.
	stream ___nextPutAll___: '}'.

	^ stream ___contents___
%

category: 'Python-Subscript Protocol'
method: dict
__setitem__: key _: value
	"Set d[key] to value"
	self ___at___: key put: value.
	^ nil
%

category: 'Python-Subscript Protocol'
method: SymbolDictionary
__setitem__: key _: value
	"Set d[key] to value"

	super __setitem__: (key perform: #'asSymbol' env: 0) _: value.
	^ nil
%

category: 'Python-Mutation Methods'
method: dict
clear
	"Remove all items from the dictionary"
	self perform: #removeAllKeys: env: 0 withArguments: {self perform: #keys env: 0}
%

category: 'Python-Mutation Methods'
method: dict
copy
	"Return a shallow copy of the dictionary"
	^ self ___copy___
%

category: 'Python-Access Methods'
method: dict
get: key
	"Return the value for key if key is in the dictionary, else None"
	^ self perform: #get:_: env: 2 withArguments: {key. nil}
%

category: 'Python-Access Methods'
method: dict
get: key _: default
	"Return the value for key if key is in the dictionary, else default"

	| hasKey |
	hasKey := self ___includesKey___: key.
	hasKey ifTrue: [
		^ self ___at___: key
	].
	^ default
%

category: 'Python-View Methods'
method: dict
items
	"Return a new view of the dictionary's (key, value) pairs"

	| itemsArray |
	itemsArray := list ___new___.
	self ___keysAndValuesDo___: [:key :value |
		| pair |
		pair := tuple ___with___: key with: value.
		itemsArray append: pair
	].
	^ itemsArray
%

category: 'Python-View Methods'
method: dict
keys
	"Return a new view of the dictionary's keys"

	| keysArray |
	keysArray := list ___new___.
	self perform: #keysDo: env: 0 withArguments: {[:key |
		keysArray append: key
	]}.
	^ keysArray
%

category: 'Python-Mutation Methods'
method: dict
pop: key
	"If key is in the dictionary, remove it and return its value, else raise KeyError"

	| hasKey value |
	hasKey := self ___includesKey___: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
		value := self ___at___: key.
	self perform: #removeKey: env: 0 withArguments: {key}.
	^ value
%

category: 'Python-Mutation Methods'
method: dict
pop: key _: default
	"If key is in the dictionary, remove it and return its value, else return default"

	| hasKey value |
	hasKey := self ___includesKey___: key.
	hasKey ifFalse: [
		^ default
	].
		value := self ___at___: key.
	self perform: #removeKey: env: 0 withArguments: {key}.
	^ value
%

category: 'Python-Mutation Methods'
method: dict
popitem
	"Remove and return a (key, value) pair from the dictionary in LIFO order.
	Raises KeyError if the dictionary is empty"

	| isEmpty lastKey lastValue pair |
	isEmpty := self ___isEmpty___.
	isEmpty ifTrue: [
		KeyError ___signal___: 'popitem(): dictionary is empty'
	].

	lastKey := nil.
	lastValue := nil.
	self ___keysAndValuesDo___: [:key :value |
		lastKey := key.
		lastValue := value
	].

	self perform: #removeKey: env: 0 withArguments: {lastKey}.
	pair := tuple ___with___: lastKey with: lastValue.
	^ pair
%

category: 'Python-Mutation Methods'
method: dict
setdefault: key
	"If key is in the dictionary, return its value. If not, insert key with value None and return None"
	^ self perform: #setdefault:_: env: 2 withArguments: {key. nil}
%

category: 'Python-Mutation Methods'
method: dict
setdefault: key _: default
	"If key is in the dictionary, return its value. If not, insert key with value default and return default"

	| hasKey |
	hasKey := self ___includesKey___: key.
	hasKey ifTrue: [
		^ self ___at___: key
	].
	self ___at___: key put: default.
	^ default
%

category: 'Python-Mutation Methods'
method: dict
update: other
	"Update the dictionary with key/value pairs from other, overwriting existing keys"

	| isDict |
	isDict := other ___isKindOf___: dict.
	isDict ifTrue: [
		other ___keysAndValuesDo___: [:key :value |
			self ___at___: key put: value
		]
	] ifFalse: [
		"Assume other is an iterable of (key, value) pairs"
		other ___do___: [:pair |
			| key value |
			key := pair ___at___: 1.
			value := pair ___at___: 2.
			self ___at___: key put: value
		]
	]
%

category: 'Python-View Methods'
method: dict
values
	"Return a new view of the dictionary's values"

	| valuesArray |
	valuesArray := list ___new___.
	self perform: #valuesDo: env: 0 withArguments: {[:value |
		valuesArray append: value
	]}.
	^ valuesArray
%

set compile_env: 0
