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
	^ (self @env1:___real___: x) @env0:sin
%

category: 'Grail-Trigonometric Functions'
method: math
cos: x
	^ (self @env1:___real___: x) @env0:cos
%

category: 'Grail-Trigonometric Functions'
method: math
tan: x
	^ (self @env1:___real___: x) @env0:tan
%

category: 'Grail-Trigonometric Functions'
method: math
asin: x
	| f |
	f := self @env1:___real___: x.
	(f @env0:< -1.0 or: [f @env0:> 1.0]) ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:arcSin
%

category: 'Grail-Trigonometric Functions'
method: math
acos: x
	| f |
	f := self @env1:___real___: x.
	(f @env0:< -1.0 or: [f @env0:> 1.0]) ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:arcCos
%

category: 'Grail-Trigonometric Functions'
method: math
atan: x
	^ (self @env1:___real___: x) @env0:arcTan
%

category: 'Grail-Trigonometric Functions'
method: math
atan2: y _: x
	^ (self @env1:___real___: y) @env0:arcTan2: (self @env1:___real___: x)
%

! ===============================================================================
! Fast-path callables — hyperbolic
! ===============================================================================

category: 'Grail-Hyperbolic Functions'
method: math
sinh: x
	^ (self @env1:___real___: x) @env0:sinh
%

category: 'Grail-Hyperbolic Functions'
method: math
cosh: x
	^ (self @env1:___real___: x) @env0:cosh
%

category: 'Grail-Hyperbolic Functions'
method: math
tanh: x
	^ (self @env1:___real___: x) @env0:tanh
%

category: 'Grail-Hyperbolic Functions'
method: math
asinh: x
	^ (self @env1:___real___: x) @env0:arcSinh
%

category: 'Grail-Hyperbolic Functions'
method: math
acosh: x
	| f |
	f := self @env1:___real___: x.
	f @env0:< 1.0 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:arcCosh
%

category: 'Grail-Hyperbolic Functions'
method: math
atanh: x
	| f |
	f := self @env1:___real___: x.
	(f @env0:<= -1.0 or: [f @env0:>= 1.0]) ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:arcTanh
%

! ===============================================================================
! Fast-path callables — exponential and logarithmic
! ===============================================================================

category: 'Grail-Exponential and Logarithmic'
method: math
exp: x
	^ (self @env1:___real___: x) @env0:exp
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
	"math.log(x, base) — logarithm of x to the given base.  Domain:
	x <= 0 raises CPython's ValueError."

	| f |
	f := self @env1:___real___: x.
	f @env0:<= 0.0 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ (f @env0:ln) @env0:/ ((self @env1:___real___: base) @env0:ln)
%

category: 'Grail-Exponential and Logarithmic'
method: math
log10: x
	| f |
	f := self @env1:___real___: x.
	f @env0:<= 0.0 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:log10
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
	| f |
	f := self @env1:___real___: x.
	f @env0:< 0.0 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ f @env0:sqrt
%

category: 'Grail-Exponential and Logarithmic'
method: math
pow: x _: y
	"math.pow(x, y) — x raised to the power y (as float)."
	^ (self @env1:___real___: x) @env0:raisedTo: (self @env1:___real___: y)
%

! ===============================================================================
! Fast-path callables — rounding and integer
! ===============================================================================

category: 'Grail-Rounding'
method: math
ceil: x
	^ (self @env1:___real___: x) @env0:ceiling
%

category: 'Grail-Rounding'
method: math
floor: x
	^ (self @env1:___real___: x) @env0:floor
%

category: 'Grail-Rounding'
method: math
trunc: x
	^ (self @env1:___real___: x) @env0:truncated
%

