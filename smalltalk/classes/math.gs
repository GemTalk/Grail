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

category: 'Python-Singleton'
classmethod: math
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for math module'
%

category: 'Python-Singleton'
classmethod: math
instance
	"Return the singleton instance of math.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance initialize
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: math
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

! ------------------- Instance methods for math

category: 'Python-Initialization'
method: math
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_pi;
		initialize_e;
		initialize_tau;
		initialize_inf;
		initialize_nan;
		initialize_sqrt;
		initialize_pow;
		initialize_exp;
		initialize_log;
		initialize_logWithBase;
		initialize_log10;
		initialize_log2;
		initialize_sin;
		initialize_cos;
		initialize_tan;
		initialize_asin;
		initialize_acos;
		initialize_atan;
		initialize_atan2;
		initialize_sinh;
		initialize_cosh;
		initialize_tanh;
		initialize_asinh;
		initialize_acosh;
		initialize_atanh;
		initialize_ceil;
		initialize_floor;
		initialize_trunc;
		initialize_factorial;
		initialize_gcd;
		initialize_lcm;
		initialize_fabs;
		initialize_isnan;
		initialize_isinf;
		initialize_isfinite;
		initialize_degrees;
		initialize_radians;
		yourself
%

category: 'Python-Initialization'
method: math
initialize_pi
	"The mathematical constant π = 3.141592..."
	pi := Float perform: #pi env: 0
%

category: 'Python-Initialization'
method: math
initialize_e
	"The mathematical constant e = 2.718281..."
	e := Float perform: #e env: 0
%

category: 'Python-Initialization'
method: math
initialize_tau
	"The mathematical constant τ = 2π = 6.283185..."
	tau := (Float perform: #pi env: 0) ___times___: 2
%

category: 'Python-Initialization'
method: math
initialize_inf
	"Positive infinity"
	inf := PlusInfinity
%

category: 'Python-Initialization'
method: math
initialize_nan
	"Not a number (NaN)"
	nan := PlusQuietNaN
%

category: 'Python-Initialization'
method: math
initialize_sqrt
	"Return the square root of x"
	sqrt := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___sqrt___
	]
%

category: 'Python-Initialization'
method: math
initialize_pow
	"Return x raised to the power y"
	pow := [:positional :keywords |
		| x y xFloat yFloat |
		x := positional ___at___: 1.
		y := positional ___at___: 2.
		xFloat := x ___asFloat___.
		yFloat := y ___asFloat___.
		xFloat ___raisedTo___: yFloat
	]
%

category: 'Python-Initialization'
method: math
initialize_exp
	"Return e raised to the power x"
	exp := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #exp env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_log
	"Return the natural logarithm of x (base e)"
	log := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___ln___
	]
%

category: 'Python-Initialization'
method: math
initialize_logWithBase
	"Return the logarithm of x to the given base"
	logWithBase := [:positional :keywords |
		| x base lnX lnBase |
		x := positional ___at___: 1.
		base := positional ___at___: 2.
		lnX := x ___ln___.
		lnBase := base ___ln___.
		lnX ___divide___: lnBase
	]
%

category: 'Python-Initialization'
method: math
initialize_log10
	"Return the base-10 logarithm of x"
	log10 := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		(x ___asFloat___) perform: #log10 env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_log2
	"Return the base-2 logarithm of x"
	log2 := [:positional :keywords |
		| x ln2 |
		x := positional ___at___: 1.
		ln2 := 2 ___ln___.
		(x ___ln___) ___divide___: ln2
	]
%

category: 'Python-Initialization'
method: math
initialize_sin
	"Return the sine of x (in radians)"
	sin := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___sin___
	]
%

category: 'Python-Initialization'
method: math
initialize_cos
	"Return the cosine of x (in radians)"
	cos := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___cos___
	]
%

