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
	^ self perform: #__new__: env: 1 withArguments: {arg}
%

category: 'Python-Bridge'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}
%

category: 'Python-Bridge'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}
%

category: 'Python-Bridge'
method: object
___add___: element
	"Convenience method: self perform: #add: env: 1 withArguments: {element}"
	^ self perform: #add: env: 1 withArguments: {element}
%

category: 'Python-Bridge'
method: object
___contains___: element
	"Convenience method: self perform: #__contains__: env: 1 withArguments: {element}"
	^ self perform: #__contains__: env: 1 withArguments: {element}
%

category: 'Python-Bridge'
method: object
___len___
	"Convenience method: self perform: #__len__ env: 1"
	^ self perform: #__len__ env: 1
%

category: 'Python-Bridge'
method: Object
___repr___
	"Call the Python __repr__ implementation (env 2)."

	^ self perform: #__repr__ env: 1
%

set compile_env: 1

category: 'Convenience Methods'
classmethod: object
___lf___
	^ self perform: #lf env: 0
%

category: 'Convenience Methods'
classmethod: object
___new___

	^ self perform: #new env: 0
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 2 code"
	^ self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}
%

category: 'Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 2 code"
	^ self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}
%

category: 'Convenience Methods'
classmethod: object
___on___: aCollection
	^ self perform: #on: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods'
classmethod: object
___stdin___
	^ self perform: #stdin env: 0
%

category: 'Convenience Methods'
classmethod: object
___stdout___
	^ self perform: #stdout env: 0
%

category: 'Convenience Methods'
classmethod: object
___with___: anObject
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

category: 'Python-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls."

	^ self perform: #new env: 0
%

category: 'Convenience Methods - Unary'
method: object
___abs___
	^ self perform: #abs env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___add___: element
	^ self perform: #add: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___addAll___: aCollection
	^ self perform: #addAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Keyword'
method: object
___addFirst___: element
	^ self perform: #addFirst: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___allButFirst___
	^ self perform: #allButFirst env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___allSelectorsForEnvironment___: envId
	^ self perform: #allSelectorsForEnvironment: env: 0 withArguments: {envId}
%

category: 'Convenience Methods - Keyword'
method: object
___arcTan2___: y
	^ self perform: #arcTan2: env: 0 withArguments: {y}
%

category: 'Convenience Methods - Unary'
method: object
___asArray___
	^ self perform: #asArray env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asFloat___
	^ self perform: #asFloat env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asFraction___
	^ self perform: #asFraction env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asInteger___
	^ self perform: #asInteger env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asLowercase___
	^ self perform: #asLowercase env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asSortedCollection___
	^ self perform: #asSortedCollection env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asString___
	^ self perform: #asString env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asSymbol___
	^ self perform: #asSymbol env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asUnicodeString___
	^ self perform: #asUnicodeString env: 0
%

category: 'Convenience Methods - Unary'
method: object
___asUppercase___
	^ self perform: #asUppercase env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key
	^ self perform: #at: env: 0 withArguments: {key}
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key ifAbsent: aBlock
	"Convenience method: self perform: #at:ifAbsent: env: 0 withArguments: {key. aBlock}"
	^ self perform: #at:ifAbsent: env: 0 withArguments: {key. aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___at___: key put: value
	^ self perform: #at:put: env: 0 withArguments: {key. value}
%

category: 'Convenience Methods - Keyword'
method: object
___beginsWith___: aString
	^ self perform: #beginsWith: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Binary'
method: object
___bitAnd___: other
	^ self perform: #bitAnd: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___bitOr___: other
	^ self perform: #bitOr: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___bitShift___: amount
	^ self perform: #bitShift: env: 0 withArguments: {amount}
%

category: 'Convenience Methods - Binary'
method: object
___bitXor___: other
	^ self perform: #bitXor: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___class___
	^ self perform: #class env: 0
%

category: 'Convenience Methods - Unary'
method: object
___codePoint___
	^ self perform: #codePoint env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___codePoint___: anInteger
	^ self perform: #codePoint: env: 0 withArguments: {anInteger}
%

category: 'Convenience Methods - Keyword'
method: object
___collect___: block
	^ self perform: #collect: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Binary'
method: object
___concat___: other
	^ self perform: #, env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___contains___: element
	^ self perform: #__contains__: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Unary'
method: object
___contents___
	^ self perform: #contents env: 0
%

category: 'Convenience Methods - Unary'
method: object
___copy___
	^ self perform: #copy env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___copyFrom___: start to: end
	^ self perform: #copyFrom:to: env: 0 withArguments: {start. end}
%

category: 'Convenience Methods - Unary'
method: object
___cos___
	^ self perform: #cos env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___cr___
	^ self perform: #cr env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___decodeToUnicode___
	^ self perform: #decodeToUnicode env: 0
%

