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

category: 'Python-Bridge'
method: object
___add___: element
	"Convenience method: self perform: #add: env: 1 withArguments: {element}"
	^ self @env1:add: element
%

category: 'Python-Bridge'
method: object
___contains___: element
	"Convenience method: self perform: #__contains__: env: 1 withArguments: {element}"
	^ self @env1:__contains__: element
%

category: 'Python-Bridge'
method: object
___len___
	"Convenience method: self perform: #__len__ env: 1"
	^ self @env1:__len__
%

category: 'Python-Bridge'
method: Object
___repr___
	"Call the Python __repr__ implementation (env 2)."

	^ self @env1:__repr__
%

set compile_env: 1

category: 'Convenience Methods'
classmethod: object
___lf___
	^ self @env0:lf
%

category: 'Convenience Methods'
classmethod: object
___new___

	^ self @env0:new
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 2 code"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 2 code"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

category: 'Convenience Methods'
classmethod: object
___on___: aCollection
	^ self @env0:on: aCollection
%

category: 'Convenience Methods'
classmethod: object
___stdin___
	^ self @env0:stdin
%

category: 'Convenience Methods'
classmethod: object
___stdout___
	^ self @env0:stdout
%

category: 'Convenience Methods'
classmethod: object
___with___: anObject
	^ self @env0:with: anObject
%

category: 'Python-Initialization'
classmethod: object
__init_subclass__
	"Called when a class is subclassed.
	This is a class method that receives the subclass as the receiver.
	Default implementation does nothing."

	^ nil
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
___abs___
	^ self @env0:abs
%

category: 'Convenience Methods - Keyword'
method: object
___add___: element
	^ self @env0:add: element
%

category: 'Convenience Methods - Keyword'
method: object
___addAll___: aCollection
	^ self @env0:addAll: aCollection
%

category: 'Convenience Methods - Keyword'
method: object
___addFirst___: element
	^ self @env0:addFirst: element
%

category: 'Convenience Methods - Keyword'
method: object
___allButFirst___
	^ self @env0:allButFirst
%

category: 'Convenience Methods - Keyword'
method: object
___allSelectorsForEnvironment___: envId
	^ self @env0:allSelectorsForEnvironment: envId
%

category: 'Convenience Methods - Keyword'
method: object
___arcTan2___: y
	^ self @env0:arcTan2: y
%

category: 'Convenience Methods - Unary'
method: object
___asArray___
	^ self @env0:asArray
%

category: 'Convenience Methods - Unary'
method: object
___asFloat___
	^ self @env0:asFloat
%

category: 'Convenience Methods - Unary'
method: object
___asFraction___
	^ self @env0:asFraction
%

category: 'Convenience Methods - Unary'
method: object
___asInteger___
	^ self @env0:asInteger
%

category: 'Convenience Methods - Unary'
method: object
___asLowercase___
	^ self @env0:asLowercase
%

category: 'Convenience Methods - Unary'
method: object
___asSortedCollection___
	^ self @env0:asSortedCollection
%

category: 'Convenience Methods - Unary'
method: object
___asString___
	^ self @env0:asString
%

category: 'Convenience Methods - Unary'
method: object
___asSymbol___
	^ self @env0:asSymbol
%

category: 'Convenience Methods - Unary'
method: object
___asUnicodeString___
	^ self @env0:asUnicodeString
%

category: 'Convenience Methods - Unary'
method: object
___asUppercase___
	^ self @env0:asUppercase
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key
	^ self @env0:at: key
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key ifAbsent: aBlock
	"Convenience method: self perform: #at:ifAbsent: env: 0 withArguments: {key. aBlock}"
	^ self @env0:at: key ifAbsent: aBlock
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key put: value
	^ self @env0:at: key put: value
%

category: 'Convenience Methods - Keyword'
method: object
___beginsWith___: aString
	^ self @env0:beginsWith: aString
%

category: 'Convenience Methods - Binary'
method: object
___bitAnd___: other
	^ self @env0:bitAnd: other
