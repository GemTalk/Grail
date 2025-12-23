! ===============================================================================
! math Module (Python 'math' module)
! ===============================================================================
! This file contains the Python math module implementation.
! The math module provides mathematical functions and constants.
! ===============================================================================

! ------------------- Remove existing Python methods from math
expectvalue /Metaclass3
doit
math removeAllMethods: 2.
math class removeAllMethods: 2.
%

set compile_env: 2
! ------------------- Class methods for math
! ------------------- Instance methods for math

category: 'Python-Mathematical Constants'
method: math
pi
	"The mathematical constant π = 3.141592..."
	^ Float perform: #pi env: 0
%

category: 'Python-Mathematical Constants'
method: math
e
	"The mathematical constant e = 2.718281..."
	^ Float perform: #e env: 0
%

category: 'Python-Mathematical Constants'
method: math
tau
	"The mathematical constant τ = 2π = 6.283185..."
	^ (Float perform: #pi env: 0) perform: #* env: 0 withArguments: {2}
%

category: 'Python-Mathematical Constants'
method: math
inf
	"Positive infinity"
	^ PlusInfinity
%

category: 'Python-Mathematical Constants'
method: math
nan
	"Not a number (NaN)"
	^ PlusQuietNaN
%

category: 'Python-Power and Logarithmic Functions'
method: math
sqrt: x
	"Return the square root of x"
	^ x perform: #sqrt env: 0
%

category: 'Python-Power and Logarithmic Functions'
method: math
pow: x _: y
	"Return x raised to the power y"
	| xFloat yFloat |
	xFloat := x perform: #asFloat env: 0.
	yFloat := y perform: #asFloat env: 0.
	^ xFloat perform: #raisedTo: env: 0 withArguments: {yFloat}
%

category: 'Python-Power and Logarithmic Functions'
method: math
exp: x
	"Return e raised to the power x"
	^ x perform: #exp env: 0
%

category: 'Python-Power and Logarithmic Functions'
method: math
log: x
	"Return the natural logarithm of x (base e)"
	^ x perform: #ln env: 0
%

category: 'Python-Power and Logarithmic Functions'
method: math
log: x _: base
	"Return the logarithm of x to the given base"
	| lnX lnBase |
	lnX := x perform: #ln env: 0.
	lnBase := base perform: #ln env: 0.
	^ lnX perform: #/ env: 0 withArguments: {lnBase}
%

category: 'Python-Power and Logarithmic Functions'
method: math
log10: x
	"Return the base-10 logarithm of x"
	^ (x perform: #asFloat env: 0) perform: #log10 env: 0
%

category: 'Python-Power and Logarithmic Functions'
method: math
log2: x
	"Return the base-2 logarithm of x"
	| ln2 |
	ln2 := 2 perform: #ln env: 0.
	^ (x perform: #ln env: 0) perform: #/ env: 0 withArguments: {ln2}
%

category: 'Python-Trigonometric Functions'
method: math
sin: x
	"Return the sine of x (in radians)"
	^ x perform: #sin env: 0
%

category: 'Python-Trigonometric Functions'
method: math
cos: x
	"Return the cosine of x (in radians)"
	^ x perform: #cos env: 0
%

category: 'Python-Trigonometric Functions'
method: math
tan: x
	"Return the tangent of x (in radians)"
	^ x perform: #tan env: 0
%

category: 'Python-Trigonometric Functions'
method: math
asin: x
	"Return the arc sine of x (in radians)"
	^ x perform: #arcSin env: 0
%

category: 'Python-Trigonometric Functions'
method: math
acos: x
	"Return the arc cosine of x (in radians)"
	^ x perform: #arcCos env: 0
%

category: 'Python-Trigonometric Functions'
method: math
atan: x
	"Return the arc tangent of x (in radians)"
	^ x perform: #arcTan env: 0
%

category: 'Python-Trigonometric Functions'
method: math
atan2: y _: x
	"Return atan(y / x) in radians, with correct quadrant"
	| yFloat xFloat |
	yFloat := y perform: #asFloat env: 0.
	xFloat := x perform: #asFloat env: 0.
	^ yFloat perform: #arcTan2: env: 0 withArguments: {xFloat}
%

category: 'Python-Hyperbolic Functions'
method: math
sinh: x
	"Return the hyperbolic sine of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #sinh env: 0
%

category: 'Python-Hyperbolic Functions'
method: math
cosh: x
	"Return the hyperbolic cosine of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #cosh env: 0
%

category: 'Python-Hyperbolic Functions'
method: math
tanh: x
	"Return the hyperbolic tangent of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #tanh env: 0
%

category: 'Python-Hyperbolic Functions'
method: math
asinh: x
	"Return the inverse hyperbolic sine of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #arcSinh env: 0
%

category: 'Python-Hyperbolic Functions'
method: math
acosh: x
	"Return the inverse hyperbolic cosine of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #arcCosh env: 0
%

category: 'Python-Hyperbolic Functions'
method: math
atanh: x
	"Return the inverse hyperbolic tangent of x"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #arcTanh env: 0
%

category: 'Python-Rounding Functions'
method: math
ceil: x
	"Return the ceiling of x (smallest integer >= x)"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #ceiling env: 0
%

category: 'Python-Rounding Functions'
method: math
floor: x
	"Return the floor of x (largest integer <= x)"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #floor env: 0
%

category: 'Python-Rounding Functions'
method: math
trunc: x
	"Return x truncated to an integer"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #truncated env: 0
%

category: 'Python-Number Theory Functions'
method: math
factorial: n
	"Return n factorial (n!)"
	| nInt |
	nInt := n perform: #asInteger env: 0.
	(nInt perform: #< env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'factorial() not defined for negative values'}
	].
	^ nInt perform: #factorial env: 0
%

category: 'Python-Number Theory Functions'
method: math
gcd: a _: b
	"Return the greatest common divisor of a and b"
	| aInt bInt |
	aInt := a perform: #asInteger env: 0.
	bInt := b perform: #asInteger env: 0.
	^ aInt perform: #gcd: env: 0 withArguments: {bInt}
%

category: 'Python-Number Theory Functions'
method: math
lcm: a _: b
	"Return the least common multiple of a and b"
	| aInt bInt |
	aInt := a perform: #asInteger env: 0.
	bInt := b perform: #asInteger env: 0.
	^ aInt perform: #lcm: env: 0 withArguments: {bInt}
%

category: 'Python-Floating Point Functions'
method: math
fabs: x
	"Return the absolute value of x as a float"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #abs env: 0
%

category: 'Python-Floating Point Functions'
method: math
isnan: x
	"Return True if x is NaN"
	| xFloat result |
	xFloat := x perform: #asFloat env: 0.
	result := xFloat perform: #_isNaN env: 0.
	^ result ifTrue: [true] ifFalse: [false]
%

category: 'Python-Floating Point Functions'
method: math
isinf: x
	"Return True if x is positive or negative infinity"
	| xFloat kind |
	xFloat := x perform: #asFloat env: 0.
	kind := xFloat perform: #_getKind env: 0.
	^ (kind perform: #= env: 0 withArguments: {3}) ifTrue: [true] ifFalse: [false]
%

category: 'Python-Floating Point Functions'
method: math
isfinite: x
	"Return True if x is neither infinity nor NaN"
	| xFloat kind |
	xFloat := x perform: #asFloat env: 0.
	kind := xFloat perform: #_getKind env: 0.
	"kind: 1=normal, 2=subnormal, 3=infinity, 4=zero, 5=signaling NaN, 6=quiet NaN"
	^ ((kind perform: #<= env: 0 withArguments: {2}) or: [kind perform: #= env: 0 withArguments: {4}])
		ifTrue: [true] ifFalse: [false]
%

category: 'Python-Angular Conversion'
method: math
degrees: x
	"Convert angle x from radians to degrees"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #radiansToDegrees env: 0
%

category: 'Python-Angular Conversion'
method: math
radians: x
	"Convert angle x from degrees to radians"
	| xFloat |
	xFloat := x perform: #asFloat env: 0.
	^ xFloat perform: #degreesToRadians env: 0
%

set compile_env: 0

