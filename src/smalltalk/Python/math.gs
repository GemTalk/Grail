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
___rangeCheck___: r finite: inputWasFinite
	"CPython raises OverflowError (``math range error'') when a FINITE
	input overflows to an infinite result -- exp(1e6), 2**1e6, pow(2,1e4).
	An infinite result from an already-infinite input (exp(inf)) is not an
	overflow.  Returns r unchanged otherwise."

	((r @env0:_getKind) @env0:== 3 and: [inputWasFinite])
		ifTrue: [OverflowError ___signal___: 'math range error'].
	^ r
%

category: 'Grail-Exponential and Logarithmic'
method: math
exp: x
	| f |
	f := self @env1:___real___: x.
	^ self @env1:___rangeCheck___: (f @env0:exp) finite: ((f @env0:_getKind) @env0:~= 3)
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
	"math.pow(x, y) — x raised to the power y (as float).  NOTE: the full
	IEEE-754 special-case matrix (pow(1, NAN)=1, pow(0, -2)->ValueError,
	the INF/NINF/negative-base rules -- test_math testPow) is a separate
	follow-on; raising OverflowError on a finite-input overflow here would
	mis-fire on those domain cases as OverflowError instead of ValueError."
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
	"Validate integer-ness via __index__ (a float argument is a TypeError,
	not a silent truncation)."
	^ (self @env1:___index___: a) @env0:gcd: (self @env1:___index___: b)
%

category: 'Grail-Number Theory'
method: math
lcm: a _: b
	| av bv |
	av := self @env1:___index___: a.
	bv := self @env1:___index___: b.
	^ (av @env0:= 0 or: [bv @env0:= 0]) ifTrue: [0] ifFalse: [av @env0:lcm: bv]
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

! ===============================================================================
! Integer-valued number-theory / combinatorics
! ===============================================================================

