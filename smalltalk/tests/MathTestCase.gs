! ===============================================================================
! MathTestCase - Tests for Python math module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
MathTestCase removeAllMethods: 0.
MathTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for MathTestCase

category: 'Tests - Constants'
method: MathTestCase
testPi
	"Test math.pi constant"

	| m result |
	m := math new.
	result := m perform: #pi env: 2.

	self assert: (((result perform: #- env: 0 withArguments: {3.14159}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Constants'
method: MathTestCase
testE
	"Test math.e constant"

	| m result |
	m := math new.
	result := m perform: #e env: 2.

	self assert: (((result perform: #- env: 0 withArguments: {2.71828}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Constants'
method: MathTestCase
testTau
	"Test math.tau constant (2*pi)"

	| m result pi |
	m := math new.
	result := m perform: #tau env: 2.
	pi := m perform: #pi env: 2.

	self assert: (((result perform: #- env: 0 withArguments: {pi * 2}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Constants'
method: MathTestCase
testInf
	"Test math.inf constant"

	| m result |
	m := math new.
	result := m perform: #inf env: 2.

	self assert: (result perform: #_getKind env: 0) equals: 3
%

category: 'Tests - Constants'
method: MathTestCase
testNan
	"Test math.nan constant"

	| m result |
	m := math new.
	result := m perform: #nan env: 2.

	self assert: (result perform: #_isNaN env: 0)
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testSqrt
	"Test math.sqrt()"

	| m result |
	m := math new.

	result := (m perform: #sqrt: env: 2 withArguments: {4}).
	self assert: result equals: 2.0.

	result := (m perform: #sqrt: env: 2 withArguments: {9}).
	self assert: result equals: 3.0.

	result := (m perform: #sqrt: env: 2 withArguments: {2}).
	self assert: (((result perform: #- env: 0 withArguments: {1.41421}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testPow
	"Test math.pow()"

	| m result |
	m := math new.

	result := (m perform: #pow:_: env: 2 withArguments: {2. 3}).
	self assert: result equals: 8.0.

	result := (m perform: #pow:_: env: 2 withArguments: {5. 2}).
	self assert: result equals: 25.0.

	result := (m perform: #pow:_: env: 2 withArguments: {10. 0}).
	self assert: result equals: 1.0
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testExp
	"Test math.exp()"

	| m result |
	m := math new.

	result := (m perform: #exp: env: 2 withArguments: {0}).
	self assert: result equals: 1.0.

	result := (m perform: #exp: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {2.71828}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog
	"Test math.log()"

	| m result |
	m := math new.

	result := (m perform: #log: env: 2 withArguments: {2.71828}).
	self assert: (((result perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001}).

	result := (m perform: #log:_: env: 2 withArguments: {100. 10}).
	self assert: (((result perform: #- env: 0 withArguments: {2.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog10
	"Test math.log10()"

	| m result |
	m := math new.

	result := (m perform: #log10: env: 2 withArguments: {100}).
	self assert: (((result perform: #- env: 0 withArguments: {2.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #log10: env: 2 withArguments: {1000}).
	self assert: (((result perform: #- env: 0 withArguments: {3.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Power and Logarithmic'
method: MathTestCase
testLog2
	"Test math.log2()"

	| m result |
	m := math new.

	result := (m perform: #log2: env: 2 withArguments: {8}).
	self assert: (((result perform: #- env: 0 withArguments: {3.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #log2: env: 2 withArguments: {16}).
	self assert: (((result perform: #- env: 0 withArguments: {4.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testSin
	"Test math.sin()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #sin: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #sin: env: 2 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}).
	self assert: (((result perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testCos
	"Test math.cos()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #cos: env: 2 withArguments: {0}).
	self assert: (((result perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #cos: env: 2 withArguments: {pi}).
	self assert: (((result perform: #+ env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testTan
	"Test math.tan()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #tan: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #tan: env: 2 withArguments: {(pi perform: #/ env: 0 withArguments: {4})}).
	self assert: (((result perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAsin
	"Test math.asin()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #asin: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #asin: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAcos
	"Test math.acos()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #acos: env: 2 withArguments: {1}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #acos: env: 2 withArguments: {0}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAtan
	"Test math.atan()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #atan: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #atan: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {4})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Trigonometric'
method: MathTestCase
testAtan2
	"Test math.atan2()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #atan2:_: env: 2 withArguments: {1. 1}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {4})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #atan2:_: env: 2 withArguments: {1. 0}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testSinh
	"Test math.sinh()"

	| m result |
	m := math new.

	result := (m perform: #sinh: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #sinh: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {1.1752}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testCosh
	"Test math.cosh()"

	| m result |
	m := math new.

	result := (m perform: #cosh: env: 2 withArguments: {0}).
	self assert: (((result perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #cosh: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {1.5430}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Hyperbolic'
method: MathTestCase
testTanh
	"Test math.tanh()"

	| m result |
	m := math new.

	result := (m perform: #tanh: env: 2 withArguments: {0}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #tanh: env: 2 withArguments: {1}).
	self assert: (((result perform: #- env: 0 withArguments: {0.7615}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Rounding'
method: MathTestCase
testCeil
	"Test math.ceil()"

	| m result |
	m := math new.

	result := (m perform: #ceil: env: 2 withArguments: {3.2}).
	self assert: result equals: 4.

	result := (m perform: #ceil: env: 2 withArguments: {3.8}).
	self assert: result equals: 4.

	result := (m perform: #ceil: env: 2 withArguments: {-3.2}).
	self assert: result equals: -3
%

category: 'Tests - Rounding'
method: MathTestCase
testFloor
	"Test math.floor()"

	| m result |
	m := math new.

	result := (m perform: #floor: env: 2 withArguments: {3.2}).
	self assert: result equals: 3.

	result := (m perform: #floor: env: 2 withArguments: {3.8}).
	self assert: result equals: 3.

	result := (m perform: #floor: env: 2 withArguments: {-3.2}).
	self assert: result equals: -4
%

category: 'Tests - Rounding'
method: MathTestCase
testTrunc
	"Test math.trunc()"

	| m result |
	m := math new.

	result := (m perform: #trunc: env: 2 withArguments: {3.7}).
	self assert: result equals: 3.

	result := (m perform: #trunc: env: 2 withArguments: {-3.7}).
	self assert: result equals: -3
%

category: 'Tests - Number Theory'
method: MathTestCase
testFactorial
	"Test math.factorial()"

	| m result |
	m := math new.

	result := (m perform: #factorial: env: 2 withArguments: {0}).
	self assert: result equals: 1.

	result := (m perform: #factorial: env: 2 withArguments: {5}).
	self assert: result equals: 120.

	result := (m perform: #factorial: env: 2 withArguments: {10}).
	self assert: result equals: 3628800
%

category: 'Tests - Number Theory'
method: MathTestCase
testGcd
	"Test math.gcd()"

	| m result |
	m := math new.

	result := (m perform: #gcd:_: env: 2 withArguments: {12. 8}).
	self assert: result equals: 4.

	result := (m perform: #gcd:_: env: 2 withArguments: {15. 25}).
	self assert: result equals: 5.

	result := (m perform: #gcd:_: env: 2 withArguments: {7. 13}).
	self assert: result equals: 1
%

category: 'Tests - Number Theory'
method: MathTestCase
testLcm
	"Test math.lcm()"

	| m result |
	m := math new.

	result := (m perform: #lcm:_: env: 2 withArguments: {12. 8}).
	self assert: result equals: 24.

	result := (m perform: #lcm:_: env: 2 withArguments: {15. 25}).
	self assert: result equals: 75
%

category: 'Tests - Floating Point'
method: MathTestCase
testFabs
	"Test math.fabs()"

	| m result |
	m := math new.

	result := (m perform: #fabs: env: 2 withArguments: {-5.5}).
	self assert: result equals: 5.5.

	result := (m perform: #fabs: env: 2 withArguments: {3.2}).
	self assert: result equals: 3.2
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsnan
	"Test math.isnan()"

	| m result nan |
	m := math new.
	nan := m perform: #nan env: 2.

	result := (m perform: #isnan: env: 2 withArguments: {nan}).
	self assert: result.

	result := (m perform: #isnan: env: 2 withArguments: {5.5}).
	self deny: result
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsinf
	"Test math.isinf()"

	| m result inf |
	m := math new.
	inf := m perform: #inf env: 2.

	result := (m perform: #isinf: env: 2 withArguments: {inf}).
	self assert: result.

	result := (m perform: #isinf: env: 2 withArguments: {5.5}).
	self deny: result
%

category: 'Tests - Floating Point'
method: MathTestCase
testIsfinite
	"Test math.isfinite()"

	| m result inf nan |
	m := math new.
	inf := m perform: #inf env: 2.
	nan := m perform: #nan env: 2.

	result := (m perform: #isfinite: env: 2 withArguments: {5.5}).
	self assert: result.

	result := (m perform: #isfinite: env: 2 withArguments: {inf}).
	self deny: result.

	result := (m perform: #isfinite: env: 2 withArguments: {nan}).
	self deny: result
%

category: 'Tests - Angular Conversion'
method: MathTestCase
testDegrees
	"Test math.degrees()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #degrees: env: 2 withArguments: {pi}).
	self assert: (((result perform: #- env: 0 withArguments: {180.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #degrees: env: 2 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}).
	self assert: (((result perform: #- env: 0 withArguments: {90.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Angular Conversion'
method: MathTestCase
testRadians
	"Test math.radians()"

	| m result pi |
	m := math new.
	pi := m perform: #pi env: 2.

	result := (m perform: #radians: env: 2 withArguments: {180}).
	self assert: (((result perform: #- env: 0 withArguments: {pi}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).

	result := (m perform: #radians: env: 2 withArguments: {90}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {2})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%



