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
math category: 'Grail-Modules'
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

category: 'Grail-Initialization'
method: math
initialize
	self @env0:at: #pi put: (Float @env0:pi).
	self @env0:at: #e put: (Float @env0:e).
	self @env0:at: #tau put: ((Float @env0:pi) @env0:* 2).
	self @env0:at: #inf put: PlusInfinity.
	self @env0:at: #nan put: PlusQuietNaN.
%

! ===============================================================================
! Stored-attribute accessors (constants)
! ===============================================================================

category: 'Grail-Mathematical Constants'
method: math
pi
	^ self @env0:at: #pi
%

category: 'Grail-Mathematical Constants'
method: math
e
	^ self @env0:at: #e
%

category: 'Grail-Mathematical Constants'
method: math
tau
	^ self @env0:at: #tau
%

category: 'Grail-Mathematical Constants'
method: math
inf
	^ self @env0:at: #inf
%

category: 'Grail-Mathematical Constants'
method: math
nan
	^ self @env0:at: #nan
%

! ===============================================================================
! Fast-path callables — trigonometric
! ===============================================================================

category: 'Grail-Trigonometric Functions'
method: math
sin: x
	^ x @env0:sin
%

category: 'Grail-Trigonometric Functions'
method: math
cos: x
	^ x @env0:cos
%

category: 'Grail-Trigonometric Functions'
method: math
tan: x
	^ x @env0:tan
%

category: 'Grail-Trigonometric Functions'
method: math
asin: x
	^ x @env0:arcSin
%

category: 'Grail-Trigonometric Functions'
method: math
acos: x
	^ x @env0:arcCos
%

category: 'Grail-Trigonometric Functions'
method: math
atan: x
	^ x @env0:arcTan
%

category: 'Grail-Trigonometric Functions'
method: math
atan2: y _: x
	^ (y @env0:asFloat) @env0:arcTan2: (x @env0:asFloat)
%

! ===============================================================================
! Fast-path callables — hyperbolic
! ===============================================================================

category: 'Grail-Hyperbolic Functions'
method: math
sinh: x
	^ (x @env0:asFloat) @env0:sinh
%

category: 'Grail-Hyperbolic Functions'
method: math
cosh: x
	^ (x @env0:asFloat) @env0:cosh
%

category: 'Grail-Hyperbolic Functions'
method: math
tanh: x
	^ (x @env0:asFloat) @env0:tanh
%

category: 'Grail-Hyperbolic Functions'
method: math
asinh: x
	^ (x @env0:asFloat) @env0:arcSinh
%

category: 'Grail-Hyperbolic Functions'
method: math
acosh: x
	^ (x @env0:asFloat) @env0:arcCosh
%

category: 'Grail-Hyperbolic Functions'
method: math
atanh: x
	^ (x @env0:asFloat) @env0:arcTanh
%

! ===============================================================================
! Fast-path callables — exponential and logarithmic
! ===============================================================================

category: 'Grail-Exponential and Logarithmic'
method: math
exp: x
	^ x @env0:exp
%

category: 'Grail-Exponential and Logarithmic'
method: math
log: x
	"math.log(x) — natural logarithm. Delegates to log:_: with base e."
	^ self log: x _: (self e)
%

category: 'Grail-Exponential and Logarithmic'
method: math
log: x _: base
	"math.log(x, base) — logarithm of x to the given base."
	^ (x @env0:ln) @env0:/ (base @env0:ln)
%

category: 'Grail-Exponential and Logarithmic'
method: math
log10: x
	^ (x @env0:asFloat) @env0:log10
%

category: 'Grail-Exponential and Logarithmic'
method: math
log2: x
	| ln2 |
	ln2 := 2 @env0:ln.
	^ (x @env0:ln) @env0:/ ln2
%

category: 'Grail-Exponential and Logarithmic'
method: math
sqrt: x
	^ x @env0:sqrt
%

