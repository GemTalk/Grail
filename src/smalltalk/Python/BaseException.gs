! ------------------- Superclass check
run
(Globals at: #Exception) ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- NOTE: All Python exceptions are now created as Python classes
! ------- to ensure proper inheritance from BaseException and access to __new__ methods.
! ------- Previously, some exceptions were mapped to GemStone classes, but this
! ------- broke the inheritance chain and prevented access to Python exception methods.

! ===============================================================================
! Python Exception Class Definitions (as DataCurator)
! ===============================================================================
! Define Python exception classes BEFORE switching to SystemUser.
! This ensures that exception classes like IndexError, ValueError, TypeError
! are available when we import methods for base classes (which may reference them).
! We use GemStone's Exception as the base for Python's BaseException to ensure
! compatibility with GemStone's exception handling mechanism.
! ===============================================================================

! ------- BaseException (Python's root exception class)
expectvalue /Class
doit
(Globals at: #Exception) subclass: 'BaseException'
  instVarNames: #( args )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BaseException comment:
'Python BaseException - root of Python exception hierarchy.

This is the base class for all built-in exceptions in Python.
It inherits from GemStone''s Exception to integrate with GemStone''s
exception handling mechanism.

Instance variables:
  args - tuple of arguments passed to the exception constructor
         (Note: This is separate from GemStone''s gsArgs instance variable)
'
%

expectvalue /Class
doit
BaseException category: 'Grail-Exceptions'
%

! ===============================================================================
! BaseException Methods (Python 'BaseException' type)
! ===============================================================================
! This file contains method implementations for the BaseException class,
! which is the root of Python's exception hierarchy.
!
! BaseException inherits from GemStone's Exception to integrate with GemStone's
! exception handling mechanism.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from BaseException
expectvalue /Metaclass3
doit
BaseException removeAllMethods: 1.
BaseException class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: BaseException
__new__
	"``ExceptionClass()`` as an expression — the class-call fast path
	(CallAst >> printBareCallClassNewOn:) emits ``(cls @env1:__new__)``
	with the exception class as the RECEIVER and the constructor
	arguments as the keyword arguments.  Construct without signaling:
	``e = ValueError(); raise e`` signals later via RaiseAst's
	``@env0:signal`` form.

	NOTE: the previous ``__new__: cls`` / ``__new__: cls _: anArray``
	forms here followed the explicit-cls convention of a dispatcher
	that prepended the class argument; through the fast path that
	bound the FIRST CONSTRUCTOR ARGUMENT as ``cls`` and sent
	``___new___`` to a string.  No senders of the old forms remain."

	| instance |
	instance := self ___new___.
	instance ___args___: #().
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1
	"``ExceptionClass(arg)`` as an expression — one constructor argument."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2
	"``ExceptionClass(a, b)`` as an expression."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2 _: arg3
	"``ExceptionClass(a, b, c)`` as an expression."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2. arg3 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2 _: arg3 _: arg4 _: arg5
	"``ExceptionClass(a, b, c, d, e)`` as an expression —
	UnicodeDecodeError / UnicodeEncodeError take five arguments."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2. arg3. arg4. arg5 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
___signal___: message
	"Create and signal an exception with proper Python args."

	| instance |
	instance := self ___new___.
	instance ___args___: { message }.
	instance ___signal___: message.
%

set compile_env: 0
category: 'Grail-Initialization'
classmethod: BaseException
___hasUserInit___
	"True if this class defines its OWN Python __init__ (any arity) somewhere
	below BaseException — i.e. a user-defined exception (or a library one like
	werkzeug's HTTPException/BuildError) that must run __init__ when raised.
	Built-in exceptions inherit BaseException's __init__ and return false."

	| c |
	c := self.
	[c notNil and: [c ~~ BaseException]] whileTrue: [
		| md |
		md := c methodDictForEnv: 1.
		((md includesKey: #'__init__')
			or: [(md includesKey: #'__init__:')
			or: [(md includesKey: #'__init__:_:')
			or: [(md includesKey: #'__init__:_:_:')
			or: [md includesKey: #'___init__:kw:']]]])
				ifTrue: [^ true].
		c := c superclass.
	].
	^ false
%
set compile_env: 1

category: 'Grail-Initialization'
classmethod: BaseException
___signalNew___: positional kw: kwargs
	"``raise Cls(*positional, **kwargs)`` — construct with the FULL args tuple,
	run any user-defined __init__ (the plain ___signal___: path skips __init__
	and keeps only the first arg), then signal.  Built-in exceptions inherit
	BaseException's __init__ so they skip the __init__ call but still receive
	the complete args tuple."

	| instance |
	instance := self ___new___.
	instance ___args___: positional.
	(self @env0:___hasUserInit___) ifTrue: [
		(instance ___pyAttrLoad___: #'__init__') value: positional value: kwargs
	].
	"Signal WITH a message so GemStone's ``messageText'' / ``description''
	carry it -- the old ___signal___: path set this, and a bare ``signal''
	would leave it nil (``ValueError(''x'') description'' would drop the
	''x'').  Use the first positional argument, exactly as the old path
	did: it's the conventional exception message and avoids invoking the
	exception's ``__str__'', which can touch attributes a user __init__
	hasn't set (e.g. itsdangerous BadData.__str__ reading self.message)
	and would raise the WRONG exception out of a raise."
	^ instance ___signal___:
		((positional @env0:isEmpty) ifTrue: [''] ifFalse: [positional @env0:at: 1])
%

category: 'Grail-Private'
method: BaseException
___args___: anArray
	"Setter for args instance variable."

	args := anArray
%

category: 'Grail-Exception Chaining'
method: BaseException
__cause__
	"Return the exception that was the direct cause of this exception.
	Set via 'raise ... from ...' syntax."

	^ None  "TODO: implement exception chaining"
%

category: 'Grail-Exception Chaining'
method: BaseException
__context__
	"Return the exception context (the exception that was being handled
	when this exception was raised)."

	^ None  "TODO: implement exception context"
%

category: 'Grail-Comparison'
method: BaseException
__eq__: other
	"Compare exceptions for equality.
	Two exceptions are equal if they are the same class and have the same args."

	| myClass otherClass myArgs otherArgs |
	myClass := self @env0:class.
	otherClass := other @env0:class.

	myClass == otherClass ifFalse: [ ^ false ].

	myArgs := self @env1:args.
	otherArgs := other @env1:args.

	^ myArgs @env0:= otherArgs
%

category: 'Grail-Initialization'
method: BaseException
__init__
	"Initialize with no arguments."

	args := #().
	^ None
%

category: 'Grail-Initialization'
method: BaseException
__init__: a
	"Initialize with arguments.
	a should be a tuple (Array) of arguments."

	a ifNil: [ args := #() ] ifNotNil: [ args := a ].
	^ None
%

category: 'Grail-Comparison'
method: BaseException
__ne__: other
	"Compare exceptions for inequality."

	| result |
	result := self __eq__: other.
	^ result @env0:not
%

category: 'Grail-String Representation'
method: BaseException
__repr__
	"Return a detailed string representation of the exception."
	
	| className argsArray stream |
	className := (self @env0:class) @env0:name.
	argsArray := self @env1:args.
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	
	stream @env0:nextPutAll: className.
	stream @env0:nextPut: $(.
	
	((argsArray @env0:size) @env0:> 0) ifTrue: [
		argsArray @env0:doWithIndex: [:arg :idx |
			| argRepr |
			(idx @env0:> 1) ifTrue: [
				stream @env0:nextPutAll: ', '.
			].
			argRepr := arg @env0:asString.
			(arg isKindOf: Unicode7) ifTrue: [
				stream @env0:nextPut: $'.
				stream @env0:nextPutAll: argRepr.
				stream @env0:nextPut: $'.
			] ifFalse: [
				stream @env0:nextPutAll: argRepr.
			].
		].
	].
	
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-String Representation'
method: BaseException
__str__
	"Return a string representation of the exception.
	If args is empty, return empty string.
	If args has one element, return str of that element.
	Otherwise, return str of the args tuple."
	
	| argsArray size |
	argsArray := self @env1:args.
	size := argsArray @env0:size.
	
	size == 0 ifTrue: [ ^ '' ].
	size == 1 ifTrue: [
		^ ((argsArray @env0:at: 1) @env0:asString) @env0:asUnicodeString
	].
	^ (argsArray @env0:asString) @env0:asUnicodeString
%

category: 'Grail-Exception Chaining'
method: BaseException
__suppress_context__
	"Return whether to suppress the exception context in tracebacks."

	^ false  "TODO: implement context suppression"
%

category: 'Grail-Exception Chaining'
method: BaseException
__traceback__
	"Return the traceback object for this exception."

	^ nil  "TODO: implement traceback support"
%

category: 'Grail-Exception Methods'
method: BaseException
add_note: note
	"Add a note to the exception (Python 3.11+).
	Notes are displayed in the traceback."

	"TODO: implement exception notes"
	^ None
%

category: 'Grail-Attribute Access'
method: BaseException
args
	"Return the tuple of arguments passed to the exception."
	
	^ args ifNil: [ #() ]
%

category: 'Grail-Exception Methods'
method: BaseException
with_traceback: tb
	"Set the traceback for this exception and return self.
	This is used to set the traceback when re-raising an exception."

	"TODO: implement traceback setting"
	^ self
%

set compile_env: 0
