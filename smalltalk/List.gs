! ------------------- Remove existing behavior from list
expectvalue /Metaclass3
doit
list removeAllMethods.
list class removeAllMethods.
%
! ------------------- Class methods for list
set compile_env: 0
category: 'other'
classmethod: list
__call__: aList

	^(self __new__: aList) __init__: aList; yourself
%
category: 'other'
classmethod: list
__new__: aList

	^self basicNew.
%
set compile_env: 0
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
set compile_env: 0
category: 'Python'
method: list
__delitem__: anIndex
	^self ___remove: anIndex ifFail: 'list assignment index out of range'.
%
category: 'Python'
method: list
__getslice__: aPyIntStart _: aPyIntEnd

	| end |
	end := aPyIntEnd.

	end class == NoneType ifTrue: [
		end := int ___value: container size
	].

	^self class ___value: (self ___getslice: aPyIntStart _: end)
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
	container do: [ :elem |
		stream 
			nextPutAll: ', ';
			nextPutAll: elem __repr__ ___value;
			yourself.
	].
	stream nextPut: $].

	^(str ___value: (stream contents)).
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

	^self.

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
	^self ___remove: anIndex ifFail: 'pop index out of range'.
%
category: 'Python'
method: list
remove: anElement

	^self ___container
		remove: anElement
		ifAbsent: [ValueError signal: 'list.remove(x): x not in list' ].
%
category: 'Python'
method: list
reverse

	^self ___value: self ___container reverse.
%
category: 'Python'
method: list
sort

	^self ___value: self ___container sort.
%
category: 'Python'
method: list
sort_key: aFunction reverse: aBool
"
	| sortBlock reverse |
	sortBlock := aDict at: #key
							ifPresent: [:sortFunc | [:a :b | (sortFunc value: a) < (sortFunc value: b)] ]
							ifAbsent: [[:a :b | a < b]].

	^self ___initialize: (aBool ___value)
									ifTrue: [(self ___container sort: sortBlock) reverse]
									ifFalse: [self ___container sort: sortBlock]).
"
%
category: 'Python'
method: list
sort: aDict
	| sortBlock reverse |
	sortBlock := aDict at: #key
							ifPresent: [:sortFunc | [:a :b | (sortFunc value: a) < (sortFunc value: b)] ]
							ifAbsent: [[:a :b | a < b]].

	^self ___initialize: ((aDict at: #reverse ifAbsent: [false])
									ifTrue: [(self ___container sort: sortBlock) reverse]
									ifFalse: [self ___container sort: sortBlock]).
%
set compile_env: 0
category: 'Python 2.7'
method: list
__delslice__: start _: end
	"I don't find this in Python 3.9.2"

	(end > start) ifTrue: [
		self ___container removeFrom: (start + 1) to: (end - start + 1).
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
set compile_env: 0
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
category: 'Smalltalk'
method: list
___typeName
	^'list'
%
