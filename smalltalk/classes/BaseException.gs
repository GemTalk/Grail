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
	instance := cls perform: #new env: 0.
	instance perform: #___args: env: 0 withArguments: { #() }.
	^ instance
%

category: 'Python-Initialization'
classmethod: BaseException
__new__: cls _: anArray
	"Create a new BaseException instance with arguments.
	anArray should be a tuple (Array) of arguments."
	
	| instance |
	instance := cls perform: #new env: 0.
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
	size := argsArray perform: #size env: 0.
	
	size == 0 ifTrue: [ ^ '' ].
	size == 1 ifTrue: [
		^ ((argsArray perform: #at: env: 0 withArguments: { 1 }) perform: #asString env: 0) perform: #asUnicodeString env: 0
	].
	^ (argsArray perform: #asString env: 0) perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: BaseException
__repr__
	"Return a detailed string representation of the exception."
	
	| className argsArray stream |
	className := (self perform: #class env: 0) perform: #name env: 0.
	argsArray := self perform: #args env: 2.
	stream := WriteStream perform: #on: env: 0 withArguments: { Unicode7 perform: #new env: 0 }.
	
	stream with: className perform: #nextPutAll: env: 0.
	stream with: $( perform: #nextPut: env: 0.
	
	((argsArray perform: #size env: 0) with: 0 perform: #> env: 0) ifTrue: [
		argsArray perform: #doWithIndex: env: 0 withArguments: { [:arg :idx |
			| argRepr |
			(idx with: 1 perform: #> env: 0) ifTrue: [
				stream with: ', ' perform: #nextPutAll: env: 0.
			].
			argRepr := arg perform: #asString env: 0.
			(arg perform: #isKindOf: env: 0 withArguments: { Unicode7 }) ifTrue: [
				stream with: $' perform: #nextPut: env: 0.
				stream with: argRepr perform: #nextPutAll: env: 0.
				stream with: $' perform: #nextPut: env: 0.
			] ifFalse: [
				stream with: argRepr perform: #nextPutAll: env: 0.
			].
		] }.
	].
	
	stream with: $) perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
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
	myClass := self perform: #class env: 0.
	otherClass := other perform: #class env: 0.

	myClass == otherClass ifFalse: [ ^ false ].

	myArgs := self perform: #args env: 2.
	otherArgs := other perform: #args env: 2.

	^ myArgs perform: #= env: 0 withArguments: { otherArgs }
%

category: 'Python-Comparison'
method: BaseException
__ne__: other
	"Compare exceptions for inequality."

	| result |
	result := self perform: #__eq__: env: 2 withArguments: { other }.
	^ result perform: #not env: 0
%

! ------------------- Smalltalk-side methods (env 0)
set compile_env: 0

category: 'Smalltalk'
method: BaseException
___args: anArray
	"Smalltalk-side setter for args instance variable."

	args := anArray
%


