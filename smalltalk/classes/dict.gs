! ===============================================================================
! dict Methods (Python 'dict' type - mutable mapping)
! ===============================================================================
! This file contains Python method implementations for the dict class.
! dict is mapped to GemStone's Dictionary class.
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
Dictionary removeAllMethods: 2.
Dictionary class removeAllMethods: 2.
%

! ------------------- Instance methods for dict
set compile_env: 2

category: 'Python-Type'
method: Dictionary
__class__
	"Return the Python type for dict"
	^ dict
%

category: 'Python-Collection Protocol'
method: Dictionary
__len__
	"Return the number of items in the dictionary"
	^ self ___size___
%

category: 'Python-Collection Protocol'
method: Dictionary
__contains__: key
	"Return True if key is in the dictionary, else False"
	^ self ___includesKey___: key
%

category: 'Python-Subscript Protocol'
method: Dictionary
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
method: Dictionary
__setitem__: key _: value
	"Set d[key] to value"
	self ___at___: key put: value
%

category: 'Python-Subscript Protocol'
method: Dictionary
__delitem__: key
	"Remove d[key] from dictionary. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self ___includesKey___: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	self perform: #removeKey: env: 0 withArguments: {key}
%

category: 'Python-Iterator Protocol'
method: Dictionary
__iter__
	"Return an iterator over the keys of the dictionary"
	^ dict_keyiterator perform: #___on: env: 2 withArguments: {self}
%

category: 'Python-Comparison'
method: Dictionary
__eq__: other
	"Return True if dictionaries have the same (key, value) pairs"

	| mySize otherSize |
	(other ___isKindOf___: Dictionary) ifFalse: [
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

category: 'Python-Comparison'
method: Dictionary
__ne__: other
	"Return True if dictionaries do not have the same (key, value) pairs"
	^ (self perform: #__eq__: env: 2 withArguments: {other}) ___not___
%

category: 'Python-Mutation Methods'
method: Dictionary
clear
	"Remove all items from the dictionary"
	self perform: #removeAllKeys: env: 0 withArguments: {self perform: #keys env: 0}
%

category: 'Python-Mutation Methods'
method: Dictionary
copy
	"Return a shallow copy of the dictionary"
	^ self ___copy___
%

category: 'Python-Access Methods'
method: Dictionary
get: key
	"Return the value for key if key is in the dictionary, else None"
	^ self perform: #get:_: env: 2 withArguments: {key. nil}
%

category: 'Python-Access Methods'
method: Dictionary
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
method: Dictionary
keys
	"Return a new view of the dictionary's keys"

	| keysArray |
	keysArray := Array ___new___.
	self perform: #keysDo: env: 0 withArguments: {[:key |
		keysArray ___add___: key
	]}.
	^ keysArray
%

category: 'Python-View Methods'
method: Dictionary
values
	"Return a new view of the dictionary's values"

	| valuesArray |
	valuesArray := Array ___new___.
	self perform: #valuesDo: env: 0 withArguments: {[:value |
		valuesArray ___add___: value
	]}.
	^ valuesArray
%

category: 'Python-View Methods'
method: Dictionary
items
	"Return a new view of the dictionary's (key, value) pairs"

	| itemsArray |
	itemsArray := Array ___new___.
	self ___keysAndValuesDo___: [:key :value |
		| pair |
		pair := InvariantArray ___with___: key with: value.
		itemsArray ___add___: pair
	].
	^ itemsArray
%

category: 'Python-Mutation Methods'
method: Dictionary
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
method: Dictionary
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
method: Dictionary
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
	pair := InvariantArray ___with___: lastKey with: lastValue.
	^ pair
%

category: 'Python-Mutation Methods'
method: Dictionary
setdefault: key
	"If key is in the dictionary, return its value. If not, insert key with value None and return None"
	^ self perform: #setdefault:_: env: 2 withArguments: {key. nil}
%

category: 'Python-Mutation Methods'
method: Dictionary
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
method: Dictionary
update: other
	"Update the dictionary with key/value pairs from other, overwriting existing keys"

	| isDict |
	isDict := other ___isKindOf___: Dictionary.
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

category: 'Python-String Representation'
method: Dictionary
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

set compile_env: 0
