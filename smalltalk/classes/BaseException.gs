! ===============================================================================
! BaseException Methods (Python 'BaseException' type)
! ===============================================================================
! This file contains method implementations for the BaseException class,
! which is the root of Python's exception hierarchy.
!
! BaseException inherits from GemStone's Exception to integrate with GemStone's
! exception handling mechanism.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from BaseException
removeallmethods BaseException
removeallclassmethods BaseException

! ------------------- Class methods for BaseException
set compile_env: 2

category: 'Python-Initialization'
classmethod: BaseException
__new__: cls
	"Create a new BaseException instance with no arguments."
	
	| instance |
	instance := cls ___new___.
	instance perform: #___args: env: 0 withArguments: { #() }.
	^ instance
%

category: 'Python-Initialization'
classmethod: BaseException
__new__: cls _: anArray
	"Create a new BaseException instance with arguments.
	anArray should be a tuple (Array) of arguments."
	
	| instance |
	instance := cls ___new___.
	instance 
		perform: #___args: 
		env: 0 
		withArguments: { anArray ifNil: [ #() ] }.
	^ instance
%

! ------------------- Instance methods for BaseException
set compile_env: 2

category: 'Python-Initialization'
method: BaseException
__init__
	"Initialize with no arguments."
	
	args := #().
%

category: 'Python-Initialization'
method: BaseException
__init__: a
	"Initialize with arguments.
	a should be a tuple (Array) of arguments."
	
	a ifNil: [ args := #() ] ifNotNil: [ args := a ].
%

category: 'Python-Attribute Access'
method: BaseException
args
	"Return the tuple of arguments passed to the exception."
	
	^ args ifNil: [ #() ]
%

category: 'Python-String Representation'
method: BaseException
__str__
	"Return a string representation of the exception.
	If args is empty, return empty string.
	If args has one element, return str of that element.
	Otherwise, return str of the args tuple."
	
	| argsArray size |
	argsArray := self perform: #args env: 2.
	size := argsArray ___size___.
	
	size == 0 ifTrue: [ ^ '' ].
	size == 1 ifTrue: [
		^ ((argsArray ___at___: 1) ___asString___) ___asUnicodeString___
	].
	^ (argsArray ___asString___) ___asUnicodeString___
%

category: 'Python-String Representation'
method: BaseException
__repr__
	"Return a detailed string representation of the exception."
	
	| className argsArray stream |
	className := (self ___class___) ___name___.
	argsArray := self perform: #args env: 2.
	stream := WriteStream ___on___: (Unicode7 ___new___).
	
	stream ___nextPutAll___: className.
	stream ___nextPut___: $(.
	
	((argsArray ___size___) with: 0 perform: #> env: 0) ifTrue: [
		argsArray perform: #doWithIndex: env: 0 withArguments: { [:arg :idx |
			| argRepr |
			(idx with: 1 perform: #> env: 0) ifTrue: [
				stream ___nextPutAll___: ', '.
			].
			argRepr := arg ___asString___.
			(arg ___isKindOf___: Unicode7) ifTrue: [
				stream ___nextPut___: $'.
				stream ___nextPutAll___: argRepr.
				stream ___nextPut___: $'.
			] ifFalse: [
				stream ___nextPutAll___: argRepr.
			].
		]}.
	].
	
	stream ___nextPut___: $).
	^ stream ___contents___
%

category: 'Python-Exception Chaining'
method: BaseException
__cause__
	"Return the exception that was the direct cause of this exception.
	Set via 'raise ... from ...' syntax."
	
	^ nil  "TODO: implement exception chaining"
%

category: 'Python-Exception Chaining'
method: BaseException
__context__
	"Return the exception context (the exception that was being handled
	when this exception was raised)."
	
	^ nil  "TODO: implement exception context"
%

category: 'Python-Exception Chaining'
method: BaseException
__suppress_context__
	"Return whether to suppress the exception context in tracebacks."

	^ false  "TODO: implement context suppression"
%

category: 'Python-Exception Chaining'
method: BaseException
__traceback__
	"Return the traceback object for this exception."

	^ nil  "TODO: implement traceback support"
%

category: 'Python-Exception Methods'
method: BaseException
with_traceback: tb
	"Set the traceback for this exception and return self.
	This is used to set the traceback when re-raising an exception."

	"TODO: implement traceback setting"
	^ self
%

category: 'Python-Exception Methods'
method: BaseException
add_note: note
	"Add a note to the exception (Python 3.11+).
	Notes are displayed in the traceback."

	"TODO: implement exception notes"
	^ nil
%

category: 'Python-Comparison'
method: BaseException
__eq__: other
	"Compare exceptions for equality.
	Two exceptions are equal if they are the same class and have the same args."

	| myClass otherClass myArgs otherArgs |
	myClass := self ___class___.
	otherClass := other ___class___.

	myClass == otherClass ifFalse: [ ^ false ].

	myArgs := self perform: #args env: 2.
	otherArgs := other perform: #args env: 2.

	^ myArgs ___eq___: otherArgs
%

category: 'Python-Comparison'
method: BaseException
__ne__: other
	"Compare exceptions for inequality."

	| result |
	result := self __eq__: other.
	^ result ___not___
%

! ------------------- Smalltalk-side methods (env 0)
set compile_env: 0

category: 'Smalltalk'
method: BaseException
___args: anArray
	"Smalltalk-side setter for args instance variable."

	args := anArray
%


