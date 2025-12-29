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
! ------------------- Class methods for cmath

category: 'Python-Singleton'
classmethod: cmath
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for cmath module'
%

category: 'Python-Singleton'
classmethod: cmath
instance
	"Return the singleton instance of cmath.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance perform: #initialize env: 2
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: cmath
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

! ------------------- Instance methods for cmath

category: 'Python-Initialization'
method: cmath
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_pi;
		initialize_e;
		initialize_tau;
		initialize_inf;
		initialize_infj;
		initialize_nan;
		initialize_nanj;
		initialize_sin;
		initialize_cos;
		initialize_tan;
		initialize_sinh;
		initialize_cosh;
		initialize_tanh;
		initialize_exp;
		initialize_log;
		initialize_log10;
		initialize_sqrt;
		initialize_phase;
		initialize_polar;
		initialize_rect;
		initialize_isnan;
		initialize_isinf;
		initialize_isfinite;
		yourself
%

category: 'Python-Initialization'
method: cmath
initialize_pi
	"The mathematical constant π = 3.141592..."
	pi := Float perform: #pi env: 0
%

category: 'Python-Initialization'
method: cmath
initialize_e
	"The mathematical constant e = 2.718281..."
	e := 1.0 perform: #exp env: 0
%

category: 'Python-Initialization'
method: cmath
initialize_tau
	"The mathematical constant τ = 2π = 6.283185..."
	| piValue |
	piValue := Float perform: #pi env: 0.
	tau := piValue ___times___: 2.0
%

category: 'Python-Initialization'
method: cmath
initialize_inf
	"Positive infinity"
	inf := PlusInfinity
%

category: 'Python-Initialization'
method: cmath
initialize_infj
	"Complex number with zero real part and positive infinity imaginary part"
	infj := complex __new__: 0.0 _: PlusInfinity
%

category: 'Python-Initialization'
method: cmath
initialize_nan
	"Not a number (NaN)"
	nan := PlusQuietNaN
%

category: 'Python-Initialization'
method: cmath
initialize_nanj
	"Complex number with zero real part and NaN imaginary part"
	nanj := complex __new__: 0.0 _: PlusQuietNaN
%