category: 'Python-Initialization'
method: math
initialize_tan
	"Return the tangent of x (in radians)"
	tan := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #tan env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_asin
	"Return the arc sine of x (in radians)"
	asin := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcSin env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_acos
	"Return the arc cosine of x (in radians)"
	acos := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcCos env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_atan
	"Return the arc tangent of x (in radians)"
	atan := [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcTan env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_atan2
	"Return atan(y / x) in radians, with correct quadrant"
	atan2 := [:positional :keywords |
		| y x yFloat xFloat |
		y := positional ___at___: 1.
		x := positional ___at___: 2.
		yFloat := y ___asFloat___.
		xFloat := x ___asFloat___.
		yFloat perform: #arcTan2: env: 0 withArguments: {xFloat}
	]
%

category: 'Python-Initialization'
method: math
initialize_sinh
	"Return the hyperbolic sine of x"
	sinh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #sinh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_cosh
	"Return the hyperbolic cosine of x"
	cosh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #cosh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_tanh
	"Return the hyperbolic tangent of x"
	tanh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #tanh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_asinh
	"Return the inverse hyperbolic sine of x"
	asinh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #arcSinh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_acosh
	"Return the inverse hyperbolic cosine of x"
	acosh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #arcCosh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_atanh
	"Return the inverse hyperbolic tangent of x"
	atanh := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #arcTanh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_ceil
	"Return the ceiling of x (smallest integer >= x)"
	ceil := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #ceiling env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_floor
	"Return the floor of x (largest integer <= x)"
	floor := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #floor env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_trunc
	"Return x truncated to an integer"
	trunc := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat ___truncated___
	]
%

category: 'Python-Initialization'
method: math
initialize_factorial
	"Return n factorial (n!)"
	factorial := [:positional :keywords |
		| n nInt |
		n := positional ___at___: 1.
		nInt := n ___asInteger___.
		(nInt ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'factorial() not defined for negative values'
		].
		nInt perform: #factorial env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_gcd
	"Return the greatest common divisor of a and b"
	gcd := [:positional :keywords |
		| a b aInt bInt |
		a := positional ___at___: 1.
		b := positional ___at___: 2.
		aInt := a ___asInteger___.
		bInt := b ___asInteger___.
		aInt perform: #gcd: env: 0 withArguments: {bInt}
	]
%

category: 'Python-Initialization'
method: math
initialize_lcm
	"Return the least common multiple of a and b"
	lcm := [:positional :keywords |
		| a b aInt bInt |
		a := positional ___at___: 1.
		b := positional ___at___: 2.
		aInt := a ___asInteger___.
		bInt := b ___asInteger___.
		aInt perform: #lcm: env: 0 withArguments: {bInt}
	]
%

category: 'Python-Initialization'
method: math
initialize_fabs
	"Return the absolute value of x as a float"
	fabs := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat ___abs___
	]
%

category: 'Python-Initialization'
method: math
initialize_isnan
	"Return True if x is NaN"
	isnan := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #_isNaN env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_isinf
	"Return True if x is positive or negative infinity"
	isinf := [:positional :keywords |
		| x xFloat kind |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		kind := xFloat perform: #_getKind env: 0.
		kind ___eq___: 3
	]
%

category: 'Python-Initialization'
method: math
initialize_isfinite
	"Return True if x is neither infinity nor NaN"
	isfinite := [:positional :keywords |
		| x xFloat kind |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		kind := xFloat perform: #_getKind env: 0.
		"kind: 1=normal, 2=subnormal, 3=infinity, 4=zero, 5=signaling NaN, 6=quiet NaN"
		(kind ___le___: 2) or: [kind ___eq___: 4]
	]
%

category: 'Python-Initialization'
method: math
initialize_degrees
	"Convert angle x from radians to degrees"
	degrees := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #radiansToDegrees env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_radians
	"Convert angle x from degrees to radians"
	radians := [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #degreesToRadians env: 0
	]
%

category: 'Python-Mathematical Constants'
method: math
pi
	"The mathematical constant π = 3.141592..."
	^ pi
%

category: 'Python-Mathematical Constants'
method: math
pi: aValue
	"Set the pi constant (for monkey patching)"
	pi := aValue
%

category: 'Python-Mathematical Constants'
method: math
e
	"The mathematical constant e = 2.718281..."
	^ e
%

category: 'Python-Mathematical Constants'
method: math
e: aValue
	"Set the e constant (for monkey patching)"
	e := aValue
