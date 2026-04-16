! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- math class (Python 'math' module)
expectvalue /Class
doit
module subclass: 'math'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
math comment:
'Python math module.

Provides mathematical functions and constants for real numbers.
See https://docs.python.org/3/library/math.html
'
%

expectvalue /Class
doit
math category: 'Modules'
%

! ------------------- Remove existing Python methods from math
expectvalue /Metaclass3
doit
math removeAllMethods: 1.
math class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Initialization — constants only
! ===============================================================================

category: 'Python-Initialization'
method: math
initialize
	self ___at___: #pi put: (Float @env0:pi).
	self ___at___: #e put: (Float @env0:e).
	self ___at___: #tau put: ((Float @env0:pi) ___times___: 2).
	self ___at___: #inf put: PlusInfinity.
	self ___at___: #nan put: PlusQuietNaN.
%

! ===============================================================================
! Stored-attribute accessors (constants)
! ===============================================================================

category: 'Python-Mathematical Constants'
method: math
pi
	^ self ___at___: #pi
%

category: 'Python-Mathematical Constants'
method: math
e
	^ self ___at___: #e
%

category: 'Python-Mathematical Constants'
method: math
tau
	^ self ___at___: #tau
%

category: 'Python-Mathematical Constants'
method: math
inf
	^ self ___at___: #inf
%

category: 'Python-Mathematical Constants'
method: math
nan
	^ self ___at___: #nan
%

! ===============================================================================
! Fast-path callables — trigonometric
! ===============================================================================

category: 'Python-Trigonometric Functions'
method: math
sin: x
	^ x ___sin___
%

category: 'Python-Trigonometric Functions'
method: math
cos: x
	^ x ___cos___
%

category: 'Python-Trigonometric Functions'
method: math
tan: x
	^ x @env0:tan
%

category: 'Python-Trigonometric Functions'
method: math
asin: x
	^ x @env0:arcSin
%

category: 'Python-Trigonometric Functions'
method: math
acos: x
	^ x @env0:arcCos
%

category: 'Python-Trigonometric Functions'
method: math
atan: x
	^ x @env0:arcTan
%

category: 'Python-Trigonometric Functions'
method: math
atan2: y _: x
	^ (y ___asFloat___) @env0:arcTan2: (x ___asFloat___)
%

! ===============================================================================
! Fast-path callables — hyperbolic
! ===============================================================================

category: 'Python-Hyperbolic Functions'
method: math
sinh: x
	^ (x ___asFloat___) @env0:sinh
%

category: 'Python-Hyperbolic Functions'
method: math
cosh: x
	^ (x ___asFloat___) @env0:cosh
%

category: 'Python-Hyperbolic Functions'
method: math
tanh: x
	^ (x ___asFloat___) @env0:tanh
%

category: 'Python-Hyperbolic Functions'
method: math
asinh: x
	^ (x ___asFloat___) @env0:arcSinh
%

category: 'Python-Hyperbolic Functions'
method: math
acosh: x
	^ (x ___asFloat___) @env0:arcCosh
%

category: 'Python-Hyperbolic Functions'
method: math
atanh: x
	^ (x ___asFloat___) @env0:arcTanh
%

! ===============================================================================
! Fast-path callables — exponential and logarithmic
! ===============================================================================

category: 'Python-Exponential and Logarithmic'
method: math
exp: x
	^ x @env0:exp
%

category: 'Python-Exponential and Logarithmic'
method: math
log: x
	"math.log(x) — natural logarithm. Delegates to log:_: with base e."
	^ self log: x _: (self e)
%

category: 'Python-Exponential and Logarithmic'
method: math
log: x _: base
	"math.log(x, base) — logarithm of x to the given base."
	^ (x ___ln___) ___divide___: (base ___ln___)
%

category: 'Python-Exponential and Logarithmic'
method: math
log10: x
	^ (x ___asFloat___) @env0:log10
%

category: 'Python-Exponential and Logarithmic'
method: math
log2: x
	| ln2 |
	ln2 := 2 ___ln___.
	^ (x ___ln___) ___divide___: ln2
%

category: 'Python-Exponential and Logarithmic'
method: math
sqrt: x
	^ x ___sqrt___
%

category: 'Python-Exponential and Logarithmic'
method: math
pow: x _: y
	"math.pow(x, y) — x raised to the power y (as float)."
	^ (x ___asFloat___) ___raisedTo___: (y ___asFloat___)
%

! ===============================================================================
! Fast-path callables — rounding and integer
! ===============================================================================

category: 'Python-Rounding'
method: math
ceil: x
	^ (x ___asFloat___) @env0:ceiling
%

category: 'Python-Rounding'
method: math
floor: x
	^ (x ___asFloat___) @env0:floor
%

category: 'Python-Rounding'
method: math
trunc: x
	^ (x ___asFloat___) ___truncated___
%

category: 'Python-Rounding'
method: math
factorial: n
	| nInt |
	nInt := n ___asInteger___.
	(nInt ___lt___: 0) ifTrue: [
		ValueError ___signal___: 'factorial() not defined for negative values'
	].
	^ nInt @env0:factorial
%

category: 'Python-Number Theory'
method: math
gcd: a _: b
	^ (a ___asInteger___) @env0:gcd: (b ___asInteger___)
%

category: 'Python-Number Theory'
method: math
lcm: a _: b
	^ (a ___asInteger___) @env0:lcm: (b ___asInteger___)
%

category: 'Python-Floating Point Functions'
method: math
fabs: x
	^ (x ___asFloat___) ___abs___
%

! ===============================================================================
! Fast-path callables — classification
! ===============================================================================

category: 'Python-Classification'
method: math
isfinite: x
	| kind |
	kind := (x ___asFloat___) @env0:_getKind.
	^ (kind ___le___: 2) or: [kind ___eq___: 4]
%

category: 'Python-Classification'
method: math
isinf: x
	^ ((x ___asFloat___) @env0:_getKind) ___eq___: 3
%

category: 'Python-Classification'
method: math
isnan: x
	^ (x ___asFloat___) @env0:_isNaN
%

! ===============================================================================
! Fast-path callables — angle conversion
! ===============================================================================

category: 'Python-Angle Conversion'
method: math
degrees: x
	^ (x ___asFloat___) @env0:radiansToDegrees
%

category: 'Python-Angle Conversion'
method: math
radians: x
	^ (x ___asFloat___) @env0:degreesToRadians
%

set compile_env: 0
