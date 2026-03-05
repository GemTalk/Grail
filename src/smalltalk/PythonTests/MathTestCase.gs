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
MathTestCase category: 'SUnit'
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

category: 'Source'
method: MathTestCase
math_cos_py

	^'import math
result = math.cos(0)
result
'
%

category: 'Source'
method: MathTestCase
math_sqrt_py

	^'import math
result = math.sqrt(9)
result
'
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAcos
	"Test math.acos()"

	| m acosBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	acosBlock := m perform: #acos env: 1.

	result := acosBlock value: {1} value: nil.
	self assert: ((result abs) < 0.00001).

	result := acosBlock value: {0} value: nil.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAsin
	"Test math.asin()"

	| m asinBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	asinBlock := m perform: #asin env: 1.

	result := asinBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := asinBlock value: {1} value: nil.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAtan
	"Test math.atan()"

	| m atanBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	atanBlock := m perform: #atan env: 1.

	result := atanBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := atanBlock value: {1} value: nil.
	self assert: (((result - (pi / 4)) abs)
		< 0.00001)
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAtan2
	"Test math.atan2()"

	| m atan2Block result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	atan2Block := m perform: #atan2 env: 1.

	result := atan2Block value: {1. 1} value: nil.
	self assert: (((result - (pi / 4)) abs)
		< 0.00001).

	result := atan2Block value: {1. 0} value: nil.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Tests - Rounding'
method: MathTestCase
testCeil
	"Test math.ceil()"

	| m ceilBlock result |
	m := math perform: #instance env: 1.
	ceilBlock := m perform: #ceil env: 1.

	result := ceilBlock value: {3.2} value: nil.
	self assert: result equals: 4.

	result := ceilBlock value: {3.8} value: nil.
	self assert: result equals: 4.

	result := ceilBlock value: {-3.2} value: nil.
	self assert: result equals: -3
%

category: 'Tests - Trigonometric'
method: MathTestCase
testCos
	"Test math.cos()"

	| m cosBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	cosBlock := m perform: #cos env: 1.

	result := cosBlock value: {0} value: nil.
	self assert: (((result - 1.0) abs)
		< 0.00001).

	result := cosBlock value: {pi} value: nil.
	self assert: (((result + 1.0) abs)
		< 0.00001)
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testCosh
	"Test math.cosh()"

	| m coshBlock result |
	m := math perform: #instance env: 1.
	coshBlock := m perform: #cosh env: 1.

	result := coshBlock value: {0} value: nil.
	self assert: (((result - 1.0) abs)
		< 0.00001).

	result := coshBlock value: {1} value: nil.
	self assert: (((result - 1.5430) abs)
		< 0.001)
%

category: 'Tests - Angular Conversion'
method: MathTestCase
testDegrees
	"Test math.degrees()"

	| m degreesBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	degreesBlock := m perform: #degrees env: 1.

	result := degreesBlock value: {pi} value: nil.
	self assert: (((result - 180.0) abs)
		< 0.00001).

	result := degreesBlock value: {(pi / 2)} value: nil.
	self assert: (((result - 90.0) abs)
		< 0.00001)
%

category: 'Tests - Constants'
method: MathTestCase
testE
	"Test math.e constant"

	| m result |
	m := math perform: #instance env: 1.
	result := m perform: #e env: 1.

	self assert: (((result - 2.71828) abs)
		< 0.001)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testExp
	"Test math.exp()"

	| m expBlock result |
	m := math perform: #instance env: 1.
	expBlock := m perform: #exp env: 1.

	result := expBlock value: {0} value: nil.
	self assert: result equals: 1.0.

	result := expBlock value: {1} value: nil.
	self assert: (((result - 2.71828) abs)
		< 0.001)
%

category: 'Tests - Floating Point'
method: MathTestCase
testFabs
	"Test math.fabs()"

	| m fabsBlock result |
	m := math perform: #instance env: 1.
	fabsBlock := m perform: #fabs env: 1.

	result := fabsBlock value: {-5.5} value: nil.
	self assert: result equals: 5.5.

	result := fabsBlock value: {3.2} value: nil.
	self assert: result equals: 3.2
%

category: 'Tests - Number Theory'
method: MathTestCase
testFactorial
	"Test math.factorial()"

	| m factorialBlock result |
	m := math perform: #instance env: 1.
	factorialBlock := m perform: #factorial env: 1.

	result := factorialBlock value: {0} value: nil.
	self assert: result equals: 1.

	result := factorialBlock value: {5} value: nil.
	self assert: result equals: 120.

	result := factorialBlock value: {10} value: nil.
	self assert: result equals: 3628800