category: 'Grail-Exponential and Logarithmic'
method: math
pow: x _: y
	"math.pow(x, y) — x raised to the power y (as float)."
	^ (x @env0:asFloat) @env0:raisedTo: (y @env0:asFloat)
%

! ===============================================================================
! Fast-path callables — rounding and integer
! ===============================================================================

category: 'Grail-Rounding'
method: math
ceil: x
	^ (x @env0:asFloat) @env0:ceiling
%

category: 'Grail-Rounding'
method: math
floor: x
	^ (x @env0:asFloat) @env0:floor
%

category: 'Grail-Rounding'
method: math
trunc: x
	^ (x @env0:asFloat) @env0:truncated
%

category: 'Grail-Rounding'
method: math
factorial: n
	| nInt |
	nInt := n @env0:asInteger.
	(nInt @env0:< 0) ifTrue: [
		ValueError ___signal___: 'factorial() not defined for negative values'
	].
	^ nInt @env0:factorial
%

category: 'Grail-Number Theory'
method: math
gcd: a _: b
	^ (a @env0:asInteger) @env0:gcd: (b @env0:asInteger)
%

category: 'Grail-Number Theory'
method: math
lcm: a _: b
	^ (a @env0:asInteger) @env0:lcm: (b @env0:asInteger)
%

category: 'Grail-Floating Point Functions'
method: math
fabs: x
	^ (x @env0:asFloat) @env0:abs
%

! ===============================================================================
! Fast-path callables — classification
! ===============================================================================

category: 'Grail-Classification'
method: math
isfinite: x
	| kind |
	kind := (x @env0:asFloat) @env0:_getKind.
	^ (kind @env0:<= 2) or: [kind == 4]
%

category: 'Grail-Classification'
method: math
isinf: x
	^ ((x @env0:asFloat) @env0:_getKind) == 3
%

category: 'Grail-Classification'
method: math
isnan: x
	^ (x @env0:asFloat) @env0:_isNaN
%

category: 'Grail-Math Functions'
method: math
_isclose: positional kw: kwargs
	"math.isclose(a, b, rel_tol=1e-09, abs_tol=0.0) -- PEP 485.
	test_math imports it at module scope."

	| a b relTol absTol diff |
	a := (positional @env0:at: 1) @env0:asFloat.
	b := (positional @env0:at: 2) @env0:asFloat.
	relTol := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [(kwargs @env0:~~ nil and: [kwargs @env0:includesKey: 'rel_tol'])
			ifTrue: [kwargs @env0:at: 'rel_tol'] ifFalse: [1e-09]].
	absTol := (positional @env0:size @env0:>= 4)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [(kwargs @env0:~~ nil and: [kwargs @env0:includesKey: 'abs_tol'])
			ifTrue: [kwargs @env0:at: 'abs_tol'] ifFalse: [0.0]].
	(relTol @env0:< 0 or: [absTol @env0:< 0]) ifTrue: [
		ValueError ___signal___: 'tolerances must be non-negative'].
	(a @env0:= b) ifTrue: [^ true].
	((a @env0:= PlusInfinity or: [a @env0:= MinusInfinity])
		or: [b @env0:= PlusInfinity or: [b @env0:= MinusInfinity]])
		ifTrue: [^ false].
	diff := (b @env0:- a) @env0:abs.
	^ (diff @env0:<= (relTol @env0:* b @env0:abs) @env0:abs)
		or: [(diff @env0:<= (relTol @env0:* a @env0:abs) @env0:abs)
		or: [diff @env0:<= absTol]]
%

! ===============================================================================
! Fast-path callables — angle conversion
! ===============================================================================

category: 'Grail-Angle Conversion'
method: math
degrees: x
	^ (x @env0:asFloat) @env0:radiansToDegrees
%

category: 'Grail-Angle Conversion'
method: math
radians: x
	^ (x @env0:asFloat) @env0:degreesToRadians
%

set compile_env: 0
