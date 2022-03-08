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
__contains__: aPyObject

	container do: [ :each |
		(each __eq__: aPyObject) ___value ifTrue: [
			^bool ___value: true
		].
	].
	^bool ___value: false
%
category: 'Python'
method: Container
__eq__: otherCollection
	| size |

	(size := self __len__ ___value) = otherCollection __len__ ___value ifFalse: [^bool ___value: false].

	1 to: size do: [:index |
		(self ___container at: index) = (otherCollection ___container at: index) ifFalse: [^bool ___value: false]].
	^bool ___value: true
%
category: 'Python'
method: Container
__ge__: otherCollection
	^(self __gt__: otherCollection) or: [self __eq__: otherCollection ]
%
category: 'Python'
method: Container
__getitem__: aPyIndex
	| index |
	index := aPyIndex ___value < 0 ifTrue: [self __len__ ___value + aPyIndex ___value] ifFalse: [aPyIndex ___value].
	(index < 0 or: [	index >= self __len__ ___value])
		ifTrue: [IndexError signal: self ___typeName, ' index out of range'].

	^self ___container at: index + 1
%
category: 'Python'
method: Container
__getslice__: aPyIntStart _: aPyIntEnd

	^self class ___value: (self ___getslice: aPyIntStart _: aPyIntEnd)
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

	{ Container }
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
__init__

	container := self class ___containerClass new.
%
category: 'Python'
method: Container
__le__: otherCollection
	^(self __gt__: otherCollection) not
%
category: 'Python'
method: Container
__len__

	^(int ___value: self ___size)
%
category: 'Python'
method: Container
__lt__: otherCollection
	^(self __gt__: otherCollection) not and: [self __ne__: otherCollection]
%
category: 'Python'
method: Container
__mul__: aPyIntMultiplier
	| newList |
	 newList := OrderedCollection new.

	aPyIntMultiplier ___value timesRepeat: [
		newList addAll: container
	].

	^self class new ___value: newList
%
category: 'Python'
method: Container
__ne__: otherCollection
	^bool ___value: ((self __eq__: otherCollection) ___value bitXor: 1)
%
category: 'Python'
method: Container
__repr__

	^self printString
%
category: 'Python'
method: Container
__rmul__: aPyIntMultiplier
	^self __mul__: aPyIntMultiplier
%
category: 'Python'
method: Container
clear

	^self ___container removeAll: self ___container.
%
category: 'Python'
method: Container
copy

	^self class ___value: container copy
%
category: 'Python'
method: Container
count: aPyObject

	^(self ___container select: [:each | each == aPyObject]) size
%
category: 'Python'
method: Container
index: aPythonObject
	^self index: aPythonObject from: (int ___value: 1).
%
category: 'Python'
method: Container
index: aPythonObject from: aPyIntStart
	^self index: aPythonObject from: aPyIntStart to: self __len__
%
category: 'Python'
method: Container
index: aPythonObject from: aPyIntStart to: aPyIntEnd

	^int ___value: (((self ___getslice: aPyIntStart _: aPyIntEnd)
		indexOf: aPythonObject
		ifAbsent: [ValueError signal: aPythonObject ___value printString, ' is not in ', self ___typeName]
				) - 1 + aPyIntStart ___value)
%
set compile_env: 0
category: 'Smalltalk'
method: Container
___container
	^container
%
category: 'Smalltalk'
method: Container
___getslice: aPyIntStart _: aPyIntEnd

	| subset x y |
	x := aPyIntStart ___value.
	y := aPyIntEnd ___value.

	x < 0 ifTrue: [
		x := container size + x.
	].

	y < 0 ifTrue: [
		y := container size + y.
	].

	subset := self ___container copy.
	(y < subset size) ifTrue: [
		subset removeFrom: y + 1 to: subset size.
	].
	x > 0 ifTrue: [
		subset removeFrom: 1 to: x.
	].
	^subset
%
category: 'Smalltalk'
method: Container
___size

	^self ___container size
%
category: 'Smalltalk'
method: Container
___value
	^container
%
category: 'Smalltalk'
method: Container
___value: aCollection

	container := (self class ___containerClass withAll: aCollection).
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
