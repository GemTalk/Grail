! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- cmath class (Python 'cmath' module)
expectvalue /Class
doit
module subclass: 'cmath'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
cmath comment:
'Python cmath module.

This class provides access to mathematical functions for complex numbers.
Each method in this class corresponds to a Python cmath module function.

See https://docs.python.org/3/library/cmath.html for the complete list.
'
%

expectvalue /Class
doit
cmath category: 'Modules'
%

! ===============================================================================
! cmath Module (Python 'cmath' module for complex numbers)
! ===============================================================================
! This file contains the Python cmath module implementation.
! The cmath module provides mathematical functions for complex numbers.
! ===============================================================================

! ------------------- Remove existing Python methods from cmath
expectvalue /Metaclass3
doit
cmath removeAllMethods: 1.
cmath class removeAllMethods: 1.
%

set compile_env: 1

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

category: 'Python-Trigonometric Functions'
method: cmath
cos
	"Return the cos function"
	^ self ___at___: #cos
%

category: 'Python-Trigonometric Functions'
method: cmath
cos: aBlock
	"Set the cos function (for monkey patching)"
	self ___at___: #cos put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
cosh
	"Return the cosh function"
	^ self ___at___: #cosh
%

category: 'Python-Hyperbolic Functions'
method: cmath
cosh: aBlock
	"Set the cosh function (for monkey patching)"
	self ___at___: #cosh put: aBlock
%

category: 'Python-Constants'
method: cmath
e
	"The mathematical constant e = 2.718281..."
	^ self ___at___: #e
%

category: 'Python-Constants'
method: cmath
e: aValue
	"Set the e constant (for monkey patching)"
	self ___at___: #e put: aValue
%

category: 'Python-Exponential and Logarithmic'
method: cmath
exp
	"Return the exp function"
	^ self ___at___: #exp
%

category: 'Python-Exponential and Logarithmic'
method: cmath
exp: aBlock
	"Set the exp function (for monkey patching)"
	self ___at___: #exp put: aBlock
%

category: 'Python-Constants'
method: cmath
inf
	"Positive infinity"
	^ self ___at___: #inf
%

category: 'Python-Constants'
method: cmath
inf: aValue
	"Set the inf constant (for monkey patching)"
	self ___at___: #inf put: aValue
%

category: 'Python-Constants'
method: cmath
infj
	"Complex number with zero real part and positive infinity imaginary part"
	^ self ___at___: #infj
%

category: 'Python-Constants'
method: cmath
infj: aValue
	"Set the infj constant (for monkey patching)"
	self ___at___: #infj put: aValue
%

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
initialize_cos
	"Return the cosine of z (complex number)"
	self ___at___: #cos put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"cos(a + bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"
		complex __new__: ((real ___cos___) ___times___: (imag @env0:cosh)) _: (((real ___sin___) ___times___: (imag @env0:sinh)) ___negated___)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_cosh
	"Return the hyperbolic cosine of z (complex number)"
	self ___at___: #cosh put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"cosh(a + bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"
		complex __new__: ((real @env0:cosh) ___times___: (imag ___cos___)) _: ((real @env0:sinh) ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_e
	"The mathematical constant e = 2.718281..."
	self ___at___: #e put: (1.0 @env0:exp)
%

category: 'Python-Initialization'
method: cmath
initialize_exp
	"Return e raised to the power z (complex number)"
	self ___at___: #exp put: [:positional :keywords |
		| z zComplex real imag expReal |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"exp(a + bi) = exp(a) * (cos(b) + i*sin(b))"
		expReal := real @env0:exp.
		complex __new__: (expReal ___times___: (imag ___cos___)) _: (expReal ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_inf
	"Positive infinity"
	self ___at___: #inf put: PlusInfinity
%

category: 'Python-Initialization'
method: cmath
initialize_infj
	"Complex number with zero real part and positive infinity imaginary part"
	self ___at___: #infj put: (complex __new__: 0.0 _: PlusInfinity)
%

category: 'Python-Initialization'
method: cmath
initialize_isfinite
	"Return True if both the real and imaginary parts of z are finite"
	self ___at___: #isfinite put: [:positional :keywords |
		| z zComplex real imag realKind imagKind |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		realKind := real @env0:_getKind.
		imagKind := imag @env0:_getKind.

		"Both must be normal (1), subnormal (2), or zero (4)"
		((realKind ___le___: 2) or: [realKind ___eq___: 4])
			and: [(imagKind ___le___: 2) or: [imagKind ___eq___: 4]]
	]
%

category: 'Python-Initialization'
method: cmath
initialize_isinf
	"Return True if either the real or imaginary part of z is infinity"
	self ___at___: #isinf put: [:positional :keywords |
		| z zComplex real imag realKind imagKind |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		realKind := real @env0:_getKind.
		imagKind := imag @env0:_getKind.

		(realKind ___eq___: 3) or: [imagKind ___eq___: 3]
	]
%

category: 'Python-Initialization'
method: cmath
initialize_isnan
	"Return True if either the real or imaginary part of z is NaN"
	self ___at___: #isnan put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		(real @env0:_isNaN) or: [imag @env0:_isNaN]
	]
