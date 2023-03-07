! ------------------- Remove existing behavior from float
removeAllMethods float
removeAllClassMethods float
! ------------------- Class methods for float
set compile_env: 0
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
set compile_env: 0
category: 'Python-float'
method: float
___addFloat: aFloat

	^float ___value: (value + aFloat).
%
category: 'Python-float'
method: float
___mulFloat: aFloat

	^float ___value: (aFloat * value).
%
category: 'Python-float'
method: float
___mulInt: anInteger

	^float ___value: (anInteger * value).
%
category: 'Python-float'
method: float
___mulReal: aFloatReal imag: aFloatImag

	^complex ___real: (aFloatReal * value) imaginary: (aFloatImag * value) .
%
category: 'Python-float'
method: float
__abs__

	^float ___value: value abs
%
category: 'Python-float'
method: float
__add__: anObject

	^anObject ___addFloat: value.
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

	^anObject ___mulFloat: value.
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

	^int ___value: value rounded
%
category: 'Python-float'
method: float
__rpow__: anObject

	^anObject __pow__: self.
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

	^[float ___value: value / anObject ___value] on: ZeroDivide do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
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
set compile_env: 0
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
set compile_env: 0
category: 'Smalltalk'
method: float
___addInt: anInteger

	^float ___value:  (anInteger + value).
%
category: 'Smalltalk'
method: float
___addReal: aFloatReal imag: aFloatImag

	^complex ___real: (value + aFloatReal) imaginary: (aFloatImag).
%
category: 'Smalltalk'
method: float
___powFloat: aFloat
	
	| return |

	return := float ___value: (aFloat  raisedTo: value).
	return ___value asString = 'MinusQuietNaN'
		ifTrue: [
			^((complex ___real: 0 imaginary: ((aFloat*(-1)) sqrt)) __pow__: (float ___value: (2*value))).
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
			^((complex ___real: 0 imaginary: ((anInteger*(-1)) sqrt)) __pow__: (float ___value: (2*value))).
		].
	^return
%
category: 'Smalltalk'
method: float
___powReal: aFloatReal imag: aFloatImag
		
	| radius radians |
	value = (value asInteger) ifTrue: [
		^ ((complex ___real: aFloatReal imaginary: aFloatImag) __pow__: (int ___value: (value asInteger)))

	].

	radius := ((aFloatReal raisedTo: 2) + (aFloatImag raisedTo: 2)) sqrt.
	aFloatReal asFloat == 0.0
		ifTrue: [
			radians := (Float pi) / 2.
			aFloatImag < 0 ifTrue: [ radians := radians + Float pi / 2 ].
		] ifFalse: [
			radians := ( aFloatImag / aFloatReal ) arcTan .
		].
			

	aFloatReal < 0
		ifTrue:[
			radians := radians + Float pi
		].

	^complex
		___real: ((radius raisedTo: value) * ( (value * radians) cos))
		imaginary: ((radius raisedTo: value) * ( (value * radians) sin)).
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

	^ anObject ___powFloat: value.
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
