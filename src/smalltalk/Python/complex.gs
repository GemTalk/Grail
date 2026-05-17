! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- complex class (Python 'complex' type)
expectvalue /Class
doit
object subclass: 'complex'
  instVarNames: #( real imag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
complex comment:
'Python complex number type.

Represents complex numbers with real and imaginary parts.
Both parts are stored as Float values internally.

Instance variables:
  real - the real part (Float)
  imag - the imaginary part (Float)
'
%

expectvalue /Class
doit
complex category: 'Grail-Numbers'
%

! ===============================================================================
! Python complex Type - Method Implementations
! ===============================================================================
! This file contains method implementations for the Python complex type.
! Complex numbers have a real and imaginary part, both stored as floats.
! ===============================================================================

! ------------------- Remove existing Python methods from complex
expectvalue /Metaclass3
doit
complex removeAllMethods: 1.
complex class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Arithmetic Operators'
method: complex
* aNumber
	"Multiply complex by aNumber."

	^ self @env1:__mul__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
+ aNumber
	"Add aNumber to complex."

	^ self @env1:__add__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
- aNumber
	"Subtract aNumber from complex."

	^ self @env1:__sub__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
/ aNumber
	"Divide complex by aNumber."

	^ self @env1:__truediv__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
= anObject
	"Equality comparison."

	^ self @env1:__eq__: anObject
%

category: 'Grail-Arithmetic Support'
method: complex
_coerce: aNumber
	"Coerce aNumber to complex.
	Convert aNumber to a complex number with zero imaginary part."

	^ complex @env1:__new__: aNumber _: 0.0
%

category: 'Grail-Arithmetic Support'
method: complex
_generality
	"Return generality for complex in numeric hierarchy.
	complex has the HIGHEST generality (90) so other types get coerced to complex.
	Hierarchy: bool(10) < SmallInt(20) < LargeInt(40) < Fraction(70) < Float(85) < complex(90)."

	^ 90
%

category: 'Grail-Arithmetic Operators'
method: complex
abs
	"Return the magnitude of the complex number."

	^ self @env1:__abs__
%

category: 'Grail-Arithmetic Support'
method: complex
isNumber
	"Return true - complex participates in arithmetic as a number."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: complex
negated
	"Negate the complex number."

	^ self @env1:__neg__
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: complex
__new__: r _: i
	"Create a new complex number with given real and imaginary parts.
	In Python: complex(real, imag) or complex.__new__(complex, real, imag)"

	| realVal imagVal instance |
	"Default values"
	realVal := r ifNil: [0.0] ifNotNil: [r].
	imagVal := i ifNil: [0.0] ifNotNil: [i].

	instance := self __new__.
	instance __init__: realVal _: imagVal.
	^ instance
%

category: 'Grail-Type Conversion'
classmethod: complex
from_number: n
	"Create a complex number from a real number.
	In Python: complex.from_number(5) returns (5+0j)"

	"Use Smalltalk-side constructor"
	^ self __new__: n _: 0.0
%

category: 'Grail-Arithmetic'
method: complex
__abs__
	"Return the magnitude (absolute value) of the complex number.
	|a+bi| = sqrt(a² + b²)"

	| realSquared imagSquared sumSquares magnitude |
	realSquared := real @env0:* real.
	imagSquared := imag @env0:* imag.
	sumSquares := realSquared @env0:+ imagSquared.
	magnitude := sumSquares @env0:sqrt.
	^ magnitude
%

category: 'Grail-Arithmetic'
method: complex
__add__: other
	"Add two complex numbers or complex and real."

	| otherReal otherImag |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].
	^ complex __new__: (real @env0:+ otherReal) _: (imag @env0:+ otherImag)
%

category: 'Grail-Type Conversion'
method: complex
__bool__
	"Return True if complex number is non-zero, False otherwise."

	^ (real @env0:~= 0.0)
		or: [imag @env0:~= 0.0]
%

category: 'Grail-Type Conversion'
method: complex
__complex__
	"Return self (already a complex number)."

	^ self
%

category: 'Grail-Comparison'
method: complex
__eq__: other
	"Test equality with another complex number."
	
	| otherReal otherImag |
	(other @env0:class) == complex ifFalse: [^ false].
	otherReal := other real.
	otherImag := other imag.
	^ (real @env0:= otherReal) 
		and: [imag @env0:= otherImag]
%

category: 'Grail-String Representation'
method: complex
__format__: formatSpec
	"Format the complex number according to format specification.
	For now, just return __repr__ - full format spec support is complex."

	^ self __repr__
%

category: 'Grail-Comparison'
method: complex
__ge__: other
	"Complex numbers cannot be ordered - raise TypeError."

	TypeError @env0:signal: '''>='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Grail-Serialization'
method: complex
__getnewargs__
	"Return arguments for pickling/unpickling."

	"Return a tuple (array) of (real, imag) for reconstruction"
	^ {real. imag}
%

category: 'Grail-Serialization'
method: complex
__getstate__
	"Return state for pickling. Complex numbers have no additional state."

	^ None
%

category: 'Grail-Comparison'
method: complex
__gt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	TypeError @env0:signal: '''>'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Grail-Initialization'
method: complex
__init__: r _: i
	"Initialize a complex number with real and imaginary parts.
	Called after __new__ in Python, or directly from Smalltalk constructor."

	real := r @env0:asFloat.
	imag := i @env0:asFloat.
	^ None
%

