! ------------------- Remove existing behavior from Container
removeallmethods Container
removeallclassmethods Container
! ------------------- Class methods for Container
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
category: 'Python'
method: Container
__add__: aList
	"Only accept containers of the same type (tuple + tuple, list + list, etc.)"

	| newContainer otherTypeName |

	(aList class == self class)
		ifFalse: [
			"Get the type name - use ___typeName for Python objects, class name for Smalltalk objects"
			otherTypeName := (aList respondsTo: #___typeName)
				ifTrue: [aList ___typeName]
				ifFalse: [aList class name].
			TypeError signal: 'can only concatenate ', self ___typeName , ' (not "', otherTypeName,'") to ', self ___typeName
		].

	"Build a new mutable container with elements from both, then create the result.
	 This works for both mutable (list) and immutable (tuple) containers."
	newContainer := OrderedCollection new.
	newContainer addAll: container.
	newContainer addAll: aList ___container.

	^self class new ___value: newContainer
%
category: 'Python'
method: Container
__bool__

	^bool ___value: (self ___container size) ~= 0
%
category: 'Python'
method: Container
__contains__: aPyObject

	container do: [:each |
		(each __eq__: aPyObject) ___value ifTrue: [
			^True
		].
	].
	^False
%
category: 'Python'
method: Container
__eq__: otherCollection

	| size |

	(self class = otherCollection class) ifFalse: [^False].

	(size := self __len__ ___value) = otherCollection __len__ ___value ifFalse: [^False].

	1 to: size do: [:index |
		(self ___container at: index) = (otherCollection ___container at: index) ifFalse: [^False]].
	^True
%
category: 'Python'
method: Container
__ge__: otherCollection

	^(self __gt__: otherCollection) ___or: [self __eq__: otherCollection]
%
category: 'Python'
method: Container
__getitem__: aPyIndex

	| index |

	"Handle slice object"
	(aPyIndex isKindOf: slice) ifTrue: [
		^self ___getslice: aPyIndex start _: aPyIndex stop _: aPyIndex step
	].

	"Handle integer index"
	index := aPyIndex ___value < 0 ifTrue: [self __len__ ___value + aPyIndex ___value] ifFalse: [aPyIndex ___value].
	(index < 0 or: [	index >= self __len__ ___value])
		ifTrue: [IndexError signal: self ___typeName, ' index out of range'].

	^self ___container at: index + 1
%
category: 'Python'
method: Container
__gt__: otherCollection

	| size |

	size := self ___container size min: otherCollection ___container size.

	1 to: size do: 	[:index |
			| selfElement otherElement |
			selfElement := self ___container at: index.
			otherElement := otherCollection ___container at: index.
			(selfElement __gt__: otherElement) ___value ifTrue: [^True].
			(selfElement __lt__: otherElement) ___value ifTrue: [^False]
		].

	^self ___container size > otherCollection ___container size ifTrue: [True] ifFalse: [False]
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

	aMultiplier -1 timesRepeat: [
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

	^(self __gt__: otherCollection) __not__
%
category: 'Python'
method: Container
__len__

	^(int ___value: self ___size)
%
category: 'Python'
method: Container
__lt__: otherCollection

	^(self __gt__: otherCollection) __not__ ___and: [self __ne__: otherCollection]
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

	^(self __eq__: otherCollection) __not__
%
category: 'Python'
method: Container
__repr__

	| stream |

	stream := WriteStream on: String new.
	stream nextPut: $[.
	stream nextPutAll: container removeFirst __repr__.
	container do: [:elem |
		stream 
			nextPutAll: ', ';
			nextPutAll: elem __repr__ ___value;
			yourself.
	].
	stream nextPut: $].

	^str ___value: stream contents
%
category: 'Python'
method: Container
__rmul__: aPyIntMultiplier

	^self __mul__: aPyIntMultiplier
%
category: 'Python'
method: Container
clear

	^self ___container removeAll: self ___container
%
category: 'Python'
method: Container
copy

	^self class ___value: container copy
%
category: 'Python'
method: Container
count: aPyObject

	^(self ___container select: [:each | each = aPyObject]) size
%
category: 'Python'
method: Container
index: aPythonObject

	^self index: aPythonObject from: (int ___value: 1)
%
category: 'Python'
method: Container
index: aPythonObject from: aPyIntStart

	^self index: aPythonObject from: aPyIntStart to: self __len__
%
category: 'Python'
method: Container
index: aPythonObject from: aPyIntStart to: aPyIntEnd

	^int ___value: (((self ___getslice: aPyIntStart _: aPyIntEnd) ___container
		indexOf: aPythonObject
		ifAbsent: [ValueError signal: aPythonObject ___value printString, ' is not in ', self ___typeName]
				) - 1 + aPyIntStart ___value)
%
category: 'Smalltalk'
method: Container
___asIterableForFor

	^container
%
category: 'Smalltalk'
method: Container
___container

	^container
%
category: 'Smalltalk'
method: Container
___getslice: aPyIntStart _: aPyIntEnd

	"Delegate to 3-argument version with None step"
	^self ___getslice: aPyIntStart _: aPyIntEnd _: None
%
category: 'Smalltalk'
method: Container
___getslice: aPyIntStart _: aPyIntEnd _: aPyIntStep
	"Slice with step: s[i:j:k]"

	| start stop step result size |
	size := container size.

	"Handle None step - defaults to 1"
	step := aPyIntStep == None ifTrue: [1] ifFalse: [aPyIntStep ___value].
	step == 0 ifTrue: [ValueError signal: 'slice step cannot be zero'].

	"Handle None values for start and stop based on step direction"
	step > 0 ifTrue: [
		start := aPyIntStart == None ifTrue: [0] ifFalse: [aPyIntStart ___value].
		stop := aPyIntEnd == None ifTrue: [size] ifFalse: [aPyIntEnd ___value].
	] ifFalse: [
		start := aPyIntStart == None ifTrue: [size - 1] ifFalse: [aPyIntStart ___value].
		stop := aPyIntEnd == None ifTrue: [-1 - size] ifFalse: [aPyIntEnd ___value].
	].

	"Handle negative indices"
	start < 0 ifTrue: [start := (size + start) max: 0].
	stop < 0 ifTrue: [stop := size + stop].

	"Clamp to valid range"
	step > 0 ifTrue: [
		start := start min: size.
		stop := stop min: size.
	] ifFalse: [
		start := start min: (size - 1).
		stop := (stop max: -1).
	].

	"Build result"
	result := OrderedCollection new.
	step > 0 ifTrue: [
		| i |
		i := start.
		[i < stop] whileTrue: [
			result add: (container at: i + 1).
			i := i + step.
		].
	] ifFalse: [
		| i |
		i := start.
		[i > stop] whileTrue: [
			result add: (container at: i + 1).
			i := i + step.
		].
	].

	^self class ___value: result
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

	"If the collection is already the right type, just use it directly.
	 Otherwise, create a new container from the collection."
	container := (aCollection class == self class ___containerClass)
		ifTrue: [aCollection]
		ifFalse: [self class ___containerClass withAll: aCollection].
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
