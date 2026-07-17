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
		ValueError ___signal___: 'expected a number between -1 and 1, got '
			@env0:, f @env0:printString].
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
___logHugeInt___: x
	"Natural log of a positive integer too large to represent as a float:
	ln(x) = ln(x >> shift) + shift*ln(2), keeping ~52 significant bits so
	the reduced value converts to a finite float (log(10**1000))."

	| shift |
	shift := x @env0:highBit @env0:- 52.
	^ ((x @env0:bitShift: shift @env0:negated) @env0:asFloat) @env0:ln
		@env0:+ (shift @env0:* (2.0 @env0:ln))
%

category: 'Grail-Exponential and Logarithmic'
method: math
___naturalLog___: x
	"ln(x) with CPython's domain error (x <= 0) and exact handling of a
	huge integer whose float conversion would overflow to inf."

	| f |
	(x @env0:isKindOf: Integer) ifTrue: [
		"An integer argument carries no float value in its message (it could
		be huge): CPython says just ``expected a positive input''."
		x @env0:<= 0 ifTrue: [ValueError ___signal___: 'expected a positive input'].
		(x @env0:highBit @env0:> 1023) ifTrue: [^ self @env1:___logHugeInt___: x]].
	f := self @env1:___real___: x.
	f @env0:<= 0.0 ifTrue: [
		ValueError ___signal___: 'expected a positive input, got ' @env0:, f @env0:printString].
	^ f @env0:ln
%

category: 'Grail-Exponential and Logarithmic'
method: math
log: x
	"math.log(x) — natural logarithm."
	^ self @env1:___naturalLog___: x
%

category: 'Grail-Exponential and Logarithmic'
method: math
log: x _: base
	"math.log(x, base) — logarithm of x to the given base.  Domain:
	x <= 0 raises CPython's ValueError."

	^ (self @env1:___naturalLog___: x) @env0:/ (self @env1:___naturalLog___: base)
%

category: 'Grail-Exponential and Logarithmic'
method: math
log10: x
	"Base-10 log; a huge integer routes through the integer-magnitude
	natural log (log10(10**1000) = 1000) rather than overflowing."

	| f |
	((x @env0:isKindOf: Integer) and: [x @env0:highBit @env0:> 1023]) ifTrue: [
		x @env0:<= 0 ifTrue: [ValueError ___signal___: 'math domain error'].
		^ (self @env1:___logHugeInt___: x) @env0:/ (10.0 @env0:ln)].
	f := self @env1:___real___: x.
	f @env0:<= 0.0 ifTrue: [
		ValueError ___signal___: 'expected a positive input, got ' @env0:, f @env0:printString].
	^ f @env0:log10
%

category: 'Grail-Exponential and Logarithmic'
method: math
log2: x
	"Base-2 log.  CPython guarantees EXACT results for powers of two, which
	a bare ln(x)/ln(2) does not (it drifts to 1023.0000000000001).  An
	integer power of two (one bit set) is highBit-1; a float power of two is
	its binary exponent -- but GemStone's Float>>exponent pins every
	subnormal at -1022, so a small value is first renormalised by 2**52
	(enough to lift the smallest subnormal 2**-1074 into the normal range).
	Non-powers and huge integers keep the natural-log path."

	| f e |
	(x @env0:isKindOf: Integer) ifTrue: [
		x @env0:<= 0 ifTrue: [ValueError ___signal___: 'math domain error'].
		((x @env0:bitAnd: x @env0:- 1) @env0:= 0) ifTrue: [^ (x @env0:highBit @env0:- 1) @env0:asFloat].
		(x @env0:highBit @env0:> 1023) ifTrue: [^ (self @env1:___logHugeInt___: x) @env0:/ (2.0 @env0:ln)].
		^ (self @env1:___naturalLog___: x) @env0:/ (2.0 @env0:ln)].
	f := self @env1:___real___: x.
	((f @env0:> 0.0) and: [f @env0:_isNaN @env0:not and: [(f @env0:_getKind) @env0:~= 3]]) ifTrue: [
		e := f @env0:exponent.
		e @env0:<= -1022 ifTrue: [e := (f @env0:* (2.0 @env0:raisedTo: 52)) @env0:exponent @env0:- 52].
		((2.0 @env0:raisedTo: e) @env0:= f) ifTrue: [^ e @env0:asFloat]].
	^ (self @env1:___naturalLog___: f) @env0:/ (2.0 @env0:ln)
%

