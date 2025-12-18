! ------------------- Remove existing behavior from int
removeallmethods int
removeallclassmethods int
! ------------------- Class methods for int
category: 'Python'
classmethod: int
__call__: aPythonObject
	^(self __new__: aPythonObject) __init__; yourself
%
category: 'Python'
classmethod: int
__new__: aPythonObject

	| instance |
	(aPythonObject isKindOf: int) ifTrue: [instance := aPythonObject. ^instance].
	(aPythonObject isKindOf: float) ifTrue: [instance := self basicNew ___value: aPythonObject ___value asInteger. ^instance].
	(aPythonObject isKindOf: str) ifTrue: [
		| value |
		value := [
			Integer fromString: aPythonObject ___value 
		] on: ImproperOperation do: [:ex |
			ValueError signal: 'int() arg is a malformed string'.
		].
		instance := self basicNew ___value: value. 
		^instance
	]. 
 	TypeError signal: 'TypeError: can''t convert ' , aPythonObject class name , ' to int'.
	^instance
%
category: 'Python-int'
classmethod: int
from_bytes: aBytes _: byteorder
	"int.from_bytes(bytes, byteorder='big', *, signed=False)"

	^self from_bytes: aBytes _: byteorder _: False
%
category: 'Python-int'
classmethod: int
from_bytes: aBytes _: byteorder _: signed
	"int.from_bytes(bytes, byteorder='big', *, signed=False)
	 Return the integer represented by the given array of bytes."

	| bytesArray result isBigEndian isSigned |
	bytesArray := aBytes ___container.
	isBigEndian := byteorder ___value = 'big'.
	isSigned := signed == True.

	result := 0.
	isBigEndian
		ifTrue: [
			bytesArray do: [:each |
				result := (result bitShift: 8) bitOr: each.
			].
		]
		ifFalse: [
			| shift |
			shift := 0.
			bytesArray do: [:each |
				result := result bitOr: (each bitShift: shift).
				shift := shift + 8.
			].
		].

	"Handle signed conversion"
	(isSigned and: [bytesArray size > 0]) ifTrue: [
		| highByte |
		highByte := isBigEndian
			ifTrue: [bytesArray first]
			ifFalse: [bytesArray last].
		(highByte bitAnd: 16r80) ~= 0 ifTrue: [
			"Negative number - subtract 2^(numBits)"
			result := result - (1 bitShift: (bytesArray size * 8)).
		].
	].

	^int ___value: result
