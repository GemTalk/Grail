! ------------------- Remove existing behavior from cmath
removeallmethods cmath
removeallclassmethods cmath
! ------------------- Class methods for cmath
category: 'other'
classmethod: cmath
functionNames

	^#( #acos #acosh #asin #asinh #atan #atanh #cos #cosh #e #exp #inf #infj
		#isclose #isfinite #isinf #isnan #log #log10 #nan #nanj #phase #pi
		#polar #rect #sin #sinh #sqrt #tan #tanh #tau )
%
! ------------------- Instance methods for cmath
category: 'other'
method: cmath
acos
	"Return the arc cosine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z one zSquared oneMinusZSquared sqrtPart iPart logArg logResult minusI result |
		z := currentScope at: #z.
		z := self asComplex: z.

		"acos(z) = -i * log(z + i * sqrt(1 - z^2))"

		"Calculate 1 - z^2"
		one := complex ___real: 1.0 imaginary: 0.0.
		zSquared := z __mul__: z.
		oneMinusZSquared := one __sub__: zSquared.

		"Calculate sqrt(1 - z^2)"
		sqrtPart := oneMinusZSquared __pow__: (float ___value: 0.5).

		"Calculate i * sqrt(1 - z^2)"
		iPart := complex ___real: 0.0 imaginary: 1.0.
		sqrtPart := iPart __mul__: sqrtPart.

		"Calculate z + i * sqrt(1 - z^2)"
		logArg := z __add__: sqrtPart.

		"Calculate log(z + i * sqrt(1 - z^2))"
		logResult := self log scope: currentScope positional: {logArg} named: {}.

		"Calculate -i * log(...)"
		minusI := complex ___real: 0.0 imaginary: -1.0.
		result := minusI __mul__: logResult.

		result
	].
	^function.
%
category: 'other'
method: cmath
acosh
	"Return the inverse hyperbolic cosine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z one zSquared zSquaredMinusOne sqrtPart logArg result |
		z := currentScope at: #z.
		z := self asComplex: z.

		"acosh(z) = log(z + sqrt(z^2 - 1))"

		"Calculate z^2 - 1"
		one := complex ___real: 1.0 imaginary: 0.0.
		zSquared := z __mul__: z.
		zSquaredMinusOne := zSquared __sub__: one.

		"Calculate sqrt(z^2 - 1)"
		sqrtPart := zSquaredMinusOne __pow__: (float ___value: 0.5).

		"Calculate z + sqrt(z^2 - 1)"
		logArg := z __add__: sqrtPart.

		"Calculate log(z + sqrt(z^2 - 1))"
		result := self log scope: currentScope positional: {logArg} named: {}.

		result
	].
	^function.
%
category: 'other'
method: cmath
asComplex: z
	"Convert z to a complex number if it isn't already"
	
	z class == complex ifTrue: [^z].
	z class == int ifTrue: [^complex ___real: z ___value imaginary: 0].
	z class == float ifTrue: [^complex ___real: z ___value imaginary: 0].
	
	"Try __complex__ method"
	[^z __complex__] on: MessageNotUnderstood do: [].
	
	"Try __float__ method"
	[| f |
		f := z __float__.
		complex ___real: f ___value imaginary: 0
	] on: MessageNotUnderstood do: [].
	
	TypeError signal: 'cannot convert ', z class name, ' to complex'.
%
category: 'other'
method: cmath
asin
	"Return the arc sine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z one zSquared oneMinusZSquared sqrtPart iPart iTimesZ logArg logResult minusI result |
		z := currentScope at: #z.
		z := self asComplex: z.

		"asin(z) = -i * log(i*z + sqrt(1 - z^2))"

		"Calculate 1 - z^2"
		one := complex ___real: 1.0 imaginary: 0.0.
		zSquared := z __mul__: z.
		oneMinusZSquared := one __sub__: zSquared.

		"Calculate sqrt(1 - z^2)"
		sqrtPart := oneMinusZSquared __pow__: (float ___value: 0.5).

		"Calculate i*z"
		iPart := complex ___real: 0.0 imaginary: 1.0.
		iTimesZ := iPart __mul__: z.

		"Calculate i*z + sqrt(1 - z^2)"
		logArg := iTimesZ __add__: sqrtPart.

		"Calculate log(i*z + sqrt(1 - z^2))"
		logResult := self log scope: currentScope positional: {logArg} named: {}.

		"Calculate -i * log(...)"
		minusI := complex ___real: 0.0 imaginary: -1.0.
		result := minusI __mul__: logResult.

		result
	].
	^function.