category: 'Grail-Exponential and Logarithmic'
method: math
sqrt: x
	| f |
	f := self @env1:___real___: x.
	f @env0:< 0.0 ifTrue: [
		ValueError ___signal___: 'expected a nonnegative input, got ' @env0:, f @env0:printString].
	^ f @env0:sqrt
%

category: 'Grail-Exponential and Logarithmic'
method: math
pow: x _: y
	"math.pow(x, y) -- x raised to the power y (as float).  GemStone's
	raisedTo: already follows C pow() for the inf/nan-input special cases
	(pow(1, NAN)=1, pow(INF, -2)=0, ...) and for finite inputs returns the
	IEEE result -- NaN for a negative base to a non-integer power, inf on
	overflow or 0**negative.  CPython turns those two finite-input outcomes
	into exceptions: a NaN result (out of domain) or an inf from 0**negative
	is a ValueError; an inf from a genuine overflow is an OverflowError."

	| fx fy r |
	fx := self @env1:___real___: x.
	fy := self @env1:___real___: y.
	r := fx @env0:raisedTo: fy.
	((fx @env0:_isNaN @env0:not and: [fx @env0:abs @env0:~= PlusInfinity])
		and: [fy @env0:_isNaN @env0:not and: [fy @env0:abs @env0:~= PlusInfinity]]) ifTrue: [
		r @env0:_isNaN ifTrue: [ValueError ___signal___: 'math domain error'].
		(r @env0:abs @env0:= PlusInfinity) ifTrue: [
			fx @env0:= 0.0
				ifTrue: [ValueError ___signal___: 'math domain error']
				ifFalse: [OverflowError ___signal___: 'math range error']]].
	^ r
%

! ===============================================================================
! Fast-path callables — rounding and integer
! ===============================================================================

category: 'Grail-Rounding'
method: math
___dunderRound___: x selector: dunder default: fallback coerceFloat: coerceFloat
	"ceil/floor/trunc first honour the CORRESPONDING dunder defined on x's
	TYPE -- either a method def (whichClassIncludesSelector) or a class-body
	assignment / descriptor (the metaclass carries an accessor for it, e.g.
	``__ceil__ = BadDescr()'').  An instance attribute of that name is NOT a
	type slot, so it is ignored (CPython).  When a type slot exists, load it
	as an attribute of x -- which fires a descriptor's __get__ (BadDescr
	raises ValueError) -- and call the result.

	With no type slot the two families diverge: ceil/floor (coerceFloat)
	coerce through __float__ and apply the Smalltalk fallback, but trunc
	(NOT coerceFloat) requires __trunc__ -- a bare __float__ is a TypeError,
	so only a genuine Smalltalk Number is truncated."

	(((x @env0:class @env0:whichClassIncludesSelector: dunder environmentId: 1) @env0:~~ nil)
		or: [(x @env0:class @env0:class @env0:whichClassIncludesSelector: dunder environmentId: 1) @env0:~~ nil])
		ifTrue: [^ (x @env1:___pyAttrLoad___: dunder) @env1:value: { } value: nil].
	coerceFloat ifTrue: [^ (self @env1:___real___: x) @env0:perform: fallback].
	(x @env0:isKindOf: Number) ifTrue: [^ x @env0:perform: fallback].
	TypeError ___signal___: ('type '
		@env0:, x @env0:class @env0:name @env0:asString
		@env0:, ' doesn''t define ' @env0:, dunder @env0:asString @env0:, ' method')
%

category: 'Grail-Rounding'
method: math
ceil: x
	^ self @env1:___dunderRound___: x selector: #'__ceil__' default: #ceiling coerceFloat: true
%

category: 'Grail-Rounding'
method: math
floor: x
	^ self @env1:___dunderRound___: x selector: #'__floor__' default: #floor coerceFloat: true
%

category: 'Grail-Rounding'
method: math
trunc: x
	^ self @env1:___dunderRound___: x selector: #'__trunc__' default: #truncated coerceFloat: false
%

