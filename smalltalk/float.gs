! ------------------- Remove existing behavior from float
removeallmethods float
removeallclassmethods float
! ------------------- Class methods for float
category: 'Python-float'
classmethod: float
__getformat__: typestr
	"Return information about the float type.
	 typestr must be 'double' or 'float'."

	| ts |
	ts := typestr ___value.
	(ts = 'double' or: [ts = 'float']) ifFalse: [
		ValueError signal: '__getformat__() argument must be ''double'' or ''float'''.
	].
	"GemStone uses IEEE 754 format"
	^str ___value: 'IEEE, little-endian'
%
category: 'Python-float'
classmethod: float
__new__
	"Create a new float instance with default value 0.0"

	^self basicNew
		___value: 0.0;
		yourself
%
category: 'Python-float'
classmethod: float
from_number: aNumber
	"Create a float from a number. Equivalent to float(x) for numeric x."

	^self ___value: aNumber __float__ ___value
%
category: 'Python-float'
classmethod: float
fromhex: aHexString
	"Create a floating-point number from a hexadecimal string.
	 Format: [sign] ['0x'] integer ['.' fraction] ['p' exponent]"

	| s sign mantissa exponent idx val result dotIdx pIdx |
	s := aHexString ___value asLowercase.
	sign := 1.
	idx := 1.

	"Parse sign"
	(s at: 1) = $- ifTrue: [sign := -1. idx := 2].
	(s at: 1) = $+ ifTrue: [idx := 2].

	"Skip '0x' prefix if present"
	(s size >= (idx + 1) and: [(s copyFrom: idx to: idx + 1) = '0x'])
		ifTrue: [idx := idx + 2].

	"Find 'p' for exponent"
	pIdx := s findString: 'p' startingAt: idx.
	pIdx = 0 ifTrue: [
		"No exponent"
		exponent := 0.
		mantissa := s copyFrom: idx to: s size.
	] ifFalse: [
		mantissa := s copyFrom: idx to: pIdx - 1.
		exponent := (s copyFrom: pIdx + 1 to: s size) asInteger.
	].

	"Parse mantissa (may have decimal point)"
	dotIdx := mantissa findString: '.' startingAt: 1.
	dotIdx = 0 ifTrue: [
		"Integer mantissa"
		val := (Integer fromHexString: mantissa) asFloat.
	] ifFalse: [
		| intPart fracPart fracVal |
		intPart := mantissa copyFrom: 1 to: dotIdx - 1.
		fracPart := mantissa copyFrom: dotIdx + 1 to: mantissa size.
		intPart isEmpty ifTrue: [intPart := '0'].
		val := (Integer fromHexString: intPart) asFloat.
		fracPart isEmpty ifFalse: [
			fracVal := (Integer fromHexString: fracPart) asFloat.
			val := val + (fracVal / (16 raisedTo: fracPart size)).
		].
	].

	"Apply exponent (power of 2)"
	result := val * (2 raisedTo: exponent) * sign.
	^float ___value: result
%
category: 'Smalltalk'
classmethod: float
___value: aNumber

	(aNumber isKindOf: Number) ifFalse: [
		ValueError signal: 'float() arg is a malformed string'.
	].
	^self basicNew
		___value: aNumber asFloat;
		yourself
%
! ------------------- Instance methods for float
category: 'Python-float'
method: float
___addFloat: aFloat

	^float ___value: value + aFloat
