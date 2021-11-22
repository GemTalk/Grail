! ------------------- Remove existing behavior from object
removeAllMethods object
removeAllClassMethods object
! ------------------- Class methods for object
set compile_env: 0
category: 'done'
classmethod: object
___dir
	^ self ___pyProtocol
		collect: [ :each |
			( each truncateTo: ( each indexOf: $: ifAbsent: [ each size  + 1] ) - 1 ) asString.
		]
%
set compile_env: 0
category: 'Python'
classmethod: object
__new__

	^ self __new__: self
%
category: 'Python'
classmethod: object
__new__: aPyClass

	( ( self = aPyClass) or: [ self subclasses includes: aPyClass ] )
		ifFalse: [ TypeError signal: self name, '.__new__(', aPyClass name,') is not safe, use ', aPyClass name,'.__new__()' ].
	^ self basicNew
%
set compile_env: 0
category: 'Smalltalk'
classmethod: object
___new__init__
	^ self __new__
			__init__
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam
	^ self __new__
			__init__: firstParam
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam _: secondParam
	^ self __new__
			__init__: firstParam _: secondParam
%
category: 'Smalltalk'
classmethod: object
___new__init__: firstParam _: secondParam _: thirdParam
	^ self __new__
			__init__: firstParam _: secondParam  _: thirdParam
%
category: 'Smalltalk'
classmethod: object
___pyProtocol
	^ ( self == object ifTrue: [  Set new ]
								ifFalse: [ self superclass ___pyProtocol ] )
		addAll: ( ( self methodsInProtocol: #Python ) collect: [ :each | each selector ] );
		addAll: ( ( self class methodsInProtocol: #Python ) collect: [ :each | each selector ] );
		yourself
%
category: 'Smalltalk'
classmethod: object
new
	^ self __new__
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

	TypeError signal: 'can''t delete ' , name , ' attribute'.
%
category: 'Python'
method: object
__dir__

 	^ list ___new__init__: self class ___dir
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
	^ self == anObject
%
category: 'Python'
method: object
__format__: aString

	aString notEmpty ifTrue: [
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
	symbol := aString asSymbol.
	(self class selectors includes: aString asSymbol) ifTrue: [
		^self ___perform: symbol
	].
	AttributeError signal: self __class__ name asString, ' object has no attribute ', aString.
%
category: 'Python'
method: object
__gt__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: object
__hash__

	^ self identityHash printString
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

	^ '<', self class name, ' object at ' , self identityHash printString , '>'
%
category: 'Python'
method: object
__setattr__: aKey _: aValue

	| symbol |
	symbol := aKey asSymbol.
	( self __dir__ __contains__: aKey ) ifTrue: [
      	AttributeError signal: self __class__ name asString printString, ' object attribute ', aKey printString , ' is read-only'.
   ].

	AttributeError signal: self __class__ name asString printString, ' object has no attribute ', aKey printString .
%
category: 'Python'
method: object
__sizeof__

	^ 16
%
category: 'Python'
method: object
__str__

	^ self __repr__
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
	^ self ___perform: aSymbol withArguments: (Array new: 0)
%
category: 'Smalltalk'
method: object
___perform: selector withArguments: argArray
	"Send the selector, aSymbol, to the receiver with arguments in argArray.
	Fail if the number of arguments expected by the selector
	does not match the size of argArray.
	Primitive. Optional. See Object documentation whatIsAPrimitive."

	<reflective: #object:performMessageWithArgs:>
	"<primitive: 84>"
	^ self perform: selector withArguments: argArray inSuperclass: self class
%
category: 'Smalltalk'
method: object
___yourself
%
category: 'Smalltalk'
method: object
= other
	^ self __eq__: other
%
category: 'Smalltalk'
method: object
asCollectionElement
%
category: 'Smalltalk'
method: object
asString
	"Answer a string that represents the receiver."

	^ self printString
%
category: 'Smalltalk'
method: object
basicInspect
	^ Smalltalk tools basicInspector inspect: self
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

	^ String streamContents: [:s | self printOn: s]
%
category: 'Smalltalk'
method: object
gtDebuggerSUnitPrint
	"I return a textual representation of the object that is used by the SUnit debugger to compare objects using a textual diff."

	^ self printString
%
category: 'Smalltalk'
method: object
gtDisplayString
	"I return a textual representation of the object that is used by the SUnit debugger to compare objects using a textual diff."

	^ self printString
%
category: 'Smalltalk'
method: object
hash
	"Answer a SmallInteger whose value is related to the receiver's identity.
	May be overridden, and should be overridden in any classes that define = "

	^ self identityHash
%
category: 'Smalltalk'
method: object
inspect
	"Create and schedule an Inspector in which the user can examine the receiver's variables."
	^ Smalltalk tools inspector inspect: self
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