%

category: 'Convenience Methods - Binary'
method: object
___bitOr___: other
	^ self @env0:bitOr: other
%

category: 'Convenience Methods - Keyword'
method: object
___bitShift___: amount
	^ self @env0:bitShift: amount
%

category: 'Convenience Methods - Binary'
method: object
___bitXor___: other
	^ self @env0:bitXor: other
%

category: 'Convenience Methods - Unary'
method: object
___class___
	^ self @env0:class
%

category: 'Convenience Methods - Unary'
method: object
___codePoint___
	^ self @env0:codePoint
%

category: 'Convenience Methods - Keyword'
method: object
___codePoint___: anInteger
	^ self @env0:codePoint: anInteger
%

category: 'Convenience Methods - Keyword'
method: object
___collect___: block
	^ self @env0:collect: block
%

category: 'Convenience Methods - Binary'
method: object
___concat___: other
	^ self @env0:, other
%

category: 'Convenience Methods - Keyword'
method: object
___contains___: element
	^ self @env0:__contains__: element
%

category: 'Convenience Methods - Unary'
method: object
___contents___
	^ self @env0:contents
%

category: 'Convenience Methods - Unary'
method: object
___copy___
	^ self @env0:copy
%

category: 'Convenience Methods - Keyword'
method: object
___copyFrom___: start to: end
	^ self @env0:copyFrom: start to: end
%

category: 'Convenience Methods - Unary'
method: object
___cos___
	^ self @env0:cos
%

category: 'Convenience Methods - Keyword'
method: object
___cr___
	^ self @env0:cr
%

category: 'Convenience Methods - Keyword'
method: object
___decodeToUnicode___
	^ self @env0:decodeToUnicode
%

category: 'Convenience Methods - Binary'
method: object
___divide___: other
	^ self @env0:/ other
%

category: 'Convenience Methods - Binary'
method: object
___divideInteger___: other
	^ self @env0:// other
%

category: 'Convenience Methods - Keyword'
method: object
___do___: block
	^ self @env0:do: block
%

category: 'Convenience Methods - Keyword'
method: object
___endsWith___: aString
	^ self @env0:endsWith: aString
%

category: 'Convenience Methods - Binary'
method: object
___eq___: other
	^ self @env0:= other
%

category: 'Convenience Methods - Keyword'
method: object
___error___: message
	^ self @env0:error: message
%

category: 'Convenience Methods - Keyword'
method: object
___existsOnServer___: aPath
	^ self @env0:existsOnServer: aPath
%

category: 'Convenience Methods - Keyword'
method: object
___findString___: aString startingAt: startIndex
	^ self @env0:findString: aString startingAt: startIndex
%

category: 'Convenience Methods - Unary'
method: object
___first___
	^ self @env0:first
%

category: 'Convenience Methods - Keyword'
method: object
___flush___
	^ self @env0:flush
%

category: 'Convenience Methods - Keyword'
method: object
___from___: start to: end by: step
	^ self @env0:from: start to: end by: step
%

category: 'Convenience Methods - Keyword'
method: object
___fromStream___: aStream
	^ self @env0:fromStream: aStream
%

category: 'Convenience Methods - Binary'
method: object
___ge___: other
	^ self @env0:>= other
%

category: 'Convenience Methods - Unary'
method: object
___getKind___
	"Return the float kind: 1=normal, 3=infinity, 5=NaN"
	^ self @env0:_getKind
%

category: 'Convenience Methods - Binary'
method: object
___gt___: other
	^ self @env0:> other
%

category: 'Convenience Methods - Unary'
method: object
___hash___
	^ self @env0:hash
%

category: 'Convenience Methods - Unary'
method: object
___identityHash___
	^ self @env0:identityHash
%

category: 'Convenience Methods - Keyword'
method: object
___includes___: element
	^ self @env0:includes: element
%

category: 'Convenience Methods - Keyword'
method: object
___includesKey___: key
	^ self @env0:includesKey: key
