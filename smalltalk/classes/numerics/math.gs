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

This class provides access to mathematical functions and constants.
Each method in this class corresponds to a Python math module function.

See https://docs.python.org/3/library/math.html for the complete list.
'
%

expectvalue /Class
doit
math category: 'Modules'
%

! ===============================================================================
! math Module (Python 'math' module)
! ===============================================================================
! This file contains the Python math module implementation.
! The math module provides mathematical functions and constants.
! ===============================================================================

! ------------------- Remove existing Python methods from math
expectvalue /Metaclass3
doit
math removeAllMethods: 1.
math class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Trigonometric Functions'
method: math
acos
	"Return the acos function"
	^ self ___at___: #acos
%

category: 'Python-Trigonometric Functions'
method: math
acos: aBlock
	"Set the acos function (for monkey patching)"
	self ___at___: #acos put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
acosh
	"Return the acosh function"
	^ self ___at___: #acosh
%

category: 'Python-Hyperbolic Functions'
method: math
acosh: aBlock
	"Set the acosh function (for monkey patching)"
	self ___at___: #acosh put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
asin
	"Return the asin function"
	^ self ___at___: #asin
%

category: 'Python-Trigonometric Functions'
method: math
asin: aBlock
	"Set the asin function (for monkey patching)"
	self ___at___: #asin put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
asinh
	"Return the asinh function"
	^ self ___at___: #asinh
%

category: 'Python-Hyperbolic Functions'
method: math
asinh: aBlock
	"Set the asinh function (for monkey patching)"
	self ___at___: #asinh put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
atan
	"Return the atan function"
	^ self ___at___: #atan
%

category: 'Python-Trigonometric Functions'
method: math
atan2
	"Return the atan2 function"
	^ self ___at___: #atan2
%

category: 'Python-Trigonometric Functions'
method: math
atan2: aBlock
	"Set the atan2 function (for monkey patching)"
	self ___at___: #atan2 put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
atan: aBlock
	"Set the atan function (for monkey patching)"
	self ___at___: #atan put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
atanh
	"Return the atanh function"
	^ self ___at___: #atanh
%

category: 'Python-Hyperbolic Functions'
method: math
atanh: aBlock
	"Set the atanh function (for monkey patching)"
	self ___at___: #atanh put: aBlock
%

category: 'Python-Rounding Functions'
method: math
ceil
	"Return the ceil function"
	^ self ___at___: #ceil
%

category: 'Python-Rounding Functions'
method: math
ceil: aBlock
	"Set the ceil function (for monkey patching)"
	self ___at___: #ceil put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
cos
	"Return the cos function"
	^ self ___at___: #cos
%

category: 'Python-Trigonometric Functions'
method: math
cos: aBlock
	"Set the cos function (for monkey patching)"
	self ___at___: #cos put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
cosh
	"Return the cosh function"
	^ self ___at___: #cosh
%

category: 'Python-Hyperbolic Functions'
method: math
cosh: aBlock
	"Set the cosh function (for monkey patching)"
	self ___at___: #cosh put: aBlock
%

category: 'Python-Angular Conversion'
method: math
degrees
	"Return the degrees function"
	^ self ___at___: #degrees
%

category: 'Python-Angular Conversion'
method: math
degrees: aBlock
	"Set the degrees function (for monkey patching)"
	self ___at___: #degrees put: aBlock
%

category: 'Python-Mathematical Constants'
method: math
e
	"The mathematical constant e = 2.718281..."
	^ self ___at___: #e
%

category: 'Python-Mathematical Constants'
method: math
e: aValue
	"Set the e constant (for monkey patching)"
	self ___at___: #e put: aValue
%

category: 'Python-Power and Logarithmic Functions'
method: math
exp
	"Return the exp function"
	^ self ___at___: #exp
%

category: 'Python-Power and Logarithmic Functions'
method: math
exp: aBlock
	"Set the exp function (for monkey patching)"
	self ___at___: #exp put: aBlock
%

category: 'Python-Floating Point Functions'
method: math
fabs
	"Return the fabs function"
	^ self ___at___: #fabs
