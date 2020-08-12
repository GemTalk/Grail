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
real: newValue imag: newImag
	^self basicNew real: newValue imag: newImag
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
- aNumber
	(aNumber isKindOf: complex) ifTrue: [
		^complex real: self real - aNumber real imag: self imaginary - aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: complex
* aNumber
	(aNumber isKindOf: complex) ifTrue: [
		^complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #* coercing: aNumber
%
category: 'Arithmetic'
method: complex
/ aNumber
	(aNumber isKindOf: complex) ifTrue: [
		^complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #/ coercing: aNumber
%
category: 'Arithmetic'
method: complex
+ aNumber
	(aNumber isKindOf: complex) ifTrue: [
		^complex real: self real + aNumber real imag: self imaginary + aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: complex
= aNumber
	(aNumber isKindOf: complex) ifTrue: [
		^(self real = aNumber real) and: [self imag = aNumber imag]
	].
	^self _retry: #= coercing: aNumber
%
set compile_env: 0
category: 'other'
method: complex
_coerce: aNumber
	^complex real: aNumber imag: 0
%
category: 'other'
method: complex
_generality
	^150
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

	real ~= 0 ifTrue: [
		aStream 
			print: real;
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

	self halt.
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

	self halt.
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

	self halt.
%
category: 'Python'
method: complex
__truediv__

	self halt.
%
category: 'Python'
method: complex
conjugate

	self halt.
%
category: 'Python'
method: complex
imag

	self halt.
%
category: 'Python'
method: complex
real

	self halt.
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
	real := newValue
%
category: 'Updating'
method: complex
real: newValue imag: newImag
	real := newValue.
	imaginary := newImag.
%
