! ------------------- Remove existing behavior from float
removeallmethods float
removeallclassmethods float
! ------------------- Class methods for float
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

	({$d. $i. $u} includes: aCharacter) ifTrue: [
		^(int ___value: value floor)
			___convertWithFlags: aSet
			precision: anObject
			andType: aCharacter
	].

	({$s. $a. $r } includes: aCharacter) ifTrue: [
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
	resultString := tempNumber asStringUsingFormat: {10. precisionHolder. false}.

	characterUsed == $g
		ifTrue: [
			| tempHolder index |
			tempHolder := ''.
			index := 1.
			"Collect only significant digits"
			[precisionHolder > 0 and: [index <= resultString size]] whileTrue: [
					
				(resultString at: index) isAlphaNumeric ifTrue: [
					precisionHolder := precisionHolder -1.
				].
				tempHolder := tempHolder + (resultString at: index).
				index := index + 1.
			].
			"remove trailing zeros"
			resultString := tempHolder.
			aCharacter asLowercase == $g ifTrue: [
				| reverseIndex |
				reverseIndex := resultString size.
				[(resultString at: reverseIndex) == $0] whileTrue: [
					reverseIndex := reverseIndex -1.
				].
				(resultString at: reverseIndex) == $. ifTrue: [
					reverseIndex := reverseIndex -1.
				].
				resultString := resultString copyFrom: 1 to: reverseIndex.
				
			].
		]
		ifFalse: [

			decimalIndex := resultString indexOf: $..
			"add trailing zeros, this is based on the precision or 6 if there is no precision"
			precisionHolder + decimalIndex <= resultString size
				ifTrue: [
					resultString := resultString copyFrom: 1 to: precisionHolder + decimalIndex.
					resultString last == $. ifTrue: [
						resultString := resultString copyFrom: 1 to: (resultString size -1).
					].
				] ifFalse: [
					aCharacter asLowercase == $g ifFalse: [
						[resultString size < (precisionHolder + decimalIndex)] whileTrue: [
							resultString := resultString + '0'.
						].
					].
				].

			aCharacter asLowercase == $g ifTrue: [
				| reverseIndex |
				reverseIndex := resultString size.
				[(resultString at: reverseIndex) == $0] whileTrue: [
					reverseIndex := reverseIndex -1.
				].
				(resultString at: reverseIndex) == $. ifTrue: [
					reverseIndex := reverseIndex -1.
				].
				resultString := resultString copyFrom: 1 to: reverseIndex.
				
			].
			"add exponential for onto the string if required"
			characterUsed == $e ifTrue: [
				resultString := resultString + 'e'.
				exponent negative ifTrue: [
					resultString := resultString + '-'.
				] ifFalse: [
					resultString := resultString + '+'.
				].
				exponent abs < 10 ifTrue: [
					resultString := resultString + '0'.
				].
				resultString := resultString + (exponent abs asString).
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

	^tuple  ___value: { value // anObject ___value. value \\ anObject ___value }
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
__fromhex__

	self error: #pyTodo
%
category: 'Python-float'
method: float
__getformat__

	self error: #pyTodo
%
category: 'Python-float'
method: float
__getnewargs__

	self error: #pyTodo
%
category: 'Python-float'
method: float
__hex__

	self error: #pyTodo
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

	((result * 2) odd and: [result floor even])
		ifTrue: [
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
__setformat__

	self error: #pyTodo
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
   ^tuple ___value: { val numerator. val denominator }
%
category: 'Python-float'
method: float
conjugate

	^self
%
category: 'Python-float'
method: float
imag

	^float ___value: 0
%
category: 'Python-float'
method: float
is_integer

	^self __trunc__ __eq__: self
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
	
	| return |

	return := float ___value: (aFloat  raisedTo: value).
	return ___value asString = 'MinusQuietNaN'
		ifTrue: [
			^((complex ___real: 0 imaginary: ((aFloat*(-1)) sqrt)) __pow__: (float ___value: 2*value))
		].
	^return
%
category: 'Smalltalk'
method: float
___powInt: anInteger
	| return |

	return := float ___value: (anInteger  raisedTo: value).
	return ___value asString = 'MinusQuietNaN'
		ifTrue: [
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
	aFloatReal asFloat == 0.0
		ifTrue: [
			radians := Float pi / 2.
			aFloatImag < 0 ifTrue: [radians := radians + Float pi / 2].
		] ifFalse: [
			radians := (aFloatImag / aFloatReal) arcTan.
		].
			

	aFloatReal < 0
		ifTrue: [
			radians := radians + Float pi
		].

	^complex
		___real: ((radius raisedTo: value) * ((value * radians) cos))
		imaginary: ((radius raisedTo: value) * ((value * radians) sin)).
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
