! ------------------- Remove existing behavior from math
removeallmethods math
removeallclassmethods math
! ------------------- Class methods for math
! ------------------- Instance methods for math
category: 'other'
method: math
acos

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcCos.
	].
	^function.
%
category: 'other'
method: math
acosh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcCosh.
	].
	^function.
%
category: 'other'
method: math
asin

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcSin.
	].
	^function.
%
category: 'other'
method: math
asinh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcSinh.
	].
	^function.
%
category: 'other'
method: math
atan

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcTan.
	].
	^function.
%
category: 'other'
method: math
atan2

	| function |
	function := FunctionDef new
		params: #( #y #x );
		yourself.
	function block: [:currentScope |
		| y x |
		y := (currentScope at: #y) ___value asFloat.
		x := (currentScope at: #x) ___value asFloat.
		float ___value: (y arcTan2: x).
	].
	^function.
%
category: 'other'
method: math
atanh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat arcTanh.
	].
	^function.
%
category: 'other'
method: math
cbrt

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		float ___value: (x sign * (x abs raisedTo: (1.0 / 3.0))).
	].
	^function.
%
category: 'other'
method: math
ceil

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value.
		int ___value: x asFloat ceiling.
	].
	^function.
%
category: 'other'
method: math
comb

	| function |
	function := FunctionDef new
		params: #( #'n' #'k' );
		yourself.
	function block: [:currentScope |
		| n k |
		n := currentScope at: #n.
		k := currentScope at: #k.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		(k isKindOf: int) ifFalse: [TypeError signal: '''' , k class name , ''' cannot be interpreted as an integer'].
		n := n ___value.
		k := k ___value.
		n >= 0 ifFalse: [ValueError signal: 'comb() not defined for negative values'].
		k >= 0 ifFalse: [ValueError signal: 'comb() not defined for negative values'].
		int ___value: (k <= n ifTrue: [
			n factorial / (k factorial * (n - k) factorial).
		] ifFalse: [
			0.
		]).
	].
	^function.
%
category: 'other'
method: math
copysign

	| function |
	function := FunctionDef new
		params: #( #mag #sgn );
		yourself.
	function block: [:currentScope |
		| mag sgn |
		mag := (currentScope at: #mag) ___value asFloat abs.
		sgn := (currentScope at: #sgn) ___value asFloat sign.
		float ___value: mag * sgn.
	].
	^function.
%
category: 'other'
method: math
cos

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat cos.
	].
	^function.
%
category: 'other'
method: math
cosh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat cosh.
	].
	^function.
%
category: 'other'
method: math
degrees

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		float ___value: x radiansToDegrees.
	].
	^function.
%
category: 'other'
method: math
dist

	| function |
	function := FunctionDef new
		params: #( #p #q );
		yourself.
	function block: [:currentScope |
		| p q sum |
		p := (currentScope at: #p) ___value.
		q := (currentScope at: #q) ___value.
		p size = q size ifFalse: [ValueError signal: 'both points must have the same number of dimensions'].
		sum := 0.0.
		1 to: p size do: [:i |
			| diff |
			diff := (p at: i) ___value asFloat - (q at: i) ___value asFloat.
			sum := sum + (diff * diff).
		].
		float ___value: sum sqrt.
	].
	^function.
%
category: 'other'
method: math
e

	^float ___value: 1.0 exp
%
category: 'other'
method: math
erf

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat erf.
	].
	^function.
%
category: 'other'
method: math
erfc

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat erfc.
	].
	^function.
%
category: 'other'
method: math
exp

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat exp.
	].
	^function.
%
category: 'other'
method: math
expm1

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		float ___value: (x exp - 1.0).
	].
	^function.
%
category: 'other'
method: math
fabs

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat abs.
	].
	^function.
%
category: 'other'
method: math
factorial

	| function |
	function := FunctionDef new
		params: #( #n );
		yourself.
	function block: [:currentScope |
		| n |
		n := currentScope at: #n.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		n ___value >= 0 ifFalse: [ValueError signal: 'factorial() not defined for negative values'].
		int ___value: n ___value factorial.
	].
	^function.
%
category: 'other'
method: math
floor

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value.
		int ___value: x asFloat floor.
	].
	^function.
