! ------------------- Remove existing behavior from set
removeallmethods set
removeallclassmethods set
! ------------------- Class methods for set
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
category: 'Python'
method: set
__doc__

	^str ___value: 'Build an unordered collection of unique elements.'
%
category: 'Python'
method: set
__hash__
	"set is mutable and therefore not hashable. In Python, set.__hash__ is None."

	TypeError signal: 'unhashable type: ''set'''
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
__repr__

	| stream index |

	index := 1.
	stream := WriteStream on: String new.
	stream nextPut: ${.
	container do: [:elem |
		stream nextPutAll: elem __repr__ ___value.
		index ~= container size ifTrue: [
			stream nextPutAll: ', '.
		].
		index := index + 1.
	].
	stream nextPut: $}.

	^(str ___value: stream contents)
%
category: 'Python'
method: set
add: anElement

	self ___container add: anElement
%
category: 'Python'
method: set
clear
	"Remove all elements from the set"

	container := self class ___containerClass new.
%
category: 'Python'
method: set
difference_update: others
	"Remove all elements of others from this set.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	iterables do: [:each |
		container := container - each ___container.
	].
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
intersection_update: others
	"Update the set, keeping only elements found in it and all others.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	iterables do: [:each |
		container := container * each ___container.
	].
%
category: 'Python'
method: set
pop

 	container isEmpty ifTrue: [KeyError signal].
	^self remove: container any
%
category: 'Python'
method: set
remove: anElement

	^self ___container
		remove: anElement
		ifAbsent: [KeyError signal: anElement ___value printString].
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
update: others
	"Update the set, adding elements from all others.
	 others can be a single set/iterable or a tuple of sets/iterables."

	| iterables |
	iterables := (others isKindOf: tuple)
		ifTrue: [others ___container]
		ifFalse: [{others}].
	iterables do: [:each |
		self ___container addAll: each ___container.
	].
%
category: 'Smalltalk'
method: set
__getitem__: anIndex
	"Sets do not support indexing"

	TypeError signal: '''', self ___typeName, ''' object is not subscriptable'
%
category: 'Smalltalk'
method: set
__iadd__: other
	"Sets do not support += (use update for set)"

	TypeError signal: 'unsupported operand type(s) for +=: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: set
__imul__: other
	"Sets do not support *="

	TypeError signal: 'unsupported operand type(s) for *=: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: set
__mul__: other
	"Sets do not support *"

	TypeError signal: 'unsupported operand type(s) for *: ''', self ___typeName, ''' and ''', other ___typeName, ''''
%
category: 'Smalltalk'
method: set
__rmul__: other
	"Sets do not support *"

	TypeError signal: 'unsupported operand type(s) for *: ''', other ___typeName, ''' and ''', self ___typeName, ''''
%
category: 'Smalltalk'
method: set
count: anElement
	"Sets do not have count method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''count'''
%
category: 'Smalltalk'
method: set
index: anElement
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
%
category: 'Smalltalk'
method: set
index: anElement from: start
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
%
category: 'Smalltalk'
method: set
index: anElement from: start to: stop
	"Sets do not have index method"

	AttributeError signal: '''', self ___typeName, ''' object has no attribute ''index'''
%
