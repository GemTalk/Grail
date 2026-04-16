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

Provides mathematical functions for complex numbers.
See https://docs.python.org/3/library/cmath.html
'
%

expectvalue /Class
doit
cmath category: 'Modules'
%

! ------------------- Remove existing Python methods from cmath
expectvalue /Metaclass3
doit
cmath removeAllMethods: 1.
cmath class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Private helper
! ===============================================================================

category: 'Python-Private'
method: cmath
___asComplex: z
	"Convert z to a complex number if it isn't already"
	| zClass |
	zClass := z ___class___.
	(zClass ___eq___: complex) ifTrue: [^ z].
	^ complex __new__: (z ___asFloat___) _: 0.0
%

! ===============================================================================
! Initialization — constants only
! ===============================================================================

category: 'Python-Initialization'
method: cmath
initialize
	self ___at___: #pi put: (Float @env0:pi).
	self ___at___: #e put: (1.0 @env0:exp).
	self ___at___: #tau put: ((Float @env0:pi) ___times___: 2.0).
	self ___at___: #inf put: PlusInfinity.
	self ___at___: #infj put: (complex __new__: 0.0 _: PlusInfinity).
	self ___at___: #nan put: PlusQuietNaN.
	self ___at___: #nanj put: (complex __new__: 0.0 _: PlusQuietNaN).
%

! ===============================================================================
! Stored-attribute accessors (constants)
! ===============================================================================

category: 'Python-Constants'
method: cmath
pi
	^ self ___at___: #pi
%

category: 'Python-Constants'
method: cmath
e
	^ self ___at___: #e
%

category: 'Python-Constants'
method: cmath
tau
	^ self ___at___: #tau
%

category: 'Python-Constants'
method: cmath
inf
	^ self ___at___: #inf
%

category: 'Python-Constants'
method: cmath
infj
	^ self ___at___: #infj
%

category: 'Python-Constants'
method: cmath
nan
	^ self ___at___: #nan
%

category: 'Python-Constants'
method: cmath
nanj
	^ self ___at___: #nanj
%

! ===============================================================================
! Fast-path callables — trigonometric
! ===============================================================================

category: 'Python-Trigonometric Functions'
method: cmath
cos: z
	"cmath.cos(z) — cos(a+bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real ___cos___) ___times___: (imag @env0:cosh)) _: (((real ___sin___) ___times___: (imag @env0:sinh)) ___negated___)
%

category: 'Python-Trigonometric Functions'
method: cmath
sin: z
	"cmath.sin(z) — sin(a+bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real ___sin___) ___times___: (imag @env0:cosh)) _: ((real ___cos___) ___times___: (imag @env0:sinh))
%

category: 'Python-Trigonometric Functions'
method: cmath
tan: z
	"cmath.tan(z) — sin(z) / cos(z)"

	^ (self sin: z) __truediv__: (self cos: z)
%

! ===============================================================================
! Fast-path callables — hyperbolic
! ===============================================================================

category: 'Python-Hyperbolic Functions'
method: cmath
cosh: z
	"cmath.cosh(z) — cosh(a+bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:cosh) ___times___: (imag ___cos___)) _: ((real @env0:sinh) ___times___: (imag ___sin___))
%

category: 'Python-Hyperbolic Functions'
method: cmath
sinh: z
	"cmath.sinh(z) — sinh(a+bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:sinh) ___times___: (imag ___cos___)) _: ((real @env0:cosh) ___times___: (imag ___sin___))
%

category: 'Python-Hyperbolic Functions'
method: cmath
tanh: z
	"cmath.tanh(z) — sinh(z) / cosh(z)"

	^ (self sinh: z) __truediv__: (self cosh: z)
%

! ===============================================================================
! Fast-path callables — exponential and logarithmic
! ===============================================================================

category: 'Python-Exponential and Logarithmic'
method: cmath
exp: z
	"cmath.exp(z) — exp(a+bi) = exp(a) * (cos(b) + i*sin(b))"

	| zComplex real imag expReal |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	expReal := real @env0:exp.
	^ complex __new__: (expReal ___times___: (imag ___cos___)) _: (expReal ___times___: (imag ___sin___))
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log: z
	"cmath.log(z) — log(|z|) + i*arg(z)"

	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real ___times___: real) ___plus___: (imag ___times___: imag)) ___sqrt___).
	theta := imag @env0:arcTan2: real.
	^ complex __new__: (r ___ln___) _: theta
%

category: 'Python-Exponential and Logarithmic'
method: cmath
log10: z
	"cmath.log10(z) — log(z) / log(10)"

	| logZ ln10 |
	logZ := self log: z.
	ln10 := 10.0 ___ln___.
	^ logZ __truediv__: (complex __new__: ln10 _: 0.0)
%

category: 'Python-Exponential and Logarithmic'
method: cmath
sqrt: z
	"cmath.sqrt(z) — sqrt(r) * (cos(theta/2) + i*sin(theta/2))"

	| zComplex real imag r theta sqrtR halfTheta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real ___times___: real) ___plus___: (imag ___times___: imag)) ___sqrt___).
	theta := imag @env0:arcTan2: real.
	sqrtR := r ___sqrt___.
	halfTheta := theta ___divide___: 2.0.
	^ complex __new__: (sqrtR ___times___: (halfTheta ___cos___)) _: (sqrtR ___times___: (halfTheta ___sin___))
%

! ===============================================================================
! Fast-path callables — polar coordinates
! ===============================================================================

category: 'Python-Polar Coordinates'
method: cmath
phase: z
	"cmath.phase(z) — return the phase (argument) of z in radians"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ imag @env0:arcTan2: real
%

category: 'Python-Polar Coordinates'
method: cmath
polar: z
	"cmath.polar(z) — return (r, theta) as a tuple"

	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real ___times___: real) ___plus___: (imag ___times___: imag)) ___sqrt___).
	theta := imag @env0:arcTan2: real.
	^ tuple ___withAll___: (tuple ___with___: r with: theta)
%

category: 'Python-Polar Coordinates'
method: cmath
rect: r _: theta
	"cmath.rect(r, theta) — convert polar to rectangular"

	| rFloat thetaFloat |
	rFloat := r ___asFloat___.
	thetaFloat := theta ___asFloat___.
	^ complex __new__: (rFloat ___times___: (thetaFloat ___cos___)) _: (rFloat ___times___: (thetaFloat ___sin___))
%

! ===============================================================================
! Fast-path callables — classification
! ===============================================================================

category: 'Python-Classification'
method: cmath
isfinite: z
	"cmath.isfinite(z) — True if both real and imag parts are finite"

	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	realKind := real @env0:_getKind.
	imagKind := imag @env0:_getKind.
	^ ((realKind ___le___: 2) or: [realKind ___eq___: 4])
		and: [(imagKind ___le___: 2) or: [imagKind ___eq___: 4]]
%

category: 'Python-Classification'
method: cmath
isinf: z
	"cmath.isinf(z) — True if either part is infinity"

	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	realKind := real @env0:_getKind.
	imagKind := imag @env0:_getKind.
	^ (realKind ___eq___: 3) or: [imagKind ___eq___: 3]
%

category: 'Python-Classification'
method: cmath
isnan: z
	"cmath.isnan(z) — True if either part is NaN"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ (real @env0:_isNaN) or: [imag @env0:_isNaN]
%

set compile_env: 0