%
category: 'other'
method: cmath
asinh
	"Return the inverse hyperbolic sine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z one zSquared zSquaredPlusOne sqrtPart logArg result |
		z := currentScope at: #z.
		z := self asComplex: z.

		"asinh(z) = log(z + sqrt(z^2 + 1))"

		"Calculate z^2 + 1"
		one := complex ___real: 1.0 imaginary: 0.0.
		zSquared := z __mul__: z.
		zSquaredPlusOne := zSquared __add__: one.

		"Calculate sqrt(z^2 + 1)"
		sqrtPart := zSquaredPlusOne __pow__: (float ___value: 0.5).

		"Calculate z + sqrt(z^2 + 1)"
		logArg := z __add__: sqrtPart.

		"Calculate log(z + sqrt(z^2 + 1))"
		result := self log scope: currentScope positional: {logArg} named: {}.

		result
	].
	^function.
%
category: 'other'
method: cmath
atan
	"Return the arc tangent of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag iPart iPlusZ iMinusZ quotient logResult iOverTwo result |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"atan(z) = (i/2) * log((i+z)/(i-z))"
		"Has singularities at z = ±i"

		"Check for singularities: z = i or z = -i"
		result := (real abs < 1.0e-10 and: [(imag - 1.0) abs < 1.0e-10]) ifTrue: [
			"atan(i) = i*infinity"
			complex ___real: 0.0 imaginary: PlusInfinity
		] ifFalse: [
			(real abs < 1.0e-10 and: [(imag + 1.0) abs < 1.0e-10]) ifTrue: [
				"atan(-i) = -i*infinity"
				complex ___real: 0.0 imaginary: MinusInfinity
			] ifFalse: [
				"Calculate i"
				iPart := complex ___real: 0.0 imaginary: 1.0.

				"Calculate i+z"
				iPlusZ := iPart __add__: z.

				"Calculate i-z"
				iMinusZ := iPart __sub__: z.

				"Calculate (i+z)/(i-z)"
				quotient := iPlusZ __truediv__: iMinusZ.

				"Calculate log((i+z)/(i-z))"
				logResult := self log scope: currentScope positional: {quotient} named: {}.

				"Calculate (i/2) * log(...)"
				iOverTwo := complex ___real: 0.0 imaginary: 0.5.
				iOverTwo __mul__: logResult
			]
		].
		result
	].
	^function.
%
category: 'other'
method: cmath
atanh
	"Return the inverse hyperbolic tangent of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag one onePlusZ oneMinusZ quotient logResult oneHalf result |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"atanh(z) = (1/2) * log((1+z)/(1-z))"
		"Has singularities at z = ±1"

		"Check for singularities: z = 1 or z = -1"
		result := (imag abs < 1.0e-10 and: [(real - 1.0) abs < 1.0e-10]) ifTrue: [
			"atanh(1) = +infinity"
			complex ___real: PlusInfinity imaginary: 0.0
		] ifFalse: [
			(imag abs < 1.0e-10 and: [(real + 1.0) abs < 1.0e-10]) ifTrue: [
				"atanh(-1) = -infinity"
				complex ___real: MinusInfinity imaginary: 0.0
			] ifFalse: [
				"Calculate 1"
				one := complex ___real: 1.0 imaginary: 0.0.

				"Calculate 1+z"
				onePlusZ := one __add__: z.

				"Calculate 1-z"
				oneMinusZ := one __sub__: z.

				"Calculate (1+z)/(1-z)"
				quotient := onePlusZ __truediv__: oneMinusZ.

				"Calculate log((1+z)/(1-z))"
				logResult := self log scope: currentScope positional: {quotient} named: {}.

				"Calculate (1/2) * log(...)"
				oneHalf := complex ___real: 0.5 imaginary: 0.0.
				oneHalf __mul__: logResult
			]
		].
		result
	].
	^function.
