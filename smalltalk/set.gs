! ------------------- Remove existing behavior from set
removeAllMethods set
removeAllClassMethods set
! ------------------- Class methods for set
set compile_env: 0
category: 'Smalltalk'
classmethod: set
___containerClass

	^Set
%
category: 'Smalltalk'
classmethod: set
___endChar
	^$}
%
category: 'Smalltalk'
classmethod: set
___startChar
	^${
%
category: 'Smalltalk'
classmethod: set
__call__: aSet

	^(self __new__: aSet) __init__: aSet; yourself
%
category: 'Smalltalk'
classmethod: set
__new__: aSet

	^self basicNew
%
! ------------------- Instance methods for set
set compile_env: 0
category: 'Python'
method: set
__and__: aSet

	| x |
	x := set ___value: Set new.
	aSet ___value do: [ :each | (container includesValue: each) ifTrue: [ x add: each ] ].
	^x
%
category: 'Python'
method: set
__eq__: otherCollection

	^bool ___value: (self ___container = otherCollection ___container)
%
category: 'Python'
method: set
__ge__: otherCollection
	^bool ___value: (self issuperset: otherCollection)
%
category: 'Python'
method: set
__gt__: otherCollection

	^bool ___value: ((self __ge__: otherCollection) ___value and: [(self __ne__: otherCollection) ___value])
%
category: 'Python'
method: set
__iand__: aSet

	^self intersection_update: aSet
%
category: 'Python'
method: set
__init__: aCollection
	| items |
	items := aCollection.
	(aCollection isKindOf: Container) ifTrue: [
		items := aCollection ___container.
	].

	container := self class ___containerClass withAll: items copy.
%
category: 'Python'
method: set
__ior__: aSet

	^self update: aSet
%
category: 'Python'
method: set
__isub__: aSet

	^self difference_update: aSet
%
category: 'Python'
method: set
__ixor__: aSet

	^self symmetric_difference_update: aSet
%
category: 'Python'
method: set
__le__: otherCollection
	^self issubset: otherCollection
%
category: 'Python'
method: set
__lt__: otherCollection

	^(self __le__: otherCollection) and: [self __ne__: otherCollection]
%
category: 'Python'
method: set
__or__: aSet

	^self union: aSet
%
category: 'Python'
method: set
__rand__: aSet

	^aSet intersection: self
%
category: 'Python'
method: set
__repr__

	| stream index|
	
	index := 1.
	stream := WriteStream on: String new.
	stream nextPut: ${.
	container do: [ :elem |
		stream nextPutAll: elem __repr__ ___value.
		index ~= container size ifTrue: [
			stream nextPutAll: ', '.
		].
		index := index + 1.
	].
	stream nextPut: $}.

	^(str ___value: (stream contents)).
%
category: 'Python'
method: set
__ror__: aSet

	^aSet union: self
%
category: 'Python'
method: set
__rsub__: aSet

	^aSet difference: self
%
category: 'Python'
method: set
__rxor__: aSet

	^aSet symmetric_difference: self
%
category: 'Python'
method: set
__sub__: aSet

	^self difference: aSet
%
category: 'Python'
method: set
__xor__: aSet

	^self symmetric_difference: aSet
%
category: 'Python'
method: set
add: anElement

	self ___container add: anElement
%
category: 'Python'
method: set
difference_update: aSet

	container := container - aSet ___container
%
category: 'Python'
method: set
difference: aSet

	^self copy difference_update: aSet
%
category: 'Python'
method: set
discard: anElement

	^self ___container
		remove: anElement
		ifAbsent: [].
%
category: 'Python'
method: set
intersection_update: aSet

	container := container * aSet ___container
%
category: 'Python'
method: set
intersection: aSet

	^self copy intersection_update: aSet
%
category: 'Python'
method: set
isdisjoint: aSet

	^(self intersection: aSet) __len__ ___value == 0
%
category: 'Python'
method: set
issubset: aSet

	self ___container do: [ :each | (aSet ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: set
issuperset: aSet

	aSet ___container do: [ :each | (self ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: set
pop
 	container isEmpty ifTrue: [ KeyError signal ].
	^self remove: container any.
%
category: 'Python'
method: set
remove: anElement

	^self ___container
		remove: anElement
		ifAbsent: [KeyError signal: anElement ___value printString ].
%
category: 'Python'
method: set
symmetric_difference_update: aSet
	"A + B - (AxB)
	"
	self ___value: (self symmetric_difference: aSet) ___container
%
category: 'Python'
method: set
symmetric_difference: aSet
	"A + B - (AxB)
	"
	^(self union: aSet) difference: (self intersection: aSet)
%
category: 'Python'
method: set
union: aSet

	^self copy update: aSet
%
category: 'Python'
method: set
update: aSet

	self ___container addAll: aSet ___container
%