category: 'Grail-Rounding'
method: math
factorial: n
	"GemStone caps LargeInteger at ~130k bits (engine limit; CPython's
	ints are unbounded).  Resignal the kernel NumericError as the
	catchable Python OverflowError -- a DELIBERATE deviation
	(test_math's factorial(10**10) huge-input probes)."

	| nInt |
	"factorial requires an exact integer -- a float (even 5.0), Decimal, or
	string is a TypeError, not a silent truncation (testFactorialNonIntegers)."
	nInt := self @env1:___index___: n.
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
	"ldexp(x, i) -> x * 2**i.  i must be an exact integer (a float is a
	TypeError).  A finite x whose scaled result overflows raises
	OverflowError; INF/NAN pass through unchanged."

	| fx ii mag |
	fx := self @env1:___real___: x.
	ii := self @env1:___index___: i.
	(fx @env0:_isNaN or: [(fx @env0:_getKind) @env0:== 3 or: [fx @env0:= 0.0]])
		ifTrue: [^ fx].
	"Inside the representable exponent window, scale as an exact rational and
	round once: a bare fx * 2**ii would FLUSH a subnormal result to zero
	(2**-1126 underflows before the multiply), truncating
	math.ldexp(6993274598585239, -1126).  Outside the window the result can
	only be inf or 0, so the float path is safe -- and it avoids building a
	multi-million-bit 2**ii that would blow GemStone's LargeInteger cap
	(math.ldexp(1.0, 1000000))."
	mag := (ii @env0:abs @env0:<= 1200)
		ifTrue: [ii @env0:>= 0
			ifTrue: [(fx @env0:asFraction @env0:* (2 @env0:raisedTo: ii)) @env0:asFloat]
			ifFalse: [(fx @env0:asFraction @env0:/ (2 @env0:raisedTo: ii @env0:negated)) @env0:asFloat]]
		ifFalse: [fx @env0:* (2.0 @env0:raisedTo: ii)].
	^ self @env1:___rangeCheck___: mag finite: true
%

category: 'Grail-Math Functions'
method: math
___signBit___: f
	"True when f is negative, INCLUDING negative zero (probed via 1/f, whose
	sign survives where f = 0.0 = -0.0 does not)."

	^ (f @env0:< 0.0) or: [f @env0:= 0.0 and: [(1.0 @env0:/ f) @env0:< 0.0]]
%

category: 'Grail-Math Functions'
method: math
fma: x _: y _: z
	"fma(x, y, z) -> the correctly-rounded (single rounding) x*y + z, the
	true fused multiply-add.  GemStone has no FMA primitive, but every finite
	double is an exact Fraction, so a*b + c is computed exactly as a rational
	and rounded once through asFloat (which also carries the sign through an
	underflow to +/-0.0).  IEEE special cases: a NaN input gives NaN; inf*0
	is an invalid operation (ValueError), as is an infinite product added to
	an infinity of the opposite sign; a finite product that overflows the
	float range is an OverflowError; an exact zero result is +0.0 unless both
	the product and c are negative (round-to-nearest)."

	| fa fb fc aInf bInf cInf prodNeg prod r mag |
	fa := self @env1:___real___: x.
	fb := self @env1:___real___: y.
	fc := self @env1:___real___: z.
	(fa @env0:_isNaN or: [fb @env0:_isNaN or: [fc @env0:_isNaN]]) ifTrue: [^ PlusQuietNaN].
	aInf := fa @env0:abs @env0:= PlusInfinity.
	bInf := fb @env0:abs @env0:= PlusInfinity.
	cInf := fc @env0:abs @env0:= PlusInfinity.
	((aInf and: [fb @env0:= 0.0]) or: [bInf and: [fa @env0:= 0.0]]) ifTrue: [
		ValueError ___signal___: 'invalid operation in fma'].
	(aInf or: [bInf]) ifTrue: [
		prodNeg := (self @env1:___signBit___: fa) @env0:~= (self @env1:___signBit___: fb).
		prod := prodNeg ifTrue: [MinusInfinity] ifFalse: [PlusInfinity].
		cInf ifTrue: [
			^ (fc @env0:= prod)
				ifTrue: [prod]
				ifFalse: [ValueError ___signal___: 'invalid operation in fma']].
		^ prod].
	cInf ifTrue: [^ fc].
	r := ((fa @env0:asFraction) @env0:* (fb @env0:asFraction)) @env0:+ (fc @env0:asFraction).
	r @env0:= 0 ifTrue: [
		^ ((self @env1:___signBit___: fa) @env0:~= (self @env1:___signBit___: fb)
			and: [self @env1:___signBit___: fc])
			ifTrue: [0.0 @env0:negated]
			ifFalse: [0.0]].
	mag := r @env0:asFloat.
	(mag @env0:abs @env0:= PlusInfinity) ifTrue: [
		OverflowError ___signal___: 'overflow in fma'].
	^ mag
%