%

category: 'Python-Floating Point Functions'
method: math
fabs: aBlock
	"Set the fabs function (for monkey patching)"
	self ___at___: #fabs put: aBlock
%

category: 'Python-Number Theory Functions'
method: math
factorial
	"Return the factorial function"
	^ self ___at___: #factorial
%

category: 'Python-Number Theory Functions'
method: math
factorial: aBlock
	"Set the factorial function (for monkey patching)"
	self ___at___: #factorial put: aBlock
%

category: 'Python-Rounding Functions'
method: math
floor
	"Return the floor function"
	^ self ___at___: #floor
%

category: 'Python-Rounding Functions'
method: math
floor: aBlock
	"Set the floor function (for monkey patching)"
	self ___at___: #floor put: aBlock
%

category: 'Python-Number Theory Functions'
method: math
gcd
	"Return the gcd function"
	^ self ___at___: #gcd
%

category: 'Python-Number Theory Functions'
method: math
gcd: aBlock
	"Set the gcd function (for monkey patching)"
	self ___at___: #gcd put: aBlock
%

category: 'Python-Mathematical Constants'
method: math
inf
	"Positive infinity"
	^ self ___at___: #inf
%

category: 'Python-Mathematical Constants'
method: math
inf: aValue
	"Set the inf constant (for monkey patching)"
	self ___at___: #inf put: aValue
%

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
initialize_acos
	"Return the arc cosine of x (in radians)"
	self ___at___: #acos put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcCos env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_acosh
	"Return the inverse hyperbolic cosine of x"
	self ___at___: #acosh put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #arcCosh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_asin
	"Return the arc sine of x (in radians)"
	self ___at___: #asin put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcSin env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_asinh
	"Return the inverse hyperbolic sine of x"
	self ___at___: #asinh put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #arcSinh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_atan
	"Return the arc tangent of x (in radians)"
	self ___at___: #atan put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #arcTan env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_atan2
	"Return atan(y / x) in radians, with correct quadrant"
	self ___at___: #atan2 put: [:positional :keywords |
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
initialize_atanh
	"Return the inverse hyperbolic tangent of x"
	self ___at___: #atanh put: [:positional :keywords |
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
	self ___at___: #ceil put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #ceiling env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_cos
	"Return the cosine of x (in radians)"
	self ___at___: #cos put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___cos___
	]
%

category: 'Python-Initialization'
method: math
initialize_cosh
	"Return the hyperbolic cosine of x"
	self ___at___: #cosh put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #cosh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_degrees
	"Convert angle x from radians to degrees"
	self ___at___: #degrees put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #radiansToDegrees env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_e
	"The mathematical constant e = 2.718281..."
	self ___at___: #e put: (Float perform: #e env: 0)
%

category: 'Python-Initialization'
method: math
initialize_exp
	"Return e raised to the power x"
	self ___at___: #exp put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #exp env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_fabs
	"Return the absolute value of x as a float"
	self ___at___: #fabs put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat ___abs___
	]
%

category: 'Python-Initialization'
method: math
initialize_factorial
	"Return n factorial (n!)"
	self ___at___: #factorial put: [:positional :keywords |
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
initialize_floor
	"Return the floor of x (largest integer <= x)"
	self ___at___: #floor put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #floor env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_gcd
	"Return the greatest common divisor of a and b"
	self ___at___: #gcd put: [:positional :keywords |
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
initialize_inf
	"Positive infinity"
	self ___at___: #inf put: PlusInfinity
%

category: 'Python-Initialization'
method: math
initialize_isfinite
	"Return True if x is neither infinity nor NaN"
	self ___at___: #isfinite put: [:positional :keywords |
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
initialize_isinf
	"Return True if x is positive or negative infinity"
	self ___at___: #isinf put: [:positional :keywords |
		| x xFloat kind |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		kind := xFloat perform: #_getKind env: 0.
		kind ___eq___: 3
	]
%

