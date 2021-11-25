! ------------------- Remove existing behavior from Container
removeAllMethods Container
removeAllClassMethods Container
! ------------------- Class methods for Container
set compile_env: 0
category: 'Smalltalk'
classmethod: Container
___containerClass

	self subclassResponsibility.
%
category: 'Smalltalk'
classmethod: Container
___endChar
	^$#
%
category: 'Smalltalk'
classmethod: Container
___startChar
	^$#
%
category: 'Smalltalk'
classmethod: Container
___value: aCollection

	^self basicNew
		___value: aCollection;
		yourself
%
! ------------------- Instance methods for Container
set compile_env: 0
category: 'comparing'
method: Container
= anObject
	"Answer whether the receiver and anObject represent the same object."

	self == anObject
		ifTrue: [^true].
	self class = anObject class
		ifFalse: [^false].
	^container = anObject ___container
%
category: 'comparing'
method: Container
hash
	"Answer an integer value that is related to the identity of the receiver."

	^container hash
%
set compile_env: 0
category: 'Python'
method: Container
__add__: aList
	| newlist |

	{ Container. Collection }
		detect: [:each | aList isKindOf: each]
		ifNone: [TypeError signal: 'can only concatenate ', self ___typeName , ' (not "', aList class name,'") to ', self ___typeName].

	newlist := self class __call__: self.
	"We don't know yet what aList might be"
	newlist ___container addAll: ((aList isKindOf: Container)
											 ifTrue: [aList ___container] ifFalse: [aList]).

	^newlist
%
category: 'Python'
method: Container
__contains__: anElement

	^container includes: anElement
%
category: 'Python'
method: Container
__eq__: otherCollection
	| size |

	(size := self __len__) = otherCollection __len__ ifFalse: [^false].

	1 to: size do: [:index |
		(self ___container at: index) = (otherCollection ___container at: index) ifFalse: [^false]].
	^true
%
category: 'Python'
method: Container
__ge__: otherCollection
	^(self __gt__: otherCollection) or: [self __eq__: otherCollection ]
%
category: 'Python'
method: Container
__getitem__: anIndex
	| index |
	index := anIndex < 0 ifTrue: [self __len__ + anIndex] ifFalse: [anIndex].
	(index < 0 or: [	index >= self __len__])
		ifTrue: [IndexError signal: self ___typeName, ' index out of range'].

	^self ___container at: index + 1
%
category: 'Python'
method: Container
__gt__: otherCollection
	| size |

	size := self ___container size min: otherCollection ___container size.

	1 to: size do: 	[:index |
			(self ___container at: index) > (otherCollection ___container at: index) ifTrue: [^true].
			(self ___container at: index) < (otherCollection ___container at: index) ifTrue: [^false]
		].

	^self ___container size > otherCollection ___container size
%
category: 'Python'
method: Container
__iadd__: aList
	| newlist |

	{ Container. Collection }
		detect: [:each | aList isKindOf: each]
		ifNone: [TypeError signal: 'can only concatenate ', self ___typeName , ' (not "', aList class name,'") to ', self ___typeName].

	"We don't know yet what aList might be"
	self ___container addAll: ((aList isKindOf: Container)
											 ifTrue: [aList ___container] ifFalse: [aList]).

	^self
%
category: 'Python'
method: Container
__imul__: aMultiplier
	| newList |
	 newList := self.

	(aMultiplier -1) timesRepeat: [
		newList ___container addAll: self ___container
  ].

	^newList
%
category: 'Python'
method: Container
__le__: otherCollection
	^(self __gt__: otherCollection) not
%
category: 'Python'
method: Container
__len__

	^self ___size
%
category: 'Python'
method: Container
__lt__: otherCollection
	^(self __gt__: otherCollection) not and: [self __ne__: otherCollection]
%
category: 'Python'
method: Container
__mul__: aMultiplier
	| newList |
	 newList := OrderedCollection new.

	aMultiplier timesRepeat: [
		newList addAll: self ___container
  ].

	^self class new ___initialize: newList
%
category: 'Python'
method: Container
__ne__: otherCollection
	^(self __eq__: otherCollection) not
%
category: 'Python'
method: Container
__repr__

	^self printString
%
category: 'Python'
method: Container
__rmul__: aMultiplier
	^self __mul__: aMultiplier
%
category: 'Python'
method: Container
clear

	^self ___container removeAll.
%
category: 'Python'
method: Container
copy

	^self class ___value: container copy
%
category: 'Python'
method: Container
count: anElement

	^(self ___container select: [:each | each == anElement]) size
%
category: 'Python'
method: Container
index: anElement
	^self index: anElement from: 0.
%
category: 'Python'
method: Container
index: anElement from: start
	^self index: anElement from: start to: self __len__
%
category: 'Python'
method: Container
index: anElement from: start to: end

	^((self ___getslice: start _: end)
		indexOf: anElement
		ifAbsent: [ValueError signal: anElement printString, ' is not in ', self ___typeName]
				) - 1 + start
%
set compile_env: 0
category: 'Python 2.7'
method: Container
__getslice__: start _: end

	^self class ___value: (self ___getslice: start _: end)
%
set compile_env: 0
category: 'Smalltalk'
method: Container
___container
	^container
%
category: 'Smalltalk'
method: Container
___getslice: start _: end

	| subset |
	subset := self ___container copy.
	subset removeFirst: start.
	subset removeLast: (self __len__ - (self __len__ min: end)).
	^subset
%
category: 'Smalltalk'
method: Container
___initArgs: args

	self ___initialize: (args isEmpty ifTrue: [{}] ifFalse: [args first])
%
category: 'Smalltalk'
method: Container
___initialize: aCollection
	| items |
	items := aCollection.
	(aCollection isKindOf: Container) ifTrue: [
		items := aCollection ___container.
	].

	container := self class ___containerClass withAll: items copy.
%
category: 'Smalltalk'
method: Container
___size

	^self ___container size
%
category: 'Smalltalk'
method: Container
___value: aCollection

	container := aCollection.
%
category: 'Smalltalk'
method: Container
gtDebuggerSUnitPrint

	^self ___container gtDebuggerSUnitPrint
%
category: 'Smalltalk'
method: Container
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

	aStream nextPut: self class ___startChar.
	self ___container do: [:element | aStream print: element] separatedBy: [aStream nextPutAll: ', '].
	aStream nextPut: self class ___endChar.
%
category: 'Smalltalk'
method: Container
printOn: aStream
	"Append a sequence of characters that identify the receiver to aStream."

	"self printNameOn: aStream."
	self printElementsOn: aStream
%