%
category: 'Python-float'
method: float
___convertWithFlags: aSet precision: anObject andType: aCharacter
	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"
	"There is definitely a way to make this more efficient. If you would like to make this
	more efficient go ahead."

	| resultString tempNumber invalidTypes characterUsed exponent precisionHolder decimalIndex |
	resultString := ''.

	invalidTypes := {
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$c->[TypeError signal: 'TypeError: %c requires int or char'].
		} asDictionary.

	(invalidTypes includes: aCharacter) ifTrue: [
		(invalidTypes at: aCharacter) value.
	].

	({ $d. $i. $u } includes: aCharacter) ifTrue: [
		^(int ___value: value floor)
			___convertWithFlags: aSet
			precision: anObject
			andType: aCharacter
	].

	({ $s. $a. $r } includes: aCharacter) ifTrue: [
		"if it uses string type indicator then it should change to a string or character and then use that
		class's implementation"
		^(str ___value: value asString)
			___convertWithFlags: aSet
			precision: anObject
			andType: aCharacter.
	].

	characterUsed := aCharacter asLowercase.

	"us floating points for everything between those two numbers"

	characterUsed == $g ifTrue: [
		((value abs < 0.0001) or: [value abs >= 999999.5]) ifTrue: [
			characterUsed := $e.
		].
	].

	tempNumber := value abs.
	"convert to the correct decimal for scientific form and track the exponent needed"
	characterUsed == $e ifTrue: [
		exponent := 0.
		tempNumber >= 10 ifTrue: [
			[tempNumber >= 10] whileTrue: [
				tempNumber := tempNumber / 10.
				exponent := exponent + 1.
			].
		] ifFalse: [
			tempNumber < 1 ifTrue: [
				[tempNumber < 1] whileTrue: [
					tempNumber := tempNumber * 10.
					exponent := exponent - 1.
				].
			].
		].
	].

	precisionHolder := anObject.
	precisionHolder = '' ifTrue: [
		precisionHolder := 6.
	].
	resultString := tempNumber asStringUsingFormat: { 10. precisionHolder. false }.

	characterUsed == $g ifTrue: [
		| tempHolder index |
		tempHolder := ''.
		index := 1.
		"Collect only significant digits"
		[precisionHolder > 0 and: [index <= resultString size]] whileTrue: [
			(resultString at: index) isAlphaNumeric ifTrue: [
				precisionHolder := precisionHolder - 1.
			].
			tempHolder := tempHolder , (resultString at: index).
			index := index + 1.
		].
		"remove trailing zeros"
		resultString := tempHolder.
		aCharacter asLowercase == $g ifTrue: [
			| reverseIndex |
			reverseIndex := resultString size.
			[(resultString at: reverseIndex) == $0] whileTrue: [
				reverseIndex := reverseIndex - 1.
			].
			(resultString at: reverseIndex) == $. ifTrue: [
				reverseIndex := reverseIndex - 1.
			].
			resultString := resultString copyFrom: 1 to: reverseIndex.
		].
	] ifFalse: [

		decimalIndex := resultString indexOf: $..
		"add trailing zeros, this is based on the precision or 6 if there is no precision"
		precisionHolder + decimalIndex <= resultString size ifTrue: [
			resultString := resultString copyFrom: 1 to: precisionHolder + decimalIndex.
			resultString last == $. ifTrue: [
				resultString := resultString copyFrom: 1 to: (resultString size -1).
			].
		] ifFalse: [
			aCharacter asLowercase == $g ifFalse: [
				[resultString size < (precisionHolder + decimalIndex)] whileTrue: [
					resultString := resultString , '0'.
				].
			].
		].

			aCharacter asLowercase == $g ifTrue: [
				| reverseIndex |
				reverseIndex := resultString size.
				[(resultString at: reverseIndex) == $0] whileTrue: [
					reverseIndex := reverseIndex - 1.
				].
				(resultString at: reverseIndex) == $. ifTrue: [
					reverseIndex := reverseIndex - 1.
				].
				resultString := resultString copyFrom: 1 to: reverseIndex.

			].
			"add exponential for onto the string if required"
			characterUsed == $e ifTrue: [
				resultString := resultString , 'e'.
				exponent negative ifTrue: [
					resultString := resultString , '-'.
				] ifFalse: [
					resultString := resultString , '+'.
				].
				exponent abs < 10 ifTrue: [
					resultString := resultString , '0'.
				].
				resultString := resultString , (exponent abs asString).
				aCharacter isUppercase ifTrue: [
					resultString := resultString asUppercase.
				].
		].
	].

	"add the appropriate sign or a space to the number"
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
category: 'Python-float'
method: float
___modFloat: aFloat

	^float ___value: (aFloat rem: value)
%
category: 'Python-float'
method: float
___modInt: anInteger

	^float ___value: (anInteger rem: value)
%
category: 'Python-float'
method: float
___mulFloat: aFloat

	^float ___value: aFloat * value
