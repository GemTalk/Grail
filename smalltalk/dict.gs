! ------------------- Remove existing behavior from dict
removeallmethods dict
removeallclassmethods dict
! ------------------- Class methods for dict
category: 'Python'
classmethod: dict
fromkeys: iterable
	"Create a new dictionary with keys from iterable and values set to None."

	^self fromkeys: iterable _: None
%
category: 'Python'
classmethod: dict
fromkeys: iterable _: value
	"Create a new dictionary with keys from iterable and values set to value."

	| newDict |
	newDict := dict ___value: OrderedDictionary new.
	iterable ___container do: [:each |
		newDict ___container at: each put: value
	].
	^newDict
%
category: 'Smalltalk'
classmethod: dict
___containerClass

	^OrderedDictionary
%
category: 'Smalltalk'
classmethod: dict
___endChar
	^$}
%
category: 'Smalltalk'
classmethod: dict
___startChar
	^${
%
! ------------------- Instance methods for dict
category: 'Python'
method: dict
__contains__: anElement

	^self ___container includesKey: anElement
%
category: 'Python'
method: dict
__delitem__: aKey

	^self ___container
		removeKey: aKey
		ifAbsent: [KeyError signal: aKey printString].
%
category: 'Python'
method: dict
__doc__

	^str ___value: 'dict() -> new empty dictionary\n' ,
		'dict(mapping) -> new dictionary initialized from a mapping object''s\n' ,
		'    (key, value) pairs\n' ,
		'dict(iterable) -> new dictionary initialized as if via:\n' ,
		'    d = {}\n' ,
		'    for k, v in iterable:\n' ,
		'        d[k] = v\n' ,
		'dict(**kwargs) -> new dictionary initialized with the name=value pairs\n' ,
		'    in the keyword argument list.  For example:  dict(one=1, two=2)'
%
category: 'Python'
method: dict
__eq__: otherDict
	"Two dicts are equal if they have the same keys with equal values.
	 Uses Python equality (__eq__) for Python objects."

	(otherDict isKindOf: dict) ifFalse: [^False].
	self ___container size = otherDict ___container size ifFalse: [^False].
	self ___container keysAndValuesDo: [:key :value |
		| otherValue keysEqual valuesEqual |
		"Check if key exists in other dict"
		otherValue := otherDict ___container at: key ifAbsent: [
			"Key not found directly - try Python equality for keys"
			| found |
			found := false.
			otherDict ___container keysAndValuesDo: [:otherKey :otherVal |
				found ifFalse: [
					keysEqual := (key isKindOf: object)
						ifTrue: [(key __eq__: otherKey) == True]
						ifFalse: [key = otherKey].
					keysEqual ifTrue: [
						otherValue := otherVal.
						found := true.
					].
				].
			].
			found ifFalse: [^False].
			otherValue
		].
		"Compare values using Python equality if both are Python objects"
		valuesEqual := ((value isKindOf: object) and: [otherValue isKindOf: object])
			ifTrue: [(value __eq__: otherValue) == True]
			ifFalse: [value = otherValue].
		valuesEqual ifFalse: [^False]
	].
	^True
%
category: 'Python'
method: dict
__ge__: otherDict
	"Python 3: dict does not support ordering comparisons"

	TypeError signal: 'TypeError: ''>'' not supported between instances of ''dict'' and ''dict'''
%
category: 'Python'
method: dict
__getitem__: aKey

	"Dicts don't support slicing"
	(aKey isKindOf: slice) ifTrue: [
		TypeError signal: 'unhashable type: ''slice'''
	].

	^self ___container
		at: aKey
		ifAbsent: [KeyError signal: 'KeyError: ' + aKey __repr__ ___value].
%
category: 'Python'
method: dict
__gt__: otherDict
	"Python 3: dict does not support ordering comparisons"

	TypeError signal: 'TypeError: ''>'' not supported between instances of ''dict'' and ''dict'''
%
category: 'Python'
method: dict
__hash__
	"dict is mutable and unhashable"

	TypeError signal: 'unhashable type: ''dict'''
%
category: 'Python'
method: dict
__ior__: aDict

	self ___container addAll: aDict ___container.
	^self
%
category: 'Python'
method: dict
__le__: otherDict
	"Python 3: dict does not support ordering comparisons"

	TypeError signal: 'TypeError: ''<'' not supported between instances of ''dict'' and ''dict'''
%
category: 'Python'
method: dict
__lt__: otherDict
	"Python 3: dict does not support ordering comparisons"

	TypeError signal: 'TypeError: ''<'' not supported between instances of ''dict'' and ''dict'''
%
category: 'Python'
method: dict
__ne__: otherCollection

	^(self __eq__: otherCollection) __not__
%
category: 'Python'
method: dict
__or__: aDict

	^self copy __ior__: aDict
%
category: 'Python'
method: dict
__repr__

	| stream index |
	
	index := 1.
	stream := WriteStream on: String new.
	stream nextPut: ${.
	container associationsDo: [:elem |
		stream
			nextPutAll: elem key __repr__ ___value;
			nextPutAll: ': ';
			nextPutAll: elem value __repr__ ___value.
		index ~= container size ifTrue: [
			stream nextPutAll: ', '.
		].
		index := index + 1.
	].

	stream nextPut: $}.

	^(str ___value: stream contents)
%
category: 'Python'
method: dict
__ror__: aDict

   ^aDict __or__: self
%
category: 'Python'
method: dict
__setitem__: aKey _: aValue

	^self ___container
		at: aKey
		put: aValue.
%
category: 'Python'
method: dict
clear

	self ___container clear
%
category: 'Python'
method: dict
copy

	^self class ___value: container copy
%
category: 'Python'
method: dict
get: aKey
	"Return the value for key if key is in the dictionary, else None."

	^self get: aKey _: None
%
category: 'Python'
method: dict
get: aKey _: default
	"Return the value for key if key is in the dictionary, else default."

	^self ___container
		at: aKey
		ifAbsent: [default]
%
category: 'Python'
method: dict
items

	| s |
	s := OrderedCollection new.
	container keysAndValuesDo: [:eachKey :eachValue |
		s add: (tuple ___value: (Array with: eachKey with: eachValue)).
	].
	#pyTodo "We should actually be returning dict_items".
	^frozenset ___value: s
%
category: 'Python'
method: dict
keys

	^frozenset ___value: container keys
%
category: 'Python'
method: dict
pop: aKey
	"Remove specified key and return the corresponding value.
	 If the key is not found, raise KeyError."

	| value |
	value := self ___container at: aKey ifAbsent: [
		KeyError signal: aKey __repr__ ___value
	].
	self ___container removeKey: aKey.
	^value
%
category: 'Python'
method: dict
pop: aKey _: default
	"Remove specified key and return the corresponding value.
	 If the key is not found, return default."

	| value |
	value := self ___container at: aKey ifAbsent: [^default].
	self ___container removeKey: aKey.
	^value
%
category: 'Python'
method: dict
popitem
	"Remove and return a (key, value) pair as a tuple.
	 In CPython 3.7+, pairs are returned in LIFO order.
	 Raises KeyError if empty."

	| key value |
	container size == 0 ifTrue: [
		KeyError signal: 'popitem(): dictionary is empty'
	].
	key := container lastKey.
	value := container at: key.
	container removeKey: key.
	^tuple ___value: (Array with: key with: value)
%
category: 'Python'
method: dict
setdefault: aKey
	"If key is in the dictionary, return its value.
	 If not, insert key with value None and return None."

	^self setdefault: aKey _: None
%
category: 'Python'
method: dict
setdefault: aKey _: default
	"If key is in the dictionary, return its value.
	 If not, insert key with value of default and return default."

	^self ___container at: aKey ifAbsentPut: [default]
%
category: 'Python'
method: dict
update: anObject
	"Update the dictionary with the key/value pairs from anObject.
	 Returns None (like Python)."

	| index KeyAndValue |
	anObject class == dict ifTrue: [
		anObject ___container keysAndValuesDo: [:key :val | self ___container at: key put: val].
	] ifFalse: [
		anObject __len__ ___value == 0 ifFalse: [
			anObject class == str ifTrue: [
				ValueError signal: 'ValueError: dictionary update sequence element #0 has length 1; 2 is required'.
			].
			index := 0.
			KeyAndValue := OrderedCollection new.
			anObject ___container do: [:each |
				each __len__ ___value == 2 ifFalse: [
					ValueError signal:
						'TypeError: dictionary update sequence element #',
						index asString,
						' has a length ',
						each __len__ ___value asString,
						'; 2 is required'.
				].
				each class == str ifTrue: [
					each ___value do: [:elem | KeyAndValue add: (str ___value: elem asString)].
				] ifFalse: [
					each ___container do: [:elem | KeyAndValue add: elem].
				].
				self ___container add: ((KeyAndValue at: 1) -> (KeyAndValue at: 2))
			].
		].
	].
	^None
%
category: 'Python'
method: dict
values

	^frozenset ___value: container values
%
category: 'Smalltalk'
method: dict
___asIterableForFor

	| result l |
	result := Array new.
	container keysAndValuesDo: [:key :value |
		l := list ___value: (Array with: key with: value).
		result add: l.
	].
	^result
%
category: 'Smalltalk'
method: dict
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

	aStream nextPut: self class ___startChar.
	self ___container keys do: [:key | aStream print: key; nextPut: $:; space; print: (self ___container at: key)] separatedBy: [aStream nextPutAll: ', '].
	aStream nextPut: self class ___endChar.
%
