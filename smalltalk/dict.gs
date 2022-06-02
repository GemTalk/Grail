! ------------------- Remove existing behavior from dict
removeAllMethods dict
removeAllClassMethods dict
! ------------------- Class methods for dict
set compile_env: 0
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
set compile_env: 0
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
		ifAbsent: [KeyError signal: aKey printString ].
%
category: 'Python'
method: dict
__ge__: otherCollection
	^(self __gt__: otherCollection) or: [self __eq__: otherCollection ]
%
category: 'Python'
method: dict
__getitem__: aKey
	^self ___container
		at: aKey
		ifAbsent: [KeyError signal: aKey printString ].
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
	^self __delitem__: aKey.
%
category: 'Python'
method: dict
values

	^frozenset ___value: container values
%
set compile_env: 0
category: 'Smalltalk'
method: dict
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

	aStream nextPut: self class ___startChar.
	self ___container keys do: [:key | aStream print: key; nextPut: $:; space; print: (self ___container at: key)] separatedBy: [aStream nextPutAll: ', '].
	aStream nextPut: self class ___endChar.
%