category: 'Grail-Comparison'
method: complex
__le__: other
	"Complex numbers cannot be ordered - raise TypeError."

	TypeError @env0:signal: '''<='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Grail-Comparison'
method: complex
__lt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	TypeError @env0:signal: '''<'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Grail-Arithmetic'
method: complex
__mul__: other
	"Multiply two complex numbers or complex and real.
	(a+bi)(c+di) = (ac-bd) + (ad+bc)i"

	| otherReal otherImag newReal newImag ac bd ad bc |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].

	ac := real @env0:* otherReal.
	bd := imag @env0:* otherImag.
	ad := real @env0:* otherImag.
	bc := imag @env0:* otherReal.

	newReal := ac @env0:- (bd).
	newImag := ad @env0:+ bc.

	^ complex __new__: newReal _: newImag
%

category: 'Grail-Comparison'
method: complex
__ne__: other
	"Test inequality with another complex number."

	^ (self __eq__: other) @env0:not
%

category: 'Grail-Arithmetic'
method: complex
__neg__
	"Negate the complex number."

	^ complex __new__: (real @env0:negated) _: (imag @env0:negated)
%

category: 'Grail-Arithmetic'
method: complex
__pos__
	"Unary plus (returns self)."

	^ self
%

category: 'Grail-Arithmetic'
method: complex
__pow__: other
	"Raise complex number to a power.
	For now, only support integer powers."

	| result n |
	"Convert other to integer"
	n := other @env0:asInteger.

	"Handle special cases"
	n == 0 ifTrue: [^ complex __new__: 1.0 _: 0.0].
	n == 1 ifTrue: [^ self].

	"Positive powers: multiply self n times"
	(n @env0:> 0) ifTrue: [
		result := self.
		((n @env0:- 1) @env0:timesRepeat: [
			result := result __mul__: self.
		]).
		^ result
	].

	"Negative powers: 1 / (self ** -n)"
	result := complex __new__: 1.0 _: 0.0.
	^ result __truediv__: (self __pow__: (n @env0:negated))
%

category: 'Grail-Arithmetic'
method: complex
__radd__: other
	"Right-hand add (commutative, so same as __add__)."

	^ self __add__: other
%

category: 'Grail-String Representation'
method: complex
__repr__
	"Return string representation of complex number."

	| realStr imagStr |
	realStr := real @env0:printString.
	imagStr := imag @env0:abs.
	imagStr := imagStr @env0:printString.

	^ ((real @env0:= 0.0)
		ifTrue: [imagStr @env0:, 'j']
		ifFalse: [
			(imag @env0:>= 0.0)
				ifTrue: [
					(((('(' @env0:, realStr)
						@env0:, '+')
						@env0:, imagStr)
						@env0:, 'j)')
				]
				ifFalse: [
					(((('(' @env0:, realStr)
						@env0:, '-')
						@env0:, imagStr)
						@env0:, 'j)')
				]
		]) @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: complex
__rmul__: other
	"Right-hand multiply (commutative, so same as __mul__)."

	^ self __mul__: other
%

category: 'Grail-Arithmetic'
method: complex
__rpow__: other
	"Right-hand power (other ** self).
	This is complex and requires logarithms - stub for now."

	NotImplementedError @env0:signal: 'complex __rpow__ not yet implemented'
%

category: 'Grail-Arithmetic'
method: complex
__rsub__: other
	"Right-hand subtract (other - self)."

	| otherReal otherImag |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].
	^ complex __new__: (otherReal @env0:- real) _: (otherImag @env0:- imag)
%

category: 'Grail-Arithmetic'
method: complex
__rtruediv__: other
	"Right-hand divide (other / self)."

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].

	"Calculate denominator: a² + b² (self's magnitude squared)"
	denom := (real @env0:* real)
		@env0:+ (imag @env0:* imag).

	"Calculate numerator components for other / self"
	ac := otherReal @env0:* real.
	bd := otherImag @env0:* imag.
	bc := otherImag @env0:* real.
	ad := otherReal @env0:* imag.

	newReal := (ac @env0:+ bd)
		@env0:/ denom.
	newImag := (bc @env0:- (ad))
		@env0:/ denom.

	^ complex __new__: newReal _: newImag
%

category: 'Grail-String Representation'
method: complex
__str__
	"Return string representation (same as __repr__ for complex)."

	^ self __repr__
%

category: 'Grail-Arithmetic'
method: complex
__sub__: other
	"Subtract two complex numbers or complex and real."

	| otherReal otherImag |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].
	^ complex __new__: (real @env0:- otherReal) _: (imag @env0:- otherImag)
%

category: 'Grail-Arithmetic'
method: complex
__truediv__: other
	"Divide two complex numbers or complex by real.
	(a+bi)/(c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)"

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].

	"Calculate denominator: c² + d²"
	denom := (otherReal @env0:* otherReal)
		@env0:+ (otherImag @env0:* otherImag).

	"Calculate numerator components"
	ac := real @env0:* otherReal.
	bd := imag @env0:* otherImag.
	bc := imag @env0:* otherReal.
	ad := real @env0:* otherImag.

	newReal := (ac @env0:+ bd)
		@env0:/ denom.
	newImag := (bc @env0:- (ad))
		@env0:/ denom.

	^ complex __new__: newReal _: newImag
%

category: 'Grail-Numbers'
method: complex
conjugate
	"Return the complex conjugate."

	^ complex __new__: real _: (imag @env0:negated)
%

category: 'Grail-Attribute Access'
method: complex
imag
	"Return the imaginary part of the complex number."
	
	^ imag
%

category: 'Grail-Attribute Access'
method: complex
real
	"Return the real part of the complex number."
	
	^ real
%

set compile_env: 0