%

category: 'Convenience Methods - Keyword'
method: object
___includesString___: aString
	^ self @env0:includesString: aString
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element
	^ self @env0:indexOf: element
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element ifAbsent: exceptionBlock
	^ self @env0:indexOf: element ifAbsent: exceptionBlock
%

category: 'Convenience Methods - Keyword'
method: object
___inject___: initial into: block
	^ self @env0:inject: initial into: block
%

category: 'Convenience Methods - Unary'
method: object
___isEmpty___
	^ self @env0:isEmpty
%

category: 'Convenience Methods - Keyword'
method: object
___isKindOf___: aClass
	^ self @env0:isKindOf: aClass
%

category: 'Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool @env1:__new__: self
%

category: 'Convenience Methods - Unary'
method: object
___isLetter___
	^ self @env0:isLetter
%

category: 'Convenience Methods - Unary'
method: object
___isNaN___
	"Return true if this float is NaN"
	^ self @env0:_isNaN
%

category: 'Convenience Methods - Unary'
method: object
___isScaledDecimal___
	"Return true if this is a ScaledDecimal"
	^ self @env0:_isScaledDecimal
%

category: 'Convenience Methods - Unary'
method: object
___isUppercase___
	^ self @env0:isUppercase
%

category: 'Convenience Methods - Keyword'
method: object
___keysAndValuesDo___: aBlock
	^ self @env0:keysAndValuesDo: aBlock
%

category: 'Convenience Methods - Binary'
method: object
___le___: other
	^ self @env0:<= other
%

category: 'Convenience Methods - Unary'
method: object
___ln___
	^ self @env0:ln
%

category: 'Convenience Methods - Binary'
method: object
___lt___: other
	^ self @env0:< other
%

category: 'Convenience Methods - Keyword'
method: object
___max___: other
	^ self @env0:max: other
%

category: 'Convenience Methods - Keyword'
method: object
___min___: other
	^ self @env0:min: other
%

category: 'Convenience Methods - Binary'
method: object
___minus___: other
	^ self @env0:- other
%

category: 'Convenience Methods - Binary'
method: object
___modulo___: other
	^ self @env0:\\ other
%

category: 'Convenience Methods - Unary'
method: object
___name___
	^ self @env0:name
%

category: 'Convenience Methods - Binary'
method: object
___ne___: other
	^ self @env0:~= other
%

category: 'Convenience Methods - Unary'
method: object
___negated___
	^ self @env0:negated
%

category: 'Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self @env0:new: size
%

category: 'Convenience Methods - Keyword'
method: object
___nextLine___
	^ self @env0:nextLine
%

category: 'Convenience Methods - Keyword'
method: object
___nextPut___: char
	^ self @env0:nextPut: char
%

category: 'Convenience Methods - Keyword'
method: object
___nextPutAll___: string
	^ self @env0:nextPutAll: string
%

category: 'Convenience Methods - Unary'
method: object
___not___
	^ self @env0:not
%

category: 'Convenience Methods - Unary'
method: object
___notEmpty___
	^ self @env0:notEmpty
%

category: 'Convenience Methods - Keyword'
method: object
___ensure___: aBlock
	^ self @env0:ensure: aBlock
%

category: 'Convenience Methods - Keyword'
method: object
___on___: exception do: handler
	^ self @env0:on: exception do: handler
%

category: 'Convenience Methods - Keyword'
method: object
___on___: stream
	^ self @env0:on: stream
%

category: 'Convenience Methods - Unary'
method: object
___pass___
	^ self @env0:pass
%

category: 'Convenience Methods - Unary'
method: object
___physicalSize___
	^ self @env0:physicalSize
%

category: 'Convenience Methods - Unary'
method: object
___pi___
	^ self @env0:pi
%

category: 'Convenience Methods - Binary'
method: object
___plus___: other
	^ self @env0:+ other
%

category: 'Convenience Methods - Unary'
method: object
___printString___
	^ self @env0:printString
