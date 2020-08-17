! ------------------- Remove existing behavior from complex
expectvalue /Metaclass3       
doit
complex removeAllMethods.
complex class removeAllMethods.
%
! ------------------- Class methods for complex
set compile_env: 0
category: 'other'
classmethod: complex
_generality

	^ 150
%
category: 'other'
classmethod: complex
real: newValue imag: newImag

	^self basicNew 
		real: newValue 
		imag: newImag
%
category: 'other'
classmethod: complex
with: aNumber
	
	| aComplex |
	aComplex := aNumber.
	(aNumber isKindOf: complex) ifFalse: [ aComplex := complex real: aNumber imag: 0 ].
	^ self real: aComplex real imag: aComplex imag
%
! ------------------- Instance methods for complex
set compile_env: 0
category: 'Accessing'
method: complex
imaginary
	^imaginary
%
set compile_env: 0
category: 'Arithmetic'
method: complex
_retry: aSymbol coercing: aNumber

	^ self perform: aSymbol with: (self _coerce: aNumber)
%
category: 'Arithmetic'
method: complex
= anObject

	| res temp |
	res := ((temp := self __eq__ value: self value: anObject) == True).
	^ res
%
set compile_env: 0
category: 'other'
method: complex
_coerce: aNumber

	^ complex real: aNumber imag: 0
%
category: 'other'
method: complex
_generality

	^ 150
%
set compile_env: 0
category: 'Printing'
method: complex
asString

	| stream |
	stream := WriteStream on: str new.
	self printOn: stream.
	^stream contents
%
category: 'Printing'
method: complex
printOn: aStream

	number ~= 0 ifTrue: [
		aStream 
			print: number;
			nextPut: $+.
	].

	aStream 
		print: imaginary;
		nextPut: $j.
%
set compile_env: 0
category: 'Python'
method: complex
__abs__

	self halt.
%
category: 'Python'
method: complex
__add__

	^ [ :lhs :rhs | complex 
		real: lhs real + rhs real
		imag: lhs imag + rhs imag
	]
%
category: 'Python'
method: complex
__bool__

	self halt.
%
category: 'Python'
method: complex
__divmod__

	self halt.
%
category: 'Python'
method: complex
__eq__
	
	^ [ :lhs :rhs |
		| lreal rreal limag rimag |
		lreal := lhs.
		rreal := rhs.
		limag := 0.
		rimag := 0.
		(lhs isKindOf: complex) ifTrue: [ limag := lhs imag ].
		(rhs isKindOf: complex) ifTrue: [ rimag := rhs imag ].
		(lhs isKindOf: AbstractNumber) ifTrue: [ lreal := lhs ___number ].
		(rhs isKindOf: AbstractNumber) ifTrue: [ rreal := rhs ___number ].
		(lreal == rreal and: [ limag == rimag ]) ifTrue: [ True ] ifFalse: [ False ] 
	]
%
category: 'Python'
method: complex
__float__

	self halt.
%
category: 'Python'
method: complex
__floordiv__

	self halt.
%
category: 'Python'
method: complex
__getnewargs__

	self halt.
%
category: 'Python'
method: complex
__int__

	self halt.
%
category: 'Python'
method: complex
__mod__

	self halt.
%
category: 'Python'
method: complex
__mul__

	^ [ :lhs :rhs |	complex 
		real: (lhs real * rhs real) + (lhs imaginary * rhs imaginary) negated
		imag: (lhs real * rhs imaginary) + (lhs imaginary * rhs real)
	]
%
category: 'Python'
method: complex
__neg__

	self halt.
%
category: 'Python'
method: complex
__pos__

	self halt.
%
category: 'Python'
method: complex
__pow__

	self halt.
%
category: 'Python'
method: complex
__radd__

	self halt.
%
category: 'Python'
method: complex
__rdivmod__

	self halt.
%
category: 'Python'
method: complex
__rfloordiv__

	self halt.
%
category: 'Python'
method: complex
__rmod__

	self halt.
%
category: 'Python'
method: complex
__rmul__

	self halt.
%
category: 'Python'
method: complex
__rpow__

	self halt.
%
category: 'Python'
method: complex
__rsub__

	self halt.
%
category: 'Python'
method: complex
__rtruediv__

	self halt.
%
category: 'Python'
method: complex
__str__

	self halt.
%
category: 'Python'
method: complex
__sub__

	^ [ :lhs :rhs | complex
		real: lhs real - rhs real 
		imag: lhs imaginary - rhs imaginary
	]
%
category: 'Python'
method: complex
__truediv__

	^ [ :lhs :rhs | complex
		real: (lhs real * rhs real) + (lhs imaginary * rhs imaginary) negated
		imag: (lhs real * rhs imaginary) + (lhs imaginary * rhs real)
	]
%
category: 'Python'
method: complex
conjugate

	self halt.
%
category: 'Python'
method: complex
imag

	^ imaginary
%
category: 'Python'
method: complex
real

	^ number
%
set compile_env: 0
category: 'Updating'
method: complex
imaginary: newValue
	imaginary := newValue
%
category: 'Updating'
method: complex
real: newValue

	number := newValue
%
category: 'Updating'
method: complex
real: newValue imag: newImag

	(newValue isKindOf: AbstractNumber) 
		ifTrue: [ number := newValue ___number ]
		ifFalse: [ number := newValue ].
	(newImag isKindOf: AbstractNumber) 
		ifTrue: [ imaginary := newImag ___number ]
		ifFalse: [ imaginary := newImag ].
%