%

category: 'Tests - Rounding'
method: MathTestCase
testFloor
	"Test math.floor()"

	| m floorBlock result |
	m := math perform: #instance env: 1.
	floorBlock := m perform: #floor env: 1.

	result := floorBlock value: {3.2} value: nil.
	self assert: result equals: 3.

	result := floorBlock value: {3.8} value: nil.
	self assert: result equals: 3.

	result := floorBlock value: {-3.2} value: nil.
	self assert: result equals: -4
%

category: 'Tests - Number Theory'
method: MathTestCase
testGcd
	"Test math.gcd()"

	| m gcdBlock result |
	m := math perform: #instance env: 1.
	gcdBlock := m perform: #gcd env: 1.

	result := gcdBlock value: {12. 8} value: nil.
	self assert: result equals: 4.

	result := gcdBlock value: {15. 25} value: nil.
	self assert: result equals: 5.

	result := gcdBlock value: {7. 13} value: nil.
	self assert: result equals: 1
%

category: 'Tests - Constants'
method: MathTestCase
testInf
	"Test math.inf constant"

	| m result |
	m := math perform: #instance env: 1.
	result := m perform: #inf env: 1.

	self assert: (result _getKind) equals: 3
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsfinite
	"Test math.isfinite()"

	| m isfiniteBlock result inf nan |
	m := math perform: #instance env: 1.
	inf := m perform: #inf env: 1.
	nan := m perform: #nan env: 1.
	isfiniteBlock := m perform: #isfinite env: 1.

	result := isfiniteBlock value: {5.5} value: nil.
	self assert: result.

	result := isfiniteBlock value: {inf} value: nil.
	self deny: result.

	result := isfiniteBlock value: {nan} value: nil.
	self deny: result
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsinf
	"Test math.isinf()"

	| m isinfBlock result inf |
	m := math perform: #instance env: 1.
	inf := m perform: #inf env: 1.
	isinfBlock := m perform: #isinf env: 1.

	result := isinfBlock value: {inf} value: nil.
	self assert: result.

	result := isinfBlock value: {5.5} value: nil.
	self deny: result
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsnan
	"Test math.isnan()"

	| m isnanBlock result nan |
	m := math perform: #instance env: 1.
	nan := m perform: #nan env: 1.
	isnanBlock := m perform: #isnan env: 1.

	result := isnanBlock value: {nan} value: nil.
	self assert: result.

	result := isnanBlock value: {5.5} value: nil.
	self deny: result
%

category: 'Tests - Number Theory'
method: MathTestCase
testLcm
	"Test math.lcm()"

	| m lcmBlock result |
	m := math perform: #instance env: 1.
	lcmBlock := m perform: #lcm env: 1.

	result := lcmBlock value: {12. 8} value: nil.
	self assert: result equals: 24.

	result := lcmBlock value: {15. 25} value: nil.
	self assert: result equals: 75
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog
	"Test math.log()"

	| m logBlock logWithBaseBlock result |
	m := math perform: #instance env: 1.
	logBlock := m perform: #log env: 1.
		logWithBaseBlock := m perform: #logWithBase env: 1.

	result := logBlock value: {2.71828} value: nil.
	self assert: (((result - 1.0) abs)
		< 0.001).

	result := logWithBaseBlock value: {100. 10} value: nil.
	self assert: (((result - 2.0) abs)
		< 0.001)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog10
	"Test math.log10()"

	| m log10Block result |
	m := math perform: #instance env: 1.
	log10Block := m perform: #log10 env: 1.

	result := log10Block value: {100} value: nil.
	self assert: (((result - 2.0) abs)
		< 0.00001).

	result := log10Block value: {1000} value: nil.
	self assert: (((result - 3.0) abs)
		< 0.00001)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog2
	"Test math.log2()"

	| m log2Block result |
	m := math perform: #instance env: 1.
	log2Block := m perform: #log2 env: 1.

	result := log2Block value: {8} value: nil.
	self assert: (((result - 3.0) abs)
		< 0.00001).

	result := log2Block value: {16} value: nil.
	self assert: (((result - 4.0) abs)
		< 0.00001)
%

category: 'Tests - Constants'
method: MathTestCase
testNan
	"Test math.nan constant"

	| m result |
	m := math perform: #instance env: 1.
	result := m perform: #nan env: 1.

	self assert: (result _isNaN)
