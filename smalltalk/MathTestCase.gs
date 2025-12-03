! ------------------- Remove existing behavior from MathTestCase
removeallmethods MathTestCase
removeallclassmethods MathTestCase
! ------------------- Class methods for MathTestCase
! ------------------- Instance methods for MathTestCase
category: 'other'
method: MathTestCase
test_aggregate_functions

	| pyString result |
	pyString :=  '
import math
abs(math.fsum([1.0, 2.0, 3.0]) - 6.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.prod([2, 3, 4]) - 24) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.prod([2, 3, 4], start=2) - 48) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.hypot(3.0, 4.0) - 5.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.hypot(1.0, 1.0, 1.0) - 1.732) < 0.001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.dist([0.0, 0.0], [3.0, 4.0]) - 5.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.sumprod([1, 2, 3], [4, 5, 6]) - 32.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_comb

	| pyString result |
	pyString :=  '
import math
math.comb(3, 4) == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 4) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 3) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 2) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 1) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4.0, 1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(4, 1.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(-4, 1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(4, -1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_constants

	| pyString result |
	pyString :=  '
import math
math.pi > 3.14 and math.pi < 3.15
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.e > 2.71 and math.e < 2.72
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.tau > 6.28 and math.tau < 6.29
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isinf(math.inf)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isnan(math.nan)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_conversion_functions

	| pyString result |
	pyString :=  '
import math
abs(math.degrees(math.pi) - 180.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.degrees(math.pi / 2) - 90.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.radians(180.0) - math.pi) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.radians(90.0) - math.pi / 2) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_decomposition_functions

	| pyString result |
	pyString :=  '
import math
m, e = math.frexp(8.0)
abs(m - 0.5) < 0.0001 and e == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
frac, integ = math.modf(3.75)
abs(frac - 0.75) < 0.0001 and abs(integ - 3.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.ldexp(0.5, 4) - 8.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_exp_log_functions

	| pyString result |
	pyString :=  '
import math
abs(math.exp(0.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.exp(1.0) - math.e) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log(1.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log(math.e) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log10(10.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log2(8.0) - 3.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log(100.0, 10.0) - 2.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.expm1(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.log1p(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_factorial

	| pyString result |
	pyString :=  '
import math
math.factorial(5) == 120
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.factorial(-5)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.factorial(5.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.factorial()
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 	"math.sqrt() takes exactly one argument (0 given)"
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_float_operations

	| pyString result |
	pyString :=  '
import math
math.fabs(-3.5) == 3.5
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.copysign(3.5, -1.0) == -3.5
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.copysign(-3.5, 1.0) == 3.5
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.fmod(7.0, 3.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.remainder(7.0, 3.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.fma(2.0, 3.0, 4.0) - 10.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_gcd

	| pyString result |
	pyString :=  '
import math
math.gcd() == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(4) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(12, 18) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(17, 5) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(10, 0) == 10
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(100, 10) == 10
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(1, 1) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(6, 12, 18) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(7, 14, 21) == 7
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(3, 5, 7) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(4, 6, 9) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(105, 140, 175, 210) == 35
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(105, 140.0, 175, 210) == 35
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_hyperbolic_functions

	| pyString result |
	pyString :=  '
import math
abs(math.sinh(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.cosh(0.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.tanh(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.asinh(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.acosh(1.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.atanh(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_inverse_trig_functions

	| pyString result |
	pyString :=  '
import math
abs(math.asin(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.acos(1.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.atan(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.asin(1.0) - math.pi / 2) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.atan2(0.0, 1.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.atan2(1.0, 0.0) - math.pi / 2) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_isqrt

	| pyString result |
	pyString :=  '
import math
math.isqrt(4.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex |
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.isqrt(-4)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex |
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.isqrt(4) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isqrt(5) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isqrt(8) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_lcm

	| pyString result |
	pyString :=  '
import math
math.lcm() == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.lcm(4) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.lcm(12, 18) == 36
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.lcm(4, 6, 8) == 24
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_nextafter_ulp

	| pyString result |
	pyString :=  '
import math
x = 1.0
next_x = math.nextafter(x, 2.0)
next_x > x
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
x = 1.0
prev_x = math.nextafter(x, 0.0)
prev_x < x
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
x = 1.0
ulp_x = math.ulp(x)
ulp_x > 0.0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isnan(math.ulp(math.nan))
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isinf(math.ulp(math.inf))
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_perm

	| pyString result |
	pyString :=  '
import math
math.perm(5, 2) == 20
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.perm(5, 5) == 120
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.perm(5, 0) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.perm(5, 6) == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_power_sqrt_functions

	| pyString result |
	pyString :=  '
import math
abs(math.sqrt(4.0) - 2.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.pow(2.0, 3.0) - 8.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.cbrt(8.0) - 2.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.cbrt(-8.0) + 2.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_rounding_functions

	| pyString result |
	pyString :=  '
import math
math.ceil(3.2) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.ceil(-3.2) == -3
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.floor(3.8) == 3
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.floor(-3.8) == -4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.trunc(3.8) == 3
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.trunc(-3.8) == -3
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_special_functions

	| pyString result |
	pyString :=  '
import math
abs(math.erf(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.erfc(0.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(1.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(5.0) - 24.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.lgamma(5.0) - math.log(24.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(2.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(3.0) - 2.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(4.0) - 6.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(0.5) - 1.772453850905516) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.gamma(1.5) - 0.886226925452758) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_testing_functions

	| pyString result |
	pyString :=  '
import math
math.isfinite(3.5)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
not math.isfinite(math.inf)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isinf(math.inf)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
not math.isinf(3.5)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isnan(math.nan)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
not math.isnan(3.5)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isclose(1.0, 1.0000000001)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
not math.isclose(1.0, 1.0000001)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
not math.isclose(1.0, 2.0)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isclose(1.0, 1.00001, rel_tol=1e-4)
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: MathTestCase
test_trig_functions

	| pyString result |
	pyString :=  '
import math
abs(math.sin(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.cos(0.0) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.tan(0.0)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.sin(math.pi / 2) - 1.0) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
abs(math.cos(math.pi / 2)) < 0.0001
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
