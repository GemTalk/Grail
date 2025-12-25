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

category: 'Convenience Methods'
classmethod: object
___new___
	"Convenience method: self perform: #new env: 0"

	^ self perform: #new env: 0
%

category: 'Convenience Methods'
classmethod: object
___on___: aCollection
	"Convenience method: self perform: #on: env: 0 withArguments: {aCollection}"
	^ self perform: #on: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods'
classmethod: object
___lf___
	"Convenience method: self perform: #lf env: 0"
	^ self perform: #lf env: 0
%

category: 'Convenience Methods'
classmethod: object
___stdin___
	"Convenience method: self perform: #stdin env: 0"
	^ self perform: #stdin env: 0
%

category: 'Convenience Methods'
classmethod: object
___stdout___
	"Convenience method: self perform: #stdout env: 0"
	^ self perform: #stdout env: 0
%

category: 'Convenience Methods'
classmethod: object
___with___: anObject
	"Convenience method: self perform: #with: env: 0 withArguments: {anObject}"
	^ self perform: #with: env: 0 withArguments: {anObject}
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
	selectors := myClass perform: #allSelectorsForEnvironment: env: 0 withArguments: { 2 }.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors perform: #reject: env: 0 withArguments: { [:selector |
		| selectorStr prefix |
		selectorStr := selector ___asString___.
		((selectorStr ___size___) ___ge___: 3) ifTrue: [
			prefix := selectorStr ___copyFrom___: 1 to: 3.
			prefix ___eq___: '___'
		] ifFalse: [false]
	] }.
	result := selectors perform: #collect: env: 0 withArguments: { [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector perform: #indexOf: env: 0 withArguments: { $: }.
		index == 0
			ifTrue: [selector ___asString___]
			ifFalse: [selector ___copyFrom___: 1 to: (index ___minus___: 1)]
	] }.
	^ (result perform: #asSortedCollection env: 0) ___asArray___
%

category: 'Python-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self ___error___: 'Not yet implemented: __getattribute__'
%

category: 'Python-Attribute Access'
method: object
__setattr__: name _: value
	"Set a named attribute. Called by obj.name = value
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute setting"
	self ___error___: 'AttributeError: readonly attribute'
%

category: 'Python-Comparison'
method: object
__eq__: other
	"Return self == other"

	^ self ___eq___: other
%

category: 'Python-Comparison'
method: object
__ne__: other
	"Return self != other"

	^ (self ___eq___: other) ___not___
%

category: 'Python-Comparison'
method: object
__lt__: other
	"Return self < other"

	self ___error___: 'Not yet implemented: __lt__'
%

category: 'Python-Comparison'
method: object
__le__: other
	"Return self <= other"

	self ___error___: 'Not yet implemented: __le__'
%

category: 'Python-Comparison'
method: object
__gt__: other
	"Return self > other"

	self ___error___: 'Not yet implemented: __gt__'
%

category: 'Python-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self ___error___: 'Not yet implemented: __ge__'
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

category: 'Python-String Representation'
method: object
__str__
	"Return a string representation for display"

	^ (self ___printString___) ___asUnicodeString___
%

category: 'Python-String Representation'
method: object
__format__: formatSpec
	"Return a formatted string representation"

	self ___error___: 'Not yet implemented: __format__'
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

category: 'Python-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self ___error___: 'Not yet implemented: __getstate__'
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

! ------------------- Convenience Methods (Env-0 Wrappers)
! These methods wrap common perform:env:0 calls to improve code readability
! in environment 2 (Python) code.

category: 'Convenience Methods - Unary'
method: object
___size___
	"Convenience method: self perform: #size env: 0"
	^ self perform: #size env: 0
%

category: 'Convenience Methods - Unary'
method: object
___class___
	"Convenience method: self perform: #class env: 0"
	^ self perform: #class env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isEmpty___
	"Convenience method: self perform: #isEmpty env: 0"
	^ self perform: #isEmpty env: 0
%

category: 'Convenience Methods - Unary'
method: object
___first___
	"Convenience method: self perform: #first env: 0"
	^ self perform: #first env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asString___
	"Convenience method: self perform: #asString env: 0"
	^ self perform: #asString env: 0
%

category: 'Convenience Methods - Unary'
method: object
___name___
	"Convenience method: self perform: #name env: 0"
	^ self perform: #name env: 0
%

category: 'Convenience Methods - Unary'
method: object
___hash___
	"Convenience method: self perform: #hash env: 0"
	^ self perform: #hash env: 0
%

category: 'Convenience Methods - Unary'
method: object
___printString___
	"Convenience method: self perform: #printString env: 0"
	^ self perform: #printString env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asFloat___
	"Convenience method: self perform: #asFloat env: 0"
	^ self perform: #asFloat env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asInteger___
	"Convenience method: self perform: #asInteger env: 0"
	^ self perform: #asInteger env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asArray___
	"Convenience method: self perform: #asArray env: 0"
	^ self perform: #asArray env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asSortedCollection___
	"Convenience method: self perform: #asSortedCollection env: 0"
	^ self perform: #asSortedCollection env: 0
%

category: 'Convenience Methods - Unary'
method: object
___reverse___
	"Convenience method: self perform: #reverse env: 0"
	^ self perform: #reverse env: 0
%

category: 'Convenience Methods - Unary'
method: object
___copy___
	"Convenience method: self perform: #copy env: 0"
	^ self perform: #copy env: 0
%

category: 'Convenience Methods - Unary'
method: object
___notEmpty___
	"Convenience method: self perform: #notEmpty env: 0"
	^ self perform: #notEmpty env: 0
%

category: 'Convenience Methods - Unary'
method: object
___not___
	"Convenience method: self perform: #not env: 0"
	^ self perform: #not env: 0
%

category: 'Convenience Methods - Unary'
method: object
___contents___
	"Convenience method: self perform: #contents env: 0"
	^ self perform: #contents env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asUnicodeString___
	"Convenience method: self perform: #asUnicodeString env: 0"
	^ self perform: #asUnicodeString env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asLowercase___
	"Convenience method: self perform: #asLowercase env: 0"
	^ self perform: #asLowercase env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asUppercase___
	"Convenience method: self perform: #asUppercase env: 0"
	^ self perform: #asUppercase env: 0
%

category: 'Convenience Methods - Unary'
method: object
___codePoint___
	"Convenience method: self perform: #codePoint env: 0"
	^ self perform: #codePoint env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___codePoint___: anInteger
	"Convenience method: self perform: #codePoint: env: 0 withArguments: {anInteger}"
	^ self perform: #codePoint: env: 0 withArguments: {anInteger}
%

category: 'Convenience Methods - Unary'
method: object
___rounded___
	"Convenience method: self perform: #rounded env: 0"
	^ self perform: #rounded env: 0
%

category: 'Convenience Methods - Unary'
method: object
___identityHash___
	"Convenience method: self perform: #identityHash env: 0"
	^ self perform: #identityHash env: 0
%

category: 'Convenience Methods - Unary'
method: object
___physicalSize___
	"Convenience method: self perform: #physicalSize env: 0"
	^ self perform: #physicalSize env: 0
%

category: 'Convenience Methods - Unary'
method: object
___signal___
	"Convenience method: self perform: #signal env: 0"
	^ self perform: #signal env: 0
%

category: 'Convenience Methods - Binary'
method: object
___eq___: other
	"Convenience method: self perform: #= env: 0 withArguments: {other}"
	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___plus___: other
	"Convenience method: self perform: #+ env: 0 withArguments: {other}"
	^ self perform: #+ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___minus___: other
	"Convenience method: self perform: #- env: 0 withArguments: {other}"
	^ self perform: #- env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___times___: other
	"Convenience method: self perform: #* env: 0 withArguments: {other}"
	^ self perform: #* env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___divide___: other
	"Convenience method: self perform: #/ env: 0 withArguments: {other}"
	^ self perform: #/ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___lt___: other
	"Convenience method: self perform: #< env: 0 withArguments: {other}"
	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___gt___: other
	"Convenience method: self perform: #> env: 0 withArguments: {other}"
	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___le___: other
	"Convenience method: self perform: #<= env: 0 withArguments: {other}"
	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___ge___: other
	"Convenience method: self perform: #>= env: 0 withArguments: {other}"
	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___concat___: other
	"Convenience method: self perform: #, env: 0 withArguments: {other}"
	^ self perform: #, env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___ne___: other
	"Convenience method: self perform: #~= env: 0 withArguments: {other}"
	^ self perform: #~= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___printStringRadix___: radix
	"Convenience method: self perform: #printStringRadix: env: 0 withArguments: {radix}"
	^ self perform: #printStringRadix: env: 0 withArguments: {radix}
%

category: 'Convenience Methods - Keyword'
method: object
___at___: index
	"Convenience method: self perform: #at: env: 0 withArguments: {index}"
	^ self perform: #at: env: 0 withArguments: {index}
%

category: 'Convenience Methods - Keyword'
method: object
___at___: index put: value
	"Convenience method: self perform: #at:put: env: 0 withArguments: {index. value}"
	^ self perform: #at:put: env: 0 withArguments: {index. value}
%

category: 'Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self perform: #new: env: 0 withArguments: {size}
%

category: 'Convenience Methods - Keyword'
method: object
___signal___: message
	"Convenience method: self perform: #signal: env: 0 withArguments: {message}"
	^ self perform: #signal: env: 0 withArguments: {message}
%

category: 'Convenience Methods - Keyword'
method: object
___do___: block
	"Convenience method: self perform: #do: env: 0 withArguments: {block}"
	^ self perform: #do: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end do: block
	"Convenience method: self perform: #to:do: env: 0 withArguments: {end. block}"
	^ self perform: #to:do: env: 0 withArguments: {end. block}
%

category: 'Convenience Methods - Keyword'
method: object
___on___: exception do: handler
	"Convenience method: self perform: #on:do: env: 0 withArguments: {exception. handler}"
	^ self perform: #on:do: env: 0 withArguments: {exception. handler}
%

category: 'Convenience Methods - Keyword'
method: object
___copyFrom___: start to: end
	"Convenience method: self perform: #copyFrom:to: env: 0 withArguments: {start. end}"
	^ self perform: #copyFrom:to: env: 0 withArguments: {start. end}
%

category: 'Convenience Methods - Keyword'
method: object
___collect___: block
	"Convenience method: self perform: #collect: env: 0 withArguments: {block}"
	^ self perform: #collect: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___select___: block
	"Convenience method: self perform: #select: env: 0 withArguments: {block}"
	^ self perform: #select: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___inject___: initial into: block
	"Convenience method: self perform: #inject:into: env: 0 withArguments: {initial. block}"
	^ self perform: #inject:into: env: 0 withArguments: {initial. block}
%

category: 'Convenience Methods - Keyword'
method: object
___min___: other
	"Convenience method: self perform: #min: env: 0 withArguments: {other}"
	^ self perform: #min: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___max___: other
	"Convenience method: self perform: #max: env: 0 withArguments: {other}"
	^ self perform: #max: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element ifAbsent: exceptionBlock
	"Convenience method: self perform: #indexOf:ifAbsent: env: 0 withArguments: {element. exceptionBlock}"
	^ self perform: #indexOf:ifAbsent: env: 0 withArguments: {element. exceptionBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___removeAtIndex___: index
	"Convenience method: self perform: #removeAtIndex: env: 0 withArguments: {index}"
	^ self perform: #removeAtIndex: env: 0 withArguments: {index}
%

category: 'Convenience Methods - Keyword'
method: object
___bitShift___: amount
	"Convenience method: self perform: #bitShift: env: 0 withArguments: {amount}"
	^ self perform: #bitShift: env: 0 withArguments: {amount}
%

category: 'Convenience Methods - Keyword'
method: object
___whileTrue___: block
	"Convenience method: self perform: #whileTrue: env: 0 withArguments: {block}"
	^ self perform: #whileTrue: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___whileFalse___: block
	"Convenience method: self perform: #whileFalse: env: 0 withArguments: {block}"
	^ self perform: #whileFalse: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___on___: stream
	"Convenience method: self perform: #on: env: 0 withArguments: {stream}"
	^ self perform: #on: env: 0 withArguments: {stream}
%

category: 'Convenience Methods - Keyword'
method: object
___add___: element
	"Convenience method: self perform: #add: env: 0 withArguments: {element}"
	^ self perform: #add: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___remove___: element
	"Convenience method: self perform: #remove: env: 0 withArguments: {element}"
	^ self perform: #remove: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___removeAll___: aCollection
	"Convenience method: self perform: #removeAll: env: 0 withArguments: {aCollection}"
	^ self perform: #removeAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Keyword'
method: object
___addAll___: aCollection
	"Convenience method: self perform: #addAll: env: 0 withArguments: {aCollection}"
	^ self perform: #addAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Keyword'
method: object
___existsOnServer___: aPath
	"Convenience method: self perform: #existsOnServer: env: 0 withArguments: {aPath}"
	^ self perform: #existsOnServer: env: 0 withArguments: {aPath}
%

category: 'Convenience Methods - Keyword'
method: object
___beginsWith___: aString
	"Convenience method: self perform: #beginsWith: env: 0 withArguments: {aString}"
	^ self perform: #beginsWith: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Keyword'
method: object
___endsWith___: aString
	"Convenience method: self perform: #endsWith: env: 0 withArguments: {aString}"
	^ self perform: #endsWith: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Keyword'
method: object
___sort___: aBlock
	"Convenience method: self perform: #sort: env: 0 withArguments: {aBlock}"
	^ self perform: #sort: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___reverseDo___: aBlock
	"Convenience method: self perform: #reverseDo: env: 0 withArguments: {aBlock}"
	^ self perform: #reverseDo: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___fromStream___: aStream
	"Convenience method: self perform: #fromStream: env: 0 withArguments: {aStream}"
	^ self perform: #fromStream: env: 0 withArguments: {aStream}
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end by: step do: aBlock
	"Convenience method: self perform: #to:by:do: env: 0 withArguments: {end. step. aBlock}"
	^ self perform: #to:by:do: env: 0 withArguments: {end. step. aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___from___: start to: end by: step
	"Convenience method: self perform: #from:to:by: env: 0 withArguments: {start. end. step}"
	^ self perform: #from:to:by: env: 0 withArguments: {start. end. step}
%

category: 'Convenience Methods - Keyword'
method: object
___size___: aSize
	"Convenience method: self perform: #size: env: 0 withArguments: {aSize}"
	^ self perform: #size: env: 0 withArguments: {aSize}
%

category: 'Convenience Methods - Keyword'
method: object
___includesKey___: key
	"Convenience method: self perform: #includesKey: env: 0 withArguments: {key}"
	^ self perform: #includesKey: env: 0 withArguments: {key}
%

category: 'Convenience Methods - Keyword'
method: object
___timesRepeat___: block
	"Convenience method: self perform: #timesRepeat: env: 0 withArguments: {block}"
	^ self perform: #timesRepeat: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___isKindOf___: aClass
	"Convenience method: self perform: #isKindOf: env: 0 withArguments: {aClass}"
	^ self perform: #isKindOf: env: 0 withArguments: {aClass}
%

category: 'Convenience Methods - Keyword'
method: object
___respondsTo___: aSelector
	"Convenience method: self perform: #respondsTo: env: 0 withArguments: {aSelector}"
	^ self perform: #respondsTo: env: 0 withArguments: {aSelector}
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2
	"Convenience method: self perform: #with:with: env: 0 withArguments: {arg1. arg2}"
	^ self perform: #with:with: env: 0 withArguments: {arg1. arg2}
%

category: 'Convenience Methods - Keyword'
method: object
___withAll___: aCollection
	"Convenience method: self perform: #withAll: env: 0 withArguments: {aCollection}"
	^ self perform: #withAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Keyword'
method: object
___error___: message
	"Convenience method: self perform: #error: env: 0 withArguments: {message}"
	^ self perform: #error: env: 0 withArguments: {message}
%

category: 'Convenience Methods - Keyword'
method: object
___nextPut___: char
	"Convenience method: self perform: #nextPut: env: 0 withArguments: {char}"
	^ self perform: #nextPut: env: 0 withArguments: {char}
%

category: 'Convenience Methods - Keyword'
method: object
___nextPutAll___: string
	"Convenience method: self perform: #nextPutAll: env: 0 withArguments: {string}"
	^ self perform: #nextPutAll: env: 0 withArguments: {string}
%

category: 'Convenience Methods - Keyword'
method: object
___allSelectorsForEnvironment___: envId
	"Convenience method: self perform: #allSelectorsForEnvironment: env: 0 withArguments: {envId}"
	^ self perform: #allSelectorsForEnvironment: env: 0 withArguments: {envId}
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element
	"Convenience method: self perform: #indexOf: env: 0 withArguments: {element}"
	^ self perform: #indexOf: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___decodeToUnicode___
	"Convenience method: self perform: #decodeToUnicode env: 0"
	^ self perform: #decodeToUnicode env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___flush___
	"Convenience method: self perform: #flush env: 0"
	^ self perform: #flush env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___nextLine___
	"Convenience method: self perform: #nextLine env: 0"
	^ self perform: #nextLine env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___space___
	"Convenience method: self perform: #space env: 0"
	^ self perform: #space env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___cr___
	"Convenience method: self perform: #cr env: 0"
	^ self perform: #cr env: 0
%

category: 'Convenience Methods - Unary'
method: object
___negated___
	"Convenience method: self perform: #negated env: 0"
	^ self perform: #negated env: 0
%

category: 'Convenience Methods - Unary'
method: object
___abs___
	"Convenience method: self perform: #abs env: 0"
	^ self perform: #abs env: 0
%

category: 'Convenience Methods - Unary'
method: object
___truncated___
	"Convenience method: self perform: #truncated env: 0"
	^ self perform: #truncated env: 0
%

category: 'Convenience Methods - Unary'
method: object
___ln___
	"Convenience method: self perform: #ln env: 0"
	^ self perform: #ln env: 0
%

category: 'Convenience Methods - Unary'
method: object
___sqrt___
	"Convenience method: self perform: #sqrt env: 0"
	^ self perform: #sqrt env: 0
%

category: 'Convenience Methods - Unary'
method: object
___sin___
	"Convenience method: self perform: #sin env: 0"
	^ self perform: #sin env: 0
%

category: 'Convenience Methods - Unary'
method: object
___cos___
	"Convenience method: self perform: #cos env: 0"
	^ self perform: #cos env: 0
%

category: 'Convenience Methods - Unary'
method: object
___pi___
	"Convenience method: self perform: #pi env: 0"
	^ self perform: #pi env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isLetter___
	"Convenience method: self perform: #isLetter env: 0"
	^ self perform: #isLetter env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isUppercase___
	"Convenience method: self perform: #isUppercase env: 0"
	^ self perform: #isUppercase env: 0
%

category: 'Convenience Methods - Binary'
method: object
___divideInteger___: other
	"Convenience method: self perform: #// env: 0 withArguments: {other}"
	^ self perform: #// env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___modulo___: other
	"Convenience method: self perform: #\\ env: 0 withArguments: {other}"
	^ self perform: #\\ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___bitAnd___: other
	"Convenience method: self perform: #bitAnd: env: 0 withArguments: {other}"
	^ self perform: #bitAnd: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___bitOr___: other
	"Convenience method: self perform: #bitOr: env: 0 withArguments: {other}"
	^ self perform: #bitOr: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___bitXor___: other
	"Convenience method: self perform: #bitXor: env: 0 withArguments: {other}"
	^ self perform: #bitXor: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___findString___: aString startingAt: startIndex
	"Convenience method: self perform: #findString:startingAt: env: 0 withArguments: {aString. startIndex}"
	^ self perform: #findString:startingAt: env: 0 withArguments: {aString. startIndex}
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2 with: arg3
	"Convenience method: self perform: #with:with:with: env: 0 withArguments: {arg1. arg2. arg3}"
	^ self perform: #with:with:with: env: 0 withArguments: {arg1. arg2. arg3}
%

category: 'Convenience Methods - Keyword'
method: object
___split___: aString
	"Convenience method: self perform: #split: env: 0 withArguments: {aString}"
	^ self perform: #split: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Keyword'
method: object
___raisedTo___: power
	"Convenience method: self perform: #raisedTo: env: 0 withArguments: {power}"
	^ self perform: #raisedTo: env: 0 withArguments: {power}
%

category: 'Convenience Methods - Keyword'
method: object
___keysAndValuesDo___: aBlock
	"Convenience method: self perform: #keysAndValuesDo: env: 0 withArguments: {aBlock}"
	^ self perform: #keysAndValuesDo: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___contains___: element
	"Convenience method: self perform: #__contains__: env: 0 withArguments: {element}"
	^ self perform: #__contains__: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___arcTan2___: y
	"Convenience method: self perform: #arcTan2: env: 0 withArguments: {y}"
	^ self perform: #arcTan2: env: 0 withArguments: {y}
%

category: 'Convenience Methods - Keyword'
method: object
___trimBoth___
	"Convenience method: self perform: #trimBoth env: 0"
	^ self perform: #trimBoth env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___removeKey___: key
	"Convenience method: self perform: #removeKey: env: 0 withArguments: {key}"
	^ self perform: #removeKey: env: 0 withArguments: {key}
%

category: 'Convenience Methods - Keyword'
method: object
___addFirst___: element
	"Convenience method: self perform: #addFirst: env: 0 withArguments: {element}"
	^ self perform: #addFirst: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___removeLast___
	"Convenience method: self perform: #removeLast env: 0"
	^ self perform: #removeLast env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___reversed___
	"Convenience method: self perform: #reversed env: 0"
	^ self perform: #reversed env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___allButFirst___
	"Convenience method: self perform: #allButFirst env: 0"
	^ self perform: #allButFirst env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___includesString___: aString
	"Convenience method: self perform: #includesString: env: 0 withArguments: {aString}"
	^ self perform: #includesString: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Keyword'
method: object
___includes___: element
	"Convenience method: self perform: #includes: env: 0 withArguments: {element}"
	^ self perform: #includes: env: 0 withArguments: {element}
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

	self ___error___: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)'
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

category: 'Convenience Methods - Python (env 2)'
classmethod: object
___new___: arg
	"Convenience method: self perform: #__new__: env: 2 withArguments: {arg}"
	^ self perform: #__new__: env: 2 withArguments: {arg}
%

category: 'Convenience Methods - Python (env 2)'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 2 withArguments: {arg1. arg2}"
	^ self perform: #__new__:_: env: 2 withArguments: {arg1. arg2}
%

category: 'Convenience Methods - Python (env 2)'
method: object
___len___
	"Convenience method: self perform: #__len__ env: 2"
	^ self perform: #__len__ env: 2
%

category: 'Convenience Methods - Python (env 2)'
method: object
___contains___: element
	"Convenience method: self perform: #__contains__: env: 2 withArguments: {element}"
	^ self perform: #__contains__: env: 2 withArguments: {element}
%

category: 'Convenience Methods - Python (env 2)'
method: object
___add___: element
	"Convenience method: self perform: #add: env: 2 withArguments: {element}"
	^ self perform: #add: env: 2 withArguments: {element}
%