%

category: 'Python-Initialization'
method: cmath
initialize_log
	"Return the natural logarithm of z (complex number)"
	self ___at___: #log put: [:positional :keywords |
		| z zComplex real imag r theta |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"log(z) = log(|z|) + i*arg(z)"
		"Calculate magnitude: r = sqrt(real^2 + imag^2)"
		r := (((real ___times___: real)
			___plus___: (imag ___times___: imag)) ___sqrt___).

		"Calculate argument: theta = atan2(imag, real)"
		theta := imag @env0:arcTan2: real.

		complex __new__: (r ___ln___) _: theta
	]
%

category: 'Python-Initialization'
method: cmath
initialize_log10
	"Return the base-10 logarithm of z (complex number)"
	self ___at___: #log10 put: [:positional :keywords |
		| z logBlock logZ ln10 |
		z := positional ___at___: 1.
		logBlock := self log.
		logZ := logBlock value: {z} value: nil.
		ln10 := 10.0 ___ln___.
		logZ __truediv__: (complex __new__: ln10 _: 0.0)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_nan
	"Not a number (NaN)"
	self ___at___: #nan put: PlusQuietNaN
%

category: 'Python-Initialization'
method: cmath
initialize_nanj
	"Complex number with zero real part and NaN imaginary part"
	self ___at___: #nanj put: (complex __new__: 0.0 _: PlusQuietNaN)
%

category: 'Python-Initialization'
method: cmath
initialize_phase
	"Return the phase (argument) of z in radians"
	self ___at___: #phase put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		imag @env0:arcTan2: real
	]
%

category: 'Python-Initialization'
method: cmath
initialize_pi
	"The mathematical constant π = 3.141592..."
	self ___at___: #pi put: (Float @env0:pi)
%

category: 'Python-Initialization'
method: cmath
initialize_polar
	"Return the polar coordinates (r, theta) of z"
	self ___at___: #polar put: [:positional :keywords |
		| z zComplex real imag r theta |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"Calculate magnitude"
		r := (((real ___times___: real)
			___plus___: (imag ___times___: imag)) ___sqrt___).

		"Calculate argument"
		theta := imag @env0:arcTan2: real.

		tuple ___withAll___: (tuple ___with___: r with: theta)
	]
%