category: 'Grail-Math Functions'
method: math
___fsumCoerce___: item
	"Coerce one fsum element to a Float.  A huge integer beyond the float
	range is an OverflowError (matching float(10**1000)) rather than a
	silent inf; everything else goes through ___real___ (Boolean/Number/
	__float__, TypeError on non-numerics)."

	(item @env0:isKindOf: Integer) ifTrue: [
		| f |
		f := item @env0:asFloat.
		((f @env0:_getKind) @env0:== 3) ifTrue: [
			OverflowError ___signal___: 'int too large to convert to float'].
		^ f].
	^ self @env1:___real___: item
%

category: 'Grail-Math Functions'
method: math
___fsumTotal___: partials
	"Round the non-overlapping partial sums (increasing magnitude) to a
	single correctly-rounded Float.  Combine from the top down until a
	nonzero low word appears, then apply CPython's half-even correction
	using the next-lower partial's sign so ties round to even."

	| n hi lo broke xx yy |
	n := partials @env0:size.
	n @env0:= 0 ifTrue: [^ 0.0].
	hi := partials @env0:at: n. n := n @env0:- 1.
	lo := 0.0.
	broke := false.
	[broke @env0:not and: [n @env0:> 0]] @env0:whileTrue: [
		xx := hi.
		yy := partials @env0:at: n. n := n @env0:- 1.
		hi := xx @env0:+ yy.
		lo := yy @env0:- (hi @env0:- xx).
		lo @env0:~= 0.0 ifTrue: [broke := true]].
	(n @env0:> 0 and: [
		(lo @env0:< 0.0 and: [(partials @env0:at: n) @env0:< 0.0])
			or: [lo @env0:> 0.0 and: [(partials @env0:at: n) @env0:> 0.0]]]) ifTrue: [
		| y2 x2 |
		y2 := lo @env0:* 2.0.
		x2 := hi @env0:+ y2.
		(y2 @env0:= (x2 @env0:- hi)) ifTrue: [hi := x2]].
	^ hi
%

category: 'Grail-Math Functions'
method: math
fsum: iterable
	"Full-precision summation (CPython's math.fsum): Shewchuk's algorithm
	keeps a set of non-overlapping partial sums so the total rounds exactly
	once.  IEEE-754 doubles make the two-sum (hi := x+y; lo := y-(hi-x))
	exact.  inf/nan summands accumulate separately -- inf + -inf is a
	ValueError -- and a finite summand whose partial overflows is an
	OverflowError."

	| partials specialSum infSum i x xsave y hi lo |
	partials := OrderedCollection @env0:new.
	specialSum := 0.0.
	infSum := 0.0.
	(self @env1:___materialize___: iterable) @env0:do: [:item |
		x := self @env1:___fsumCoerce___: item.
		xsave := x.
		i := 0.
		1 @env0:to: partials @env0:size do: [:jj |
			y := partials @env0:at: jj.
			(x @env0:abs @env0:< y @env0:abs) ifTrue: [ | t | t := x. x := y. y := t ].
			hi := x @env0:+ y.
			lo := y @env0:- (hi @env0:- x).
			(lo @env0:~= 0.0) ifTrue: [ i := i @env0:+ 1. partials @env0:at: i put: lo ].
			x := hi ].
		[partials @env0:size @env0:> i] @env0:whileTrue: [ partials @env0:removeLast ].
		(x @env0:~= 0.0) ifTrue: [
			(x @env0:_isNaN or: [(x @env0:_getKind) @env0:== 3])
				ifTrue: [
					(xsave @env0:_isNaN @env0:not and: [(xsave @env0:_getKind) @env0:~= 3])
						ifTrue: [ OverflowError ___signal___: 'intermediate overflow in fsum' ].
					(xsave @env0:_getKind) @env0:== 3 ifTrue: [ infSum := infSum @env0:+ xsave ].
					specialSum := specialSum @env0:+ xsave.
					partials := OrderedCollection @env0:new ]
				ifFalse: [ partials @env0:add: x ] ] ].
	(specialSum @env0:~= 0.0 or: [specialSum @env0:_isNaN]) ifTrue: [
		infSum @env0:_isNaN ifTrue: [ ValueError ___signal___: '-inf + inf in fsum' ].
		^ specialSum ].
	^ self @env1:___fsumTotal___: partials
%