%
category: 'Python-float'
method: float
___mulInt: anInteger

	^float ___value: anInteger * value
%
category: 'Python-float'
method: float
___mulReal: aFloatReal imag: aFloatImag

	^complex ___real: aFloatReal * value imaginary: aFloatImag * value
%
category: 'Python-float'
method: float
___truedivFloat: aFloat

	^[float ___value: aFloat / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-float'
method: float
___truedivInt: anInteger

	^[float ___value: anInteger / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-float'
method: float
___truedivReal: aFloatReal imag: aFloatImag

	
	^[complex ___real: aFloatReal / value imaginary:aFloatImag / value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-float'
method: float
__abs__

	^float ___value: value abs
%
category: 'Python-float'
method: float
__add__: anObject

	^anObject ___addFloat: value
%
category: 'Python-float'
method: float
__bool__

	^bool ___value: value ~= 0
%
category: 'Python-float'
method: float
__ceil__

	^int ___value: value ceiling
%
category: 'Python-float'
method: float
__divmod__: anObject

	^tuple  ___value: { float ___value: value // anObject ___value. float ___value: value \\ anObject ___value }
%
category: 'Python-float'
method: float
__doc__

	^str ___value: 'Convert a string or number to a floating-point number, if possible.'
%
category: 'Python-float'
method: float
__float__

	^self
%
category: 'Python-float'
method: float
__floor__

	^int ___value: value floor
%
category: 'Python-float'
method: float
__floordiv__: anObject

	^[int ___value: value // anObject ___value]on: ZeroDivide do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-float'
method: float
__format__: formatSpec
	"Format the float according to the format specification.
	 Format: [[fill]align][sign][#][0][width][,][.precision][type]
	 Type can be: e, E, f, F, g, G, n, %"

	| spec precision typeChar idx |
	spec := formatSpec ___value.
	spec isEmpty ifTrue: [^self __str__].

	"Parse simple format specs like '.2f', 'f', '.4e', etc."
	typeChar := spec last.
	('eEfFgGn%' includes: typeChar) ifFalse: [
		"Default to general format if no type specified"
		typeChar := $g.
	].

	"Find precision (digits after the dot)"
	idx := spec indexOf: $..
	idx > 0
		ifTrue: [
			| precStr |
			precStr := spec copyFrom: idx + 1 to: spec size - 1.
			precStr isEmpty
				ifTrue: [precision := 0]
				ifFalse: [precision := precStr asInteger].
		]
		ifFalse: [precision := ''].

	^str ___value: (self ___convertWithFlags: Set new precision: precision andType: typeChar)
%
category: 'Python-float'
method: float
__getnewargs__
	"Return a tuple of arguments for pickling"

	^tuple ___value: { self }
%
category: 'Python-float'
method: float
__getstate__
	"Return state for pickling. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__getstate__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-float'
method: float
__hash__
	"Return hash value. Integer-valued floats hash the same as the corresponding integer."

	| intVal kind |
	kind := value _getKind.
	kind >= 5 ifTrue: [^int ___value: value hash].  "NaN"
	kind = 3 ifTrue: [^int ___value: (value > 0 ifTrue: [314159] ifFalse: [-314159])].  "Infinity"
	intVal := value truncated.
	(value = intVal asFloat)
		ifTrue: [^int ___value: intVal hash]
		ifFalse: [^int ___value: value hash].
%
category: 'Python-float'
method: float
__init_subclass__
	"Called when subclassing float. Not implemented - implement when adding metaclass support."

	NotImplementedError signal: '__init_subclass__ is not implemented. Implement when adding metaclass support.'
%
category: 'Python-float'
method: float
__int__

	^self __trunc__
%
category: 'Python-float'
method: float
__mod__: anObject

	^float ___value: (value rem: anObject ___value)
%
category: 'Python-float'
method: float
__mul__: anObject

	^anObject ___mulFloat: value
%
category: 'Python-float'
method: float
__neg__

	^float ___value: value negated
%
category: 'Python-float'
method: float
__pos__

	^self __abs__
%
category: 'Python-float'
method: float
__radd__: any

	^any __add__: self
%
category: 'Python-float'
method: float
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python-float'
method: float
__reduce__
	"Return state for pickling. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__reduce__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-float'
method: float
__reduce_ex__: protocol
	"Return state for pickling with protocol version. Not implemented - implement when adding pickle support."

	NotImplementedError signal: '__reduce_ex__ is not implemented. Implement when adding pickle support.'
%
category: 'Python-float'
method: float
__rfloordiv__: any

	^any __floordiv__: self
%
category: 'Python-float'
method: float
__rmod__: any

	^any __mod__: self
%
category: 'Python-float'
method: float
__rmul__: any

	^any __mul__: self
%
category: 'Python-float'
method: float
__round__

	
	"Python uses Gaussian rounding so it which Smalltalk does not do"

	| result |
	((value * 2) odd and: [value floor even]) ifTrue: [
		result := int ___value: value floor.
	] ifFalse: [
		result := int ___value: value rounded
	].
	^result
%
category: 'Python-float'
method: float
__round__: anInt

	
	"Python uses Gaussian rounding so it which Smalltalk does not do"

	| result |

	anInt class == int ifFalse: [
		TypeError signal: 'TypeError: ', anInt class asString,' object cannot be interpreted as an integer'.
	].

	result := value * (10 raisedTo: anInt ___value).

	((result * 2) odd and: [result floor even]) ifTrue: [
		result := result floor.
	] ifFalse: [
		result := result rounded.
	].
	^float ___value: result / (10 raisedTo: anInt ___value)
%
category: 'Python-float'
method: float
__rpow__: anObject

	^anObject __pow__: self
%
category: 'Python-float'
method: float
__rsub__: any

	^any __sub__: self
%
category: 'Python-float'
method: float
__rtruediv__: any

	^any __truediv__: self
%
category: 'Python-float'
method: float
__sub__: anObject

	^float ___value: value - anObject ___value
%
category: 'Python-float'
method: float
__truediv__: anObject

	^(anObject ___truedivFloat: value)
%
category: 'Python-float'
method: float
__trunc__

	^int ___value: value truncated
%
category: 'Python-float'
method: float
as_integer_ratio

	| val |
	val := value asFraction.
   ^tuple ___value: { int ___value: val numerator. int ___value: val denominator }
%
category: 'Python-float'
method: float
conjugate

	^self
%
category: 'Python-float'
method: float
hex
	"Return a hexadecimal string representation of a floating-point number.
	 Format: [sign] '0x' integer '.' fraction 'p' [sign] exponent"

	| sign mantissa exponent mantissaHex result absVal kind |
	value = 0.0 ifTrue: [^str ___value: '0x0.0000000000000p+0'].

	"Check for exceptional values (NaN, Infinity)"
	kind := value _getKind.
	kind >= 5 ifTrue: [^str ___value: 'nan'].  "NaN"
	kind = 3 ifTrue: [  "Infinity"
		^str ___value: (value > 0 ifTrue: ['inf'] ifFalse: ['-inf'])
	].

	absVal := value abs.
	sign := value < 0 ifTrue: ['-'] ifFalse: [''].

	"Get the exponent (power of 2)"
	exponent := absVal fractionPart = 0
		ifTrue: [(absVal ln / 2 ln) floor]
		ifFalse: [(absVal ln / 2 ln) floor].

	"Normalize mantissa to be in range [1, 2)"
	mantissa := absVal / (2 raisedTo: exponent).

	"Handle denormalized numbers"
	mantissa >= 2 ifTrue: [
		exponent := exponent + 1.
		mantissa := mantissa / 2.
	].
	mantissa < 1 ifTrue: [
		exponent := exponent - 1.
		mantissa := mantissa * 2.
	].

	"Convert mantissa to hex (13 hex digits for 52-bit mantissa)"
	mantissaHex := ((mantissa - 1) * (16 raisedTo: 13)) rounded printStringRadix: 16.
	mantissaHex := mantissaHex asLowercase.
	[mantissaHex size < 13] whileTrue: [mantissaHex := '0', mantissaHex].

	result := sign, '0x1.', mantissaHex, 'p',
		(exponent >= 0 ifTrue: ['+'] ifFalse: ['']), exponent printString.
	^str ___value: result
%
category: 'Python-float'
method: float
imag

	^float ___value: 0
%
category: 'Python-float'
method: float
is_integer
	"Return True if the float is an integer value (has no fractional part)"

	^bool ___value: value = value truncated
%
category: 'Python-float'
method: float
real

	^self
%
category: 'Python-object'
method: float
__eq__: anObject

	^bool ___value: value = anObject ___value
%
category: 'Python-object'
method: float
__ge__: anObject

	^bool ___value: value >= anObject ___value
%
category: 'Python-object'
method: float
__gt__: anObject

	^bool ___value: value > anObject ___value
%
category: 'Python-object'
method: float
__init__

	value := 0.0.
%
category: 'Python-object'
method: float
__init__: aNumber

	value := aNumber asFloat.
%
category: 'Python-object'
method: float
__le__: anObject

	^bool ___value: value <= anObject ___value
%
category: 'Python-object'
method: float
__lt__: anObject

	^bool ___value: value < anObject ___value
%
category: 'Python-object'
method: float
__ne__: anObject

	^bool ___value: value ~= anObject ___value
%
category: 'Python-object'
method: float
__repr__

	^str ___value: value printString
%
category: 'Python-object'
method: float
__str__
	"Return string representation of the float."

	| s |
	s := value printString.
	"Handle -0.0 specially - use signBit to detect negative zero"
	(value = 0.0 and: [value signBit = 1]) ifTrue: [s := '-0.0'].
	^str ___value: s
%
category: 'Smalltalk'
method: float
___addInt: anInteger

	^float ___value:  anInteger + value
%
category: 'Smalltalk'
method: float
___addReal: aFloatReal imag: aFloatImag

	^complex ___real: value + aFloatReal imaginary: aFloatImag
%
category: 'Smalltalk'
method: float
___powFloat: aFloat

	
	| return asString |

	return := float ___value: (aFloat  raisedTo: value).
	asString := return ___value asString.
	(asString = 'MinusQuietNaN' or: [asString = 'PlusQuietNaN']) ifTrue: [
		^((complex ___real: 0 imaginary: ((aFloat*(-1)) sqrt)) __pow__: (float ___value: 2*value))
	].
	^return
%
category: 'Smalltalk'
method: float
___powInt: anInteger

	| return asString |

	return := float ___value: (anInteger  raisedTo: value).
	asString := return ___value asString.
	(asString = 'MinusQuietNaN' or: [asString = 'PlusQuietNaN']) ifTrue: [
		^((complex ___real: 0 imaginary: ((anInteger*(-1)) sqrt)) __pow__: (float ___value: 2*value))
	].
	^return
%
category: 'Smalltalk'
method: float
___powReal: aFloatReal imag: aFloatImag

		
	| radius radians |
	value = value asInteger ifTrue: [
		^((complex ___real: aFloatReal imaginary: aFloatImag) __pow__: (int ___value: value asInteger))

	].

	radius := ((aFloatReal raisedTo: 2) + (aFloatImag raisedTo: 2)) sqrt.
	aFloatReal asFloat == 0.0 ifTrue: [
		radians := Float pi / 2.
		aFloatImag < 0 ifTrue: [radians := radians + Float pi / 2].
	] ifFalse: [
		radians := (aFloatImag / aFloatReal) arcTan.
	].

	aFloatReal < 0 ifTrue: [
		radians := radians + Float pi
	].

	^complex
		___real: ((radius raisedTo: value) * ((value * radians) cos))
		imaginary: ((radius raisedTo: value) * ((value * radians) sin)).
%
category: 'Smalltalk'
method: float
___rsubInt: anInteger
	"Reverse subtraction: anInteger - self"

	^float ___value: anInteger - value
%
category: 'Smalltalk'
method: float
___value

	^value
%
category: 'Smalltalk'
method: float
___value: anInteger

	value := anInteger
%
category: 'Smalltalk'
method: float
__pow__: anObject

	^anObject ___powFloat: value
%
category: 'Smalltalk'
method: float
printOn: aStream

	aStream
		nextPutAll: 'float(';
		print: value;
		nextPut: $);
		yourself.
%
