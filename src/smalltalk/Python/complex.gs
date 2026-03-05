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
complex category: 'Numbers'
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

category: 'Python-Arithmetic Operators'
method: complex
* aNumber
	"Multiply complex by aNumber."

	^ self perform: #__mul__: env: 1 withArguments: {aNumber}
%

category: 'Python-Arithmetic Operators'
method: complex
+ aNumber
	"Add aNumber to complex."

	^ self perform: #__add__: env: 1 withArguments: {aNumber}
%

category: 'Python-Arithmetic Operators'
method: complex
- aNumber
	"Subtract aNumber from complex."

	^ self perform: #__sub__: env: 1 withArguments: {aNumber}
%

category: 'Python-Arithmetic Operators'
method: complex
/ aNumber
	"Divide complex by aNumber."

	^ self perform: #__truediv__: env: 1 withArguments: {aNumber}
%

category: 'Python-Arithmetic Operators'
method: complex
= anObject
	"Equality comparison."

	^ self perform: #__eq__: env: 1 withArguments: {anObject}
%

category: 'Python-Arithmetic Support'
method: complex
_coerce: aNumber
	"Coerce aNumber to complex.
	Convert aNumber to a complex number with zero imaginary part."

	^ complex perform: #__new__:_: env: 1 withArguments: {aNumber. 0.0}
%

category: 'Python-Arithmetic Support'
method: complex
_generality
	"Return generality for complex in numeric hierarchy.
	complex has the HIGHEST generality (90) so other types get coerced to complex.
	Hierarchy: bool(10) < SmallInt(20) < LargeInt(40) < Fraction(70) < Float(85) < complex(90)."

	^ 90
%

category: 'Python-Arithmetic Operators'
method: complex
abs
	"Return the magnitude of the complex number."

	^ self perform: #__abs__ env: 1
%

category: 'Python-Arithmetic Support'
method: complex
isNumber
	"Return true - complex participates in arithmetic as a number."

	^ true
%

category: 'Python-Arithmetic Operators'
method: complex
negated
	"Negate the complex number."

	^ self perform: #__neg__ env: 1
%

set compile_env: 1

category: 'Python-Initialization'
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

category: 'Python-Type Conversion'
classmethod: complex
from_number: n
	"Create a complex number from a real number.
	In Python: complex.from_number(5) returns (5+0j)"

	"Use Smalltalk-side constructor"
	^ self __new__: n _: 0.0
%

category: 'Python-Arithmetic'
method: complex
__abs__
	"Return the magnitude (absolute value) of the complex number.
	|a+bi| = sqrt(a² + b²)"

	| realSquared imagSquared sumSquares magnitude |
	realSquared := real ___times___: real.
	imagSquared := imag ___times___: imag.
	sumSquares := realSquared ___plus___: imagSquared.
	magnitude := sumSquares ___sqrt___.
	^ magnitude
%

category: 'Python-Arithmetic'
method: complex
__add__: other
	"Add two complex numbers or complex and real."

	| otherReal otherImag |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].
	^ complex __new__: (real ___plus___: otherReal) _: (imag ___plus___: otherImag)
%

category: 'Python-Type Conversion'
method: complex
__bool__
	"Return True if complex number is non-zero, False otherwise."

	^ (real ___ne___: 0.0)
		or: [imag ___ne___: 0.0]
%

category: 'Python-Type Conversion'
method: complex
__complex__
	"Return self (already a complex number)."

	^ self
%

category: 'Python-Comparison'
method: complex
__eq__: other
	"Test equality with another complex number."
	
	| otherReal otherImag |
	(other ___class___) == complex ifFalse: [^ false].
	otherReal := other real.
	otherImag := other imag.
	^ (real ___eq___: otherReal) 
		and: [imag ___eq___: otherImag]
%

category: 'Python-String Representation'
method: complex
__format__: formatSpec
	"Format the complex number according to format specification.
	For now, just return __repr__ - full format spec support is complex."

	^ self __repr__
%

category: 'Python-Comparison'
method: complex
__ge__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''>='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Serialization'
method: complex
__getnewargs__
	"Return arguments for pickling/unpickling."

	"Return a tuple (array) of (real, imag) for reconstruction"
	^ {real. imag}
%

category: 'Python-Serialization'
method: complex
__getstate__
	"Return state for pickling. Complex numbers have no additional state."

	^ nil
%

category: 'Python-Comparison'
method: complex
__gt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''>'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Initialization'
method: complex
__init__: r _: i
	"Initialize a complex number with real and imaginary parts.
	Called after __new__ in Python, or directly from Smalltalk constructor."

	real := r ___asFloat___.
	imag := i ___asFloat___.
	^ nil
%

category: 'Python-Comparison'
method: complex
__le__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''<='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Comparison'
method: complex
__lt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''<'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Arithmetic'
method: complex
__mul__: other
	"Multiply two complex numbers or complex and real.
	(a+bi)(c+di) = (ac-bd) + (ad+bc)i"

	| otherReal otherImag newReal newImag ac bd ad bc |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].

	ac := real ___times___: otherReal.
	bd := imag ___times___: otherImag.
	ad := real ___times___: otherImag.
	bc := imag ___times___: otherReal.

	newReal := ac ___minus___: (bd).
	newImag := ad ___plus___: bc.

	^ complex __new__: newReal _: newImag