%

category: 'Convenience Methods - Keyword'
method: object
___printStringRadix___: radix
	^ self @env0:printStringRadix: radix
%

category: 'Convenience Methods - Keyword'
method: object
___raisedTo___: power
	^ self @env0:raisedTo: power
%

category: 'Convenience Methods - Keyword'
method: object
___remove___: element
	^ self @env0:remove: element
%

category: 'Convenience Methods - Keyword'
method: object
___removeAll___: aCollection
	^ self @env0:removeAll: aCollection
%

category: 'Convenience Methods - Keyword'
method: object
___removeAtIndex___: index
	^ self @env0:removeAtIndex: index
%

category: 'Convenience Methods - Keyword'
method: object
___removeKey___: key
	^ self @env0:removeKey: key
%

category: 'Convenience Methods - Keyword'
method: object
___removeLast___
	^ self @env0:removeLast
%

category: 'Convenience Methods - Keyword'
method: object
___respondsTo___: aSelector
	^ self @env0:respondsTo: aSelector
%

category: 'Convenience Methods - Keyword'
method: object
___respondsToEnv1___: aSelector
	"Check if the receiver responds to aSelector in environment 1 (Python)"
	| selectors |
	selectors := self ___class___ ___allSelectorsForEnvironment___: 1.
	^ selectors ___includes___: aSelector
%

category: 'Convenience Methods - Unary'
method: object
___reverse___
	^ self @env0:reverse
%

category: 'Convenience Methods - Keyword'
method: object
___reversed___
	^ self @env0:reversed
%

category: 'Convenience Methods - Keyword'
method: object
___reverseDo___: aBlock
	^ self @env0:reverseDo: aBlock
%

category: 'Convenience Methods - Unary'
method: object
___rounded___
	^ self @env0:rounded
%

category: 'Convenience Methods - Keyword'
method: object
___select___: block
	^ self @env0:select: block
%

category: 'Convenience Methods - Unary'
method: object
___signal___
	^ self @env0:signal
%

category: 'Convenience Methods - Keyword'
method: object
___signal___: message
	^ self @env0:signal: message
%

category: 'Convenience Methods - Unary'
method: object
___sin___
	^ self @env0:sin
%

category: 'Convenience Methods - Unary'
method: object
___size___
	^ self @env0:size
%

category: 'Convenience Methods - Keyword'
method: object
___size___: aSize
	^ self @env0:size: aSize
%

category: 'Convenience Methods - Keyword'
method: object
___sort___: aBlock
	^ self @env0:sort: aBlock
%

category: 'Convenience Methods - Keyword'
method: object
___space___
	^ self @env0:space
%

category: 'Convenience Methods - Keyword'
method: object
___split___: aString
	^ self @env0:split: aString
%

category: 'Convenience Methods - Unary'
method: object
___sqrt___
	^ self @env0:sqrt
%

category: 'Convenience Methods - Binary'
method: object
___times___: other
	^ self @env0:* other
%

category: 'Convenience Methods - Keyword'
method: object
___timesRepeat___: block
	^ self @env0:timesRepeat: block
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end by: step do: aBlock
	^ self @env0:to: end by: step do: aBlock
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end do: block
	^ self @env0:to: end do: block
%

category: 'Convenience Methods - Keyword'
method: object
___trimBoth___
	^ self @env0:trimBoth
%

category: 'Convenience Methods - Unary'
method: object
___truncated___
	^ self @env0:truncated
%

category: 'Convenience Methods - Keyword'
method: object
___whileFalse___: block
	^ self @env0:whileFalse: block
%

category: 'Convenience Methods - Keyword'
method: object
___whileTrue___: block
	^ self @env0:whileTrue: block
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2
	^ self @env0:with: arg1 with: arg2
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2 with: arg3
	^ self @env0:with: arg1 with: arg2 with: arg3
%

category: 'Convenience Methods - Keyword'
method: object
___withAll___: aCollection
	^ self @env0:withAll: aCollection
