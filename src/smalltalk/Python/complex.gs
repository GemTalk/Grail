! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- complex class (Python 'complex' type)
expectvalue /Class
doit
object subclass: 'complex'
  instVarNames: #()
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
Both parts are stored as Float values internally via dynamic
instance variables (#real, #imag), so ``cpx.real'' from Python
returns the float value directly through ___pyAttrLoad___''s
dynamic-instVar probe (not a BoundMethod), and ``del cpx.real''
truly removes the binding.
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
__new__: r
	"complex(x) -- the one-arg form.  Without this, the call fell
	through to the inherited object.__new__: (whose argument is a
	CLASS) and sent #new to the number: complex(10**23) died with
	'LargeInteger does not understand #new' (test_fractions
	testBigComplexComparisons).  The isBehavior branch keeps the
	object.__new__(cls) protocol (copy/pickle) working."

	(r @env0:isBehavior) ifTrue: [^ r @env0:new].
	(r isKindOf: complex) ifTrue: [^ r].
	^ complex __new__: r _: 0.0
%

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
	realSquared := (self real) @env0:* (self real).
	imagSquared := (self imag) @env0:* (self imag).
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
	^ complex __new__: ((self real) @env0:+ otherReal) _: ((self imag) @env0:+ otherImag)
%

category: 'Grail-Type Conversion'
method: complex
__bool__
	"Return True if complex number is non-zero, False otherwise."

	^ ((self real) @env0:~= 0.0)
		or: [(self imag) @env0:~= 0.0]
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
	(other isKindOf: complex) ifFalse: [
		"CPython: complex(5) == 5 is True -- a real number compares
		equal when the imaginary part is zero."
		((other isKindOf: Number) or: [other isKindOf: Boolean]) ifTrue: [
			"Compare EXACTLY (no asFloat): CPython's int-vs-float real
			comparison is exact, so 10**23 != complex(10**23) -- the
			float real is 1e23, a different integer."
			| o |
			o := (other isKindOf: Boolean)
				ifTrue: [other ifTrue: [1] ifFalse: [0]]
				ifFalse: [other].
			^ ((self imag) @env0:= 0) and: [(self real) @env0:= o]].
		^ false].
	otherReal := other real.
	otherImag := other imag.
	^ ((self real) @env0:= otherReal) 
		and: [(self imag) @env0:= otherImag]
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
	^ {self real. self imag}
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
	Called after __new__ in Python, or directly from Smalltalk
	constructor.  Phase B+1: stores into dynamic instVars so
	``cpx.real'' / ``cpx.imag'' Python attribute reads find the
	values directly via the ___pyAttrLoad___ dynamic probe."

	self @env0:dynamicInstVarAt: #real put: r @env0:asFloat.
	self @env0:dynamicInstVarAt: #imag put: i @env0:asFloat.
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

	ac := (self real) @env0:* otherReal.
	bd := (self imag) @env0:* otherImag.
	ad := (self real) @env0:* otherImag.
	bc := (self imag) @env0:* otherReal.

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

	^ complex __new__: ((self real) @env0:negated) _: ((self imag) @env0:negated)
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
	realStr := (self real) @env0:printString.
	imagStr := (self imag) @env0:abs.
	imagStr := imagStr @env0:printString.

	^ (((self real) @env0:= 0.0)
		ifTrue: [imagStr @env0:, 'j']
		ifFalse: [
			((self imag) @env0:>= 0.0)
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
	^ complex __new__: (otherReal @env0:- (self real)) _: (otherImag @env0:- (self imag))
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
	denom := ((self real) @env0:* (self real))
		@env0:+ ((self imag) @env0:* (self imag)).

	"Calculate numerator components for other / self"
	ac := otherReal @env0:* (self real).
	bd := otherImag @env0:* (self imag).
	bc := otherImag @env0:* (self real).
	ad := otherReal @env0:* (self imag).

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
	^ complex __new__: ((self real) @env0:- otherReal) _: ((self imag) @env0:- otherImag)
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
	ac := (self real) @env0:* otherReal.
	bd := (self imag) @env0:* otherImag.
	bc := (self imag) @env0:* otherReal.
	ad := (self real) @env0:* otherImag.

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

	^ complex __new__: (self real) _: ((self imag) @env0:negated)
%

category: 'Grail-Attribute Access'
method: complex
imag
	"Return the imaginary part of the complex number.  Phase B+1:
	reads from dynamic-instVar storage; symmetrical with the
	``cpx.imag'' Python attribute load path."

	^ self @env0:dynamicInstVarAt: #imag
%

category: 'Grail-Attribute Access'
method: complex
real
	"Return the real part of the complex number.  Phase B+1: reads
	from dynamic-instVar storage; symmetrical with the ``cpx.real''
	Python attribute load path."

	^ self @env0:dynamicInstVarAt: #real
%

set compile_env: 0