%
category: 'other'
method: cmath
cos
	"Return the cosine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"cos(a + bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"
		complex
			___real: (real cos * imag cosh)
			imaginary: (real sin * imag sinh) negated
	].
	^function.
%
category: 'other'
method: cmath
cosh
	"Return the hyperbolic cosine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"cosh(a + bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"
		complex
			___real: (real cosh * imag cos)
			imaginary: (real sinh * imag sin)
	].
	^function.
%
category: 'other'
method: cmath
e
	"The mathematical constant e = 2.718281..."

	^float ___value: Float e
%
category: 'other'
method: cmath
exp
	"Return e raised to the power z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag expReal |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"exp(a + bi) = exp(a) * (cos(b) + i*sin(b))"
		expReal := real exp.
		complex
			___real: (expReal * imag cos)
			imaginary: (expReal * imag sin)
	].
	^function.
%
category: 'other'
method: cmath
inf
	"Floating-point positive infinity"

	^float ___value: PlusInfinity
%
category: 'other'
method: cmath
infj
	"Complex number with zero real part and positive infinity imaginary part"

	^complex ___real: 0.0 imaginary: PlusInfinity
%
category: 'other'
method: cmath
isclose
	"Check if the values a and b are close to each other"

	| function |
	function := builtin_function_or_method new
		params: #( #a #b );
		kwonlyargs: #( #rel_tol #abs_tol );
		kw_defaults: { float ___value: 1.0e-9. float ___value: 0.0 };
		yourself.
	function block: [:currentScope |
		| a b relTol absTol diff maxVal tolerance |
		a := currentScope at: #a.
		b := currentScope at: #b.
		relTol := (currentScope at: #rel_tol) ___value.
		absTol := (currentScope at: #abs_tol) ___value.

		a := self asComplex: a.
		b := self asComplex: b.

		"Check for special values (NaN, inf)"
		"For now, compute: abs(a-b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)"
		diff := (a __sub__: b) __abs__ ___value.
		maxVal := ((a __abs__ ___value) max: (b __abs__ ___value)).
		tolerance := (relTol * maxVal) max: absTol.

		bool ___value: (diff <= tolerance)
	].
	^function.
%
category: 'other'
method: cmath
isfinite
	"Return True if both the real and imaginary parts of z are finite"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag realKind imagKind |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"A number is finite if it's not infinity (kind 3) and not NaN (kind > 4)"
		realKind := real _getKind.
		imagKind := imag _getKind.
		bool ___value: ((realKind ~= 3 and: [realKind <= 4]) and: [imagKind ~= 3 and: [imagKind <= 4]])
	].
	^function.
%
category: 'other'
method: cmath
isinf
	"Return True if either the real or imaginary part of z is an infinity"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag realKind imagKind |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"Kind 3 is infinity"
		realKind := real _getKind.
		imagKind := imag _getKind.
		bool ___value: (realKind = 3 or: [imagKind = 3])
	].
	^function.
%
category: 'other'
method: cmath
isnan
	"Return True if either the real or imaginary part of z is a NaN"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"_isNaN returns true for both quiet and signaling NaN"
		bool ___value: (real _isNaN or: [imag _isNaN])
	].
	^function.
%
category: 'other'
method: cmath
log
	"Return the logarithm of z to the given base (e by default)"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		kwonlyargs: #( #base );
		kw_defaults: { nil };
		yourself.
	function block: [:currentScope |
		| z base real imag r theta result |
		z := currentScope at: #z.
		base := currentScope at: #base.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"log(z) = log(r) + i*theta where z = r*e^(i*theta)"
		r := ((real * real) + (imag * imag)) sqrt.
		theta := imag arcTan2: real.

		result := complex ___real: r ln imaginary: theta.

		"If base is provided, divide by log(base)"
		base ifNotNil: [
			| logBase |
			base := self asComplex: base.
			logBase := self log scope: currentScope positional: {base} named: {}.
			result := result __truediv__: logBase.
		].

		result
	].
	^function.