category: 'Python-Initialization'
method: cmath
initialize_sin
	"Return the sine of z (complex number)"
	sin := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"sin(a + bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"
		complex __new__: ((real ___sin___) ___times___: (imag perform: #cosh env: 0)) _: ((real ___cos___) ___times___: (imag perform: #sinh env: 0))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_cos
	"Return the cosine of z (complex number)"
	cos := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"cos(a + bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"
		complex __new__: ((real ___cos___) ___times___: (imag perform: #cosh env: 0)) _: (((real ___sin___) ___times___: (imag perform: #sinh env: 0)) ___negated___)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_tan
	"Return the tangent of z (complex number)"
	tan := [:z |
		| sinBlock cosBlock sinZ cosZ |
		sinBlock := self sin.
		cosBlock := self cos.
		sinZ := sinBlock value: z.
		cosZ := cosBlock value: z.
		sinZ __truediv__: cosZ
	]
%

category: 'Python-Initialization'
method: cmath
initialize_sinh
	"Return the hyperbolic sine of z (complex number)"
	sinh := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"sinh(a + bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"
		complex __new__: ((real perform: #sinh env: 0) ___times___: (imag ___cos___)) _: ((real perform: #cosh env: 0) ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_cosh
	"Return the hyperbolic cosine of z (complex number)"
	cosh := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"cosh(a + bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"
		complex __new__: ((real perform: #cosh env: 0) ___times___: (imag ___cos___)) _: ((real perform: #sinh env: 0) ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_tanh
	"Return the hyperbolic tangent of z (complex number)"
	tanh := [:z |
		| sinhBlock coshBlock sinhZ coshZ |
		sinhBlock := self sinh.
		coshBlock := self cosh.
		sinhZ := sinhBlock value: z.
		coshZ := coshBlock value: z.
		sinhZ __truediv__: coshZ
	]
%

category: 'Python-Initialization'
method: cmath
initialize_exp
	"Return e raised to the power z (complex number)"
	exp := [:z |
		| zComplex real imag expReal |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"exp(a + bi) = exp(a) * (cos(b) + i*sin(b))"
		expReal := real perform: #exp env: 0.
		complex __new__: (expReal ___times___: (imag ___cos___)) _: (expReal ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_log
	"Return the natural logarithm of z (complex number)"
	log := [:z |
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

		complex __new__: (r ___ln___) _: theta
	]
%

category: 'Python-Initialization'
method: cmath
initialize_log10
	"Return the base-10 logarithm of z (complex number)"
	log10 := [:z |
		| logBlock logZ ln10 |
		logBlock := self log.
		logZ := logBlock value: z.
		ln10 := 10.0 ___ln___.
		logZ __truediv__: (complex __new__: ln10 _: 0.0)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_sqrt
	"Return the square root of z (complex number)"
	sqrt := [:z |
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

		complex __new__: (sqrtR ___times___: (halfTheta ___cos___)) _: (sqrtR ___times___: (halfTheta ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_phase
	"Return the phase (argument) of z in radians"
	phase := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		imag perform: #arcTan2: env: 0 withArguments: {real}
	]
%

category: 'Python-Initialization'
method: cmath
initialize_polar
	"Return the polar coordinates (r, theta) of z"
	polar := [:z |
		| zComplex real imag r theta |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"Calculate magnitude"
		r := (((real ___times___: real)
			___plus___: (imag ___times___: imag)) ___sqrt___).

		"Calculate argument"
		theta := imag perform: #arcTan2: env: 0 withArguments: {real}.

		tuple ___withAll___: (InvariantArray ___with___: r with: theta)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_rect
	"Convert polar coordinates (r, theta) to rectangular form (complex number)"
	rect := [:r :theta |
		| rFloat thetaFloat |
		rFloat := r ___asFloat___.
		thetaFloat := theta ___asFloat___.

		complex __new__: (rFloat ___times___: (thetaFloat ___cos___)) _: (rFloat ___times___: (thetaFloat ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_isnan
	"Return True if either the real or imaginary part of z is NaN"
	isnan := [:z |
		| zComplex real imag |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		(real perform: #_isNaN env: 0) or: [imag perform: #_isNaN env: 0]
	]
%

category: 'Python-Initialization'
method: cmath
initialize_isinf
	"Return True if either the real or imaginary part of z is infinity"
	isinf := [:z |
		| zComplex real imag realKind imagKind |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		realKind := real perform: #_getKind env: 0.
		imagKind := imag perform: #_getKind env: 0.

		(realKind ___eq___: 3) or: [imagKind ___eq___: 3]
	]
%

category: 'Python-Initialization'
method: cmath
initialize_isfinite
	"Return True if both the real and imaginary parts of z are finite"
	isfinite := [:z |
		| zComplex real imag realKind imagKind |
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		realKind := real perform: #_getKind env: 0.
		imagKind := imag perform: #_getKind env: 0.

		"Both must be normal (1), subnormal (2), or zero (4)"
		((realKind ___le___: 2) or: [realKind ___eq___: 4])
			and: [(imagKind ___le___: 2) or: [imagKind ___eq___: 4]]
	]
%

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
	^ pi
%

category: 'Python-Constants'
method: cmath
pi: aValue
	"Set the pi constant (for monkey patching)"
	pi := aValue
%

category: 'Python-Constants'
method: cmath
e
	"The mathematical constant e = 2.718281..."
	^ e
%

category: 'Python-Constants'
method: cmath
e: aValue
	"Set the e constant (for monkey patching)"
	e := aValue
%

category: 'Python-Constants'
method: cmath
tau
	"The mathematical constant τ = 2π = 6.283185..."
	^ tau
%

category: 'Python-Constants'
method: cmath
tau: aValue
	"Set the tau constant (for monkey patching)"
	tau := aValue
%

category: 'Python-Constants'
method: cmath
inf
	"Positive infinity"
	^ inf
%

category: 'Python-Constants'
method: cmath
inf: aValue
	"Set the inf constant (for monkey patching)"
	inf := aValue
%

category: 'Python-Constants'
method: cmath
infj
	"Complex number with zero real part and positive infinity imaginary part"
	^ infj
%

category: 'Python-Constants'
method: cmath
infj: aValue
	"Set the infj constant (for monkey patching)"
	infj := aValue
%

category: 'Python-Constants'
method: cmath
nan
	"Not a number (NaN)"
	^ nan
%

category: 'Python-Constants'
method: cmath
nan: aValue
	"Set the nan constant (for monkey patching)"
	nan := aValue
%

category: 'Python-Constants'
method: cmath
nanj
	"Complex number with zero real part and NaN imaginary part"
	^ nanj
%

category: 'Python-Constants'
method: cmath
nanj: aValue
	"Set the nanj constant (for monkey patching)"
	nanj := aValue
%

category: 'Python-Trigonometric Functions'
method: cmath
sin
	"Return the sin function"
	^ sin
%

category: 'Python-Trigonometric Functions'
method: cmath
sin: aBlock
	"Set the sin function (for monkey patching)"
	sin := aBlock
%

category: 'Python-Trigonometric Functions'
method: cmath
cos
	"Return the cos function"
	^ cos
%

category: 'Python-Trigonometric Functions'
method: cmath
cos: aBlock
	"Set the cos function (for monkey patching)"
	cos := aBlock
%

category: 'Python-Trigonometric Functions'
method: cmath
tan
	"Return the tan function"
	^ tan
%

category: 'Python-Trigonometric Functions'
method: cmath
tan: aBlock
	"Set the tan function (for monkey patching)"
	tan := aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh
	"Return the sinh function"
	^ sinh
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh: aBlock
	"Set the sinh function (for monkey patching)"
	sinh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
cosh
	"Return the cosh function"
	^ cosh
%

category: 'Python-Hyperbolic Functions'
method: cmath
cosh: aBlock
	"Set the cosh function (for monkey patching)"
	cosh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh
	"Return the tanh function"
	^ tanh
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh: aBlock
	"Set the tanh function (for monkey patching)"
	tanh := aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
exp
	"Return the exp function"
	^ exp
%

category: 'Python-Exponential and Logarithmic'
method: cmath
exp: aBlock
	"Set the exp function (for monkey patching)"
	exp := aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log
	"Return the log function"
	^ log
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log: aBlock
	"Set the log function (for monkey patching)"
	log := aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10
	"Return the log10 function"
	^ log10
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10: aBlock
	"Set the log10 function (for monkey patching)"
	log10 := aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt
	"Return the sqrt function"
	^ sqrt
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt: aBlock
	"Set the sqrt function (for monkey patching)"
	sqrt := aBlock
%

category: 'Python-Polar Coordinates'
method: cmath
phase
	"Return the phase function"
	^ phase
%

category: 'Python-Polar Coordinates'
method: cmath
phase: aBlock
	"Set the phase function (for monkey patching)"
	phase := aBlock
%

category: 'Python-Polar Coordinates'
method: cmath
polar
	"Return the polar function"
	^ polar
%

category: 'Python-Polar Coordinates'
method: cmath
polar: aBlock
	"Set the polar function (for monkey patching)"
	polar := aBlock
%

category: 'Python-Polar Coordinates'
method: cmath
rect
	"Return the rect function"
	^ rect
%

category: 'Python-Polar Coordinates'
method: cmath
rect: aBlock
	"Set the rect function (for monkey patching)"
	rect := aBlock
%

category: 'Python-Classification'
method: cmath
isnan
	"Return the isnan function"
	^ isnan
%

category: 'Python-Classification'
method: cmath
isnan: aBlock
	"Set the isnan function (for monkey patching)"
	isnan := aBlock
%

category: 'Python-Classification'
method: cmath
isinf
	"Return the isinf function"
	^ isinf
%

category: 'Python-Classification'
method: cmath
isinf: aBlock
	"Set the isinf function (for monkey patching)"
	isinf := aBlock
%

category: 'Python-Classification'
method: cmath
isfinite
	"Return the isfinite function"
	^ isfinite
%

category: 'Python-Classification'
method: cmath
isfinite: aBlock
	"Set the isfinite function (for monkey patching)"
	isfinite := aBlock
%

set compile_env: 0