%

category: 'Tests - Constants'
method: MathTestCase
testPi
	"Test math.pi constant"

	| m result |
	m := math perform: #instance env: 1.
	result := m perform: #pi env: 1.

	self assert: (((result - 3.14159) abs)
		< 0.001)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testPow
	"Test math.pow()"

	| m powBlock result |
	m := math perform: #instance env: 1.
	powBlock := m perform: #pow env: 1.

	result := powBlock value: {2. 3} value: nil.
	self assert: result equals: 8.0.

	result := powBlock value: {5. 2} value: nil.
	self assert: result equals: 25.0.

	result := powBlock value: {10. 0} value: nil.
	self assert: result equals: 1.0
%

category: 'Tests - Python Source'
method: MathTestCase
testPythonMathCos
	"Execute math.cos from Python source."

	| moduleScope result |
	moduleScope := SymbolDictionary new.
	result := ModuleAst
		evaluateSource: self math_cos_py
		usingModuleScope: moduleScope.
	self assert: ((result - 1.0) abs) < 0.00001.
%

category: 'Tests - Python Source'
method: MathTestCase
testPythonMathSqrt
	"Execute math.sqrt from Python source."

	| moduleScope result |
	moduleScope := SymbolDictionary new.
	result := ModuleAst
		evaluateSource: self math_sqrt_py
		usingModuleScope: moduleScope.
	self assert: ((result - 3.0) abs) < 0.00001.
%

category: 'Tests - Angular Conversion'
method: MathTestCase
testRadians
	"Test math.radians()"

	| m radiansBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	radiansBlock := m perform: #radians env: 1.

	result := radiansBlock value: {180} value: nil.
	self assert: (((result - pi) abs)
		< 0.00001).

	result := radiansBlock value: {90} value: nil.
	self assert: (((result - (pi / 2)) abs)
		< 0.00001)
%

category: 'Tests - Trigonometric'
method: MathTestCase
testSin
	"Test math.sin()"

	| m sinBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	sinBlock := m perform: #sin env: 1.

	result := sinBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := sinBlock value: {(pi / 2)} value: nil.
	self assert: (((result - 1.0) abs)
		< 0.00001)
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testSinh
	"Test math.sinh()"

	| m sinhBlock result |
	m := math perform: #instance env: 1.
	sinhBlock := m perform: #sinh env: 1.

	result := sinhBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := sinhBlock value: {1} value: nil.
	self assert: (((result - 1.1752) abs)
		< 0.001)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testSqrt
	"Test math.sqrt()"

	| m sqrtBlock result |
	m := math perform: #instance env: 1.
	sqrtBlock := m perform: #sqrt env: 1.

	result := sqrtBlock value: {4} value: nil.
	self assert: result equals: 2.0.

	result := sqrtBlock value: {9} value: nil.
	self assert: result equals: 3.0.

	result := sqrtBlock value: {2} value: nil.
	self assert: (((result - 1.41421) abs)
		< 0.001)
%

category: 'Tests - Trigonometric'
method: MathTestCase
testTan
	"Test math.tan()"

	| m tanBlock result pi |
	m := math perform: #instance env: 1.
	pi := m perform: #pi env: 1.
	tanBlock := m perform: #tan env: 1.

	result := tanBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := tanBlock value: {(pi / 4)} value: nil.
	self assert: (((result - 1.0) abs)
		< 0.00001)
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testTanh
	"Test math.tanh()"

	| m tanhBlock result |
	m := math perform: #instance env: 1.
	tanhBlock := m perform: #tanh env: 1.

	result := tanhBlock value: {0} value: nil.
	self assert: ((result abs) < 0.00001).

	result := tanhBlock value: {1} value: nil.
	self assert: (((result - 0.7615) abs)
		< 0.001)
%

category: 'Tests - Constants'
method: MathTestCase
testTau
	"Test math.tau constant (2*pi)"

	| m result pi |
	m := math perform: #instance env: 1.
	result := m perform: #tau env: 1.
	pi := m perform: #pi env: 1.

	self assert: result - (pi * 2) abs < 0.00001
%

category: 'Tests - Rounding'
method: MathTestCase
testTrunc
	"Test math.trunc()"

	| m truncBlock result |
	m := math perform: #instance env: 1.
	truncBlock := m perform: #trunc env: 1.

	result := truncBlock value: {3.7} value: nil.
	self assert: result equals: 3.

	result := truncBlock value: {-3.7} value: nil.
	self assert: result equals: -3
%
