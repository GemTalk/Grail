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
	"Test cmath.exp() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 0.0 _: 0.0.
	result := cm @env1:exp: z.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 1.0) abs) < 0.00001).
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
	"Test cmath.isfinite() — Phase-4 direct method dispatch."

	| cm z result inf |
	cm := cmath @env1:instance.
	inf := cm @env1:inf.

	z := complex ___new___: 1.0 _: 2.0.
	result := cm @env1:isfinite: z.
	self assert: result.

	z := complex ___new___: inf _: 0.0.
	result := cm @env1:isfinite: z.
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsinf
	"Test cmath.isinf() — Phase-4 direct method dispatch."

	| cm z result inf |
	cm := cmath @env1:instance.
	inf := cm @env1:inf.

	z := complex ___new___: inf _: 0.0.
	result := cm @env1:isinf: z.
	self assert: result.

	z := complex ___new___: 1.0 _: 0.0.
	result := cm @env1:isinf: z.
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsnan
	"Test cmath.isnan() — Phase-4 direct method dispatch."

	| cm z result nan |
	cm := cmath @env1:instance.
	nan := cm @env1:nan.

	z := complex ___new___: nan _: 0.0.
	result := cm @env1:isnan: z.
	self assert: result.

	z := complex ___new___: 1.0 _: 0.0.
	result := cm @env1:isnan: z.
	self deny: result
%

category: 'Tests - Logarithmic'
method: CMathTestCase
testLog
	"Test cmath.log() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 1.0 _: 0.0.
	result := cm @env1:log: z.
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
	"Test cmath.phase() — Phase-4 direct method dispatch."

	| cm z result pi |
	cm := cmath @env1:instance.
	pi := cm @env1:pi.

	z := complex ___new___: 1.0 _: 0.0.
	result := cm @env1:phase: z.
	self assert: ((result abs) < 0.00001).

	z := complex ___new___: 0.0 _: 1.0.
	result := cm @env1:phase: z.
	self assert: (((result - (pi / 2.0)) abs) < 0.00001)
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
	"Test cmath.polar() — Phase-4 direct method dispatch."

	| cm z result r |
	cm := cmath @env1:instance.

	z := complex ___new___: 3.0 _: 4.0.
	result := cm @env1:polar: z.

	r := result @env1:__getitem__: 0.
	self assert: (((r - 5.0) abs) < 0.00001)
%

category: 'Tests - Polar'
method: CMathTestCase
testRect
	"Test cmath.rect() — Phase-4 direct method dispatch."

	| cm result real imag |
	cm := cmath @env1:instance.

	result := cm @env1:rect: 1.0 _: 0.0.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 1.0) abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Power'
method: CMathTestCase
testSqrt
	"Test cmath.sqrt() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 4.0 _: 0.0.
	result := cm @env1:sqrt: z.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 2.0) abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)
%