category: 'Python-Initialization'
method: math
initialize_isnan
	"Return True if x is NaN"
	self ___at___: #isnan put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #_isNaN env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_lcm
	"Return the least common multiple of a and b"
	self ___at___: #lcm put: [:positional :keywords |
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
initialize_log
	"Return the natural logarithm of x (base e)"
	self ___at___: #log put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___ln___
	]
%

category: 'Python-Initialization'
method: math
initialize_log10
	"Return the base-10 logarithm of x"
	self ___at___: #log10 put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		(x ___asFloat___) perform: #log10 env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_log2
	"Return the base-2 logarithm of x"
	self ___at___: #log2 put: [:positional :keywords |
		| x ln2 |
		x := positional ___at___: 1.
		ln2 := 2 ___ln___.
		(x ___ln___) ___divide___: ln2
	]
%

category: 'Python-Initialization'
method: math
initialize_logWithBase
	"Return the logarithm of x to the given base"
	self ___at___: #logWithBase put: [:positional :keywords |
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
initialize_nan
	"Not a number (NaN)"
	self ___at___: #nan put: PlusQuietNaN
%

category: 'Python-Initialization'
method: math
initialize_pi
	"The mathematical constant π = 3.141592..."
	self ___at___: #pi put: (Float perform: #pi env: 0)
%

category: 'Python-Initialization'
method: math
initialize_pow
	"Return x raised to the power y"
	self ___at___: #pow put: [:positional :keywords |
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
initialize_radians
	"Convert angle x from degrees to radians"
	self ___at___: #radians put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #degreesToRadians env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_sin
	"Return the sine of x (in radians)"
	self ___at___: #sin put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___sin___
	]
%

category: 'Python-Initialization'
method: math
initialize_sinh
	"Return the hyperbolic sine of x"
	self ___at___: #sinh put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #sinh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_sqrt
	"Return the square root of x"
	self ___at___: #sqrt put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x ___sqrt___
	]
%

category: 'Python-Initialization'
method: math
initialize_tan
	"Return the tangent of x (in radians)"
	self ___at___: #tan put: [:positional :keywords |
		| x |
		x := positional ___at___: 1.
		x perform: #tan env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_tanh
	"Return the hyperbolic tangent of x"
	self ___at___: #tanh put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat perform: #tanh env: 0
	]
%

category: 'Python-Initialization'
method: math
initialize_tau
	"The mathematical constant τ = 2π = 6.283185..."
	self ___at___: #tau put: ((Float perform: #pi env: 0) ___times___: 2)
%

category: 'Python-Initialization'
method: math
initialize_trunc
	"Return x truncated to an integer"
	self ___at___: #trunc put: [:positional :keywords |
		| x xFloat |
		x := positional ___at___: 1.
		xFloat := x ___asFloat___.
		xFloat ___truncated___
	]
%

category: 'Python-Floating Point Functions'
method: math
isfinite
	"Return the isfinite function"
	^ self ___at___: #isfinite
%

category: 'Python-Floating Point Functions'
method: math
isfinite: aBlock
	"Set the isfinite function (for monkey patching)"
	self ___at___: #isfinite put: aBlock
%

category: 'Python-Floating Point Functions'
method: math
isinf
	"Return the isinf function"
	^ self ___at___: #isinf
%

category: 'Python-Floating Point Functions'
method: math
isinf: aBlock
	"Set the isinf function (for monkey patching)"
	self ___at___: #isinf put: aBlock
%

category: 'Python-Floating Point Functions'
method: math
isnan
	"Return the isnan function"
	^ self ___at___: #isnan
%

category: 'Python-Floating Point Functions'
method: math
isnan: aBlock
	"Set the isnan function (for monkey patching)"
	self ___at___: #isnan put: aBlock
%

category: 'Python-Number Theory Functions'
method: math
lcm
	"Return the lcm function"
	^ self ___at___: #lcm
%

category: 'Python-Number Theory Functions'
method: math
lcm: aBlock
	"Set the lcm function (for monkey patching)"
	self ___at___: #lcm put: aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log
	"Return the log function"
	^ self ___at___: #log
%

category: 'Python-Power and Logarithmic Functions'
method: math
log10
	"Return the log10 function"
	^ self ___at___: #log10