%

category: 'Python-Comparison'
method: complex
__ne__: other
	"Test inequality with another complex number."

	^ (self __eq__: other) ___not___
%

category: 'Python-Arithmetic'
method: complex
__neg__
	"Negate the complex number."

	^ complex __new__: (real ___negated___) _: (imag ___negated___)
%

category: 'Python-Arithmetic'
method: complex
__pos__
	"Unary plus (returns self)."

	^ self
%

category: 'Python-Arithmetic'
method: complex
__pow__: other
	"Raise complex number to a power.
	For now, only support integer powers."

	| result n |
	"Convert other to integer"
	n := other ___asInteger___.

	"Handle special cases"
	n == 0 ifTrue: [^ complex __new__: 1.0 _: 0.0].
	n == 1 ifTrue: [^ self].

	"Positive powers: multiply self n times"
	(n ___gt___: 0) ifTrue: [
		result := self.
		((n ___minus___: 1) ___timesRepeat___: [
			result := result __mul__: self.
		]).
		^ result
	].

	"Negative powers: 1 / (self ** -n)"
	result := complex __new__: 1.0 _: 0.0.
	^ result __truediv__: (self __pow__: (n ___negated___))
%

category: 'Python-Arithmetic'
method: complex
__radd__: other
	"Right-hand add (commutative, so same as __add__)."

	^ self __add__: other
%

category: 'Python-String Representation'
method: complex
__repr__
	"Return string representation of complex number."

	| realStr imagStr |
	realStr := real ___printString___.
	imagStr := imag ___abs___.
	imagStr := imagStr ___printString___.

	^ ((real ___eq___: 0.0)
		ifTrue: [imagStr ___concat___: 'j']
		ifFalse: [
			(imag ___ge___: 0.0)
				ifTrue: [
					(((('(' ___concat___: realStr)
						___concat___: '+')
						___concat___: imagStr)
						___concat___: 'j)')
				]
				ifFalse: [
					(((('(' ___concat___: realStr)
						___concat___: '-')
						___concat___: imagStr)
						___concat___: 'j)')
				]
		]) ___asUnicodeString___
%

category: 'Python-Arithmetic'
method: complex
__rmul__: other
	"Right-hand multiply (commutative, so same as __mul__)."

	^ self __mul__: other
%

category: 'Python-Arithmetic'
method: complex
__rpow__: other
	"Right-hand power (other ** self).
	This is complex and requires logarithms - stub for now."

	self error: 'NotImplementedError: complex __rpow__ not yet implemented'
%

category: 'Python-Arithmetic'
method: complex
__rsub__: other
	"Right-hand subtract (other - self)."

	| otherReal otherImag |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].
	^ complex __new__: (otherReal ___minus___: real) _: (otherImag ___minus___: imag)
%

category: 'Python-Arithmetic'
method: complex
__rtruediv__: other
	"Right-hand divide (other / self)."

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].

	"Calculate denominator: a² + b² (self's magnitude squared)"
	denom := (real ___times___: real)
		___plus___: (imag ___times___: imag).

	"Calculate numerator components for other / self"
	ac := otherReal ___times___: real.
	bd := otherImag ___times___: imag.
	bc := otherImag ___times___: real.
	ad := otherReal ___times___: imag.

	newReal := (ac ___plus___: bd)
		___divide___: denom.
	newImag := (bc ___minus___: (ad))
		___divide___: denom.

	^ complex __new__: newReal _: newImag
%

category: 'Python-String Representation'
method: complex
__str__
	"Return string representation (same as __repr__ for complex)."

	^ self __repr__
%

category: 'Python-Arithmetic'
method: complex
__sub__: other
	"Subtract two complex numbers or complex and real."

	| otherReal otherImag |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].
	^ complex __new__: (real ___minus___: otherReal) _: (imag ___minus___: otherImag)
%

category: 'Python-Arithmetic'
method: complex
__truediv__: other
	"Divide two complex numbers or complex by real.
	(a+bi)/(c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)"

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other ___class___) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other ___asFloat___.
			otherImag := 0.0.
		].

	"Calculate denominator: c² + d²"
	denom := (otherReal ___times___: otherReal)
		___plus___: (otherImag ___times___: otherImag).

	"Calculate numerator components"
	ac := real ___times___: otherReal.
	bd := imag ___times___: otherImag.
	bc := imag ___times___: otherReal.
	ad := real ___times___: otherImag.

	newReal := (ac ___plus___: bd)
		___divide___: denom.
	newImag := (bc ___minus___: (ad))
		___divide___: denom.

	^ complex __new__: newReal _: newImag
%

category: 'Numbers'
method: complex
conjugate
	"Return the complex conjugate."

	^ complex __new__: real _: (imag ___negated___)
%

category: 'Python-Attribute Access'
method: complex
imag
	"Return the imaginary part of the complex number."
	
	^ imag
%

category: 'Python-Attribute Access'
method: complex
real
	"Return the real part of the complex number."
	
	^ real
%

set compile_env: 0
