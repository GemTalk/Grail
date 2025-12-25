! ===============================================================================
! cmath Module (Python 'cmath' module for complex numbers)
! ===============================================================================
! This file contains the Python cmath module implementation.
! The cmath module provides mathematical functions for complex numbers.
! ===============================================================================

! ------------------- Remove existing Python methods from cmath
expectvalue /Metaclass3
doit
cmath removeAllMethods: 2.
cmath class removeAllMethods: 2.
%

set compile_env: 2
! ------------------- Instance methods for cmath

category: 'Python-Private'
method: cmath
___asComplex: z
	"Convert z to a complex number if it isn't already"
	| zClass |
	zClass := z ___class___.

	(zClass ___eq___: complex) ifTrue: [^ z].

	"For numeric types, create complex with zero imaginary part"
	^ complex __new__: (z ___asFloat___) _: 0.0
%

category: 'Python-Constants'
method: cmath
pi
	"The mathematical constant π = 3.141592..."
	^ Float perform: #pi env: 0
%

category: 'Python-Constants'
method: cmath
e
	"The mathematical constant e = 2.718281..."
	^ 1.0 perform: #exp env: 0
%

category: 'Python-Constants'
method: cmath
tau
	"The mathematical constant τ = 2π = 6.283185..."
	| pi |
	pi := Float perform: #pi env: 0.
	^ pi ___times___: 2.0
%

category: 'Python-Constants'
method: cmath
inf
	"Positive infinity"
	^ PlusInfinity
%

category: 'Python-Constants'
method: cmath
infj
	"Complex number with zero real part and positive infinity imaginary part"
	^ complex __new__: 0.0 _: PlusInfinity
%

category: 'Python-Constants'
method: cmath
nan
	"Not a number (NaN)"
	^ PlusQuietNaN
%

category: 'Python-Constants'
method: cmath
nanj
	"Complex number with zero real part and NaN imaginary part"
	^ complex __new__: 0.0 _: PlusQuietNaN
%

