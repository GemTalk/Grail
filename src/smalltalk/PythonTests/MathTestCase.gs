! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MathTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MathTestCase - Tests for Python math module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
MathTestCase removeAllMethods: 0.
MathTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Source'
method: MathTestCase
math_cos_py

	^'import math
result = math.cos(0)
result
'
%

category: 'Grail-Source'
method: MathTestCase
math_sqrt_py

	^'import math
result = math.sqrt(9)
result
'
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testAcos
	"Test math.acos()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:acos: 1.
	self assert: ((result abs) < 0.00001).

	result := m @env1:acos: 0.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testAsin
	"Test math.asin()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:asin: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:asin: 1.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testAtan
	"Test math.atan()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:atan: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:atan: 1.
	self assert: (((result - (pi / 4)) abs)
		< 0.00001)
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testAtan2
	"Test math.atan2()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:atan2: 1 _: 1.
	self assert: (((result - (pi / 4)) abs)
		< 0.00001).

	result := m @env1:atan2: 1 _: 0.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Grail-Tests - Rounding'
method: MathTestCase
testCeil
	"Test math.ceil()"

	| m result |
	m := math @env1:instance.

	result := m @env1:ceil: 3.2.
	self assert: result equals: 4.

	result := m @env1:ceil: 3.8.
	self assert: result equals: 4.

	result := m @env1:ceil: -3.2.
	self assert: result equals: -3
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testCos
	"Test math.cos()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:cos: 0.
	self assert: (((result - 1.0) abs)
		< 0.00001).

	result := m @env1:cos: pi.
	self assert: (((result + 1.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Hyperbolic'
method: MathTestCase
testCosh
	"Test math.cosh()"

	| m result |
	m := math @env1:instance.

	result := m @env1:cosh: 0.
	self assert: (((result - 1.0) abs)
		< 0.00001).

	result := m @env1:cosh: 1.
	self assert: (((result - 1.5430) abs)
		< 0.001)
%

category: 'Grail-Tests - Angular Conversion'
method: MathTestCase
testDegrees
	"Test math.degrees()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:degrees: pi.
	self assert: (((result - 180.0) abs)
		< 0.00001).

	result := m @env1:degrees: (pi / 2).
	self assert: (((result - 90.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Constants'
method: MathTestCase
testE
	"Test math.e constant"

	| m result |
	m := math @env1:instance.
	result := m @env1:e.

	self assert: (((result - 2.71828) abs)
		< 0.001)
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testExp
	"Test math.exp()"

	| m result |
	m := math @env1:instance.

	result := m @env1:exp: 0.
	self assert: result equals: 1.0.

	result := m @env1:exp: 1.
	self assert: (((result - 2.71828) abs)
		< 0.001)
%

category: 'Grail-Tests - Floating Point'
method: MathTestCase
testFabs
	"Test math.fabs()"

	| m result |
	m := math @env1:instance.

	result := m @env1:fabs: -5.5.
	self assert: result equals: 5.5.

	result := m @env1:fabs: 3.2.
	self assert: result equals: 3.2
%

category: 'Grail-Tests - Number Theory'
method: MathTestCase
testFactorial
	"Test math.factorial()"

	| m result |
	m := math @env1:instance.

	result := m @env1:factorial: 0.
	self assert: result equals: 1.

	result := m @env1:factorial: 5.
	self assert: result equals: 120.

	result := m @env1:factorial: 10.
	self assert: result equals: 3628800
%

category: 'Grail-Tests - Rounding'
method: MathTestCase
testFloor
	"Test math.floor()"

	| m result |
	m := math @env1:instance.

	result := m @env1:floor: 3.2.
	self assert: result equals: 3.

	result := m @env1:floor: 3.8.
	self assert: result equals: 3.

	result := m @env1:floor: -3.2.
	self assert: result equals: -4
%

category: 'Grail-Tests - Number Theory'
method: MathTestCase
testGcd
	"Test math.gcd()"

	| m result |
	m := math @env1:instance.

	result := m @env1:gcd: 12 _: 8.
	self assert: result equals: 4.

	result := m @env1:gcd: 15 _: 25.
	self assert: result equals: 5.

	result := m @env1:gcd: 7 _: 13.
	self assert: result equals: 1
%

category: 'Grail-Tests - Constants'
method: MathTestCase
testInf
	"Test math.inf constant"

	| m result |
	m := math @env1:instance.
	result := m @env1:inf.

	self assert: (result _getKind) equals: 3
%

category: 'Grail-Tests - Floating Point'
method: MathTestCase
testIsfinite
	"Test math.isfinite()"

	| m result inf nan |
	m := math @env1:instance.
	inf := m @env1:inf.
	nan := m @env1:nan.

	result := m @env1:isfinite: 5.5.
	self assert: result.

	result := m @env1:isfinite: inf.
	self deny: result.

	result := m @env1:isfinite: nan.
	self deny: result
%

category: 'Grail-Tests - Floating Point'
method: MathTestCase
testIsinf
	"Test math.isinf()"

	| m result inf |
	m := math @env1:instance.
	inf := m @env1:inf.

	result := m @env1:isinf: inf.
	self assert: result.

	result := m @env1:isinf: 5.5.
	self deny: result
%

category: 'Grail-Tests - Floating Point'
method: MathTestCase
testIsnan
	"Test math.isnan()"

	| m result nan |
	m := math @env1:instance.
	nan := m @env1:nan.

	result := m @env1:isnan: nan.
	self assert: result.

	result := m @env1:isnan: 5.5.
	self deny: result
%

category: 'Grail-Tests - Number Theory'
method: MathTestCase
testLcm
	"Test math.lcm()"

	| m result |
	m := math @env1:instance.

	result := m @env1:lcm: 12 _: 8.
	self assert: result equals: 24.

	result := m @env1:lcm: 15 _: 25.
	self assert: result equals: 75
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testLog
	"Test math.log()"

	| m result |
	m := math @env1:instance.
	
	result := m @env1:log: 2.71828.
	self assert: (((result - 1.0) abs)
		< 0.001).

	result := m @env1:log: 100 _: 10.
	self assert: (((result - 2.0) abs)
		< 0.001)
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testLog10
	"Test math.log10()"

	| m result |
	m := math @env1:instance.

	result := m @env1:log10: 100.
	self assert: (((result - 2.0) abs)
		< 0.00001).

	result := m @env1:log10: 1000.
	self assert: (((result - 3.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testLog2
	"Test math.log2()"

	| m result |
	m := math @env1:instance.

	result := m @env1:log2: 8.
	self assert: (((result - 3.0) abs)
		< 0.00001).

	result := m @env1:log2: 16.
	self assert: (((result - 4.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Constants'
method: MathTestCase
testNan
	"Test math.nan constant"

	| m result |
	m := math @env1:instance.
	result := m @env1:nan.

	self assert: (result _isNaN)
%

category: 'Grail-Tests - Constants'
method: MathTestCase
testPi
	"Test math.pi constant"

	| m result |
	m := math @env1:instance.
	result := m @env1:pi.

	self assert: (((result - 3.14159) abs)
		< 0.001)
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testPow
	"Test math.pow()"

	| m result |
	m := math @env1:instance.

	result := m @env1:pow: 2 _: 3.
	self assert: result equals: 8.0.

	result := m @env1:pow: 5 _: 2.
	self assert: result equals: 25.0.

	result := m @env1:pow: 10 _: 0.
	self assert: result equals: 1.0
%

category: 'Grail-Tests - Python Source'
method: MathTestCase
testPythonMathCos
	"Execute math.cos from Python source."

	| result |
	result := ModuleAst evaluateSource: self math_cos_py.
	self assert: ((result - 1.0) abs) < 0.00001.
%

category: 'Grail-Tests - Python Source'
method: MathTestCase
testPythonMathSqrt
	"Execute math.sqrt from Python source."

	| result |
	result := ModuleAst evaluateSource: self math_sqrt_py.
	self assert: ((result - 3.0) abs) < 0.00001.
%

category: 'Grail-Tests - Angular Conversion'
method: MathTestCase
testRadians
	"Test math.radians()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:radians: 180.
	self assert: (((result - pi) abs)
		< 0.00001).

	result := m @env1:radians: 90.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testSin
	"Test math.sin()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:sin: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:sin: (pi / 2).
	self assert: (((result - 1.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Hyperbolic'
method: MathTestCase
testSinh
	"Test math.sinh()"

	| m result |
	m := math @env1:instance.

	result := m @env1:sinh: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:sinh: 1.
	self assert: (((result - 1.1752) abs)
		< 0.001)
%

category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testSqrt
	"Test math.sqrt()"

	| m result |
	m := math @env1:instance.

	result := m @env1:sqrt: 4.
	self assert: result equals: 2.0.

	result := m @env1:sqrt: 9.
	self assert: result equals: 3.0.

	result := m @env1:sqrt: 2.
	self assert: (((result - 1.41421) abs)
		< 0.001)
%

category: 'Grail-Tests - Trigonometric'
method: MathTestCase
testTan
	"Test math.tan()"

	| m result pi |
	m := math @env1:instance.
	pi := m @env1:pi.

	result := m @env1:tan: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:tan: (pi / 4).
	self assert: (((result - 1.0) abs)
		< 0.00001)
%

category: 'Grail-Tests - Hyperbolic'
method: MathTestCase
testTanh
	"Test math.tanh()"

	| m result |
	m := math @env1:instance.

	result := m @env1:tanh: 0.
	self assert: ((result abs) < 0.00001).

	result := m @env1:tanh: 1.
	self assert: (((result - 0.7615) abs)
		< 0.001)
%

category: 'Grail-Tests - Constants'
method: MathTestCase
testTau
	"Test math.tau constant (2*pi)"

	| m result pi |
	m := math @env1:instance.
	result := m @env1:tau.
	pi := m @env1:pi.

	self assert: result - (pi * 2) abs < 0.00001
%

category: 'Grail-Tests - Rounding'
method: MathTestCase
testTrunc
	"Test math.trunc()"

	| m result |
	m := math @env1:instance.

	result := m @env1:trunc: 3.7.
	self assert: result equals: 3.

	result := m @env1:trunc: -3.7.
	self assert: result equals: -3
%

category: 'Grail-Tests - Added Functions'
method: MathTestCase
testAddedFunctions
	"isqrt / comb / perm / variadic-safe gcd,lcm / exp2 / cbrt / log1p /
	fmod / erf, and their integer-validation + domain errors."

	| m |
	m := math @env1:instance.
	self assert: (m @env1:isqrt: 100) equals: 10.
	self assert: (m @env1:isqrt: (10 @env0:raisedTo: 20)) equals: (10 @env0:raisedTo: 10).
	self assert: (m @env1:comb: 5 _: 2) equals: 10.
	self assert: (m @env1:comb: 3 _: 5) equals: 0.
	self assert: (m @env1:perm: 5 _: 2) equals: 20.
	self assert: (m @env1:perm: 5) equals: 120.
	self assert: (m @env1:gcd: 12 _: 8) equals: 4.
	self assert: (m @env1:lcm: 4 _: 6) equals: 12.
	self assert: (m @env1:exp2: 3) equals: 8.0.
	self assert: (m @env1:cbrt: 27) equals: 3.0.
	self assert: (((m @env1:cbrt: -8) @env0:+ 2.0) @env0:abs) < 0.00001.
	self assert: ((m @env1:log1p: 0) @env0:abs) < 0.00001.
	self assert: (m @env1:fmod: 10 _: 3) equals: 1.0.
	self assert: (((m @env1:erf: 0.5) @env0:- 0.5204998778) @env0:abs) < 0.00001.
	"A float argument to an integer function is a TypeError, not a silent
	truncation; log1p(-1) is a domain error."
	self should: [m @env1:gcd: 12 _: 1.5] raise: TypeError.
	self should: [m @env1:log1p: -1] raise: ValueError.
	self should: [m @env1:isqrt: -1] raise: ValueError.
	"A finite input that overflows to infinity is an OverflowError (math
	range error) for exp/exp2 -- exp(inf) stays inf (not an overflow)."
	self should: [m @env1:exp: 1000000] raise: OverflowError.
	self should: [m @env1:exp2: 1000000] raise: OverflowError.
	self assert: (m @env1:exp: (m @env1:inf)) equals: (m @env1:inf).
	"IEEE remainder rounds the quotient to the nearest even (remainder(5,2)
	= 1, remainder(7,2) = -1); y=0 is a domain error."
	self assert: (m @env1:remainder: 5 _: 2) equals: 1.0.
	self assert: (m @env1:remainder: 7 _: 2) equals: -1.0.
	self should: [m @env1:remainder: 5 _: 0] raise: ValueError.
	"gamma (Lanczos): gamma(5)=24, gamma(0.5)=sqrt(pi), gamma(-0.5)
	=-2*sqrt(pi) (reflection), a pole at 0 is a domain error."
	self assert: (((m @env1:gamma: 5) @env0:- 24.0) @env0:abs) < 0.0001.
	self assert: (((m @env1:gamma: 0.5) @env0:- 1.7724538509) @env0:abs) < 0.000001.
	self assert: (((m @env1:gamma: -0.5) @env0:+ 3.5449077018) @env0:abs) < 0.000001.
	self should: [m @env1:gamma: 0] raise: ValueError.
	"log/log10/log2 of an integer too large for a float compute from its
	magnitude instead of overflowing to inf."
	self assert: (((m @env1:log: (10 @env0:raisedTo: 1000)) @env0:- 2302.5850929940457) @env0:abs) < 0.0001.
	self assert: (((m @env1:log10: (10 @env0:raisedTo: 1000)) @env0:- 1000.0) @env0:abs) < 0.0001.
	self assert: (((m @env1:log2: (2 @env0:raisedTo: 2000)) @env0:- 2000.0) @env0:abs) < 0.0001.
	"factorial rejects non-integers (float/str/Decimal); fmod(inf,y) and
	fmod(x,0) are domain errors while fmod(x,inf) is x."
	self should: [m @env1:factorial: 5.0] raise: TypeError.
	self should: [m @env1:factorial: '5'] raise: TypeError.
	self should: [m @env1:fmod: (m @env1:inf) _: 1] raise: ValueError.
	self assert: (m @env1:fmod: 3.0 _: (m @env1:inf)) equals: 3.0.
	"Domain-error messages name the value (CPython test_exception_messages)."
	self should: [m @env1:sqrt: -1.1] raise: ValueError.
	self should: [m @env1:atanh: 1.0] raise: ValueError.
	"ldexp: integer exponent (a float is a TypeError), overflow raises,
	INF passes through."
	self assert: (m @env1:ldexp: 1 _: 3) equals: 8.0.
	self should: [m @env1:ldexp: 2.0 _: 1.1] raise: TypeError.
	self should: [m @env1:ldexp: 1.0 _: 1000000] raise: OverflowError.
	self assert: (m @env1:ldexp: (m @env1:inf) _: 30) equals: (m @env1:inf).
	"log2 is EXACT for powers of two -- integer (highBit), normal float, and
	subnormal float (renormalised past GemStone's -1022 exponent floor) --
	where ln(x)/ln(2) would drift (log2(2**1023) = 1023.0000000000001)."
	self assert: (m @env1:log2: 4) equals: 2.0.
	self assert: (m @env1:log2: (2 @env0:raisedTo: 1023)) equals: 1023.0.
	self assert: (m @env1:log2: (m @env1:ldexp: 1.0 _: 1023)) equals: 1023.0.
	self assert: (m @env1:log2: (m @env1:ldexp: 1.0 _: -1074)) equals: -1074.0.
	self assert: (m @env1:log2: (m @env1:ldexp: 1.0 _: -1050)) equals: -1050.0.
	"fsum is full-precision (Shewchuk): a naive left-to-right sum of these
	cancelling magnitudes loses the tiny tail, fsum keeps it exactly.  inf
	passes through, inf + -inf is a ValueError, a non-numeric is a TypeError,
	and a huge integer that overflows the float range is an OverflowError."
	self assert: (m @env1:fsum: { 1e100. 1.0. -1e100. 1e-100. 1e50. -1.0. -1e50 }) equals: 1e-100.
	self assert: (m @env1:fsum: { (2.0 @env0:raisedTo: 53). -0.5. (2.0 @env0:raisedTo: -54) @env0:negated })
		equals: (2.0 @env0:raisedTo: 53) @env0:- 1.0.
	self assert: (m @env1:fsum: { 1e16. 1.0. 1e-16 }) equals: 10000000000000002.0.
	self assert: (m @env1:fsum: { }) equals: 0.0.
	self assert: (m @env1:fsum: { 1.0. (m @env1:inf) }) equals: (m @env1:inf).
	self should: [m @env1:fsum: { (m @env1:inf). (m @env1:inf) @env0:negated }] raise: ValueError.
	self should: [m @env1:fsum: { 'spam' }] raise: TypeError.
	self should: [m @env1:fsum: { 10 @env0:raisedTo: 1000 }] raise: OverflowError
