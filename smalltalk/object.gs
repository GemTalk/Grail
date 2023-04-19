! ------------------- Remove existing behavior from object
removeAllMethods object
removeAllClassMethods object
! ------------------- Class methods for object
set compile_env: 0
category: 'other'
classmethod: object
__str__
	"<class '__main__.MyClass'>"
	| stream |
	stream := (WriteStream on: Unicode7 new)
		nextPutAll: '<class ''';
		nextPutAll: name;
		nextPutAll: '''>';
		yourself.
	^str ___value: stream contents
%
set compile_env: 0
category: 'Python'
classmethod: object
__call__
	"In Python the first parameter is the class, but in Smalltalk we are in the class already.
	To require the class here would imply that we should pass in the object as the first
	parameter to every instance method, and that seems silly. So, part of translating
	Python to Smalltalk is to remove that parameter (if it is called explicitly).

	What we really want is the argument passed to the class as a constructor."

	^self __new__
		__init__;
		yourself
%
category: 'Python'
classmethod: object
__new__

	^self basicNew
%
category: 'Python'
classmethod: object
__new__: anObject

	TypeError signal: 'object.__new__(' , anObject name , ') is not safe, use ' , anObject name , '.__new__()'.
%
set compile_env: 0
category: 'Smalltalk'
classmethod: object
___dir

	^self ___pyProtocol asSortedCollection asArray collect: [:each |
		| index |
		index := each indexOf: $:.
		index == 0 ifTrue: [index := each size + 1].
		str ___value: (each copyFrom: 1 to: index - 1) asString.
	]
%
category: 'Smalltalk'
classmethod: object
___pyProtocol

	| set |
	set := self == object
		ifTrue: [Set new]
		ifFalse: [self superclass ___pyProtocol].
	self categorysDo: [:catName :catMethods |
		(catName beginsWith: 'Python') ifTrue: [
			set addAll: catMethods.
		].
	].
	self class categorysDo: [:catName :catMethods |
		(catName beginsWith: 'Python') ifTrue: [
			set addAll: catMethods.
		].
	].
	^set
%
category: 'Smalltalk'
classmethod: object
doesNotUnderstand: aMessageDescriptor
"
If you pass in too many arguments, python will ignore the extra ones.
In Smalltalk we don't have optional arguments, so we just keep cutting off the end
of the keyword selector until we find a method that exists.
"

	| args index selector |

	selector := aMessageDescriptor selector.
	selector == #'compileMethod:category:using:environmentId:' ifTrue: [
		^super doesNotUnderstand: aMessageDescriptor
	].
	selector := selector asString reverse.
	args := aMessageDescriptor arguments.
	index := selector indexOf: $:.
	index == 0 ifTrue: [ ^super doesNotUnderstand: aMessageDescriptor ].
	index := selector indexOf: $: startingAt: 2.
	^self 
		perform: ((selector copyFrom: index to: selector size) reverse asSymbol) 
		withArguments: (args copyFrom: 1 to: args size - 1).
%
! ------------------- Instance methods for object
set compile_env: 0
category: 'other'
method: object
___addFloat: aFloat

	TypeError signal: 'TypeError: unsupported operand type(s) for +: ''float'' and ''', self class asString,''''.
%
category: 'other'
method: object
___addInt: anInteger

	TypeError signal: 'TypeError: unsupported operand type(s) for +: ''int'' and ''', self class asString,''''.
%
category: 'other'
method: object
___addReal: aFloatReal imag: aFloatImag

	TypeError signal: 'TypeError: unsupported operand type(s) for +: ''complex'' and ''', self class asString,''''.
%
category: 'other'
method: object
___convertWithFlags: aSet precision: anObject andType: aCharacter

	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	|validTypes invalidTypes return|
	validTypes := {$a. $s. $r. $c} asSet.
	invalidTypes := {
			$d->[TypeError signal: 'TypeError: %d format: a real number is required, not str'].
			$i->[TypeError signal: 'TypeError: %i format: a real number is required, not str'].
			$u->[TypeError signal: 'TypeError: %u format: a real number is required, not str'].
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$f->[TypeError signal: 'TypeError: must be real number, not str'].
			$F->[TypeError signal: 'TypeError: must be real number, not str'].
			$e->[TypeError signal: 'TypeError: must be real number, not str'].
			$E->[TypeError signal: 'TypeError: must be real number, not str'].
			$g->[TypeError signal: 'TypeError: must be real number, not str'].
			$G->[TypeError signal: 'TypeError: must be real number, not str'].
		} asDictionary.

	(validTypes includes: aCharacter) ifFalse:[
		(invalidTypes at: aCharacter) value.
	].

	return := self __str__ ___value.
	(aCharacter == $r or:[aCharacter == $a])
		ifTrue:[
			return := self __repr__ ___value
		].

	((aCharacter == $c) and:[ return size > 1]) ifTrue:[
		TypeError signal: 'TypeError: %c requires int or char'
	].

	(anObject ~= '' and: [anObject < (return size)]) ifFalse:[ return := return copyFrom: 1 to: return size].
	^return
%
category: 'other'
method: object
___modFloat: aFloat

	TypeError signal: 'TypeError: unsupported operand type(s) for %: ''float'' and ''', self class asString,''''.
%
category: 'other'
method: object
___modInt: anInteger

	TypeError signal: 'TypeError: unsupported operand type(s) for %: ''int'' and ''', self class asString,''''.
%
category: 'other'
method: object
___modString: aString
	
	^ (tuple ___value: {self}) ___modString: aString.
%
category: 'other'
method: object
___modString: aString parameters: anOrderedCollection

	"a string is the string to be formated and anInteger is the number of % that need an argument"
	(anOrderedCollection size) = 0 ifTrue: [^str ___value: aString].
	TypeError signal: 'TypeError: %i format: a real number is required, not list'
%
category: 'other'
method: object
___mulFloat: anObject

	TypeError signal: 'TypeError: unsupported operand type(s) for *: ''float'' and ''', anObject class asString,''''.
%
category: 'other'
method: object
___mulInt: anObject

	TypeError signal: 'TypeError: unsupported operand type(s) for *: ''int'' and ''', anObject class asString,''''.
%
category: 'other'
method: object
___mulReal: aFloatReal imag: aFloatImag

	TypeError signal: 'TypeError: unsupported operand type(s) for *: ''complex'' and ''', self class asString,''''.
%
category: 'other'
method: object
___powFloat: aFloat

	TypeError signal: 'TypeError: unsupported operand type(s) for **: ''float'' and ''', self class asString,''''.
%
category: 'other'
method: object
___powInt: anInteger

	TypeError signal: 'TypeError: unsupported operand type(s) for **: ''int'' and ''', self class asString,''''.
%
category: 'other'
method: object
___powReal: aFloatReal imag: aFloatImag

	TypeError signal: 'TypeError: unsupported operand type(s) for **: ''complex'' and ''', self class asString,''''.
%
category: 'other'
method: object
___truedivFloat: aFloat

	TypeError signal: 'TypeError: unsupported operand type(s) for /: ''float'' and ''', self class asString,''''.
%
category: 'other'
method: object
___truedivInt: anInteger

	TypeError signal: 'TypeError: unsupported operand type(s) for /: ''int'' and ''', self class asString,''''.
%
category: 'other'
method: object
___truedivReal: aFloatReal imag: aFloatImag

	TypeError signal: 'TypeError: unsupported operand type(s) for /: ''complex'' and ''', self class asString,''''.
%
category: 'other'
method: object
__round__

	TypeError signal: 'TypeError: type ', self class asString , ' doesn''t define __round__ method'
%
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

 	^list ___value: self class ___dir
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
	^bool ___value: self == anObject
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
%
category: 'Python'
method: object
__init__: firstArg

	"self ___initArgs: { firstArg }"
	TypeError signal: 'object.__init__() takes exactly one argument (the instance to initialize)'
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

	^str ___value: '<', self class name, ' object at ' , self identityHash printString , '>'
%
category: 'Python'
method: object
__setattr__: aKey _: aValue

	| symbol |
	symbol := aKey ___string asSymbol.
	(self __dir__ __contains__: aKey) ___value ifTrue: [
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
category: 'Python'
method: object
is_: anObject

	^bool ___value: self ___value == anObject ___value.
%
category: 'Python'
method: object
is_not: anObject

	^bool ___value: (self ___value == anObject ___value) not
%
set compile_env: 0
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
	(self __eq__: other) ___value ifTrue: [
		^true
	].
	^false
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
doesNotUnderstand: aMessageDescriptor
"
If you pass in too many arguments, python will ignore the extra ones.
In Smalltalk we don't have optional arguments, so we just keep cutting off the end
of the keyword selector until we find a method that exists.
"

	| args index selector |

	selector := aMessageDescriptor selector asString reverse.
	args := aMessageDescriptor arguments.
	index := selector indexOf: $:.
	index == 0 ifTrue: [ ^super doesNotUnderstand: aMessageDescriptor ].
	index := selector indexOf: $: startingAt: 2.
	^self 
		perform: ((selector copyFrom: index to: selector size) reverse asSymbol) 
		withArguments: (args copyFrom: 1 to: args size - 1).
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
		nextPutAll: self __repr__ ___value
%