%

category: 'Python-Power and Logarithmic Functions'
method: math
log10: aBlock
	"Set the log10 function (for monkey patching)"
	self ___at___: #log10 put: aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log2
	"Return the log2 function"
	^ self ___at___: #log2
%

category: 'Python-Power and Logarithmic Functions'
method: math
log2: aBlock
	"Set the log2 function (for monkey patching)"
	self ___at___: #log2 put: aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
log: aBlock
	"Set the log function (for monkey patching)"
	self ___at___: #log put: aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
logWithBase
	"Return the logWithBase function"
	^ self ___at___: #logWithBase
%

category: 'Python-Power and Logarithmic Functions'
method: math
logWithBase: aBlock
	"Set the logWithBase function (for monkey patching)"
	self ___at___: #logWithBase put: aBlock
%

category: 'Python-Mathematical Constants'
method: math
nan
	"Not a number (NaN)"
	^ self ___at___: #nan
%

category: 'Python-Mathematical Constants'
method: math
nan: aValue
	"Set the nan constant (for monkey patching)"
	self ___at___: #nan put: aValue
%

category: 'Python-Mathematical Constants'
method: math
pi
	"The mathematical constant π = 3.141592..."
	^ self ___at___: #pi
%

category: 'Python-Mathematical Constants'
method: math
pi: aValue
	"Set the pi constant (for monkey patching)"
	self ___at___: #pi put: aValue
%

category: 'Python-Power and Logarithmic Functions'
method: math
pow
	"Return the pow function"
	^ self ___at___: #pow
%

category: 'Python-Power and Logarithmic Functions'
method: math
pow: aBlock
	"Set the pow function (for monkey patching)"
	self ___at___: #pow put: aBlock
%

category: 'Python-Angular Conversion'
method: math
radians
	"Return the radians function"
	^ self ___at___: #radians
%

category: 'Python-Angular Conversion'
method: math
radians: aBlock
	"Set the radians function (for monkey patching)"
	self ___at___: #radians put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
sin
	"Return the sin function"
	^ self ___at___: #sin
%

category: 'Python-Trigonometric Functions'
method: math
sin: aBlock
	"Set the sin function (for monkey patching)"
	self ___at___: #sin put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
sinh
	"Return the sinh function"
	^ self ___at___: #sinh
%

category: 'Python-Hyperbolic Functions'
method: math
sinh: aBlock
	"Set the sinh function (for monkey patching)"
	self ___at___: #sinh put: aBlock
%

category: 'Python-Power and Logarithmic Functions'
method: math
sqrt
	"Return the square root function"
	^ self ___at___: #sqrt
%

category: 'Python-Power and Logarithmic Functions'
method: math
sqrt: aBlock
	"Set the sqrt function (for monkey patching)"
	self ___at___: #sqrt put: aBlock
%

category: 'Python-Trigonometric Functions'
method: math
tan
	"Return the tan function"
	^ self ___at___: #tan
%

category: 'Python-Trigonometric Functions'
method: math
tan: aBlock
	"Set the tan function (for monkey patching)"
	self ___at___: #tan put: aBlock
%

category: 'Python-Hyperbolic Functions'
method: math
tanh
	"Return the tanh function"
	^ self ___at___: #tanh
%

category: 'Python-Hyperbolic Functions'
method: math
tanh: aBlock
	"Set the tanh function (for monkey patching)"
	self ___at___: #tanh put: aBlock
%

category: 'Python-Mathematical Constants'
method: math
tau
	"The mathematical constant τ = 2π = 6.283185..."
	^ self ___at___: #tau
%

category: 'Python-Mathematical Constants'
method: math
tau: aValue
	"Set the tau constant (for monkey patching)"
	self ___at___: #tau put: aValue
%

category: 'Python-Rounding Functions'
method: math
trunc
	"Return the trunc function"
	^ self ___at___: #trunc
%

category: 'Python-Rounding Functions'
method: math
trunc: aBlock
	"Set the trunc function (for monkey patching)"
	self ___at___: #trunc put: aBlock
%

set compile_env: 0