%
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsFirstAgumentOn: args
	((args first isKindOf: (Globals at: #'Magnitude')) or: [args first isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() first argument must be a string or a number, not ''', args first class name,''''].
%
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsSecondAgumentOn: args
	((args second isKindOf: (Globals at: #'Magnitude')) or: [args second isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() second argument must be a number, not ''', args second class name,''''].
%
category: 'Smalltalk'
classmethod: int
___value: aNumber

	(aNumber isKindOf: Number) ifFalse: [
		ValueError signal: 'int() arg is a malformed string'.
	].
	^self basicNew
		___value: aNumber asInteger;
		yourself
%
! ------------------- Instance methods for int
category: 'Python-int'
method: int
___addFloat: aFloat

	^float ___value: value + aFloat
%
category: 'Python-int'
method: int
___addInt: anInteger

	^int ___value: anInteger + value
%
category: 'Python-int'
method: int
___addReal: aFloatReal imag: aFloatImag

	^complex ___real: value + aFloatReal imaginary: aFloatImag
%
category: 'Python-int'
method: int
___convertWithFlags: aSet precision: anObject andType: aCharacter
	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	| resultString |
	({ $s. $c. $a. $r } includes: aCharacter) ifTrue: [
		"if it uses string type indicator then it should change to a string or character and then use that
		class's implementation"
		(aCharacter == $c and: [value > Character maximumCodePoint]) ifTrue: [
			OverflowError signal: 'OverflowError: %c arg not in range(0x110000)'
		].
		aCharacter == $c ifTrue: [
			^(str ___value: value asCharacter asString)
				___convertWithFlags: aSet
				precision: anObject
				andType: aCharacter.
		].
		^(str ___value: value asString)
			___convertWithFlags: aSet
			precision: anObject
			andType: aCharacter.
	].

	({ $f. $F. $e. $E. $g. $G } includes: aCharacter) ifTrue: [
		"if it uses float type indicator then it should change to a float and then use that
		class's implementation"
		^(float ___value: value)
			___convertWithFlags: aSet
			precision: anObject
			andType: aCharacter.
	].

	resultString := WriteStream on: String new.
	({ $d. $i. $u } includes: aCharacter) ifTrue: [
		resultString := value abs asString.
	].

	({ $x. $X } includes: aCharacter) ifTrue: [
		value abs printOn: resultString base: 16.
		resultString := resultString contents removeFrom: 1 to: 3.
		
	].

	aCharacter == $o ifTrue: [
		value abs printOn: resultString base: 8.
		resultString := resultString contents removeFrom: 1 to: 2.
	].

	anObject ~= '' ifTrue: [
		"If this object has a precision set then it needs to have that many zeros infront of it.
		precision cannot decrease the length of an int"
		[resultString size < anObject] whileTrue: [
			resultString := $0 + resultString.
		].
	].
	(aSet includes: $#) ifTrue: [
		"add the base information"
		(({ $x. $X } asSet) includes: aCharacter) ifTrue: [
			resultString := '0X' + resultString.
		].
		aCharacter == $o ifTrue: [
			resultString := '0o' + resultString.
		].
	].

	aCharacter == $x ifTrue: [resultString asLowercase].

	"readd the sign if needed or appropriate"
	value < 0 ifTrue: [
		resultString := '-' + resultString.
	] ifFalse: [
		(aSet includes: $+) ifTrue: [
			resultString := '+' + resultString.
		] ifFalse: [
			(aSet includes: Character space) ifTrue: [
				resultString := ' ' + resultString.
			].
		].
	].

	^resultString
%
category: 'Python-int'
method: int
___modFloat: aFloat

	^float ___value: (aFloat rem: value)
%
category: 'Python-int'
method: int
___modInt: anInteger

	^int ___value: (anInteger rem: value)
%
category: 'Python-int'
method: int
___mulFloat: aFloat

	^float ___value: aFloat * value
%
category: 'Python-int'
method: int
___mulInt: anInteger

	^int ___value: anInteger * value
%
category: 'Python-int'
method: int
___mulReal: aFloatReal imag: aFloatImag

	^complex ___real: aFloatReal * value imaginary: aFloatImag * value
%
category: 'Python-int'
method: int
___powFloat: aFloat

	| return |
	return := float ___value: (aFloat raisedTo: value).
	(return ___value asString = 'PlusQuietNaN' or: [return ___value asString = 'MinusQuietNaN']) ifTrue: [
		^((complex ___real: 0 imaginary: ((aFloat abs) sqrt)) __pow__: (float ___value: 2 * value))
	].
	^return
%
category: 'Python-int'
method: int
___powInt: anInteger

	| return |

	return := float ___value: (anInteger raisedTo: value).

	return = return __ceil__ ifTrue: [return := int ___value: return ___value].
	
	^return
%
category: 'Python-int'
method: int
___powReal: aFloatReal imag: aFloatImag

		
	| negative complexHolder exponent result |

	value = 0 ifTrue: [^1].

	negative := value < 0.

	complexHolder := complex ___real: aFloatReal imaginary: aFloatImag.
	exponent := value abs.

	"shift the exponent until we get to the first set bit"
	[(exponent bitAnd: 1) = 0] whileTrue: [
		complexHolder := complexHolder __mul__: complexHolder.
		exponent := exponent bitShift: -1.
	].

	result := complexHolder.
	exponent := exponent bitShift: -1.
	"multiply the result by original complex number raised that specific bit number"
	[exponent > 0] whileTrue: [
		complexHolder := complexHolder __mul__: complexHolder.

		(exponent bitAnd: 1) = 1 ifTrue: [
			result := result __mul__: complexHolder.
		].

		exponent := exponent bitShift: -1.
	].

	"if the exponent was negative at the beginning then rationalize the denominator"
	negative ifTrue: [
		| conjugate denominator realPart imagPart |
		conjugate := result conjugate.
		realPart := conjugate real ___value.
		imagPart := conjugate imag ___value.
		denominator := (realPart * realPart) + (imagPart * imagPart).
		result := complex
			___real: realPart / denominator
			imaginary: imagPart / denominator
	].

	^result
%
category: 'Python-int'
method: int
___rsubInt: anInteger
	"Reverse subtraction: anInteger - self"

	^int ___value: anInteger - value
%
category: 'Python-int'
method: int
___truedivFloat: aFloat

	^[float ___value: aFloat / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
___truedivInt: anInteger

	^[float ___value: anInteger / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
___truedivReal: aFloatReal imag: aFloatImag

	
	^[complex ___real: aFloatReal / value imaginary:aFloatImag / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__abs__

	^int ___value: value abs
%
category: 'Python-int'
method: int
__add__: anObject

	^anObject ___addInt: value
%
category: 'Python-int'
method: int
__and__: anObject

	[
		| other |
		other := anObject.
		(other isKindOf: ExecBlock) ifTrue: [
			other := other value. "Evaluate the block"
		].

		^int ___value: (value bitAnd: other ___value)
	]
	on: MessageNotUnderstood
	do: [TypeError signal: 'TypeError: unsupported operand type(s) for +: ''int'' and ''', anObject class asString,''''].
%
category: 'Python-int'
method: int
__bool__

	^bool ___value: value ~= 0
%
category: 'Python-int'
method: int
__ceil__

	^self
%
category: 'Python-int'
method: int
__divmod__: anObject

	^[tuple  ___value: { int ___value: value // anObject ___value. int ___value: value \\ anObject ___value }]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__doc__

	^str ___value: 'int([x]) -> integer\n' ,
		'int(x, base=10) -> integer\n' ,
		'\n' ,
		'Convert a number or string to an integer, or return 0 if no arguments\n' ,
		'are given.  If x is a number, return x.__int__().  For floating-point\n' ,
		'numbers, this truncates towards zero.\n' ,
		'\n' ,
		'If x is not a number or if base is given, then x must be a string,\n' ,
		'bytes, or bytearray instance representing an integer literal in the\n' ,
		'given base.  The literal can be preceded by ''+'' or ''-'' and be surrounded\n' ,
		'by whitespace.  The base defaults to 10.  Valid bases are 0 and 2-36.\n' ,
		'Base 0 means to interpret the base from the string as an integer literal.\n' ,
		'>>> int(''0b100'', base=0)\n' ,
		'4'
%
category: 'Python-int'
method: int
__float__

	^float ___value: value
%
category: 'Python-int'
method: int
__floor__

	^self
%
category: 'Python-int'
method: int
__floordiv__: anObject

	^[int ___value: value // anObject ___value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__getnewargs__
	"Return a tuple of arguments for pickling"

	^tuple ___value: { self }
%
category: 'Python-int'
method: int
__getstate__
	"Return state for pickling. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__getstate__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-int'
method: int
__hash__
	"Return hash value. In Python, hash(n) == n for small integers."

	^int ___value: value hash
%
category: 'Python-int'
method: int
__index__

	^self
%
category: 'Python-int'
method: int
__init_subclass__
	"Called when subclassing int. Not implemented - implement when adding metaclass support."

	NotImplementedError signal: '__init_subclass__ is not implemented. Implement when adding metaclass support.'
%
category: 'Python-int'
method: int
__int__

	^self
%
category: 'Python-int'
method: int
__invert__

	^int ___value: (value negated - 1)
%
category: 'Python-int'
method: int
__lshift__: anIndex

	anIndex ___value < 0 ifTrue: [ValueError signal: 'ValueError: negative shift count'].
	^int ___value: (value bitShift: anIndex ___value)
%
category: 'Python-int'
method: int
__mod__: anObject

	^anObject ___modInt: value
%
category: 'Python-int'
method: int
__mul__: anObject

	^anObject ___mulInt: value
%
category: 'Python-int'
method: int
__neg__

	^int ___value: value negated
%
category: 'Python-int'
method: int
__or__: anObject

	^int ___value: (value bitOr: anObject ___value)
%
category: 'Python-int'
method: int
__pos__

	^self
%
category: 'Python-int'
method: int
__pow__: anObject

	^anObject ___powInt: value
%
category: 'Python-int'
method: int
__radd__: any

	^any __add__: self
%
category: 'Python-int'
method: int
__rand__: any

	^any __and__: self
%
category: 'Python-int'
method: int
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python-int'
method: int
__reduce__
	"Return state for pickling. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__reduce__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-int'
method: int
__reduce_ex__: protocol
	"Return state for pickling with protocol version. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__reduce_ex__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-int'
method: int
__rfloordiv__: any

	^any __floordiv__: self
%
category: 'Python-int'
method: int
__rlshift__: any

	self ___value < 0 ifTrue: [ValueError signal: 'ValueError: negative shift count'].
	^any __lshift__: self
%
category: 'Python-int'
method: int
__rmod__: any

	^any __mod__: self
%
category: 'Python-int'
method: int
__rmul__: any

	^any __mul__: self
%
category: 'Python-int'
method: int
__ror__: any

	^any __or__: self
%
category: 'Python-int'
method: int
__round__

	^self
%
category: 'Python-int'
method: int
__round__: anInt

	anInt class == int ifFalse: [
		TypeError signal: 'TypeError: ', anInt class asString,' object cannot be interpreted as an integer'
	].
	^self
%
category: 'Python-int'
method: int
__rrshift__: any

	self ___value < 0 ifTrue: [ValueError signal: 'ValueError: negative shift count'].
	(any isKindOf: Magnitude)
		ifTrue: [^self __rrshift__: (int ___value: any)].
	^any __rshift__: self
%
category: 'Python-int'
method: int
__rshift__: anIndex

	anIndex ___value < 0 ifTrue: [ValueError signal: 'ValueError: negative shift count'].
	^int ___value: (value bitShift: anIndex ___value negated)
%
category: 'Python-int'
method: int
__rsub__: any

	^any __sub__: self
%
category: 'Python-int'
method: int
__rtruediv__: any

	^any __truediv__: self
%
category: 'Python-int'
method: int
__rxor__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rxor__: (int ___value: any)].
	^any __xor__: self
%
category: 'Python-int'
method: int
__sub__: anObject

	^anObject ___rsubInt: value
%
category: 'Python-int'
method: int
__truediv__: anObject

	^(anObject ___truedivInt: value)
%
category: 'Python-int'
method: int
__trunc__

	^self
%
category: 'Python-int'
method: int
__xor__: anObject

	^int ___value: (value bitXor: anObject ___value)
%
category: 'Python-int'
method: int
as_integer_ratio

	| val |

	val := value asFraction.
   ^tuple ___value: { int ___value: val numerator. int ___value: val denominator }
%
category: 'Python-int'
method: int
bit_count
	"Return the number of ones in the binary representation of the absolute value of the integer"

	^int ___value: ((value abs printStringRadix: 2) occurrencesOf: $1)
%
category: 'Python-int'
method: int
bit_length

	^int ___value: (value highBit ifNil: [0])
%
category: 'Python-int'
method: int
conjugate

	^self
%
category: 'Python-int'
method: int
denominator

	^int ___value: 1
%
category: 'Python-int'
method: int
imag

	^int ___value: 0
%
category: 'Python-int'
method: int
is_integer
	"Return True. Exists for duck type compatibility with float.is_integer()"

	^True
%
category: 'Python-int'
method: int
numerator

	^self
%
category: 'Python-int'
method: int
real

	^self
%
category: 'Python-int'
method: int
to_bytes: length _: byteorder
	"int.to_bytes(length, byteorder='big', *, signed=False)"

	^self to_bytes: length _: byteorder _: False
%
category: 'Python-int'
method: int
to_bytes: length _: byteorder _: signed
	"int.to_bytes(length, byteorder='big', *, signed=False)
	 Return an array of bytes representing an integer."

	| numBytes isBigEndian isSigned val result |
	numBytes := length ___value.
	isBigEndian := byteorder ___value = 'big'.
	isSigned := signed == True.
	val := value.

	"Handle negative numbers"
	val < 0 ifTrue: [
		isSigned ifFalse: [
			OverflowError signal: 'can''t convert negative int to unsigned'.
		].
		"Two's complement"
		val := (1 bitShift: (numBytes * 8)) + val.
	].

	"Check if value fits in the given number of bytes"
	(val < 0 or: [val >= (1 bitShift: (numBytes * 8))]) ifTrue: [
		OverflowError signal: 'int too big to convert'.
	].

	"Build the byte array"
	result := ByteArray new: numBytes.
	1 to: numBytes do: [:i |
		isBigEndian
			ifTrue: [result at: (numBytes - i + 1) put: (val bitAnd: 16rFF)]
			ifFalse: [result at: i put: (val bitAnd: 16rFF)].
		val := val bitShift: -8.
	].

	^bytes ___value: result
%
category: 'Python-object'
method: int
__eq__: anObject

	^bool ___value: (self ___value == anObject ___value)
%
category: 'Python-object'
method: int
__ge__: anObject

 
	^bool ___value: value >= anObject ___value
%
category: 'Python-object'
method: int
__gt__: anObject

	^bool ___value: value > anObject ___value
%
category: 'Python-object'
method: int
__le__: anObject

	^bool ___value: value <= anObject ___value
%
category: 'Python-object'
method: int
__lt__: anObject

	^bool ___value: value < anObject ___value
%
category: 'Python-object'
method: int
__ne__: anObject

	^bool ___value: value ~= anObject ___value
%
category: 'Python-object'
method: int
__repr__

	^str ___value: value printString
%
category: 'Python-object'
method: int
__rpow__: anObject

	^anObject __pow__: self
%
category: 'Smalltalk'
method: int
___parse: stringArg

	| integer stream |
	stream := ReadStream on: stringArg ___string.
	[
		integer := Integer fromStream: stream.
	] on: Error do: [:ex |].
	stream atEnd ifTrue: [
		^self ___value: integer
	].
	ValueError signal: self class name, '() arg is a malformed string'
%
category: 'Smalltalk'
method: int
___value

	^value
%
category: 'Smalltalk'
method: int
___value: anInteger

	value := anInteger
%
category: 'Smalltalk'
method: int
printOn: aStream

	aStream
		nextPutAll: 'int(';
		print: value;
		nextPut: $).
%
