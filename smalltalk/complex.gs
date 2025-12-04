! ------------------- Remove existing behavior from complex
removeallmethods complex
removeallclassmethods complex
! ------------------- Class methods for complex
category: 'other'
classmethod: complex
__call__: p1

	^(self __new__: p1) __init__: p1; yourself
%
category: 'other'
classmethod: complex
__call__: p1 _: p2

	^(self __new__: p1 _: p2) __init__: p1 _: p2; yourself
%
category: 'other'
classmethod: complex
__new__: p1

	^self basicNew
%
category: 'other'
classmethod: complex
__new__: p1 _: p2

	^self basicNew
%
category: 'Smalltalk'
classmethod: complex
___assertJustOneStringArgumentOn: args
	(((args first isKindOf: String) or: [args first isKindOf: str]) and:
	[(args size > 1)])
		ifTrue: [TypeError signal: self name, '() can''t take second arg if first is a string'].
%
category: 'Smalltalk'
classmethod: complex
___assertMagnitudeAsFirstAgumentOn: args
	((args first isKindOf: (Globals at: #'Magnitude')) or: [args first isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() first argument must be a string or a number, not ''', args first class name,''''].
%
category: 'Smalltalk'
classmethod: complex
___assertMagnitudeAsSecondAgumentOn: args
	((args second isKindOf: (Globals at: #'Magnitude')) or: [args second isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() second argument must be a number, not ''', args second class name,''''].
%
category: 'Smalltalk'
classmethod: complex
___real: r

	^self ___real: r imaginary: 0
%
category: 'Smalltalk'
classmethod: complex
___real: r imaginary: i

	^self basicNew
		___real: r imaginary: i;
		yourself
%
! ------------------- Instance methods for complex
category: 'Python-complex'
method: complex
__abs__

	^float ___value: ((real raisedTo: 2) + (imaginary raisedTo: 2)) sqrt
%
category: 'Python-complex'
method: complex
__add__: anObject

	^anObject ___addReal: real imag: imaginary
%
category: 'Python-complex'
method: complex
__bool__

	^bool ___value: (real ~= 0 or: [imaginary ~= 0])
%
category: 'Python-complex'
method: complex
__getnewargs__
	"https://docs.python.org/3/library/pickle.html#object.__getnewargs__"

	#pyTodo.
	self error: 'Not yet implemented!'.
%
category: 'Python-complex'
method: complex
__mul__: anObject
	"https://mathworld.wolfram.com/ComplexMultiplication.html"
	^anObject ___mulReal: real imag: imaginary
%
category: 'Python-complex'
method: complex
__neg__

	^complex 
		___real: real negated 
		imaginary: imaginary negated
%
category: 'Python-complex'
method: complex
__pos__

		^self
%
category: 'Python-complex'
method: complex
__radd__: any

	^any __add__: self
%
category: 'Python-complex'
method: complex
__rmul__: any

	^any __mul__: self
%
category: 'Python-complex'
method: complex
__rsub__: any

	^any __sub__: self
%
category: 'Python-complex'
method: complex
__rtruediv__: any
	"https://mathworld.wolfram.com/ComplexDivision.html"

	^any __truediv__: self
%
category: 'Python-complex'
method: complex
__sub__: any
	"https://mathworld.wolfram.com/ComplexMultiplication.html"

	| a b c d |
	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.
	^complex
		___real: a - c
		imaginary: b - d
%
category: 'Python-complex'
method: complex
__truediv__: anObject

	^(anObject ___truedivReal: real imag: imaginary)
%
category: 'Python-complex'
method: complex
conjugate

	^complex 
		___real: real 
		imaginary: imaginary negated.
%
category: 'Python-complex'
method: complex
imag

	^float ___value: imaginary
%
category: 'Python-complex'
method: complex
real

	^float ___value: real
%
category: 'Python-object'
method: complex
__eq__: anObject

	^bool ___value: (real = (anObject real ___value) and: [imaginary = (anObject imag ___value)])
%
category: 'Python-object'
method: complex
__ge__: anObject

	TypeError signal: 'TypeError: ''>='' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python-object'
method: complex
__gt__: anObject

	TypeError signal: 'TypeError: ''>'' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python-object'
method: complex
__init__: anObject
	"https://docs.python.org/3/library/functions.html#complex"

	(anObject isKindOf: str) ifTrue: [^self ___parse: anObject ___value].
	[
		real := anObject real ___value.
		imaginary := anObject imag ___value.
	] on: Error do: [:ex | 
		TypeError signal: 'complex() first argument must be a string or a number, not ' , anObject class name asString printString 
	].
%
category: 'Python-object'
method: complex
__init__: p1 _: p2
	"https://docs.python.org/3/library/functions.html#complex"

	(p1 isKindOf: str) ifTrue: [
		TypeError signal: 'complex() can''t take second arg if first is a string'.
	].
	[
		real := p1 ___value.
	] on: Error do: [:ex | 
		TypeError signal: 'complex() first argument must be a number, not ' , p1 class name asString printString.
	].
	[
		imaginary := p2 ___value.
	] on: Error do: [:ex | 
		TypeError signal: 'complex() second argument must be a number, not ' , p2 class name asString printString.
	].
%
category: 'Python-object'
method: complex
__le__: anObject

	TypeError signal: 'TypeError: ''<='' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python-object'
method: complex
__lt__: anObject

	TypeError signal: 'TypeError: ''<'' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python-object'
method: complex
__ne__: other

	^(self __eq__: other) __not__
%
category: 'Python-object'
method: complex
__repr__

	^str ___value: (String streamContents: [:s |
		real = 0 ifFalse: [
			s nextPut: $(.
			((real rem: 1) = 0 ifTrue: [real asInteger] ifFalse: [real]) printOn: s.
			imaginary positive ifTrue: [s nextPut: $+]
		].
		((imaginary rem: 1) = 0 ifTrue: [imaginary asInteger] ifFalse: [imaginary]) printOn: s.
		s nextPut: $j.
		real = 0 ifFalse: [s nextPut: $)]
	])
%
category: 'Smalltalk'
method: complex
___addFloat: aFloat

	^complex ___real: real + aFloat imaginary: imaginary
%
category: 'Smalltalk'
method: complex
___addInt: anInteger

	^complex
		___real: anInteger + real
		imaginary: imaginary.
%
category: 'Smalltalk'
method: complex
___addReal: aFloatReal imag: aFloatImag

	^complex ___real: real + aFloatReal imaginary: imaginary + aFloatImag
%
category: 'Smalltalk'
method: complex
___imaginary
	"Return the Smalltalk Float value of the imaginary part"

	^imaginary
%
category: 'Smalltalk'
method: complex
___mulFloat: aFloat

	^complex ___real: aFloat * real imaginary: aFloat * imaginary
%
category: 'Smalltalk'
method: complex
___mulInt: anInteger

	^complex ___real: anInteger * real imaginary: anInteger * imaginary
%
category: 'Smalltalk'
method: complex
___mulReal: aFloatReal imag: aFloatImag

	^complex
		___real: ((real * aFloatReal) - (imaginary * aFloatImag))
		imaginary: ((real * aFloatImag) + (imaginary * aFloatReal)).
%
category: 'Smalltalk'
method: complex
___parse: stringArg
 
	[
		| stream |
		stream := ReadStream on: stringArg.
		stream peek == $( ifTrue: [
			stream next.
			real := Float fromStream: stream.
			imaginary := Float fromStream: stream.
			stream next == $j ifFalse: [ValueError signal].
			stream next == $) ifFalse: [ValueError signal].
			stream atEnd ifFalse: [ValueError signal].
			^self
		] ifFalse: [
			real := 0.
			imaginary := Float fromStream: stream.
			stream next == $j ifFalse: [ValueError signal].
			stream atEnd ifFalse: [ValueError signal].
			^self
		].
	] on: Error , ValueError do: [:ex | ex return].
	ValueError signal: 'complex() arg is a malformed string'.
%
category: 'Smalltalk'
method: complex
___powFloat: aFloat
	^complex
		___real: (aFloat raisedTo: real) * ((imaginary *(aFloat ln)) cos)
		imaginary: (aFloat raisedTo: real) * ((imaginary *(aFloat ln)) sin)
%
category: 'Smalltalk'
method: complex
___powInt: anInteger
	^complex
		___real: (anInteger raisedTo: real) * ((imaginary *(anInteger ln)) cos)
		imaginary: (anInteger raisedTo: real) * ((imaginary *(anInteger ln)) sin)
%
category: 'Smalltalk'
method: complex
___powReal: aFloatReal imag: aFloatImag
	
	| radius radians eulerTranslationExp originalExp combinationExp |
	

	originalExp := complex ___real: aFloatReal imaginary: aFloatImag.
	radius := ((aFloatReal raisedTo: 2) + (aFloatImag raisedTo: 2)) sqrt.
	aFloatReal asFloat == 0.0
		ifTrue: [
			radians := Float pi / 2.
			aFloatImag < 0 ifTrue: [radians := radians + Float pi / 2].
		] ifFalse: [
			radians := (aFloatImag / aFloatReal) arcTan.
		].
	eulerTranslationExp := complex
										___real:  radius ln
										imaginary: radians.
	
	combinationExp := eulerTranslationExp __mul__: originalExp.

	^(float ___value: Float e) __pow__: combinationExp
%
category: 'Smalltalk'
method: complex
___real
	"Return the Smalltalk Float value of the real part"

	^real
%
category: 'Smalltalk'
method: complex
___real: r imaginary: i
	"Store real and imaginary parts, coercing to Float if needed"

	real := r asFloat.
	imaginary := i asFloat.
%
category: 'Smalltalk'
method: complex
___rsubInt: anInteger
	"Reverse subtraction: anInteger - self"

	^complex
		___real: anInteger - real
		imaginary: imaginary negated.
%
category: 'Smalltalk'
method: complex
___truedivFloat: aFloat
	| numerator denominator |

	(real = 0) & (imaginary = 0) 
		ifTrue: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero'].
	
	numerator := (float ___value: aFloat) __mul__: self conjugate.
	denominator := (real*real) + (imaginary*imaginary).
	^numerator __truediv__: (float ___value: denominator)
%
category: 'Smalltalk'
method: complex
___truedivInt: anInteger
	| numerator denominator |

	(real = 0) & (imaginary = 0) 
		ifTrue: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero'].
	
	numerator := (float ___value: anInteger) __mul__: self conjugate.
	denominator := (real*real) + (imaginary*imaginary).
	^numerator __truediv__: (float ___value: denominator)
%
category: 'Smalltalk'
method: complex
___truedivReal: aFloatReal imag: aFloatImag
	| numerator denominator |
	(real = 0) & (imaginary = 0) 
		ifTrue: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero'].

	numerator := complex ___real: aFloatReal imaginary: aFloatImag.

	numerator := numerator __mul__: self conjugate.
	denominator := (real*real) + (imaginary*imaginary).
	^(numerator __truediv__: (float ___value: denominator))
%
category: 'Smalltalk'
method: complex
___value

	^real
%
category: 'Smalltalk'
method: complex
 __pow__: anObject

	^anObject ___powReal: real imag: imaginary
%
category: 'Smalltalk'
method: complex
__rpow__: anObject

	^anObject __pow__: self
%
category: 'Smalltalk'
method: complex
printOn: aStream

	aStream
		nextPutAll: 'complex(';
		print: real;
		nextPut: $,;
		print: imaginary;
		nextPut: $).
%
