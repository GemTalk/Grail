! ------------------- Remove existing behavior from frozenset
removeallmethods frozenset
removeallclassmethods frozenset
! ------------------- Class methods for frozenset
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
category: 'Python'
method: frozenset
__add__: aSet
	"Python set/frozenset does not support + operator"

	TypeError signal: 'unsupported operand type(s) for +: ''', self ___typeName, ''' and ''', aSet ___typeName, ''''
%
category: 'Python'
method: frozenset
__and__: aSet

	^self intersection: aSet
%
category: 'Python'
method: frozenset
__doc__

	^str ___value: 'Build an immutable unordered collection of unique elements.'
%
category: 'Python'
method: frozenset
__eq__: otherCollection

	^bool ___value: (self ___container = otherCollection ___container)
%
category: 'Python'
method: frozenset
__ge__: otherCollection

	^self issuperset: otherCollection
%
category: 'Python'
method: frozenset
__gt__: otherCollection

	^(self __ge__: otherCollection) ___and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__hash__
	"frozenset is immutable and hashable. Compute a hash based on the elements."

	| hash |
	hash := 0.
	container do: [:each |
		hash := hash bitXor: each __hash__ ___value.
	].
	^int ___value: hash
%
category: 'Python'
method: frozenset
__le__: otherCollection

	^self issubset: otherCollection
%
category: 'Python'
method: frozenset
__lt__: otherCollection

	^(self __le__: otherCollection) ___and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__or__: aSet

	^self union: aSet
%
category: 'Python'
method: frozenset
__rand__: aSet

	^aSet intersection: self
%
category: 'Python'
method: frozenset
__repr__

	| stream index |
	index := 1.
	stream := WriteStream on: String new.
	stream nextPutAll: 'frozenset({'.
	container do: [:each |
		stream nextPutAll: each __repr__ ___value.
		index ~= container size ifTrue: [
			stream nextPutAll: ', '.
		].
		index := index + 1.
	].
	stream nextPut: $};
		nextPut: $);
		yourself.

	^(str ___value: stream contents)
%
category: 'Python'
method: frozenset
__ror__: aSet

	^aSet union: self
%
category: 'Python'
method: frozenset
__rsub__: aSet

	^aSet difference: self
%
category: 'Python'
method: frozenset
__rxor__: aSet

	^aSet symmetric_difference: self
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
difference: others
	"Return a new frozenset with elements in self that are not in any of the others.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| result iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	result := container copy.
	iterables do: [:each |
		result := result - each ___container.
	].
	^self class ___value: result
%
category: 'Python'
method: frozenset
intersection: others
	"Return a new frozenset with elements common to self and all others.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| result iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	result := container copy.
	iterables do: [:each |
		result := result * each ___container.
	].
	^self class ___value: result
%
category: 'Python'
method: frozenset
isdisjoint: aSet

	^bool ___value: ((self intersection: aSet) __len__ ___value == 0)
%
category: 'Python'
method: frozenset
issubset: aSet

	self ___container do: [:each | (aSet ___container includesValue: each) ifFalse: [^bool ___value: false]].
	^bool ___value: true
%
category: 'Python'
method: frozenset
issuperset: aSet

	aSet ___container do: [:each | (self ___container includesValue: each) ifFalse: [^bool ___value: false]].
	^bool ___value: true
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
union: others
	"Return a new frozenset with elements from self and all others.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| newSet iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	newSet := self copy.
	iterables do: [:each |
		newSet ___container addAll: each ___container.
	].
	^newSet
%
category: 'Smalltalk'
method: frozenset
__getitem__: anIndex
	"Sets do not support indexing"

	TypeError signal: '''', self ___typeName, ''' object is not subscriptable'
%
category: 'Smalltalk'
method: frozenset
__iadd__: other
	"Sets do not support += (use update for set)"

	TypeError signal: 'unsupported operand type(s) for +=: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: frozenset
__imul__: other
	"Sets do not support *="

	TypeError signal: 'unsupported operand type(s) for *=: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: frozenset
__mul__: other
	"Sets do not support *"

	TypeError signal: 'unsupported operand type(s) for *: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: frozenset
__rmul__: other
	"Sets do not support *"

	TypeError signal: 'unsupported operand type(s) for *: ''', other ___typeName, ''' and ''', self ___typeName, ''''
%
category: 'Smalltalk'
method: frozenset
clear
	"frozenset is immutable and does not support clear"

	AttributeError signal: '''frozenset'' object has no attribute ''clear'''
%
category: 'Smalltalk'
method: frozenset
count: anElement
	"Sets do not have count method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''count'''
%
category: 'Smalltalk'
method: frozenset
index: anElement
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
%
category: 'Smalltalk'
method: frozenset
index: anElement from: start
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
%
category: 'Smalltalk'
method: frozenset
index: anElement from: start to: stop
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
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