%

category: 'Convenience Methods - Unary'
method: object
___yourself___
	^ self @env0:yourself
%

category: 'Python-Attribute Access'
method: object
__class__
	"Return the class of this object (Python type)"

	^ self ___class___
%

category: 'Python-Attribute Access'
method: object
__delattr__: name
	"Delete a named attribute. Called by del obj.name
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute deletion"
	self ___error___: 'AttributeError: readonly attribute'
%

category: 'Python-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 2 (Python).
	Excludes convenience methods (those starting with ___) that are internal implementation helpers."

	| selectors result myClass |
	myClass := self ___class___.
	selectors := myClass @env0:allSelectorsForEnvironment: 1.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors @env0:reject: [:selector |
		| selectorStr prefix |
		selectorStr := selector ___asString___.
		((selectorStr ___size___) ___ge___: 3) ifTrue: [
			prefix := selectorStr ___copyFrom___: 1 to: 3.
			prefix ___eq___: '___'
		] ifFalse: [false]
	].
	result := selectors @env0:collect: [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector @env0:indexOf: $:.
		index == 0
			ifTrue: [selector ___asString___]
			ifFalse: [selector ___copyFrom___: 1 to: (index ___minus___: 1)]
	].
	^ (result @env0:asSortedCollection) ___asArray___
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

	^ self ___eq___: other
%

category: 'Python-String Representation'
method: object
__format__: formatSpec
	"Return a formatted string representation"

	self ___error___: 'Not yet implemented: __format__'
%

category: 'Python-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self ___error___: 'Not yet implemented: __ge__'
%

category: 'Python-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self ___error___: 'Not yet implemented: __getattribute__'
%

category: 'Python-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self ___error___: 'Not yet implemented: __getstate__'
%

category: 'Python-Comparison'
method: object
__gt__: other
	"Return self > other"

	self ___error___: 'Not yet implemented: __gt__'
%

category: 'Python-Hashing & Identity'
method: object
__hash__
	"Return hash value for this object"

	^ self ___hash___
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

category: 'Python-Comparison'
method: object
__le__: other
	"Return self <= other"

	self ___error___: 'Not yet implemented: __le__'
%

category: 'Python-Comparison'
method: object
__lt__: other
	"Return self < other"

	self ___error___: 'Not yet implemented: __lt__'
%

category: 'Python-Comparison'
method: object
__ne__: other
	"Return self != other"

	^ (self ___eq___: other) ___not___
%

category: 'Python-Serialization'
method: object
__reduce__
	"Return state for pickling (protocol 2)"

	self ___error___: 'Not yet implemented: __reduce__'
%

category: 'Python-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version"

	self ___error___: 'Not yet implemented: __reduce_ex__'
%

category: 'Python-String Representation'
method: object
__repr__
	"Return a string representation for debugging"

	| myClass className stream |
	myClass := self ___class___.
	className := myClass ___name___.
	stream := WriteStream ___on___: (Unicode7 ___new___).
	stream ___nextPut___: $<.
	stream ___nextPutAll___: className.
	stream ___nextPutAll___: ' object>'.
	^ stream ___contents___
%

category: 'Python-Attribute Access'
method: object
__setattr__: name _: value
	"Set a named attribute. Called by obj.name = value
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute setting"
	self ___error___: 'AttributeError: readonly attribute'
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

	^ (self ___printString___) ___asUnicodeString___
%

category: 'Python-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.
	Default implementation should return NotImplemented singleton.
	TODO: Implement once NotImplementedType is created in smalltalk/classes/"

	self ___error___: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)'
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

category: 'Debugging Methods'
classmethod: object
___pause___
  "call ___pause___ from Python to have execution stop and if interactive control goes to topaz debugger.
   Signals an instance of Smalltalk   Halt   .
   Allows insertion of a Python source code level breakpoint , than can be continued from"
  ^ self @env0:pause
%


set compile_env: 0
