! ------------------- Remove existing behavior from list
removeallmethods list
removeallclassmethods list
! ------------------- Class methods for list
category: 'other'
classmethod: list
__call__: aList

	^(self __new__: aList) __init__: aList; yourself
%
category: 'other'
classmethod: list
__new__: aList

	^self basicNew
%
category: 'Smalltalk'
classmethod: list
___containerClass

	^OrderedCollection
%
category: 'Smalltalk'
classmethod: list
___endChar
	^$]
%
category: 'Smalltalk'
classmethod: list
___startChar
	^$[
%
! ------------------- Instance methods for list
category: 'Python'
method: list
__delitem__: anIndex

	^self ___remove: anIndex ifFail: 'list assignment index out of range'
%
category: 'Python'
method: list
__doc__

	^str ___value: 'Built-in mutable sequence.\n\nIf no argument is given, the constructor creates a new empty list.\nThe argument must be an iterable if specified.'
%
category: 'Python'
method: list
__hash__
	"Lists are not hashable in Python"

	TypeError signal: 'unhashable type: ''list'''
%
category: 'Python'
method: list
__init__

	container := OrderedCollection new
%
category: 'Python'
method: list
__init__: aList

	container := aList ___container copy
%
category: 'Python'
method: list
__repr__

	| stream |

	stream := WriteStream on: String new.
	stream nextPut: $[.
	stream nextPutAll: container removeFirst __repr__ ___value.
	container do: [:elem |
		stream 
			nextPutAll: ', ';
			nextPutAll: elem __repr__ ___value;
			yourself.
	].
	stream nextPut: $].

	^(str ___value: stream contents)
%
category: 'Python'
method: list
__reversed__

	^self class ___value: container reverse
%
category: 'Python'
method: list
__setitem__: anElement _: anIndex
	"https://docs.python.org/3/reference/datamodel.html#object.__setitem__"

	| index |
	index := anIndex ___value < 0 ifTrue: [self __len__ ___value + anIndex ___value] ifFalse: [anIndex ___value].
	(index < 0 or: [	index >= self __len__ ___value])
		ifTrue: [IndexError signal: 'list assignment index out of range'].

	^container at: index + 1 put: anElement
%
category: 'Python'
method: list
append: anElement

	self ___container add: anElement
%
category: 'Python'
method: list
extend: aList

	(aList isKindOf: Container) ifTrue: [
		self ___container addAll: aList ___container.
	] ifFalse: [
		self append: aList
	].

	^self
%
category: 'Python'
method: list
insert: anIndex _: anElement

	| index |
	index := anIndex < 0 ifTrue: [self __len__ ___value + anIndex] ifFalse: [anIndex].

	index <= 0
		ifTrue: [^self ___container addFirst: anElement].
	index >= self __len__ ___value
		ifTrue: [^self ___container addLast: anElement].

	self ___container add: anElement beforeIndex: index + 1.

	^self

 "#('a' 'b' 'c' 'd') asOrderedCollection insert: 'y' before: 2; yourself
"
%
category: 'Python'
method: list
pop

	^self pop: self __len__ ___value - 1
%
category: 'Python'
method: list
pop: anIndex

	^self ___remove: anIndex ifFail: 'pop index out of range'
%
category: 'Python'
method: list
remove: anElement

	^self ___container
		remove: anElement
		ifAbsent: [ValueError signal: 'list.remove(x): x not in list'].
%
category: 'Python'
method: list
reverse

	^self ___value: self ___container reverse
%
category: 'Python'
method: list
sort
	"Sort the list in place using Python's __lt__ for comparison"

	container := self ___container sort: [:a :b | (a __lt__: b) ___value].
	^None
%
category: 'Python'
method: list
sort: aDict
	"Sort the list in place with optional key and reverse arguments.
	 aDict should contain #key -> aBlock/callable and/or #reverse -> aBoolean/True/False"

	| sortBlock sorted keyFunc reverseVal |

	"Get the key function if provided"
	keyFunc := aDict at: #key ifAbsent: [nil].

	"Build the sort block"
	keyFunc isNil ifTrue: [
		"No key function - use Python's __lt__ directly"
		sortBlock := [:a :b | (a __lt__: b) ___value].
	] ifFalse: [
		"Key function provided - could be a Smalltalk block or Python callable"
		(keyFunc isKindOf: BlockClosure) ifTrue: [
			"Smalltalk block - use directly with Smalltalk comparison"
			sortBlock := [:a :b | (keyFunc value: a) < (keyFunc value: b)].
		] ifFalse: [
			"Python callable - use __call__ and Python's __lt__"
			sortBlock := [:a :b | ((keyFunc __call__: a) __lt__: (keyFunc __call__: b)) ___value].
		].
	].

	"Sort the container"
	sorted := self ___container sort: sortBlock.

	"Reverse if requested - handle both Smalltalk booleans and Python True/False"
	reverseVal := aDict at: #reverse ifAbsent: [false].
	(reverseVal == True or: [reverseVal == true]) ifTrue: [
		sorted := sorted reverse.
	].

	container := sorted.
	^None
%
category: 'Python 2.7'
method: list
__delslice__: start _: end
	"I don't find this in Python 3.9.2"

	(end > start) ifTrue: [
		self ___container removeFrom: start + 1 to: (end - start + 1).
	].

	^self
%
category: 'Python 2.7'
method: list
__setslice__: start _: end _: anElement
	"I don't find this in Python 3.9.2"

	self __delslice__: start _: end.
	self insert: start _: anElement.
	^self
%
category: 'Smalltalk'
method: list
___remove: anIndex ifFail: message
	"  a b c   removoving c is -1 =>   3 -1 -> 2    "
	"  a b c   removoving b is -2 =>   3 -2 -> 1    "
	"  a b c   removoving c is -3 =>   3 -3 -> 0    "
	| index |
	index := anIndex < 0 ifTrue: [self __len__ ___value + anIndex] ifFalse: [anIndex].
	(index < 0 or: [	index >= self __len__ ___value])
		ifTrue: [IndexError signal: message].

	^self ___container removeAtIndex: index + 1
%
