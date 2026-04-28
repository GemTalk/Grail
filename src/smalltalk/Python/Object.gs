! ===============================================================================
! Object Methods (Python 'object' type)
! ===============================================================================
! This file contains method implementations for the Object class when used
! as the Python 'object' type. Since Object is a fundamental GemStone Smalltalk
! class, we only add Python-specific methods here.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from object
expectvalue /Metaclass3
doit
object removeAllMethods: 1.
object class removeAllMethods: 1.
%

set compile_env: 0

category: 'Python-Bridge'
classmethod: object
___new___: arg
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg
%

category: 'Python-Bridge'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Python-Bridge'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

set compile_env: 1

category: 'Convenience Methods'
classmethod: object
___new___

	^ self @env0:new
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

category: 'Python-Initialization'
classmethod: object
__init_subclass__
	"Called when a class is subclassed.
	This is a class method that receives the subclass as the receiver.
	Default implementation does nothing."

	^ None
%

category: 'Python-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls."

	^ self @env0:new
%

category: 'Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool @env1:__new__: self
%

category: 'Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self @env0:new: size
%

category: 'Convenience Methods - Keyword'
method: object
___signal___: message
	^ self @env0:signal: message
%

category: 'Python-Attribute Access'
method: object
__class__
	"Return the class of this object (Python type)"

	^ self @env0:class
%

category: 'Python-Attribute Access'
method: object
__delattr__: name
	"Delete a named attribute. Called by del obj.name
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute deletion"
	AttributeError @env0:signal: 'readonly attribute'
%

category: 'Python-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 1 (Python).
	Excludes convenience methods (those starting with ___) that are internal implementation helpers."

	| selectors result myClass |
	myClass := self @env0:class.
	selectors := myClass @env0:allSelectorsForEnvironment: 1.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors @env0:reject: [:selector |
		| selectorStr prefix |
		selectorStr := selector @env0:asString.
		((selectorStr @env0:size) @env0:>= 3) ifTrue: [
			prefix := selectorStr @env0:copyFrom: 1 to: 3.
			prefix @env0:= '___'
		] ifFalse: [false]
	].
	result := selectors @env0:collect: [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector @env0:indexOf: $:.
		index == 0
			ifTrue: [selector @env0:asString]
			ifFalse: [selector @env0:copyFrom: 1 to: (index @env0:- 1)]
	].
	^ (result @env0:asSortedCollection) @env0:asArray
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

category: 'Python-Comparison'
method: object
__eq__: other
	"Return self == other"

	^ self @env0:= other
%

category: 'Python-String Representation'
method: object
__format__: formatSpec
	"Return a formatted string representation"

	self @env0:error: 'Not yet implemented: __format__'
%

category: 'Python-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self @env0:error: 'Not yet implemented: __ge__'
%

category: 'Python-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self @env0:error: 'Not yet implemented: __getattribute__'
%

category: 'Python-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self @env0:error: 'Not yet implemented: __getstate__'
%

category: 'Python-Comparison'
method: object
__gt__: other
	"Return self > other"

	self @env0:error: 'Not yet implemented: __gt__'
%

category: 'Python-Hashing & Identity'
method: object
__hash__
	"Return hash value for this object"

	^ self @env0:hash
%

category: 'Python-Initialization'
method: object
__init__
	"Initialize a new instance (called after __new__).
	This is an instance method that receives self (the instance).
	In Python: instance.__init__(*args, **kwargs) initializes the instance.
	Default implementation does nothing and returns None."

	^ None
%

category: 'Python-Comparison'
method: object
__le__: other
	"Return self <= other"

	self @env0:error: 'Not yet implemented: __le__'
%

category: 'Python-Comparison'
method: object
__lt__: other
	"Return self < other"

	self @env0:error: 'Not yet implemented: __lt__'
%

category: 'Python-Comparison'
method: object
__ne__: other
	"Return self != other"

	^ (self @env0:= other) @env0:not
%

category: 'Python-Serialization'
method: object
__reduce__
	"Return state for pickling (protocol 2)"

	self @env0:error: 'Not yet implemented: __reduce__'
%

category: 'Python-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version"

	self @env0:error: 'Not yet implemented: __reduce_ex__'
%

category: 'Python-String Representation'
method: object
__repr__
	"Return a string representation for debugging"

	| myClass className stream |
	myClass := self @env0:class.
	className := myClass @env0:name.
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object>'.
	^ stream @env0:contents
%

category: 'Python-Attribute Access'
method: object
__setattr__: name _: value
	"Set a named attribute. Called by obj.name = value
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute setting"
	AttributeError @env0:signal: 'readonly attribute'
%

category: 'Python-Other'
method: object
__sizeof__
	"Return the size of the object in memory, in bytes.
	Uses GemStone's physicalSize which returns bytes required to represent the object."

	^ self @env0:physicalSize
%

category: 'Python-String Representation'
method: object
__str__
	"Return a string representation for display"

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Python-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.
	Default implementation should return NotImplemented singleton.
	TODO: Implement once NotImplementedType is created in smalltalk/classes/"

	self @env0:error: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)'
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
^self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: #()
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
anArray @env0:_validateClass: Array.

"Now just try the primitive again, but send asSymbol to the selector to convert
 it to a Symbol."
^ self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: anArray
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
sel := aSelectorSymbol @env0:asSymbol.
^self @env0:_perform: sel env: environmentId withArguments: { anObject }
%


set compile_env: 0