category: 'Grail-Number Theory'
method: math
___index___: x
	"Coerce to a Python integer via __index__ (CPython requires an exact
	integer, not a float).  bool -> 0/1; a float/str/Decimal argument is a
	TypeError, matching math.isqrt/comb/perm/gcd."

	(x @env0:isKindOf: Boolean) ifTrue: [^ x ifTrue: [1] ifFalse: [0]].
	(x @env0:isKindOf: Integer) ifTrue: [^ x].
	((x @env0:class @env0:whichClassIncludesSelector: #'__index__' environmentId: 1) @env0:~~ nil)
		ifTrue: [^ (x @env0:perform: #'__index__' env: 1) @env0:asInteger].
	TypeError ___signal___: ('''' @env0:, x @env0:class @env0:name @env0:asString
		@env0:, ''' object cannot be interpreted as an integer')
%

category: 'Grail-Number Theory'
method: math
isqrt: n
	"Integer square root: the floor of the exact square root.  Pure-integer
	Newton iteration so it is exact for arbitrarily large n (a Float sqrt
	would lose precision)."

	| v x y |
	v := self @env1:___index___: n.
	v @env0:< 0 ifTrue: [
		ValueError ___signal___: 'isqrt() argument must be nonnegative'].
	v @env0:<= 1 ifTrue: [^ v].
	x := 1 @env0:bitShift: ((v @env0:highBit @env0:+ 1) @env0:// 2).
	[y := (x @env0:+ (v @env0:// x)) @env0:// 2. y @env0:< x] @env0:whileTrue: [x := y].
	^ x
%

category: 'Grail-Number Theory'
method: math
comb: n _: k
	"Binomial coefficient C(n, k) = n! / (k! (n-k)!), computed by the
	multiplicative formula (stays integer, no huge factorials).  0 when
	k > n; both args must be non-negative integers."

	| nn kk r |
	nn := self @env1:___index___: n.
	kk := self @env1:___index___: k.
	(nn @env0:< 0 or: [kk @env0:< 0]) ifTrue: [
		ValueError ___signal___: 'n and k must be non-negative integers'].
	kk @env0:> nn ifTrue: [^ 0].
	(kk @env0:* 2) @env0:> nn ifTrue: [kk := nn @env0:- kk].
	r := 1.
	1 @env0:to: kk do: [:i | r := (r @env0:* (nn @env0:- kk @env0:+ i)) @env0:// i].
	^ r
%

category: 'Grail-Number Theory'
method: math
perm: n
	"perm(n) = n! (the one-argument form)."

	^ self @env1:perm: n _: None
%

category: 'Grail-Number Theory'
method: math
perm: n _: k
	"Number of ways to arrange k of n items = n! / (n-k)!.  k=None means
	n (i.e. n!).  0 when k > n; args must be non-negative integers."

	| nn kk r |
	nn := self @env1:___index___: n.
	nn @env0:< 0 ifTrue: [
		ValueError ___signal___: 'n must be a non-negative integer'].
	k @env0:== None ifTrue: [^ self @env1:factorial: nn].
	kk := self @env1:___index___: k.
	kk @env0:< 0 ifTrue: [
		ValueError ___signal___: 'k must be a non-negative integer'].
	kk @env0:> nn ifTrue: [^ 0].
	r := 1.
	0 @env0:to: kk @env0:- 1 do: [:i | r := r @env0:* (nn @env0:- i)].
	^ r
%

category: 'Grail-Number Theory'
method: math
_gcd: positional kw: kwargs
	"math.gcd(*integers) -- variadic (3.9+).  gcd() = 0, gcd(a) = |a|."

	| r |
	r := 0.
	positional @env0:do: [:a | r := r @env0:gcd: (self @env1:___index___: a)].
	^ r
%

category: 'Grail-Number Theory'
method: math
_lcm: positional kw: kwargs
	"math.lcm(*integers) -- variadic (3.9+).  lcm() = 1; any 0 -> 0."

	| r |
	r := 1.
	positional @env0:do: [:a |
		| v |
		v := self @env1:___index___: a.
		r := v @env0:= 0 ifTrue: [0] ifFalse: [r @env0:lcm: v]].
	^ r
%

category: 'Grail-Math Functions'
method: math
prod: iterable
	"math.prod(iterable) -- product with the default start of 1."

	^ self @env1:_prod: (Array @env0:with: iterable) kw: nil
%

category: 'Grail-Math Functions'
method: math
_prod: positional kw: kwargs
	"math.prod(iterable, *, start=1)."

	| acc |
	acc := (kwargs @env0:~~ nil and: [kwargs @env0:includesKey: 'start'])
		ifTrue: [kwargs @env0:at: 'start'] ifFalse: [1].
	(self @env1:___materialize___: (positional @env0:at: 1)) @env0:do: [:v |
		acc := acc @env1:__mul__: v].
	^ acc
%

! ===============================================================================
! Additional floating-point functions
! ===============================================================================

category: 'Grail-Exponential and Logarithmic'
method: math
exp2: x
	"2 ** x (as float)."

	| f |
	f := self @env1:___real___: x.
	f @env0:_isNaN ifTrue: [^ f].
	(f @env0:_getKind) @env0:== 3 ifTrue: [
		^ f @env0:> 0 ifTrue: [PlusInfinity] ifFalse: [0.0]].
	^ self @env1:___rangeCheck___: (2.0 @env0:raisedTo: f) finite: true
%

category: 'Grail-Exponential and Logarithmic'
method: math
log1p: x
	"log(1 + x), accurate for small x.  1+x <= 0 mirrors log()'s domain."

	| arg |
	arg := 1.0 @env0:+ (self @env1:___real___: x).
	"log1p(-1) is log(0): a domain error, like log(x<=0)."
	arg @env0:<= 0.0 ifTrue: [ValueError ___signal___: 'math domain error'].
	^ arg @env0:ln
%

category: 'Grail-Math Functions'
method: math
cbrt: x
	"Real cube root, sign-preserving (cbrt(-27) = -3, cbrt(-0.0) = -0.0)."

	| f |
	f := self @env1:___real___: x.
	f @env0:_isNaN ifTrue: [^ f].
	f @env0:= 0 ifTrue: [^ f].
	f @env0:< 0 ifTrue: [^ ((f @env0:abs) @env0:raisedTo: (1.0 @env0:/ 3.0)) @env0:negated].
	^ f @env0:raisedTo: (1.0 @env0:/ 3.0)
%

category: 'Grail-Math Functions'
method: math
erf: x
	"Gauss error function (GemStone Float>>erf)."

	^ (self @env1:___real___: x) @env0:erf
%

category: 'Grail-Math Functions'
method: math
___gammaLanczos___: x
	"Lanczos approximation (g=7, 9 coefficients) of the gamma function for
	x >= 0.5; reflect x < 0.5 through gamma(x)gamma(1-x) = pi/sin(pi x).
	~15 significant digits."

	| pi c xx a t |
	pi := self @env1:pi.
	x @env0:< 0.5 ifTrue: [
		^ pi @env0:/ ((pi @env0:* x) @env0:sin
			@env0:* (self @env1:___gammaLanczos___: (1.0 @env0:- x)))].
	c := #(0.99999999999980993 676.5203681218851 -1259.1392167224028
		771.32342877765313 -176.61502916214059 12.507343278686905
		-0.13857109526572012 9.9843695780195716e-6 1.5056327351493116e-7).
	xx := x @env0:- 1.0.
	a := c @env0:at: 1.
	1 @env0:to: 8 do: [:i | a := a @env0:+ ((c @env0:at: i @env0:+ 1) @env0:/ (xx @env0:+ i))].
	t := xx @env0:+ 7.5.
	^ (2.0 @env0:* pi) @env0:sqrt
		@env0:* (t @env0:raisedTo: (xx @env0:+ 0.5))
		@env0:* (t @env0:negated @env0:exp)
		@env0:* a
%

category: 'Grail-Math Functions'
method: math
gamma: x
	"Gamma function.  Poles (ValueError) at 0 and the negative integers;
	gamma(+inf) = +inf.  GemStone Float has no gamma primitive, so use a
	Lanczos approximation."

	| f |
	f := self @env1:___real___: x.
	f @env0:_isNaN ifTrue: [^ f].
	(f @env0:_getKind) @env0:== 3 ifTrue: [
		f @env0:> 0 ifTrue: [^ PlusInfinity].
		ValueError ___signal___: 'math domain error'].
	(f @env0:<= 0.0 and: [f @env0:= f @env0:truncated]) ifTrue: [
		ValueError ___signal___: 'math domain error'].
	^ self @env1:___gammaLanczos___: f
%

category: 'Grail-Math Functions'
method: math
fmod: x _: y
	"C fmod: x - n*y with the sign of x (GemStone rem:); y=0 is a domain
	error."

	| fx fy r |
	fx := self @env1:___real___: x.
	fy := self @env1:___real___: y.
	fy @env0:= 0.0 ifTrue: [ValueError ___signal___: 'math domain error'].
	r := fx @env0:rem: fy.
	"C fmod's result carries x's sign, including the sign of a zero result
	(fmod(-10, 1) is -0.0)."
	r @env0:= 0.0 ifTrue: [^ self @env1:copysign: 0.0 _: fx].
	^ r
%

category: 'Grail-Math Functions'
method: math
___roundHalfEven___: q
	"Round a Float to the nearest integer, ties to even (IEEE default)."

	| fl frac |
	fl := q @env0:floor.
	frac := q @env0:- fl.
	frac @env0:< 0.5 ifTrue: [^ fl].
	frac @env0:> 0.5 ifTrue: [^ fl @env0:+ 1].
	^ fl @env0:even ifTrue: [fl] ifFalse: [fl @env0:+ 1]
%

category: 'Grail-Math Functions'
method: math
remainder: x _: y
	"IEEE 754 remainder: x - n*y where n = round-half-to-even(x/y), so
	|result| <= |y|/2.  remainder(x, inf) is x; remainder(inf, y) and
	remainder(x, 0) are domain errors; NaN propagates."

	| fx fy n |
	fx := self @env1:___real___: x.
	fy := self @env1:___real___: y.
	(fx @env0:_isNaN or: [fy @env0:_isNaN]) ifTrue: [^ fx @env0:+ fy].
	(fx @env0:_getKind) @env0:== 3 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	fy @env0:= 0.0 ifTrue: [
		ValueError ___signal___: 'math domain error'].
	(fy @env0:_getKind) @env0:== 3 ifTrue: [^ fx].
	n := self @env1:___roundHalfEven___: (fx @env0:/ fy).
	^ fx @env0:- (n @env0:* fy)
%

category: 'Grail-Math Functions'
method: math
frexp: x
	"Return (m, e) with x = m * 2**e and 0.5 <= |m| < 1 (0 and non-finite
	x give (x, 0))."

	| f e m |
	f := self @env1:___real___: x.
	(f @env0:_isNaN or: [(f @env0:_getKind) @env0:== 3]) ifTrue: [
		^ (Python @env0:at: #tuple) @env0:withAll: (Array @env0:with: f with: 0)].
	f @env0:= 0 ifTrue: [
		^ (Python @env0:at: #tuple) @env0:withAll: (Array @env0:with: f with: 0)].
	e := (f @env0:abs @env0:exponent) @env0:+ 1.
	m := f @env0:/ (2.0 @env0:raisedTo: e).
	^ (Python @env0:at: #tuple) @env0:withAll: (Array @env0:with: m with: e)
%

category: 'Grail-Math Functions'
method: math
modf: x
	"Return (fractional, integer) parts, both floats, each carrying x's
	sign (modf(INF) = (0.0, INF), modf(-1.5) = (-0.5, -1.0))."

	| f ip |
	f := self @env1:___real___: x.
	f @env0:_isNaN ifTrue: [
		^ (Python @env0:at: #tuple) @env0:withAll: (Array @env0:with: f with: f)].
	(f @env0:_getKind) @env0:== 3 ifTrue: [
		^ (Python @env0:at: #tuple) @env0:withAll:
			(Array @env0:with: (self @env1:copysign: 0.0 _: f) with: f)].
	ip := f @env0:truncated @env0:asFloat.
	^ (Python @env0:at: #tuple) @env0:withAll:
		(Array @env0:with: (f @env0:- ip) with: ip)
%

set compile_env: 0
