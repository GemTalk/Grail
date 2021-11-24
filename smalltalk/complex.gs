! ------------------- Remove existing behavior from complex
removeAllMethods complex
removeAllClassMethods complex
! ------------------- Class methods for complex
set compile_env: 0
set compile_env: 0
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
___real: r imaginary: i

	^self basicNew
		___real: r imaginary: i;
		yourself
%
! ------------------- Instance methods for complex
set compile_env: 0
category: 'Python'
method: complex
__abs__

	^float ___value: ((real raisedTo: 2) + (imaginary raisedTo: 2)) sqrt
%
category: 'Python'
method: complex
__add__: anObject

	^complex
		___real: real + anObject real ___value
		imaginary: imaginary + anObject imag ___value
%
category: 'Python'
method: complex
__bool__

	^bool ___value: (real ~= 0 or: [imaginary ~= 0])
%
category: 'Python'
method: complex
__divmod__: any

	^TypeError signal: 'can''t take floor or mod of complex numbers'
%
category: 'Python'
method: complex
__eq__: anObject

	^bool ___value: (real = anObject real ___value and: [imaginary = anObject imag ___value])
%
category: 'Python'
method: complex
__ge__: anObject

	TypeError signal: 'TypeError: ''>='' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python'
method: complex
__gt__: anObject

	TypeError signal: 'TypeError: ''>'' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python'
method: complex
__init__: anObject
	"https://docs.python.org/3/library/functions.html#complex"

	(anObject isKindOf: str) ifTrue: [^self ___parse: anObject ___value].
	real := anObject real ___value.
	imaginary := anObject imag ___value.
%
category: 'Python'
method: complex
__int__

	^TypeError signal: 'can''t convert complex to int'
%
category: 'Python'
method: complex
__le__: anObject

	TypeError signal: 'TypeError: ''<='' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python'
method: complex
__lt__: anObject

	TypeError signal: 'TypeError: ''<'' not supported between instances of ''complex'' and ' , anObject class asString printString.
%
category: 'Python'
method: complex
__mod__: any

	^TypeError signal: 'can''t mod complex numbers'
%
category: 'Python'
method: complex
__mul__: any
	"https://mathworld.wolfram.com/ComplexMultiplication.html"

	| a b c d |
	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.

	^complex
		___real: ((a * c) - (b * d))
		imaginary: ((a * d) + (b * c))
%
category: 'Python'
method: complex
__ne__: other

	^bool ___value: ((self __eq__: other) ___value == 0 ifTrue: [1] ifFalse: [0])
%
category: 'Python'
method: complex
__neg__

	^complex 
		___real: real negated 
		imaginary: imaginary negated
%
category: 'Python'
method: complex
__pos__

		^self
%
category: 'Python'
method: complex
__pow__: exponent
	"https://byjus.com/complex-number-power-formula/"

	| newValue  |
	#pyElaborate.
	newValue := int ___value: 1.
	exponent ___value timesRepeat: [
		newValue := self __mul__: newValue
	].
	^newValue
%
category: 'Python'
method: complex
__radd__: any

	^any __add__: self
%
category: 'Python'
method: complex
__rand__: any

	^any __and__: self
%
category: 'Python'
method: complex
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python'
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
category: 'Python'
method: complex
__rmod__: any

	^any __mod__: self
%
category: 'Python'
method: complex
__rmul__: any

	^any __mul__: self
%
category: 'Python'
method: complex
__rpow__: any

	^any __pow__: self
%
category: 'Python'
method: complex
__rsub__: any

	^any __sub__: self
%
category: 'Python'
method: complex
__rtruediv__: any
	"https://mathworld.wolfram.com/ComplexDivision.html"

	(any isKindOf: complex) ifTrue: [^any __truediv__: self].
	^(complex ___new__init__: any ___value _: 0) __truediv__: self.
%
category: 'Python'
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
category: 'Python'
method: complex
__truediv__: any
	"https://mathworld.wolfram.com/ComplexDivision.html"

	| a b c d denominator |
	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.
	denominator := (c raisedTo: 2) + (d raisedTo: 2).
	^complex
		___real: (a * c) + (b * d) / denominator
		imaginary: (b * c) - (a * d) / denominator
%
category: 'Python'
method: complex
conjugate

	^complex 
		___real: real 
		imaginary: imaginary negated.
%
category: 'Python'
method: complex
imag

	^float ___value: imaginary
%
category: 'Python'
method: complex
real

	^float ___value: real
%
set compile_env: 0
category: 'Smalltalk'
method: complex
___initArgs: args

	self error: 'use another constructor'.
	args isEmpty ifTrue: [^self ___initialize: 0 _: 0].

	self class ___assertJustOneStringArgumentOn: args.
	((args first isKindOf: String) or: [args first  isKindOf: str])
		ifTrue: [^self ___parse: args first].

	self class ___assertMagnitudeAsFirstAgumentOn: args.
	(args size == 1)
		ifTrue: [^self ___initialize: args first _: 0].

	self class ___assertMagnitudeAsSecondAgumentOn: args.
   ^self ___initialize: args first _: args second.
%
category: 'Smalltalk'
method: complex
___initialize: r1 _: r2

	self error: 'use another constructor'.
 	(r1 isKindOf: complex) ifTrue: [
		real := r1 real ___value.
		imaginary := r1 imag ___value.
	] ifFalse: [
		real := r1 asFloat.
		imaginary := r2 asFloat.
	].
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
___real: r imaginary: i

	real := r.
	imaginary := i.
%
category: 'Smalltalk'
method: complex
___value

	^real
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