category: 'Convenience Methods - Binary'
method: object
___divide___: other
	^ self perform: #/ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___divideInteger___: other
	^ self perform: #// env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___do___: block
	^ self perform: #do: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___endsWith___: aString
	^ self perform: #endsWith: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Binary'
method: object
___eq___: other
	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___error___: message
	^ self perform: #error: env: 0 withArguments: {message}
%

category: 'Convenience Methods - Keyword'
method: object
___existsOnServer___: aPath
	^ self perform: #existsOnServer: env: 0 withArguments: {aPath}
%

category: 'Convenience Methods - Keyword'
method: object
___findString___: aString startingAt: startIndex
	^ self perform: #findString:startingAt: env: 0 withArguments: {aString. startIndex}
%

category: 'Convenience Methods - Unary'
method: object
___first___
	^ self perform: #first env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___flush___
	^ self perform: #flush env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___from___: start to: end by: step
	^ self perform: #from:to:by: env: 0 withArguments: {start. end. step}
%

category: 'Convenience Methods - Keyword'
method: object
___fromStream___: aStream
	^ self perform: #fromStream: env: 0 withArguments: {aStream}
%

category: 'Convenience Methods - Binary'
method: object
___ge___: other
	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___getKind___
	"Return the float kind: 1=normal, 3=infinity, 5=NaN"
	^ self perform: #_getKind env: 0
%

category: 'Convenience Methods - Binary'
method: object
___gt___: other
	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___hash___
	^ self perform: #hash env: 0
%

category: 'Convenience Methods - Unary'
method: object
___identityHash___
	^ self perform: #identityHash env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___includes___: element
	^ self perform: #includes: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___includesKey___: key
	^ self perform: #includesKey: env: 0 withArguments: {key}
%

category: 'Convenience Methods - Keyword'
method: object
___includesString___: aString
	^ self perform: #includesString: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element
	^ self perform: #indexOf: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___indexOf___: element ifAbsent: exceptionBlock
	^ self perform: #indexOf:ifAbsent: env: 0 withArguments: {element. exceptionBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___inject___: initial into: block
	^ self perform: #inject:into: env: 0 withArguments: {initial. block}
%

category: 'Convenience Methods - Unary'
method: object
___isEmpty___
	^ self perform: #isEmpty env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___isKindOf___: aClass
	^ self perform: #isKindOf: env: 0 withArguments: {aClass}
%

category: 'Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool perform: #'__new__:' env: 1 withArguments: { self }
%

category: 'Convenience Methods - Unary'
method: object
___isLetter___
	^ self perform: #isLetter env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isNaN___
	"Return true if this float is NaN"
	^ self perform: #_isNaN env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isScaledDecimal___
	"Return true if this is a ScaledDecimal"
	^ self perform: #_isScaledDecimal env: 0
%

category: 'Convenience Methods - Unary'
method: object
___isUppercase___
	^ self perform: #isUppercase env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___keysAndValuesDo___: aBlock
	^ self perform: #keysAndValuesDo: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Binary'
method: object
___le___: other
	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___ln___
	^ self perform: #ln env: 0
%

category: 'Convenience Methods - Binary'
method: object
___lt___: other
	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___max___: other
	^ self perform: #max: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___min___: other
	^ self perform: #min: env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___minus___: other
	^ self perform: #- env: 0 withArguments: {other}
%

category: 'Convenience Methods - Binary'
method: object
___modulo___: other
	^ self perform: #\\ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___name___
	^ self perform: #name env: 0
%

category: 'Convenience Methods - Binary'
method: object
___ne___: other
	^ self perform: #~= env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___negated___
	^ self perform: #negated env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self perform: #new: env: 0 withArguments: {size}
%

category: 'Convenience Methods - Keyword'
method: object
___nextLine___
	^ self perform: #nextLine env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___nextPut___: char
	^ self perform: #nextPut: env: 0 withArguments: {char}
%

category: 'Convenience Methods - Keyword'
method: object
___nextPutAll___: string
	^ self perform: #nextPutAll: env: 0 withArguments: {string}
%

category: 'Convenience Methods - Unary'
method: object
___not___
	^ self perform: #not env: 0
%

category: 'Convenience Methods - Unary'
method: object
___notEmpty___
	^ self perform: #notEmpty env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___ensure___: aBlock
	^ self perform: #ensure: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___on___: exception do: handler
	^ self perform: #on:do: env: 0 withArguments: {exception. handler}
%

category: 'Convenience Methods - Keyword'
method: object
___on___: stream
	^ self perform: #on: env: 0 withArguments: {stream}
%

category: 'Convenience Methods - Unary'
method: object
___pass___
	^ self perform: #pass env: 0
%

category: 'Convenience Methods - Unary'
method: object
___physicalSize___
	^ self perform: #physicalSize env: 0
%

