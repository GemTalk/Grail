! ------------------- Remove existing behavior from dict
removeAllMethods dict
removeAllClassMethods dict
! ------------------- Class methods for dict
! ------------------- Instance methods for dict
set compile_env: 0
category: 'other'
method: dict
__len__

	^ [ :rhs | rhs ___container size // 2 ]
%
category: 'other'
method: dict
= aDict
	"ugly workaround method to prevent ConstantAst from making two otherwise equal dicts unequal
	current strategy: 
		check both containers are the same size
		initialize an IdentityBag to store checked indices
		iterate through self container keys
			for each key value pair, 
				check aDict container has the same key value pair, 
				check that the key index does not already exist in the IdentityBag,
				and add the aDict container key index to an IdentitySet"

	| checkedIndices |
	(container size = aDict ___container size) ifFalse: [ ^ False ].
	checkedIndices := IdentityBag new.
	1 to: container size by: 2 do: [ :leftIndex |
		| leftKey rightKey rightIndex leftValue rightValue |
		leftKey := container at: leftIndex.
		rightIndex := aDict indexOfKey: leftKey.
		(rightIndex == 0 or: [ checkedIndices includes: rightIndex ]) ifTrue: [ ^ False ].
		rightKey := aDict ___container at: rightIndex.
		leftValue := ((container at: leftIndex) isKindOf: ConstantAst) ifTrue: [ (container at: leftIndex) value ] ifFalse: [ container at: leftIndex ].
		rightValue := ((aDict ___container at: rightIndex) isKindOf: ConstantAst) ifTrue: [ (aDict ___container at: rightIndex) value ] ifFalse: [ aDict ___container at: rightIndex ].
		leftValue = rightValue ifFalse: [ ^ False ].
		checkedIndices add: rightIndex.
	].
	^ True
%
category: 'other'
method: dict
at: aKey

	| index |
	index := self indexOfKey: (str withAll: aKey).
	^ (container at: index + 1) value
%
category: 'other'
method: dict
at: aKey ifAbsent: aBlock

	| index |
	index := self indexOfKey: (str withAll: aKey).
	index = 0 ifTrue: [ ^ aBlock value ].
	^ (container at: index + 1) value
%
category: 'other'
method: dict
has: aKey

	| index |
	index := self indexOfKey: (str withAll: aKey).
	index = 0 ifTrue: [ ^ False ] ifFalse: [ ^ True ].
%
category: 'other'
method: dict
indexOfKey: aKey

	1 to: container size by: 2 do: [ :i | (container at: i) = aKey ifTrue: [ ^ i ] ].
	^ 0
%
category: 'other'
method: dict
keysAndValuesDo: aDyadicBlock

	^ 1 to: container size by: 2 do: [ :index | aDyadicBlock value: (container at: index) value: (container at: index + 1) ]
%
category: 'other'
method: dict
set: aKey to: aValue

	1 to: container size by: 2 do: [:i | 
		((container at: i) __eq__ value: (container at: i) value: aKey) == True ifTrue: [
			container at: i + 1 put: aValue.
			^self.
		].
	].
	container add: aKey; add: aValue.
%
set compile_env: 0
category: 'Python'
method: dict
__contains__

	self halt.
%
category: 'Python'
method: dict
__delitem__

	self halt.
%
category: 'Python'
method: dict
__getitem__

	^[:collection :key | 
		[
			| array each  |
			(collection isKindOf: dict) ifFalse: [TypeError signal].
			array := collection ___container.
			1 to: array size by: 2 do: [:i | 
				each := array at: i.
				(each __eq__ value: each value: key) == True ifTrue: [Notification signal: (array at: i + 1)].
			].
			KeyError signal: key.
		] on: Notification do: [:ex | 
			ex return: ex details.
		].
	]
%
category: 'Python'
method: dict
__iter__
	"The builtin iter() function looks for the __iter__() method.
	https://docs.python.org/3/library/functions.html#iter

	iter(d) Return an iterator over the keys of the dictionary. 
	This is a shortcut for iter(d.keys()).
	Keys and values are iterated over in insertion order!
	https://docs.python.org/3.7/library/stdtypes.html#mapping-types-dict"
	self halt.
%
category: 'Python'
method: dict
__setitem__

	self halt.
%
category: 'Python'
method: dict
__str__

	self halt.
%
category: 'Python'
method: dict
clear

	self halt.
%
category: 'Python'
method: dict
copy

	^super copy
%
category: 'Python'
method: dict
fromkeys

	self halt.
%
category: 'Python'
method: dict
get

	self halt.
%
category: 'Python'
method: dict
items

	self halt.
%
category: 'Python'
method: dict
keys

	self halt.
%
category: 'Python'
method: dict
pop

	self halt.
%
category: 'Python'
method: dict
popitem

	self halt.
%
category: 'Python'
method: dict
setdefault

	self halt.
%
category: 'Python'
method: dict
update

	self halt.
%
category: 'Python'
method: dict
values

	self halt.
%
