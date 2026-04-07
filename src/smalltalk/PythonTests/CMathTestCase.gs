! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CMathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CMathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CMathTestCase category: 'SUnit'
%

! ===============================================================================
! CMathTestCase - Tests for Python cmath module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
CMathTestCase removeAllMethods: 0.
CMathTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - Constants'
method: CMathTestCase
testE
	"Test cmath.e constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:e.
	
	self assert: (((result - 2.71828) abs) 
		< 0.001)
%

category: 'Tests - Exponential'
method: CMathTestCase
testExp
	"Test cmath.exp() with complex number"

	| cm expBlock z result real imag |
	cm := cmath @env1:instance.
	expBlock := cm @env1:exp.
	
	"exp(0) = 1"
	z := complex ___new___: 0.0 _: 0.0.
	result := expBlock value: {z} value: nil.
	real := result @env1:real.
	imag := result @env1:imag.
	
	self assert: (((real - 1.0) abs) 
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Constants'
method: CMathTestCase
testInf
	"Test cmath.inf constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:inf.
	
	self assert: (result _getKind) equals: 3
%

category: 'Tests - Constants'
method: CMathTestCase
testInfj
	"Test cmath.infj constant"

	| cm result imag |
	cm := cmath @env1:instance.
	result := cm @env1:infj.
	
	imag := result @env1:imag.
	self assert: (imag _getKind) equals: 3
%

category: 'Tests - Classification'
method: CMathTestCase
testIsfinite
	"Test cmath.isfinite()"

	| cm isfiniteBlock z result inf |
	cm := cmath @env1:instance.
	inf := cm @env1:inf.
	isfiniteBlock := cm @env1:isfinite.

	"isfinite(1+2j) = True"
	z := complex ___new___: 1.0 _: 2.0.
	result := isfiniteBlock value: {z} value: nil.
	self assert: result.

	"isfinite(inf+0j) = False"
	z := complex ___new___: inf _: 0.0.
	result := isfiniteBlock value: {z} value: nil.
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsinf
	"Test cmath.isinf()"

	| cm isinfBlock z result inf |
	cm := cmath @env1:instance.
	inf := cm @env1:inf.
	isinfBlock := cm @env1:isinf.

	"isinf(inf+0j) = True"
	z := complex ___new___: inf _: 0.0.
	result := isinfBlock value: {z} value: nil.
	self assert: result.

	"isinf(1+0j) = False"
	z := complex ___new___: 1.0 _: 0.0.
	result := isinfBlock value: {z} value: nil.
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsnan
	"Test cmath.isnan()"

	| cm isnanBlock z result nan |
	cm := cmath @env1:instance.
	nan := cm @env1:nan.
	isnanBlock := cm @env1:isnan.

	"isnan(nan+0j) = True"
	z := complex ___new___: nan _: 0.0.
	result := isnanBlock value: {z} value: nil.
	self assert: result.

	"isnan(1+0j) = False"
	z := complex ___new___: 1.0 _: 0.0.
	result := isnanBlock value: {z} value: nil.
	self deny: result
%

category: 'Tests - Logarithmic'
method: CMathTestCase
testLog
	"Test cmath.log() with complex number"

	| cm logBlock z result real imag |
	cm := cmath @env1:instance.
	logBlock := cm @env1:log.
	
	"log(1) = 0"
	z := complex ___new___: 1.0 _: 0.0.
	result := logBlock value: {z} value: nil.
	real := result @env1:real.
	imag := result @env1:imag.
	
	self assert: ((real abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Constants'
method: CMathTestCase
testNan
	"Test cmath.nan constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:nan.
	
	self assert: (result _isNaN)
%

category: 'Tests - Constants'
method: CMathTestCase
testNanj
	"Test cmath.nanj constant"

	| cm result imag |
	cm := cmath @env1:instance.
	result := cm @env1:nanj.
	
	imag := result @env1:imag.
	self assert: (imag _isNaN)
%

category: 'Tests - Polar'
method: CMathTestCase
testPhase
	"Test cmath.phase()"

	| cm phaseBlock z result pi |
	cm := cmath @env1:instance.
	pi := cm @env1:pi.
	phaseBlock := cm @env1:phase.

	"phase(1+0j) = 0"
	z := complex ___new___: 1.0 _: 0.0.
	result := phaseBlock value: {z} value: nil.
	self assert: ((result abs) < 0.00001).

	"phase(0+1j) = pi/2"
	z := complex ___new___: 0.0 _: 1.0.
	result := phaseBlock value: {z} value: nil.
	self assert: (((result - (pi / 2.0)) abs)
		< 0.00001)
%

category: 'Tests - Constants'
method: CMathTestCase
testPi
	"Test cmath.pi constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:pi.
	
	self assert: (((result - 3.14159) abs) 
		< 0.001)
%

category: 'Tests - Polar'
method: CMathTestCase
testPolar
	"Test cmath.polar()"

	| cm polarBlock z result r theta |
	cm := cmath @env1:instance.
	polarBlock := cm @env1:polar.

	"polar(3+4j) should give (5, atan(4/3))"
	z := complex ___new___: 3.0 _: 4.0.
	result := polarBlock value: {z} value: nil.

	r := result @env1:__getitem__: 0.
	theta := result @env1:__getitem__: 1.

	self assert: (((r - 5.0) abs)
		< 0.00001)
%

category: 'Tests - Polar'
method: CMathTestCase
testRect
	"Test cmath.rect()"

	| cm rectBlock result real imag pi |
	cm := cmath @env1:instance.
	pi := cm @env1:pi.
	rectBlock := cm @env1:rect.

	"rect(1, 0) = 1+0j"
	result := rectBlock value: {1.0. 0.0} value: nil.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 1.0) abs)
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Power'
method: CMathTestCase
testSqrt
	"Test cmath.sqrt() with complex number"

	| cm sqrtBlock z result real imag |
	cm := cmath @env1:instance.
	sqrtBlock := cm @env1:sqrt.

	"sqrt(4) = 2"
	z := complex ___new___: 4.0 _: 0.0.
	result := sqrtBlock value: {z} value: nil.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 2.0) abs)
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%