category: 'Convenience Methods - Unary'
method: object
___pi___
	^ self perform: #pi env: 0
%

category: 'Convenience Methods - Binary'
method: object
___plus___: other
	^ self perform: #+ env: 0 withArguments: {other}
%

category: 'Convenience Methods - Unary'
method: object
___printString___
	^ self perform: #printString env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___printStringRadix___: radix
	^ self perform: #printStringRadix: env: 0 withArguments: {radix}
%

category: 'Convenience Methods - Keyword'
method: object
___raisedTo___: power
	^ self perform: #raisedTo: env: 0 withArguments: {power}
%

category: 'Convenience Methods - Keyword'
method: object
___remove___: element
	^ self perform: #remove: env: 0 withArguments: {element}
%

category: 'Convenience Methods - Keyword'
method: object
___removeAll___: aCollection
	^ self perform: #removeAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Keyword'
method: object
___removeAtIndex___: index
	^ self perform: #removeAtIndex: env: 0 withArguments: {index}
%

category: 'Convenience Methods - Keyword'
method: object
___removeKey___: key
	^ self perform: #removeKey: env: 0 withArguments: {key}
%

category: 'Convenience Methods - Keyword'
method: object
___removeLast___
	^ self perform: #removeLast env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___respondsTo___: aSelector
	^ self perform: #respondsTo: env: 0 withArguments: {aSelector}
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
	^ self perform: #reverse env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___reversed___
	^ self perform: #reversed env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___reverseDo___: aBlock
	^ self perform: #reverseDo: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Unary'
method: object
___rounded___
	^ self perform: #rounded env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___select___: block
	^ self perform: #select: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Unary'
method: object
___signal___
	^ self perform: #signal env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___signal___: message
	^ self perform: #signal: env: 0 withArguments: {message}
%

category: 'Convenience Methods - Unary'
method: object
___sin___
	^ self perform: #sin env: 0
%

category: 'Convenience Methods - Unary'
method: object
___size___
	^ self perform: #size env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___size___: aSize
	^ self perform: #size: env: 0 withArguments: {aSize}
%

category: 'Convenience Methods - Keyword'
method: object
___sort___: aBlock
	^ self perform: #sort: env: 0 withArguments: {aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___space___
	^ self perform: #space env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___split___: aString
	^ self perform: #split: env: 0 withArguments: {aString}
%

category: 'Convenience Methods - Unary'
method: object
___sqrt___
	^ self perform: #sqrt env: 0
%

category: 'Convenience Methods - Binary'
method: object
___times___: other
	^ self perform: #* env: 0 withArguments: {other}
%

category: 'Convenience Methods - Keyword'
method: object
___timesRepeat___: block
	^ self perform: #timesRepeat: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end by: step do: aBlock
	^ self perform: #to:by:do: env: 0 withArguments: {end. step. aBlock}
%

category: 'Convenience Methods - Keyword'
method: object
___to___: end do: block
	^ self perform: #to:do: env: 0 withArguments: {end. block}
%

category: 'Convenience Methods - Keyword'
method: object
___trimBoth___
	^ self perform: #trimBoth env: 0
%

category: 'Convenience Methods - Unary'
method: object
___truncated___
	^ self perform: #truncated env: 0
%

category: 'Convenience Methods - Keyword'
method: object
___whileFalse___: block
	^ self perform: #whileFalse: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___whileTrue___: block
	^ self perform: #whileTrue: env: 0 withArguments: {block}
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2
	^ self perform: #with:with: env: 0 withArguments: {arg1. arg2}
%

category: 'Convenience Methods - Keyword'
method: object
___with___: arg1 with: arg2 with: arg3
	^ self perform: #with:with:with: env: 0 withArguments: {arg1. arg2. arg3}
%

category: 'Convenience Methods - Keyword'
method: object
___withAll___: aCollection
	^ self perform: #withAll: env: 0 withArguments: {aCollection}
%

category: 'Convenience Methods - Unary'
method: object
___yourself___
	^ self perform: #yourself env: 0
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
	selectors := myClass perform: #allSelectorsForEnvironment: env: 0 withArguments: { 1 }.
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

	^ self perform: #physicalSize env: 0
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
^self perform: #_perform:env:withArguments: env: 0 withArguments: {aSelectorSymbol perform: #asSymbol env: 0. environmentId. #()}
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
anArray perform: #_validateClass: env: 0 withArguments: {Array}.

"Now just try the primitive again, but send asSymbol to the selector to convert
 it to a Symbol."
^ self perform: #_perform:env:withArguments: env: 0 withArguments: {aSelectorSymbol perform: #asSymbol env: 0. environmentId. anArray}
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
sel := aSelectorSymbol perform: #asSymbol env: 0.
^self perform: #_perform:env:withArguments: env: 0 withArguments: {sel. environmentId. { anObject }}
%

set compile_env: 0