category: 'Python-Trigonometric Functions'
method: cmath
sin: z
	"Return the sine of z (complex number)"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	
	"sin(a + bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"
	^ complex __new__: ((real ___sin___) ___times___: (imag perform: #cosh env: 0)) _: ((real ___cos___) ___times___: (imag perform: #sinh env: 0))
%

category: 'Python-Trigonometric Functions'
method: cmath
cos: z
	"Return the cosine of z (complex number)"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	
	"cos(a + bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"
	^ complex __new__: ((real ___cos___) ___times___: (imag perform: #cosh env: 0)) _: (((real ___sin___) ___times___: (imag perform: #sinh env: 0)) ___negated___)
%

category: 'Python-Trigonometric Functions'
method: cmath
tan: z
	"Return the tangent of z (complex number)"
	| sinZ cosZ |
	sinZ := self sin: z.
	cosZ := self cos: z.
	^ sinZ __truediv__: cosZ
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh: z
	"Return the hyperbolic sine of z (complex number)"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	
	"sinh(a + bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"
	^ complex __new__: ((real perform: #sinh env: 0) ___times___: (imag ___cos___)) _: ((real perform: #cosh env: 0) ___times___: (imag ___sin___))
%

category: 'Python-Hyperbolic Functions'
method: cmath
cosh: z
	"Return the hyperbolic cosine of z (complex number)"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	
	"cosh(a + bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"
	^ complex __new__: ((real perform: #cosh env: 0) ___times___: (imag ___cos___)) _: ((real perform: #sinh env: 0) ___times___: (imag ___sin___))
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh: z
	"Return the hyperbolic tangent of z (complex number)"
	| sinhZ coshZ |
	sinhZ := self sinh: z.
	coshZ := self cosh: z.
	^ sinhZ __truediv__: coshZ
%

category: 'Python-Exponential and Logarithmic'
method: cmath
exp: z
	"Return e raised to the power z (complex number)"
	| zComplex real imag expReal |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	"exp(a + bi) = exp(a) * (cos(b) + i*sin(b))"
	expReal := real perform: #exp env: 0.
	^ complex __new__: (expReal ___times___: (imag ___cos___)) _: (expReal ___times___: (imag ___sin___))
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log: z
	"Return the natural logarithm of z (complex number)"
	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	"log(z) = log(|z|) + i*arg(z)"
	"Calculate magnitude: r = sqrt(real^2 + imag^2)"
	r := (((real ___times___: real)
		___plus___: (imag ___times___: imag)) ___sqrt___).

	"Calculate argument: theta = atan2(imag, real)"
	theta := imag perform: #arcTan2: env: 0 withArguments: {real}.

	^ complex __new__: (r ___ln___) _: theta
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10: z
	"Return the base-10 logarithm of z (complex number)"
	| logZ ln10 |
	logZ := self log: z.
	ln10 := 10.0 ___ln___.
	^ logZ __truediv__: (complex __new__: ln10 _: 0.0)
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt: z
	"Return the square root of z (complex number)"
	| zComplex real imag r theta sqrtR halfTheta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	"sqrt(z) = sqrt(r) * (cos(theta/2) + i*sin(theta/2))"
	"where r = |z| and theta = arg(z)"

	"Calculate magnitude"
	r := (((real ___times___: real)
		___plus___: (imag ___times___: imag)) ___sqrt___).

	"Calculate argument"
	theta := imag perform: #arcTan2: env: 0 withArguments: {real}.

	sqrtR := r ___sqrt___.
	halfTheta := theta ___divide___: 2.0.

	^ complex __new__: (sqrtR ___times___: (halfTheta ___cos___)) _: (sqrtR ___times___: (halfTheta ___sin___))
%

category: 'Python-Polar Coordinates'
method: cmath
phase: z
	"Return the phase (argument) of z in radians"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	^ imag perform: #arcTan2: env: 0 withArguments: {real}
%

category: 'Python-Polar Coordinates'
method: cmath
polar: z
	"Return the polar coordinates (r, theta) of z"
	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	"Calculate magnitude"
	r := (((real ___times___: real)
		___plus___: (imag ___times___: imag)) ___sqrt___).

	"Calculate argument"
	theta := imag perform: #arcTan2: env: 0 withArguments: {real}.

	^ tuple ___withAll___: (InvariantArray ___with___: r with: theta)
%

category: 'Python-Polar Coordinates'
method: cmath
rect: r _: theta
	"Convert polar coordinates (r, theta) to rectangular form (complex number)"
	| rFloat thetaFloat |
	rFloat := r ___asFloat___.
	thetaFloat := theta ___asFloat___.

	^ complex __new__: (rFloat ___times___: (thetaFloat ___cos___)) _: (rFloat ___times___: (thetaFloat ___sin___))
%

category: 'Python-Classification'
method: cmath
isnan: z
	"Return True if either the real or imaginary part of z is NaN"
	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	^ ((real perform: #_isNaN env: 0) or: [imag perform: #_isNaN env: 0])
		ifTrue: [true] ifFalse: [false]
%

category: 'Python-Classification'
method: cmath
isinf: z
	"Return True if either the real or imaginary part of z is infinity"
	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	realKind := real perform: #_getKind env: 0.
	imagKind := imag perform: #_getKind env: 0.

	^ (((realKind ___eq___: 3) or: [imagKind ___eq___: 3]))
		ifTrue: [true] ifFalse: [false]
%

category: 'Python-Classification'
method: cmath
isfinite: z
	"Return True if both the real and imaginary parts of z are finite"
	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.

	realKind := real perform: #_getKind env: 0.
	imagKind := imag perform: #_getKind env: 0.

	"Both must be normal (1), subnormal (2), or zero (4)"
	^ ((((realKind ___le___: 2) or: [realKind ___eq___: 4])
		and: [(imagKind ___le___: 2) or: [imagKind ___eq___: 4]]))
		ifTrue: [true] ifFalse: [false]
%

set compile_env: 0
