! ------------------- Remove existing behavior from object
removeAllMethods object
removeAllClassMethods object
! ------------------- Class methods for object
set compile_env: 0
category: 'Python'
classmethod: object
__new__

	^self __new__: None
%
category: 'Python'
classmethod: object
__new__: anObject
	"In Python the first parameter is the class, but in Smalltalk we are in the class already.
	To require the class here would imply that we should pass in the object as the first
	parameter to every instance method, and that seems silly. So, part of translating
	Python to Smalltalk is to remove that parameter (if it is called explicitly).

	What we really want is the argument passed to the class as a constructor."

	^self basicNew
		__init__: anObject;
		yourself
%
set compile_env: 0
category: 'Smalltalk'
classmethod: object
___dir

	^self ___pyProtocol collect: [:each |
		| index |
		index := each indexOf: $:.
		index == 0 ifTrue: [index := each size + 1].
		str ___new__init__: (each copyFrom: 1 to: index - 1) asString.
	]
%
category: 'Smalltalk'
classmethod: object
___new__init__
	^self __new__
			__init__
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam
	^self __new__
			__init__: firstParam
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam _: secondParam
	^self __new__
			__init__: firstParam _: secondParam
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam _: secondParam _: thirdParam
	^self __new__
			__init__: firstParam _: secondParam  _: thirdParam
%
category: 'Smalltalk'
classmethod: object
___pyProtocol

	| set |
	set := self == object
		ifTrue: [Set new]
		ifFalse: [self superclass ___pyProtocol].
	(self includesCategory: #'Python') ifTrue: [set addAll: ((self selectorsIn: #'Python') collect: [:each | each asString])].
	(self class includesCategory: #'Python') ifTrue: [set addAll: ((self class selectorsIn: #'Python') collect: [:each | each asString])].
	^set
%
category: 'Smalltalk'
classmethod: object
new
	^self __new__
%
! ------------------- Instance methods for object
set compile_env: 0
category: 'Python'
method: object
__class__

	^self class
%
category: 'Python'
method: object
__delattr__: name

	TypeError signal: 'can''t delete ' , name ___string , ' attribute'.
%
category: 'Python'
method: object
__dir__

 	^list ___new__init__: self class ___dir
%
category: 'Python'
method: object
__doc__

	^'The base class of the class hierarchy.\n' ,
		'\n' ,
		'When called, it accepts no arguments and returns a new featureless\n' ,
		'instance that has no instance attributes and cannot be given any.\n'
%
category: 'Python'
method: object
__eq__: anObject

" 	<primitive: 110>
	self primitiveFailed"
	^self == anObject
%
category: 'Python'
method: object
__format__: aString

	aString ___string notEmpty ifTrue: [
		TypeError signal: 'unsupported format string passed to object.__format__'.
	].
	^self __str__
%
category: 'Python'
method: object
__ge__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__getattribute__: aString

	| symbol |
	symbol := aString ___string asSymbol.
	(self class selectors includes: aString ___string asSymbol) ifTrue: [
		^self ___perform: symbol
	].
	AttributeError signal: self __class__ name asString, ' object has no attribute ', aString ___string.
%
category: 'Python'
method: object
__gt__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__hash__

	^self identityHash printString
%
category: 'Python'
method: object
__init__

	self ___initArgs: {}
%
category: 'Python'
method: object
__init__: firstArg

	self ___initArgs: { firstArg }
%
category: 'Python'
method: object
__init__: firstArg _: secondArg

	self ___initArgs: { firstArg. secondArg }
%
category: 'Python'
method: object
__init__: firstArg _: secondArg _: thirdArg

	self ___initArgs: { firstArg. secondArg. thirdArg }
%
category: 'Python'
method: object
__le__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__lt__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__ne__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__repr__

	^'<', self class name, ' object at ' , self identityHash printString , '>'
%
category: 'Python'
method: object
__setattr__: aKey _: aValue

	| symbol |
	symbol := aKey ___string asSymbol.
	(self __dir__ __contains__: aKey) ifTrue: [
      	AttributeError signal: self __class__ name asString printString, ' object attribute ', aKey ___string printString , ' is read-only'.
  ].

	AttributeError signal: self __class__ name asString printString, ' object has no attribute ', aKey ___string printString .
%
category: 'Python'
method: object
__sizeof__

	^16
%
category: 'Python'
method: object
__str__

	^self __repr__
%
category: 'Python'
method: object
__subclasshook__

	^NotImplementedType singleton
%
set compile_env: 0
category: 'Smalltalk'
method: object
___initArgs: args
%
category: 'Smalltalk'
method: object
___perform: aSymbol
	"Send the unary selector, aSymbol, to the receiver.
	Fail if the number of arguments expected by the selector is not zero.
	Primitive. Optional. See Object documentation whatIsAPrimitive."

	<reflective: #object:performMessageWith:>
	"<primitive: 83>"
	^self ___perform: aSymbol withArguments: (Array new: 0)
%
category: 'Smalltalk'
method: object
___perform: selector withArguments: argArray

	^self perform: selector withArguments: argArray
%
category: 'Smalltalk'
method: object
___yourself
%
category: 'Smalltalk'
method: object
= other
	^self __eq__: other
%
category: 'Smalltalk'
method: object
asCollectionElement
%
category: 'Smalltalk'
method: object
asString
	"Answer a string that represents the receiver."

	^self printString
%
category: 'Smalltalk'
method: object
basicInspect
	^self error: 'inspect not supported'
%
category: 'Smalltalk'
method: object
basicSize
	"Primitive. Answer the number of indexable variables in the receiver.
	This value is the same as the largest legal subscript. Essential. Do not
	override in any subclass. See Object documentation whatIsAPrimitive."

	"<primitive: 62>"
	"The number of indexable fields of fixed-length objects is 0"
	^0
%
category: 'Smalltalk'
method: object
enclosedElement
%
category: 'Smalltalk'
method: object
fullPrintString
	"Answer a String whose characters are a description of the receiver."

	^String streamContents: [:s | self printOn: s]
%
category: 'Smalltalk'
method: object
gtDebuggerSUnitPrint
	"I return a textual representation of the object that is used by the SUnit debugger to compare objects using a textual diff."

	^self printString
%
category: 'Smalltalk'
method: object
gtDisplayString
	"I return a textual representation of the object that is used by the SUnit debugger to compare objects using a textual diff."

	^self printString
%
category: 'Smalltalk'
method: object
hash
	"Answer a SmallInteger whose value is related to the receiver's identity.
	May be overridden, and should be overridden in any classes that define = "

	^self identityHash
%
category: 'Smalltalk'
method: object
inspect
	"Create and schedule an Inspector in which the user can examine the receiver's variables."
	^self error: 'inspect not supported'
%
category: 'Smalltalk'
method: object
printOn: aStream
	"Append to the argument, aStream, a sequence of characters that
	identifies the receiver."

	| title |
	title := self class name.
	aStream
		nextPutAll: (title first isVowel ifTrue: ['an '] ifFalse: ['a ']);
		nextPutAll: title;
		nextPutAll: self __repr__
%