%

category: 'Python-Mathematical Constants'
method: math
tau
	"The mathematical constant τ = 2π = 6.283185..."
	^ tau
%

category: 'Python-Mathematical Constants'
method: math
tau: aValue
	"Set the tau constant (for monkey patching)"
	tau := aValue
%

category: 'Python-Mathematical Constants'
method: math
inf
	"Positive infinity"
	^ inf
%

category: 'Python-Mathematical Constants'
method: math
inf: aValue
	"Set the inf constant (for monkey patching)"
	inf := aValue
%

category: 'Python-Mathematical Constants'
method: math
nan
	"Not a number (NaN)"
	^ nan
%

category: 'Python-Mathematical Constants'
method: math
nan: aValue
	"Set the nan constant (for monkey patching)"
	nan := aValue
%

category: 'Python-Power and Logarithmic Functions'
method: math
sqrt
	"Return the square root function"
	^ sqrt
%

category: 'Python-Power and Logarithmic Functions'
method: math
sqrt: aBlock
	"Set the sqrt function (for monkey patching)"
	sqrt := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
pow
	"Return the pow function"
	^ pow
%

category: 'Python-Power and Logarithmic Functions'
method: math
pow: aBlock
	"Set the pow function (for monkey patching)"
	pow := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
exp
	"Return the exp function"
	^ exp
%

category: 'Python-Power and Logarithmic Functions'
method: math
exp: aBlock
	"Set the exp function (for monkey patching)"
	exp := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log
	"Return the log function"
	^ log
%

category: 'Python-Power and Logarithmic Functions'
method: math
log: aBlock
	"Set the log function (for monkey patching)"
	log := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
logWithBase
	"Return the logWithBase function"
	^ logWithBase
%

category: 'Python-Power and Logarithmic Functions'
method: math
logWithBase: aBlock
	"Set the logWithBase function (for monkey patching)"
	logWithBase := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log10
	"Return the log10 function"
	^ log10
%

category: 'Python-Power and Logarithmic Functions'
method: math
log10: aBlock
	"Set the log10 function (for monkey patching)"
	log10 := aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log2
	"Return the log2 function"
	^ log2
%

category: 'Python-Power and Logarithmic Functions'
method: math
log2: aBlock
	"Set the log2 function (for monkey patching)"
	log2 := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
sin
	"Return the sin function"
	^ sin
%

category: 'Python-Trigonometric Functions'
method: math
sin: aBlock
	"Set the sin function (for monkey patching)"
	sin := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
cos
	"Return the cos function"
	^ cos
%

category: 'Python-Trigonometric Functions'
method: math
cos: aBlock
	"Set the cos function (for monkey patching)"
	cos := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
tan
	"Return the tan function"
	^ tan
%

category: 'Python-Trigonometric Functions'
method: math
tan: aBlock
	"Set the tan function (for monkey patching)"
	tan := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
asin
	"Return the asin function"
	^ asin
%

category: 'Python-Trigonometric Functions'
method: math
asin: aBlock
	"Set the asin function (for monkey patching)"
	asin := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
acos
	"Return the acos function"
	^ acos
%

category: 'Python-Trigonometric Functions'
method: math
acos: aBlock
	"Set the acos function (for monkey patching)"
	acos := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
atan
	"Return the atan function"
	^ atan
%

category: 'Python-Trigonometric Functions'
method: math
atan: aBlock
	"Set the atan function (for monkey patching)"
	atan := aBlock
%

category: 'Python-Trigonometric Functions'
method: math
atan2
	"Return the atan2 function"
	^ atan2
%

category: 'Python-Trigonometric Functions'
method: math
atan2: aBlock
	"Set the atan2 function (for monkey patching)"
	atan2 := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
sinh
	"Return the sinh function"
	^ sinh
%

category: 'Python-Hyperbolic Functions'
method: math
sinh: aBlock
	"Set the sinh function (for monkey patching)"
	sinh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
cosh
	"Return the cosh function"
	^ cosh
%