category: 'Grail-Math Functions'
method: math
ulp: x
	"ulp(x) -> spacing between x and the next float.  NaN -> NaN and
	+/-inf -> inf (matching CPython); 0 -> the smallest subnormal;
	otherwise 2**(exponent - 52)."

	| fx |
	fx := (self @env1:___real___: x) @env0:abs.
	fx @env0:_isNaN ifTrue: [^ fx].
	fx @env0:= PlusInfinity ifTrue: [^ PlusInfinity].
	fx @env0:= 0 ifTrue: [^ 5e-324].
	^ 2.0 @env0:raisedTo: (fx @env0:exponent @env0:- 52)
%

category: 'Grail-Math Functions'
method: math
___nextafterStep___: x up: goingUp
	"One representable step from finite nonzero x toward +inf (goingUp) or
	-inf.  The gap AWAY from zero is ulp(x); the gap TOWARD zero is the same
	except just below a normal power of two, where the binade halves it
	(GemStone's exponent pins subnormals at -1022, so the halving is gated on
	a true binary exponent > -1022).  A step landing on zero keeps x's sign;
	a step off the largest normal overflows to the signed infinity."

	| gap e awayFromZero result |
	awayFromZero := (x @env0:> 0.0) @env0:= goingUp.
	awayFromZero
		ifTrue: [gap := self @env1:ulp: x]
		ifFalse: [
			e := x @env0:abs @env0:exponent.
			((x @env0:abs @env0:= (2.0 @env0:raisedTo: e)) and: [e @env0:> -1022])
				ifTrue: [gap := 2.0 @env0:raisedTo: (e @env0:- 53)]
				ifFalse: [gap := self @env1:ulp: x]].
	result := goingUp ifTrue: [x @env0:+ gap] ifFalse: [x @env0:- gap].
	result @env0:= 0.0 ifTrue: [
		^ (self @env1:___signBit___: x) ifTrue: [0.0 @env0:negated] ifFalse: [0.0]].
	^ result
%

category: 'Grail-Math Functions'
method: math
_nextafter: positional kw: kwargs
	"math.nextafter(x, y, *, steps=1) -- the representable value `steps` ULPs
	from x toward y (the steps keyword is 3.12+).  NaN in -> NaN; x == y (so
	also either signed zero to the other) returns y; a negative steps is a
	ValueError.  Stepping from zero yields the smallest subnormal toward y,
	and stepping down off an infinity yields the largest normal."

	| fx fy steps up cur fmax |
	fx := self @env1:___real___: (positional @env0:at: 1).
	fy := self @env1:___real___: (positional @env0:at: 2).
	steps := (kwargs @env0:~~ nil and: [kwargs @env0:includesKey: 'steps'])
		ifTrue: [self @env1:___index___: (kwargs @env0:at: 'steps')]
		ifFalse: [1].
	(fx @env0:_isNaN or: [fy @env0:_isNaN]) ifTrue: [^ PlusQuietNaN].
	steps @env0:< 0 ifTrue: [
		ValueError ___signal___: 'steps must be a non-negative integer'].
	(fx @env0:= fy) ifTrue: [^ fy].
	steps @env0:= 0 ifTrue: [^ fx].
	up := fy @env0:> fx.
	fmax := ((2 @env0:raisedTo: 53) @env0:- 1) @env0:* (2 @env0:raisedTo: 971).
	fmax := fmax @env0:asFloat.
	cur := fx.
	1 @env0:to: steps do: [:i |
		(cur @env0:= fy) ifTrue: [^ fy].
		(cur @env0:abs @env0:= PlusInfinity)
			ifTrue: [cur := (self @env1:___signBit___: cur) ifTrue: [fmax @env0:negated] ifFalse: [fmax]]
			ifFalse: [
				(cur @env0:= 0.0)
					ifTrue: [cur := up ifTrue: [5e-324] ifFalse: [5e-324 @env0:negated]]
					ifFalse: [cur := self @env1:___nextafterStep___: cur up: up]]].
	^ cur
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
		ValueError ___signal___: 'expected a noninteger or positive integer, got '
			@env0:, f @env0:printString].
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
	"NaN propagates; an infinite x or a zero y is a domain error."
	(fx @env0:_isNaN or: [fy @env0:_isNaN]) ifTrue: [^ fx @env0:+ fy].
	((fx @env0:_getKind) @env0:== 3 or: [fy @env0:= 0.0]) ifTrue: [
		ValueError ___signal___: 'math domain error'].
	"fmod(x, +/-inf) is x for finite x."
	(fy @env0:_getKind) @env0:== 3 ifTrue: [^ fx].
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