category: 'Python-Initialization'
method: cmath
initialize_rect
	"Convert polar coordinates (r, theta) to rectangular form (complex number)"
	self ___at___: #rect put: [:positional :keywords |
		| r theta rFloat thetaFloat |
		r := positional ___at___: 1.
		theta := positional ___at___: 2.
		rFloat := r ___asFloat___.
		thetaFloat := theta ___asFloat___.

		complex __new__: (rFloat ___times___: (thetaFloat ___cos___)) _: (rFloat ___times___: (thetaFloat ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_sin
	"Return the sine of z (complex number)"
	self ___at___: #sin put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"sin(a + bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"
		complex __new__: ((real ___sin___) ___times___: (imag @env0:cosh)) _: ((real ___cos___) ___times___: (imag @env0:sinh))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_sinh
	"Return the hyperbolic sine of z (complex number)"
	self ___at___: #sinh put: [:positional :keywords |
		| z zComplex real imag |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.
		
		"sinh(a + bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"
		complex __new__: ((real @env0:sinh) ___times___: (imag ___cos___)) _: ((real @env0:cosh) ___times___: (imag ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_sqrt
	"Return the square root of z (complex number)"
	self ___at___: #sqrt put: [:positional :keywords |
		| z zComplex real imag r theta sqrtR halfTheta |
		z := positional ___at___: 1.
		zComplex := self ___asComplex: z.
		real := zComplex real.
		imag := zComplex imag.

		"sqrt(z) = sqrt(r) * (cos(theta/2) + i*sin(theta/2))"
		"where r = |z| and theta = arg(z)"

		"Calculate magnitude"
		r := (((real ___times___: real)
			___plus___: (imag ___times___: imag)) ___sqrt___).

		"Calculate argument"
		theta := imag @env0:arcTan2: real.

		sqrtR := r ___sqrt___.
		halfTheta := theta ___divide___: 2.0.

		complex __new__: (sqrtR ___times___: (halfTheta ___cos___)) _: (sqrtR ___times___: (halfTheta ___sin___))
	]
%

category: 'Python-Initialization'
method: cmath
initialize_tan
	"Return the tangent of z (complex number)"
	self ___at___: #tan put: [:positional :keywords |
		| z sinBlock cosBlock sinZ cosZ |
		z := positional ___at___: 1.
		sinBlock := self sin.
		cosBlock := self cos.
		sinZ := sinBlock value: {z} value: nil.
		cosZ := cosBlock value: {z} value: nil.
		sinZ __truediv__: cosZ
	]
%

category: 'Python-Initialization'
method: cmath
initialize_tanh
	"Return the hyperbolic tangent of z (complex number)"
	self ___at___: #tanh put: [:positional :keywords |
		| z sinhBlock coshBlock sinhZ coshZ |
		z := positional ___at___: 1.
		sinhBlock := self sinh.
		coshBlock := self cosh.
		sinhZ := sinhBlock value: {z} value: nil.
		coshZ := coshBlock value: {z} value: nil.
		sinhZ __truediv__: coshZ
	]
%

category: 'Python-Initialization'
method: cmath
initialize_tau
	"The mathematical constant τ = 2π = 6.283185..."
	| piValue |
	piValue := Float @env0:pi.
	self ___at___: #tau put: (piValue ___times___: 2.0)
%

category: 'Python-Classification'
method: cmath
isfinite
	"Return the isfinite function"
	^ self ___at___: #isfinite
%

category: 'Python-Classification'
method: cmath
isfinite: aBlock
	"Set the isfinite function (for monkey patching)"
	self ___at___: #isfinite put: aBlock
%

category: 'Python-Classification'
method: cmath
isinf
	"Return the isinf function"
	^ self ___at___: #isinf
%

category: 'Python-Classification'
method: cmath
isinf: aBlock
	"Set the isinf function (for monkey patching)"
	self ___at___: #isinf put: aBlock
%

category: 'Python-Classification'
method: cmath
isnan
	"Return the isnan function"
	^ self ___at___: #isnan
%

category: 'Python-Classification'
method: cmath
isnan: aBlock
	"Set the isnan function (for monkey patching)"
	self ___at___: #isnan put: aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log
	"Return the log function"
	^ self ___at___: #log
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10
	"Return the log10 function"
	^ self ___at___: #log10
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10: aBlock
	"Set the log10 function (for monkey patching)"
	self ___at___: #log10 put: aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log: aBlock
	"Set the log function (for monkey patching)"
	self ___at___: #log put: aBlock
%

category: 'Python-Constants'
method: cmath
nan
	"Not a number (NaN)"
	^ self ___at___: #nan
%

category: 'Python-Constants'
method: cmath
nan: aValue
	"Set the nan constant (for monkey patching)"
	self ___at___: #nan put: aValue
%

category: 'Python-Constants'
method: cmath
nanj
	"Complex number with zero real part and NaN imaginary part"
	^ self ___at___: #nanj
%

category: 'Python-Constants'
method: cmath
nanj: aValue
	"Set the nanj constant (for monkey patching)"
	self ___at___: #nanj put: aValue
%

category: 'Python-Polar Coordinates'
method: cmath
phase
	"Return the phase function"
	^ self ___at___: #phase
%

category: 'Python-Polar Coordinates'
method: cmath
phase: aBlock
	"Set the phase function (for monkey patching)"
	self ___at___: #phase put: aBlock
%

category: 'Python-Constants'
method: cmath
pi
	"The mathematical constant π = 3.141592..."
	^ self ___at___: #pi
%

category: 'Python-Constants'
method: cmath
pi: aValue
	"Set the pi constant (for monkey patching)"
	self ___at___: #pi put: aValue
%

category: 'Python-Polar Coordinates'
method: cmath
polar
	"Return the polar function"
	^ self ___at___: #polar
%

category: 'Python-Polar Coordinates'
method: cmath
polar: aBlock
	"Set the polar function (for monkey patching)"
	self ___at___: #polar put: aBlock
%

category: 'Python-Polar Coordinates'
method: cmath
rect
	"Return the rect function"
	^ self ___at___: #rect
%

category: 'Python-Polar Coordinates'
method: cmath
rect: aBlock
	"Set the rect function (for monkey patching)"
	self ___at___: #rect put: aBlock
%

category: 'Python-Trigonometric Functions'
method: cmath
sin
	"Return the sin function"
	^ self ___at___: #sin
%

category: 'Python-Trigonometric Functions'
method: cmath
sin: aBlock
	"Set the sin function (for monkey patching)"
	self ___at___: #sin put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh
	"Return the sinh function"
	^ self ___at___: #sinh
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh: aBlock
	"Set the sinh function (for monkey patching)"
	self ___at___: #sinh put: aBlock
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt
	"Return the sqrt function"
	^ self ___at___: #sqrt
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt: aBlock
	"Set the sqrt function (for monkey patching)"
	self ___at___: #sqrt put: aBlock
%

category: 'Python-Trigonometric Functions'
method: cmath
tan
	"Return the tan function"
	^ self ___at___: #tan
%

category: 'Python-Trigonometric Functions'
method: cmath
tan: aBlock
	"Set the tan function (for monkey patching)"
	self ___at___: #tan put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh
	"Return the tanh function"
	^ self ___at___: #tanh
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh: aBlock
	"Set the tanh function (for monkey patching)"
	self ___at___: #tanh put: aBlock
%

category: 'Python-Constants'
method: cmath
tau
	"The mathematical constant τ = 2π = 6.283185..."
	^ self ___at___: #tau
%

category: 'Python-Constants'
method: cmath
tau: aValue
	"Set the tau constant (for monkey patching)"
	self ___at___: #tau put: aValue
%

set compile_env: 0