%
category: 'other'
method: cmath
log10
	"Return the base-10 logarithm of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z logZ log10 |
		z := currentScope at: #z.

		"log10(z) = log(z) / log(10)"
		logZ := self log scope: currentScope positional: {z} named: {}.

		log10 := 10.0 ln.
		logZ __truediv__: (float ___value: log10)
	].
	^function.
%
category: 'other'
method: cmath
nan
	"A floating-point 'not a number' (NaN) value"

	^float ___value: PlusQuietNaN
%
category: 'other'
method: cmath
nanj
	"Complex number with zero real part and NaN imaginary part"

	^complex ___real: 0.0 imaginary: PlusQuietNaN
%
category: 'other'
method: cmath
phase
	"Return the phase of z (also known as the argument of z)"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"phase(z) = atan2(imag, real)"
		float ___value: (imag arcTan2: real)
	].
	^function.
%
category: 'other'
method: cmath
pi
	"The mathematical constant π = 3.141592..."

	^float ___value: Float pi
%
category: 'other'
method: cmath
polar
	"Return the representation of z in polar coordinates"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z r phi |
		z := currentScope at: #z.
		z := self asComplex: z.

		"polar(z) = (abs(z), phase(z))"
		r := z __abs__.
		phi := self phase scope: currentScope positional: {z} named: {}.

		tuple ___value: {r. phi}
	].
	^function.
%
category: 'other'
method: cmath
rect
	"Return the complex number z with polar coordinates r and phi"

	| function |
	function := builtin_function_or_method new
		params: #( #r #phi );
		yourself.
	function block: [:currentScope |
		| r phi real imag |
		r := currentScope at: #r.
		phi := currentScope at: #phi.

		"Convert r and phi to floats"
		r class == int ifTrue: [r := r ___value asFloat] ifFalse: [r := r ___value].
		phi class == int ifTrue: [phi := phi ___value asFloat] ifFalse: [phi := phi ___value].

		"rect(r, phi) = r * (cos(phi) + i*sin(phi))"
		real := r * phi cos.
		imag := r * phi sin.

		complex ___real: real imaginary: imag
	].
	^function.
%
category: 'other'
method: cmath
sin
	"Return the sine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"sin(a + bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"
		complex
			___real: (real sin * imag cosh)
			imaginary: (real cos * imag sinh)
	].
	^function.
%
category: 'other'
method: cmath
sinh
	"Return the hyperbolic sine of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z real imag |
		z := currentScope at: #z.
		z := self asComplex: z.
		real := z ___real.
		imag := z ___imaginary.

		"sinh(a + bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"
		complex
			___real: (real sinh * imag cos)
			imaginary: (real cosh * imag sin)
	].
	^function.
%
category: 'other'
method: cmath
sqrt
	"Return the square root of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z |
		z := currentScope at: #z.
		z := self asComplex: z.

		"sqrt(z) = z^0.5"
		z __pow__: (float ___value: 0.5)
	].
	^function.
%
category: 'other'
method: cmath
tan
	"Return the tangent of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z sinZ cosZ |
		z := currentScope at: #z.

		"tan(z) = sin(z) / cos(z)"
		sinZ := self sin scope: currentScope positional: {z} named: {}.
		cosZ := self cos scope: currentScope positional: {z} named: {}.

		sinZ __truediv__: cosZ
	].
	^function.
%
category: 'other'
method: cmath
tanh
	"Return the hyperbolic tangent of z"

	| function |
	function := builtin_function_or_method new
		params: #( #z );
		yourself.
	function block: [:currentScope |
		| z sinhZ coshZ |
		z := currentScope at: #z.

		"tanh(z) = sinh(z) / cosh(z)"
		sinhZ := self sinh scope: currentScope positional: {z} named: {}.
		coshZ := self cosh scope: currentScope positional: {z} named: {}.

		sinhZ __truediv__: coshZ
	].
	^function.
%
category: 'other'
method: cmath
tau
	"The mathematical constant τ = 2π = 6.283185..."

	^float ___value: Float pi * 2.0
%
