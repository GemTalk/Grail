! ------------------- Remove existing behavior from frozenset
removeAllMethods frozenset
removeAllClassMethods frozenset
! ------------------- Class methods for frozenset
set compile_env: 0
category: 'Smalltalk'
classmethod: frozenset
___containerClass

	^Set
%
category: 'Smalltalk'
classmethod: frozenset
___endChar
	^$}
%
category: 'Smalltalk'
classmethod: frozenset
___startChar
	^${
%
! ------------------- Instance methods for frozenset
set compile_env: 0
category: 'Python'
method: frozenset
__and__: aSet

	^self intersection: aSet
%
category: 'Python'
method: frozenset
__eq__: otherCollection

	^self ___container = otherCollection ___container
%
category: 'Python'
method: frozenset
__ge__: otherCollection
	^self issuperset: otherCollection
%
category: 'Python'
method: frozenset
__gt__: otherCollection

	^(self __ge__: otherCollection) and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__le__: otherCollection
	^self issubset: otherCollection
%
category: 'Python'
method: frozenset
__lt__: otherCollection

	^(self __le__: otherCollection) and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__or__: aSet

	^self union: aSet
%
category: 'Python'
method: frozenset
__sub__: aSet

	^self difference: aSet
%
category: 'Python'
method: frozenset
__xor__: aSet

	^self symmetric_difference: aSet
%
category: 'Python'
method: frozenset
difference: aSet

	^self class ___value:
	  (self ___difference: (aSet ___intersection: self ___container))
%
category: 'Python'
method: frozenset
intersection: aSet

	^self class ___value: (self ___intersection: aSet ___container).
%
category: 'Python'
method: frozenset
isdisjoint: aSet

	^(self intersection: aSet) __len__ = 0
%
category: 'Python'
method: frozenset
issubset: aSet

	self ___container do: [ :each | (aSet ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: frozenset
issuperset: aSet

	aSet ___container do: [ :each | (self ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: frozenset
symmetric_difference: aSet
	"A + B - (AxB)
	"
	^(self union: aSet) difference: (self intersection: aSet)
%
category: 'Python'
method: frozenset
union: aSet
	| newSet |
	newSet := self copy.
	newSet ___container addAll: aSet ___container.
	^newSet
%
set compile_env: 0
category: 'Smalltalk'
method: frozenset
___difference: aSet

	| difference intersection |
	intersection := self ___intersection: aSet.
	difference := container copy.
	difference removeAll: intersection.
	^difference
%
category: 'Smalltalk'
method: frozenset
___intersection: aSet

	| intersection |
	intersection := Set new.
	self ___container do: [ :each | (aSet includesValue: each) ifTrue: [ intersection add: each ] ].
	^intersection
%
category: 'Smalltalk'
method: frozenset
__rand__: aSet

	^aSet intersection: self
%
category: 'Smalltalk'
method: frozenset
__ror__: aSet

	^aSet union: self
%
category: 'Smalltalk'
method: frozenset
__rsub__: aSet

	^aSet difference: self
%
category: 'Smalltalk'
method: frozenset
__rxor__: aSet

	^aSet symmetric_difference: self
%
category: 'Smalltalk'
method: frozenset
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

   aStream nextPutAll: self class name.
	aStream nextPut: $(.
	super printElementsOn: aStream.
	aStream nextPut: $).
%
