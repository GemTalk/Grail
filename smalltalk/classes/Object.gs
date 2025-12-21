! ===============================================================================
! Object Methods (Python 'object' type)
! ===============================================================================
! This file contains method implementations for the Object class when used
! as the Python 'object' type. Since Object is a fundamental GemStone Smalltalk
! class, we only add Python-specific methods here.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from object
expectvalue /Metaclass3
doit
object removeAllMethods: 2.
object class removeAllMethods: 2.
%

! ------------------- Class methods for object
set compile_env: 2

category: 'Python-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls."

	^ self perform: #new env: 0
%

category: 'Python-Initialization'
classmethod: object
__init_subclass__
	"Called when a class is subclassed.
	This is a class method that receives the subclass as the receiver.
	Default implementation does nothing."

	^ nil
%

! ------------------- Instance methods for object
set compile_env: 2

category: 'Python-Attribute Access'
method: object
__class__
	"Return the class of this object (Python type)"

	^ self perform: #class env: 0
%

category: 'Python-Attribute Access'
method: object
__delattr__: name
	"Delete a named attribute. Called by del obj.name
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute deletion"
	self with: 'AttributeError: readonly attribute' perform: #error: env: 0
%

category: 'Python-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 2 (Python)."

	| selectors result myClass |
	myClass := self perform: #class env: 0.
	selectors := myClass perform: #allSelectorsForEnvironment: env: 0 withArguments: { 2 }.
	result := selectors perform: #collect: env: 0 withArguments: { [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector perform: #indexOf: env: 0 withArguments: { $: }.
		index == 0
			ifTrue: [selector perform: #asString env: 0]
			ifFalse: [selector perform: #copyFrom:to: env: 0 withArguments: { 1. (index perform: #- env: 0 withArguments: {1}) }]
	] }.
	^ (result perform: #asSortedCollection env: 0) perform: #asArray env: 0
%

category: 'Python-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self with: 'Not yet implemented: __getattribute__' perform: #error: env: 0
%

category: 'Python-Attribute Access'
method: object
__setattr__: name _: value
	"Set a named attribute. Called by obj.name = value
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute setting"
	self with: 'AttributeError: readonly attribute' perform: #error: env: 0
%

category: 'Python-Comparison'
method: object
__eq__: other
	"Return self == other"

	^ self with: other perform: #= env: 0
%

category: 'Python-Comparison'
method: object
__ne__: other
	"Return self != other"

	^ (self with: other perform: #= env: 0) perform: #not env: 0
%

category: 'Python-Comparison'
method: object
__lt__: other
	"Return self < other"

	self with: 'Not yet implemented: __lt__' perform: #error: env: 0
%

category: 'Python-Comparison'
method: object
__le__: other
	"Return self <= other"

	self with: 'Not yet implemented: __le__' perform: #error: env: 0
%

category: 'Python-Comparison'
method: object
__gt__: other
	"Return self > other"

	self with: 'Not yet implemented: __gt__' perform: #error: env: 0
%

category: 'Python-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self with: 'Not yet implemented: __ge__' perform: #error: env: 0
%

category: 'Python-String Representation'
method: object
__repr__
	"Return a string representation for debugging"

	| myClass className stream |
	myClass := self perform: #class env: 0.
	className := myClass perform: #name env: 0.
	stream := WriteStream perform: #on: env: 0 withArguments: { Unicode7 perform: #new env: 0 }.
	stream with: $< perform: #nextPut: env: 0.
	stream with: className perform: #nextPutAll: env: 0.
	stream with: ' object>' perform: #nextPutAll: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-String Representation'
method: object
__str__
	"Return a string representation for display"

	^ (self perform: #printString env: 0) perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: object
__format__: formatSpec
	"Return a formatted string representation"

	self with: 'Not yet implemented: __format__' perform: #error: env: 0
%

category: 'Python-Hashing & Identity'
method: object
__hash__
	"Return hash value for this object"

	^ self perform: #hash env: 0
%

category: 'Python-Initialization'
method: object
__init__
	"Initialize a new instance (called after __new__).
	This is an instance method that receives self (the instance).
	In Python: instance.__init__(*args, **kwargs) initializes the instance.
	Default implementation does nothing and returns None."

	^ nil
%

category: 'Python-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self with: 'Not yet implemented: __getstate__' perform: #error: env: 0
%

category: 'Python-Serialization'
method: object
__reduce__
	"Return state for pickling (protocol 2)"

	self with: 'Not yet implemented: __reduce__' perform: #error: env: 0
%

category: 'Python-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version"

	self with: 'Not yet implemented: __reduce_ex__' perform: #error: env: 0
%

category: 'Python-Other'
method: object
__doc__
	"Return the docstring for this object"

	^ 'The base class of the class hierarchy.

When called, it accepts no arguments and returns a new featureless
instance that has no instance attributes and cannot be given any.
'
%

category: 'Python-Other'
method: object
__sizeof__
	"Return the size of the object in memory, in bytes.
	Uses GemStone's physicalSize which returns bytes required to represent the object."

	^ self perform: #physicalSize env: 0
%

category: 'Message Handling'
method: object
perform: aSelectorSymbol env: environmentId

"Sends the receiver the unary message indicated by the argument.
 The argument is the selector of the message.  Generates an error if
 the selector is not unary.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment.
"

<primitive: 2014>
^self _perform: aSelectorSymbol asSymbol env: environmentId withArguments:  #()
%

category: 'Message Handling'
method: object
perform: aSelectorSymbol env: environmentId withArguments: anArray

"Sends the receiver the message indicated by the arguments.
 The argument, aSelectorSymbol, is the keyword selector of the message.
 The arguments of the message are the elements of anArray.  Generates an
 error if the number of arguments expected by aSelectorSymbol is not
 the same as the number of elements in anArray.

 anArray must be an instance of Array.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2015>
anArray _validateClass: Array.

"Now just try the primitive again, but send asSymbol to the selector to convert
 it to a Symbol."
^ self _perform: aSelectorSymbol asSymbol env: environmentId
	withArguments: anArray
%

category: 'Python-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.
	Default implementation should return NotImplemented singleton.
	TODO: Implement once NotImplementedType is created in smalltalk/classes/"

	self with: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)' perform: #error: env: 0
%

category: 'Message Handling'
method: object
with: anObject perform: aSelectorSymbol env: environmentId

"Sends the receiver the message indicated by the arguments.  The
 first argument is the keyword or binary selector of the message.  The
 second argument is the argument of the message to be sent.  Generates
 an error if the number of arguments expected by the selector is not 1.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2014>
| sel |
sel := aSelectorSymbol asSymbol .
^self _perform: sel env: environmentId withArguments: { anObject }
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0