category: 'Grail-Rounding'
method: math
factorial: n
	"GemStone caps LargeInteger at ~130k bits (engine limit; CPython's
	ints are unbounded).  Resignal the kernel NumericError as the
	catchable Python OverflowError -- a DELIBERATE deviation
	(test_math's factorial(10**10) huge-input probes)."

	| nInt |
	nInt := n @env0:asInteger.
	(nInt @env0:< 0) ifTrue: [
		ValueError ___signal___: 'factorial() not defined for negative values'
	].
	^ [nInt @env0:factorial]
		@env0:on: NumericError
		do: [:ex |
			OverflowError ___signal___: 'factorial result exceeds Grail integer capacity']
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
	^ (self @env1:___real___: x) @env0:abs
%

! ===============================================================================
! Fast-path callables — classification
! ===============================================================================

category: 'Grail-Classification'
method: math
isfinite: x
	| kind |
	kind := (self @env1:___real___: x) @env0:_getKind.
	^ (kind @env0:<= 2) or: [kind == 4]
%

category: 'Grail-Classification'
method: math
isinf: x
	^ ((self @env1:___real___: x) @env0:_getKind) == 3
%

category: 'Grail-Classification'
method: math
isnan: x
	^ (self @env1:___real___: x) @env0:_isNaN
%

category: 'Grail-Math Functions'
method: math
___materialize___: iterable
	"Collect any Python iterable (list, tuple, iterator, generator)
	into an OrderedCollection via the __iter__/__next__ protocol --
	env-0 do: is not part of the Python surface (list_iterator has
	none)."

	| out it done |
	out := OrderedCollection @env0:new.
	it := iterable @env1:__iter__.
	done := false.
	[done] @env0:whileFalse: [
		[out @env0:add: (it @env1:__next__)]
			@env0:on: StopIteration
			do: [:ex | done := true. ex @env0:return: nil]].
	^ out
%

category: 'Grail-Math Functions'
method: math
copysign: x _: y
	"copysign(x, y) -> magnitude of x with the sign of y.  The 1/y
	probe distinguishes -0.0 from 0.0 (its reciprocal's sign
	survives)."

	| mag neg fy |
	mag := (self @env1:___real___: x) @env0:abs.
	fy := self @env1:___real___: y.
	neg := fy @env0:< 0
		or: [fy @env0:= 0 and: [(1.0 @env0:/ fy) @env0:< 0]].
	^ neg ifTrue: [mag @env0:negated] ifFalse: [mag]
%

category: 'Grail-Math Functions'
method: math
ldexp: x _: i
	"ldexp(x, i) -> x * 2**i."

	^ (self @env1:___real___: x) @env0:* (2.0 @env0:raisedTo: i @env0:asInteger)
%

category: 'Grail-Math Functions'
method: math
fma: x _: y _: z
	"fma(x, y, z) -> x*y + z.  DEVIATION: not a fused multiply-add --
	the intermediate rounds (GemStone has no FMA primitive)."

	^ ((self @env1:___real___: x) @env0:* (self @env1:___real___: y))
		@env0:+ (self @env1:___real___: z)
%

category: 'Grail-Math Functions'
method: math
ulp: x
	"ulp(x) -> spacing between x and the next float.  0 -> the
	smallest subnormal; otherwise 2**(exponent - 52)."

	| fx |
	fx := (self @env1:___real___: x) @env0:abs.
	fx @env0:= 0 ifTrue: [^ 5e-324].
	^ 2.0 @env0:raisedTo: (fx @env0:exponent @env0:- 52)
%

category: 'Grail-Math Functions'
method: math
_hypot: positional kw: kwargs
	"hypot(*coordinates) -> Euclidean norm."

	| sum coords |
	coords := (positional @env0:size @env0:= 1
		and: [((positional @env0:at: 1) @env0:isKindOf: Number) @env0:not])
		ifTrue: [self @env1:___materialize___: (positional @env0:at: 1)]
		ifFalse: [positional].
	sum := 0.0.
	coords @env0:do: [:c |
		| f |
		f := self @env1:___real___: c.
		sum := sum @env0:+ (f @env0:* f)].
	^ sum @env0:sqrt
%

category: 'Grail-Math Functions'
method: math
dist: pIter _: qIter
	"dist(p, q) -> Euclidean distance between two points."

	| ps qs sum d |
	ps := (self @env1:___materialize___: pIter)
		@env0:collect: [:v | self @env1:___real___: v].
	qs := (self @env1:___materialize___: qIter)
		@env0:collect: [:v | self @env1:___real___: v].
	ps @env0:size @env0:= qs @env0:size ifFalse: [
		ValueError ___signal___: 'both points must have the same number of dimensions'].
	sum := 0.0.
	1 @env0:to: ps @env0:size do: [:i |
		d := (ps @env0:at: i) @env0:- (qs @env0:at: i).
		sum := sum @env0:+ (d @env0:* d)].
	^ sum @env0:sqrt
%

category: 'Grail-Math Functions'
method: math
sumprod: pIter _: qIter
	"sumprod(p, q) -> sum of products of parallel elements (3.12+)."

	| ps qs sum |
	ps := self @env1:___materialize___: pIter.
	qs := self @env1:___materialize___: qIter.
	ps @env0:size @env0:= qs @env0:size ifFalse: [
		ValueError ___signal___: 'Inputs are not the same length'].
	sum := 0.
	1 @env0:to: ps @env0:size do: [:i |
		"env-1 dunders, not env-0 arithmetic: a Python Fraction operand
		dispatches __mul__/__add__ through the class-attr operator
		protocol; env-0 sends land in the CLASSIC 1-arg DNU and die."
		sum := sum @env1:__add__:
			((ps @env0:at: i) @env1:__mul__: (qs @env0:at: i))].
	^ sum
%

category: 'Grail-Math Functions'
method: math
___real___: x
	"Convert a math-function argument to a Float with CPython's error:
	TypeError 'must be real number, not X' for non-numerics.  Booleans
	count as 0/1; __float__-bearing objects (Decimal stubs, Fraction)
	convert through the protocol.  Bare @env0:asFloat on a string
	produced downstream uncatchable MNUs (math.exp('x'))."

	(x @env0:isKindOf: Boolean) ifTrue: [^ x ifTrue: [1.0] ifFalse: [0.0]].
	(x @env0:isKindOf: Number) ifTrue: [^ x @env0:asFloat].
	((x @env0:class @env0:whichClassIncludesSelector: #'__float__' environmentId: 1) @env0:~~ nil)
		ifTrue: [^ (x @env0:perform: #'__float__' env: 1) @env0:asFloat].
	TypeError ___signal___: ('must be real number, not '
		@env0:, x @env0:class @env0:name @env0:asString)
%

category: 'Grail-Math Functions'
method: math
_isclose: positional kw: kwargs
	"math.isclose(a, b, rel_tol=1e-09, abs_tol=0.0) -- PEP 485.
	test_math imports it at module scope."

	| a b relTol absTol diff |
	a := self @env1:___real___: (positional @env0:at: 1).
	b := self @env1:___real___: (positional @env0:at: 2).
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
	^ (self @env1:___real___: x) @env0:radiansToDegrees
%

category: 'Grail-Angle Conversion'
method: math
radians: x
	^ (self @env1:___real___: x) @env0:degreesToRadians
%

set compile_env: 0
