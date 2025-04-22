! ------------------- Remove existing behavior from dict
removeallmethods dict
removeallclassmethods dict
! ------------------- Class methods for dict
category: 'Smalltalk'
classmethod: dict
___containerClass

	^Dictionary
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
__ge__: otherCollection
	^(self __gt__: otherCollection) or: [self __eq__: otherCollection]
%
category: 'Python'
method: dict
__getitem__: aKey
	^self ___container
		at: aKey
		ifAbsent: [KeyError signal: 'KeyError: ' + aKey __repr__ ___value].
%
category: 'Python'
method: dict
__getslice__: aPyIntStart _: aPyIntEnd

	TypeError signal:  'unhashable type: slice'
%
category: 'Python'
method: dict
__gt__: otherDict
	"https://stackoverflow.com/questions/29916585/dictionary-gt-and-lt-implementation"
	#pyElaborate. "this is an aproximated implementation"

	^(self ___container size > otherDict ___container size) or: [
		 (self ___container size = otherDict ___container size) and: [
			self ___container keys do: [:key |
				(self ___container at: key) > (otherDict ___container at: key ifAbsent: [^true])
					ifTrue: [^true].
				(self ___container at: key) < (otherDict ___container at: key)
				   ifTrue: [^false]
			]
		].
		false
	]
%
category: 'Python'
method: dict
__ior__: aDict
	self ___container addAll: aDict ___container.
%
category: 'Python'
method: dict
__le__: otherCollection
	^(self __gt__: otherCollection) not
%
category: 'Python'
method: dict
__lt__: otherCollection
	^(self __gt__: otherCollection) not and: [self __ne__: otherCollection]
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

	^self ___container removeAllKeys: self ___container keys
%
category: 'Python'
method: dict
copy

	^self class ___value: container copy
%
category: 'Python'
method: dict
get: aKey
	^self __getitem__: aKey
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
	^self __delitem__: aKey
%
category: 'Python'
method: dict
update: anObject
	"update the dictionary with the new key, value pairs in anObject,
		this can be done with another dictionary or nested data structures"
	| index KeyAndValue |
	anObject class == dict
		ifTrue: [
			anObject ___container keysAndValuesDo: [:key :val | self ___container at: key put: val].
		]
		ifFalse: [
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
					each class == str
						ifTrue: [
							each ___value do: [:elem | KeyAndValue add: (str ___value: elem asString)].
						]
						ifFalse: [
							each ___container do: [:elem | KeyAndValue add: elem].
							
						].
					self ___container add: ((KeyAndValue at: 1) -> (KeyAndValue at: 2))
				].
			].
		].
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