%
category: 'other'
method: math
fma

	| function |
	function := FunctionDef new
		params: #( #x #y #z );
		yourself.
	function block: [:currentScope |
		| x y z |
		x := (currentScope at: #x) ___value asFloat.
		y := (currentScope at: #y) ___value asFloat.
		z := (currentScope at: #z) ___value asFloat.
		float ___value: (x * y + z).
	].
	^function.
%
category: 'other'
method: math
fmod

	| function |
	function := FunctionDef new
		params: #( #x #y );
		yourself.
	function block: [:currentScope |
		| x y |
		x := (currentScope at: #x) ___value asFloat.
		y := (currentScope at: #y) ___value asFloat.
		float ___value: (x \\ y).
	].
	^function.
%
category: 'other'
method: math
frexp

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x result |
		x := (currentScope at: #x) ___value asFloat.
		result := x frexp.
		tuple ___value: { float ___value: (result at: 1). int ___value: (result at: 2). }.
	].
	^function.
%
category: 'other'
method: math
fsum

	| function |
	function := FunctionDef new
		params: #( #iterable );
		yourself.
	function block: [:currentScope |
		| iterable sum |
		iterable := (currentScope at: #iterable) ___value.
		sum := 0.0.
		iterable do: [:each |
			sum := sum + each ___value asFloat.
		].
		float ___value: sum.
	].
	^function.
%
category: 'other'
method: math
gamma

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x result g coeffs sum tmp z pi sqrtTwoPi |
		x := (currentScope at: #x) ___value asFloat.
		"Lanczos approximation for gamma function"
		"This is the same algorithm used by Python and most C libraries"
		g := 7.
		coeffs := #(
			0.99999999999980993
			676.5203681218851
			-1259.1392167224028
			771.32342877765313
			-176.61502916214059
			12.507343278686905
			-0.13857109526572012
			9.9843695780195716e-6
			1.5056327351493116e-7
		).
		sqrtTwoPi := (2.0 * Float pi) sqrt.

		x < 0.5 ifTrue: [
			"Use reflection formula: gamma(x) * gamma(1-x) = pi / sin(pi*x)"
			pi := Float pi.
			result := pi / ((pi * x) sin * (currentScope at: #math) gamma ___call: { float ___value: (1.0 - x) } keywords: Dictionary new scope: currentScope).
			result := result ___value.
		] ifFalse: [
			z := x - 1.0.
			sum := coeffs at: 1.
			1 to: 8 do: [:i |
				sum := sum + ((coeffs at: i + 1) / (z + i asFloat)).
			].
			tmp := z + g + 0.5.
			result := sqrtTwoPi * (tmp raisedTo: (z + 0.5)) * (0.0 - tmp) exp * sum.
		].
		float ___value: result.
	].
	^function.
%
category: 'other'
method: math
gcd

	| function |
	function := FunctionDef new
		vararg: #ints;
		yourself.
	function block: [:currentScope |
		| ints integers |
		ints := (currentScope at: #ints) ___value.
		integers := Array new: ints size.
		1 to: ints size do: [:i | 
			| n |
			n := ints at: i.
			(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
			integers at: i put: n ___value.
		].
		integers size == 0 ifTrue: [
			int ___value: 0.
		] ifFalse: [integers size == 1 ifTrue: [
			ints at: 1.
		] ifFalse: [
			| gcd |
			gcd := (integers at: 1) gcd: (integers at: 2).
			3 to: ints size do: [:i |
				gcd := gcd gcd: (integers at: i).
			].
			int ___value: gcd.
		]].
	].
	^function.
%
category: 'other'
method: math
hypot

	| function |
	function := FunctionDef new
		vararg: #coordinates;
		yourself.
	function block: [:currentScope |
		| coordinates sum |
		coordinates := (currentScope at: #coordinates) ___value.
		sum := 0.0.
		coordinates do: [:each |
			| val |
			val := each ___value asFloat.
			sum := sum + (val * val).
		].
		float ___value: sum sqrt.
	].
	^function.
%
category: 'other'
method: math
inf

	^float ___value: PlusInfinity
%
category: 'other'
method: math
isclose

	| function |
	function := FunctionDef new
		params: #( #a #b );
		kwonlyargs: #( #rel_tol #abs_tol );
		kw_defaults: { float ___value: 1.0e-9. float ___value: 0.0. };
		yourself.
	function block: [:currentScope |
		| a b rel_tol abs_tol diff result |
		a := (currentScope at: #a) ___value asFloat.
		b := (currentScope at: #b) ___value asFloat.
		rel_tol := (currentScope at: #rel_tol) ___value asFloat.
		abs_tol := (currentScope at: #abs_tol) ___value asFloat.
		a = b ifTrue: [
			result := bool ___value: true.
		] ifFalse: [
			diff := (a - b) abs.
			result := bool ___value: (diff <= ((a abs max: b abs) * rel_tol max: abs_tol)).
		].
		result.
	].
	^function.
%
category: 'other'
method: math
isfinite

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x kind |
		x := (currentScope at: #x) ___value asFloat.
		kind := x _getKind.
		bool ___value: (kind ~= 3).
	].
	^function.
%
category: 'other'
method: math
isinf

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x kind |
		x := (currentScope at: #x) ___value asFloat.
		kind := x _getKind.
		bool ___value: (kind = 3).
	].
	^function.
%
category: 'other'
method: math
isnan

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		bool ___value: x _isNaN.
	].
	^function.
%
category: 'other'
method: math
isqrt

	| function |
	function := FunctionDef new
		params: #( #n );
		yourself.
	function block: [:currentScope |
		| n |
		n := currentScope at: #n.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		n ___value >= 0 ifFalse: [ValueError signal: 'isqrt() argument must be nonnegative'].
		int ___value: (n ___value sqrt) floor.
	].
	^function.
%
category: 'other'
method: math
lcm

	| function |
	function := FunctionDef new
		vararg: #ints;
		yourself.
	function block: [:currentScope |
		| ints integers |
		ints := (currentScope at: #ints) ___value.
		integers := Array new: ints size.
		1 to: ints size do: [:i |
			| n |
			n := ints at: i.
			(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
			integers at: i put: n ___value.
		].
		integers size == 0 ifTrue: [
			int ___value: 0.
		] ifFalse: [integers size == 1 ifTrue: [
			ints at: 1.
		] ifFalse: [
			| lcm |
			lcm := (integers at: 1) lcm: (integers at: 2).
			3 to: ints size do: [:i |
				lcm := lcm lcm: (integers at: i).
			].
			int ___value: lcm.
		]].
	].
	^function.
%
category: 'other'
method: math
ldexp

	| function |
	function := FunctionDef new
		params: #( #x #i );
		yourself.
	function block: [:currentScope |
		| x i |
		x := (currentScope at: #x) ___value asFloat.
		i := (currentScope at: #i) ___value.
		float ___value: (x * (2.0 raisedTo: i)).
	].
	^function.
%
category: 'other'
method: math
lgamma

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x result g coeffs sum tmp y pi |
		x := (currentScope at: #x) ___value asFloat.
		"Lanczos approximation for log(gamma(x))"
		"More efficient to compute log directly rather than gamma then log"
		g := 7.
		coeffs := #(
			0.99999999999980993
			676.5203681218851
			-1259.1392167224028
			771.32342877765313
			-176.61502916214059
			12.507343278686905
			-0.13857109526572012
			9.9843695780195716e-6
			1.5056327351493116e-7
		).

		x < 0.5 ifTrue: [
			"Use reflection formula: log(gamma(x)) = log(pi) - log(sin(pi*x)) - log(gamma(1-x))"
			pi := Float pi.
			result := pi ln - (pi * x) sin abs ln - (currentScope at: #math) lgamma ___call: { float ___value: (1.0 - x) } keywords: Dictionary new scope: currentScope.
			result := result ___value.
		] ifFalse: [
			y := x - 1.0.
			sum := coeffs at: 1.
			1 to: 8 do: [:i |
				sum := sum + ((coeffs at: i + 1) / (y + i asFloat)).
			].
			tmp := y + g + 0.5.
			result := ((2.0 * Float pi) sqrt ln) + ((y + 0.5) * tmp ln) - tmp + sum ln.
		].
		float ___value: result.
	].
	^function.
%
category: 'other'
method: math
log

	| function |
	function := FunctionDef new
		params: #( #x #base );
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		| x base |
		x := (currentScope at: #x) ___value asFloat.
		base := currentScope at: #base.
		base == nil ifTrue: [
			float ___value: x ln.
		] ifFalse: [
			float ___value: (x ln / base ___value asFloat ln).
		].
	].
	^function.
%
category: 'other'
method: math
log10

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat log10.
	].
	^function.
%
category: 'other'
method: math
log1p

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		float ___value: (1.0 + x) ln.
	].
	^function.
%
category: 'other'
method: math
log2

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat log2.
	].
	^function.
%
category: 'other'
method: math
modf

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x result |
		x := (currentScope at: #x) ___value asFloat.
		result := x modf.
		tuple ___value: { float ___value: (result at: 1). float ___value: (result at: 2). }.
	].
	^function.
%
category: 'other'
method: math
nan

	^float ___value: PlusQuietNaN
%
category: 'other'
method: math
nextafter

	| function |
	function := FunctionDef new
		params: #( #x #y );
		yourself.
	function block: [:currentScope |
		| x y epsilon result |
		x := (currentScope at: #x) ___value asFloat.
		y := (currentScope at: #y) ___value asFloat.
		x = y ifTrue: [
			result := float ___value: y.
		] ifFalse: [
			x _isNaN ifTrue: [
				result := float ___value: x.
			] ifFalse: [
				y _isNaN ifTrue: [
					result := float ___value: y.
				] ifFalse: [
					"Use a small epsilon based on the magnitude of x"
					epsilon := x abs max: 1.0.
					epsilon := epsilon * (2.0 raisedTo: -52).
					x < y ifTrue: [
						result := float ___value: (x + epsilon).
					] ifFalse: [
						result := float ___value: (x - epsilon).
					].
				].
			].
		].
		result.
	].
	^function.
%
category: 'other'
method: math
perm

	| function |
	function := FunctionDef new
		params: #( #'n' #'k' );
		yourself.
	function block: [:currentScope |
		| n k |
		n := currentScope at: #n.
		k := currentScope at: #k.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		(k isKindOf: int) ifFalse: [TypeError signal: '''' , k class name , ''' cannot be interpreted as an integer'].
		n := n ___value.
		k := k ___value.
		n >= 0 ifFalse: [ValueError signal: 'perm() not defined for negative values'].
		k >= 0 ifFalse: [ValueError signal: 'perm() not defined for negative values'].
		int ___value: (k <= n ifTrue: [
			n factorial / (n - k) factorial.
		] ifFalse: [
			0.
		]).
	].
	^function.
%
category: 'other'
method: math
pi

	^float ___value: Float pi
%
category: 'other'
method: math
pow

	| function |
	function := FunctionDef new
		params: #( #x #y );
		yourself.
	function block: [:currentScope |
		| x y |
		x := (currentScope at: #x) ___value asFloat.
		y := (currentScope at: #y) ___value asFloat.
		float ___value: (x raisedTo: y).
	].
	^function.
%
category: 'other'
method: math
prod

	| function |
	function := FunctionDef new
		params: #( #iterable );
		kwonlyargs: #( #start );
		kw_defaults: { int ___value: 1. };
		yourself.
	function block: [:currentScope |
		| iterable product start |
		iterable := (currentScope at: #iterable) ___value.
		start := currentScope at: #start.
		product := start ___value.
		iterable do: [:each |
			product := product * each ___value.
		].
		(product isKindOf: Float) ifTrue: [
			float ___value: product.
		] ifFalse: [
			int ___value: product.
		].
	].
	^function.
%
category: 'other'
method: math
radians

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		float ___value: x degreesToRadians.
	].
	^function.
%
category: 'other'
method: math
remainder

	| function |
	function := FunctionDef new
		params: #( #x #y );
		yourself.
	function block: [:currentScope |
		| x y r |
		x := (currentScope at: #x) ___value asFloat.
		y := (currentScope at: #y) ___value asFloat.
		r := x - (y * (x / y) rounded).
		float ___value: r.
	].
	^function.
%
category: 'other'
method: math
sin

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat sin.
	].
	^function.
%
category: 'other'
method: math
sinh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat sinh.
	].
	^function.
%
category: 'other'
method: math
sqrt

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat sqrt.
	].
	^function.
%
category: 'other'
method: math
sumprod

	| function |
	function := FunctionDef new
		params: #( #p #q );
		yourself.
	function block: [:currentScope |
		| p q sum |
		p := (currentScope at: #p) ___value.
		q := (currentScope at: #q) ___value.
		p size = q size ifFalse: [ValueError signal: 'sumprod: inputs must be the same length'].
		sum := 0.0.
		1 to: p size do: [:i |
			sum := sum + ((p at: i) ___value asFloat * (q at: i) ___value asFloat).
		].
		float ___value: sum.
	].
	^function.
%
category: 'other'
method: math
tan

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat tan.
	].
	^function.
%
category: 'other'
method: math
tanh

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := currentScope at: #x.
		float ___value: x ___value asFloat tanh.
	].
	^function.
%
category: 'other'
method: math
tau

	^float ___value: (Float pi * 2.0)
%
category: 'other'
method: math
trunc

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x |
		x := (currentScope at: #x) ___value asFloat.
		int ___value: x truncated.
	].
	^function.
%
category: 'other'
method: math
ulp

	| function |
	function := FunctionDef new
		params: #( #x );
		yourself.
	function block: [:currentScope |
		| x epsilon result |
		x := (currentScope at: #x) ___value asFloat.
		x _isNaN ifTrue: [
			result := float ___value: x.
		] ifFalse: [
			x abs = PlusInfinity ifTrue: [
				result := float ___value: PlusInfinity.
			] ifFalse: [
				"ULP is the spacing between floating point numbers at the magnitude of x"
				epsilon := x abs max: 1.0.
				epsilon := epsilon * (2.0 raisedTo: -52).
				result := float ___value: epsilon.
			].
		].
		result.
	].
	^function.
%
