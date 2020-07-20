! ------------------- Remove existing behavior from Complex
expectvalue /Metaclass3       
doit
Complex removeAllMethods.
Complex class removeAllMethods.
%
! ------------------- Class methods for Complex
set compile_env: 0
category: 'other'
classmethod: Complex
real: newValue imag: newImag
	^self basicNew real: newValue imag: newImag
%
! ------------------- Instance methods for Complex
set compile_env: 0
category: 'Accessing'
method: Complex
imag
	^imaginary
%
category: 'Accessing'
method: Complex
imaginary
	^imaginary
%
category: 'Accessing'
method: Complex
real
	^real
%
set compile_env: 0
category: 'Arithmetic'
method: Complex
- aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: self real - aNumber real imag: self imaginary - aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
* aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #* coercing: aNumber
%
category: 'Arithmetic'
method: Complex
/ aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #/ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
+ aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: self real + aNumber real imag: self imaginary + aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
= aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^(self real = aNumber real) and: [self imag = aNumber imag]
	].
	^self _retry: #= coercing: aNumber
%
set compile_env: 0
category: 'other'
method: Complex
_coerce: aNumber
	^Complex real: aNumber imag: 0
%
category: 'other'
method: Complex
_generality
	^150
%
set compile_env: 0
category: 'Printing'
method: Complex
asString

	| stream |
	stream := WriteStream on: PyString new.
	self printOn: stream.
	^stream contents
%
category: 'Printing'
method: Complex
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
category: 'Updating'
method: Complex
imaginary: newValue
	imaginary := newValue
%
category: 'Updating'
method: Complex
real: newValue
	real := newValue
%
category: 'Updating'
method: Complex
real: newValue imag: newImag
	real := newValue.
	imaginary := newImag.
%