category: 'Python-Hyperbolic Functions'
method: math
cosh: aBlock
	"Set the cosh function (for monkey patching)"
	cosh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
tanh
	"Return the tanh function"
	^ tanh
%

category: 'Python-Hyperbolic Functions'
method: math
tanh: aBlock
	"Set the tanh function (for monkey patching)"
	tanh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
asinh
	"Return the asinh function"
	^ asinh
%

category: 'Python-Hyperbolic Functions'
method: math
asinh: aBlock
	"Set the asinh function (for monkey patching)"
	asinh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
acosh
	"Return the acosh function"
	^ acosh
%

category: 'Python-Hyperbolic Functions'
method: math
acosh: aBlock
	"Set the acosh function (for monkey patching)"
	acosh := aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
atanh
	"Return the atanh function"
	^ atanh
%

category: 'Python-Hyperbolic Functions'
method: math
atanh: aBlock
	"Set the atanh function (for monkey patching)"
	atanh := aBlock
%

category: 'Python-Rounding Functions'
method: math
ceil
	"Return the ceil function"
	^ ceil
%

category: 'Python-Rounding Functions'
method: math
ceil: aBlock
	"Set the ceil function (for monkey patching)"
	ceil := aBlock
%

category: 'Python-Rounding Functions'
method: math
floor
	"Return the floor function"
	^ floor
%

category: 'Python-Rounding Functions'
method: math
floor: aBlock
	"Set the floor function (for monkey patching)"
	floor := aBlock
%

category: 'Python-Rounding Functions'
method: math
trunc
	"Return the trunc function"
	^ trunc
%

category: 'Python-Rounding Functions'
method: math
trunc: aBlock
	"Set the trunc function (for monkey patching)"
	trunc := aBlock
%

category: 'Python-Number Theory Functions'
method: math
factorial
	"Return the factorial function"
	^ factorial
%

category: 'Python-Number Theory Functions'
method: math
factorial: aBlock
	"Set the factorial function (for monkey patching)"
	factorial := aBlock
%

category: 'Python-Number Theory Functions'
method: math
gcd
	"Return the gcd function"
	^ gcd
%

category: 'Python-Number Theory Functions'
method: math
gcd: aBlock
	"Set the gcd function (for monkey patching)"
	gcd := aBlock
%

category: 'Python-Number Theory Functions'
method: math
lcm
	"Return the lcm function"
	^ lcm
%

category: 'Python-Number Theory Functions'
method: math
lcm: aBlock
	"Set the lcm function (for monkey patching)"
	lcm := aBlock
%

category: 'Python-Floating Point Functions'
method: math
fabs
	"Return the fabs function"
	^ fabs
%

category: 'Python-Floating Point Functions'
method: math
fabs: aBlock
	"Set the fabs function (for monkey patching)"
	fabs := aBlock
%

category: 'Python-Floating Point Functions'
method: math
isnan
	"Return the isnan function"
	^ isnan
%

category: 'Python-Floating Point Functions'
method: math
isnan: aBlock
	"Set the isnan function (for monkey patching)"
	isnan := aBlock
%

category: 'Python-Floating Point Functions'
method: math
isinf
	"Return the isinf function"
	^ isinf
%

category: 'Python-Floating Point Functions'
method: math
isinf: aBlock
	"Set the isinf function (for monkey patching)"
	isinf := aBlock
%

category: 'Python-Floating Point Functions'
method: math
isfinite
	"Return the isfinite function"
	^ isfinite
%

category: 'Python-Floating Point Functions'
method: math
isfinite: aBlock
	"Set the isfinite function (for monkey patching)"
	isfinite := aBlock
%

category: 'Python-Angular Conversion'
method: math
degrees
	"Return the degrees function"
	^ degrees
%

category: 'Python-Angular Conversion'
method: math
degrees: aBlock
	"Set the degrees function (for monkey patching)"
	degrees := aBlock
%

category: 'Python-Angular Conversion'
method: math
radians
	"Return the radians function"
	^ radians
%

category: 'Python-Angular Conversion'
method: math
radians: aBlock
	"Set the radians function (for monkey patching)"
	radians := aBlock
%

set compile_env: 0
