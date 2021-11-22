! ------------------- Remove existing behavior from complex
removeAllMethods complex
removeAllClassMethods complex
! ------------------- Class methods for complex
set compile_env: 0
category: 'Smalltalk'
classmethod: complex
___assertJustOneStringArgumentOn: args
	( ( ( args first isKindOf: String ) or: [ args first isKindOf: str ] ) and:
	[ ( args size > 1 ) ] )
		ifTrue: [ TypeError signal: self name, '() can''t take second arg if first is a string'].
%
category: 'Smalltalk'
classmethod: complex
___assertMagnitudeAsFirstAgumentOn: args
	( ( args first isKindOf: (Globals at: #'Magnitude') ) or: [ args first isKindOf: Magnitude ] )
		ifFalse: [ TypeError signal: self name, '() first argument must be a string or a number, not ''', args first class name,'''' ].
%
category: 'Smalltalk'
classmethod: complex
___assertMagnitudeAsSecondAgumentOn: args
	( ( args second isKindOf: (Globals at: #'Magnitude') ) or: [ args second isKindOf: Magnitude ] )
		ifFalse: [ TypeError signal: self name, '() second argument must be a number, not ''', args second class name,'''' ].
%
! ------------------- Instance methods for complex
set compile_env: 0
category: 'Python'
method: complex
__abs__

	^float ___new__init__: ((value raisedTo: 2) + (imaginary raisedTo: 2)) sqrt
%
category: 'Python'
method: complex
__add__: other

	^self class 
		___new__init__: value + other ___value  
		_: ((other isKindOf: complex) ifTrue: [imaginary + other imag ___value] ifFalse: [imaginary])
%
category: 'Python'
method: complex
__bool__

	^ self __abs__ ~= 0
%
category: 'Python'
method: complex
__divmod__: any

	^ TypeError signal: 'can''t take floor or mod of complex numbers'
%
category: 'Python'
method: complex
__eq__: other

	(other isKindOf: complex) ifTrue: [
		^value = other real ___value and: [imaginary = other imag ___value]
	].
	((other isKindOf: Magnitude) and: [imaginary = 0]) ifTrue: [
		^value = other ___value
	].
	^false
%
category: 'Python'
method: complex
__float__

	^ TypeError signal: 'can''t convert complex to float'
%
category: 'Python'
method: complex
__floordiv__: any

	^ TypeError signal: 'can''t take floor of complex numbers'
%
category: 'Python'
method: complex
__ge__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: complex
__gt__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: complex
__int__

	^ TypeError signal: 'can''t convert complex to int'
%
category: 'Python'
method: complex
__le__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: complex
__lt__: anObject

	^NotImplementedType singleton
%
category: 'Python'
method: complex
__mod__: any

	^ TypeError signal: 'can''t mod complex numbers'
%
category: 'Python'
method: complex
__mul__: any
	"https://mathworld.wolfram.com/ComplexMultiplication.html"
	| a b c d |
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __mul__: ( self class ___new__init__: any ) ].

	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.

	^ self class ___new__init__: ( ( a * c ) - ( b * d ) )
				                 _: ( ( a * d ) + ( b * c ) )
%
category: 'Python'
method: complex
__neg__
	^ self class ___new__init__: value negated _: imaginary negated.
%
category: 'Python'
method: complex
__pos__
		^ self
%
category: 'Python'
method: complex
__pow__: other
	| newValue repeats |
	repeats := ( other isKindOf: Magnitude )
						ifTrue: [ other ___value ]
						ifFalse: [ other ].

	#pyElaborate.
	newValue := 1.
	repeats timesRepeat: [
		newValue := self __mul__: newValue
		 ].
	^ newValue
%
category: 'Python'
method: complex
__rdivmod__: any

	^ TypeError signal: 'can''t take floor or mod of complex numbers'
%
category: 'Python'
method: complex
__repr__

	^ String streamContents: [:s |
		value = 0 ifFalse: [
			s nextPut: $(.
			((value rem: 1) = 0 ifTrue: [value asInteger] ifFalse: [value]) printOn: s.
			imaginary positive ifTrue: [ s nextPut: $+ ]
		].
		((imaginary rem: 1) = 0 ifTrue: [imaginary asInteger] ifFalse: [imaginary]) printOn: s.
		s nextPut: $j.
		value = 0 ifFalse: [ s nextPut: $) ]
	]
%
category: 'Python'
method: complex
__rfloordiv__: any

	^ TypeError signal: 'can''t take floor of complex numbers'
%
category: 'Python'
method: complex
__rpow__: other
	^ self __pow__: other
%
category: 'Python'
method: complex
__rtruediv__: any
	"https://mathworld.wolfram.com/ComplexDivision.html"

	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rtruediv__: ( self class ___new__init__: any ) ].
	(any isKindOf: complex) ifTrue: [^ any __truediv__: self].
	^(complex ___new__init__: any ___value _: 0) __truediv__: self.
%
category: 'Python'
method: complex
__sub__: any
	"https://mathworld.wolfram.com/ComplexMultiplication.html"
	| a b c d |
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __sub__: ( self class ___new__init__: any ) ].

	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.

	^ self class ___new__init__: ( a - c ) _: ( b - d )
%
category: 'Python'
method: complex
__truediv__: any
	"https://mathworld.wolfram.com/ComplexDivision.html"
	| a b c d denominator |
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __truediv__: ( self class ___new__init__: any ) ].

	a := self real ___value.
	b := self imag ___value.
	c := any real ___value.
	d := any imag ___value.

	denominator := (c raisedTo: 2 ) + ( d raisedTo: 2 ).

	^ self class ___new__init__: ( ( a * c ) + ( b * d ) / denominator )
				                 _: ( ( b * c ) - ( a * d ) / denominator )
%
category: 'Python'
method: complex
conjugate
	^ self class ___new__init__: value _: imaginary negated.
%
category: 'Python'
method: complex
imag

	^float ___new__init__: imaginary
%
category: 'Python'
method: complex
real

	^float ___new__init__: value
%
set compile_env: 0
category: 'Smalltalk'
method: complex
___initArgs: args

	args isEmpty ifTrue: [ ^ self ___initialize: 0 _: 0].

	self class ___assertJustOneStringArgumentOn: args.
	( ( args first isKindOf: String ) or: [ args first  isKindOf: str ] )
		ifTrue: [ ^ self ___parse: args first ].

	self class ___assertMagnitudeAsFirstAgumentOn: args.
	( args size == 1 )
		ifTrue: [ ^ self ___initialize: args first _: 0].

	self class ___assertMagnitudeAsSecondAgumentOn: args.
   ^  self ___initialize: args first _: args second.
%
category: 'Smalltalk'
method: complex
___initialize: r1 _: r2

 	(r1 isKindOf: complex) ifTrue: [ 
		value := r1 real ___value.
		imaginary := r1 imag ___value.
	] ifFalse: [
		value := r1 asFloat.
		imaginary := r2 asFloat.
	].
%
category: 'Smalltalk'
method: complex
___parse: stringArg

	[
		| stream r1 r2 |
		stream := ReadStream on: stringArg.
		stream peek == $( ifTrue: [
			stream next.
			r1 := Float fromStream: stream.
			r2 := Float fromStream: stream.
			stream next == $j ifFalse: [ValueError signal].
			stream next == $) ifFalse: [ValueError signal].
			stream atEnd ifFalse: [ValueError signal].
			^self ___initialize: r1 _: r2.
		] ifFalse: [
			r2 := Float fromStream: stream.
			stream next == $j ifFalse: [ValueError signal].
			stream atEnd ifFalse: [ValueError signal].
			^self ___initialize: 0 _: r2.
		].
	] on: Error , ValueError do: [:ex | ex return].
	ValueError signal: 'complex() arg is a malformed string'.
%
category: 'Smalltalk'
method: complex
printOn: aStream

	aStream 
		nextPutAll: 'complex(';
		print: value;
		nextPut: $,;
		print: imaginary;
		nextPut: $).
%
