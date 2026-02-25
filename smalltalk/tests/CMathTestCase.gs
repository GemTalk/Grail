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
	cm := cmath perform: #instance env: 1.
	result := cm perform: #e env: 1.
	
	self assert: (((result - 2.71828) abs) 
		< 0.001)
%

category: 'Tests - Exponential'
method: CMathTestCase
testExp
	"Test cmath.exp() with complex number"

	| cm expBlock z result real imag |
	cm := cmath perform: #instance env: 1.
	expBlock := cm perform: #exp env: 1.
	
	"exp(0) = 1"
	z := complex ___new___: 0.0 _: 0.0.
	result := expBlock value: {z} value: nil.
	real := result perform: #real env: 1.
	imag := result perform: #imag env: 1.
	
	self assert: (((real - 1.0) abs) 
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Constants'
method: CMathTestCase
testInf
	"Test cmath.inf constant"

	| cm result |
	cm := cmath perform: #instance env: 1.
	result := cm perform: #inf env: 1.
	
	self assert: (result _getKind) equals: 3
%

category: 'Tests - Constants'
method: CMathTestCase
testInfj
	"Test cmath.infj constant"

	| cm result imag |
	cm := cmath perform: #instance env: 1.
	result := cm perform: #infj env: 1.
	
	imag := result perform: #imag env: 1.
	self assert: (imag _getKind) equals: 3
%

category: 'Tests - Classification'
method: CMathTestCase
testIsfinite
	"Test cmath.isfinite()"

	| cm isfiniteBlock z result inf |
	cm := cmath perform: #instance env: 1.
	inf := cm perform: #inf env: 1.
	isfiniteBlock := cm perform: #isfinite env: 1.

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
	cm := cmath perform: #instance env: 1.
	inf := cm perform: #inf env: 1.
	isinfBlock := cm perform: #isinf env: 1.

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
	cm := cmath perform: #instance env: 1.
	nan := cm perform: #nan env: 1.
	isnanBlock := cm perform: #isnan env: 1.

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
	cm := cmath perform: #instance env: 1.
	logBlock := cm perform: #log env: 1.
	
	"log(1) = 0"
	z := complex ___new___: 1.0 _: 0.0.
	result := logBlock value: {z} value: nil.
	real := result perform: #real env: 1.
	imag := result perform: #imag env: 1.
	
	self assert: ((real abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Constants'
method: CMathTestCase
testNan
	"Test cmath.nan constant"

	| cm result |
	cm := cmath perform: #instance env: 1.
	result := cm perform: #nan env: 1.
	
	self assert: (result _isNaN)
%

category: 'Tests - Constants'
method: CMathTestCase
testNanj
	"Test cmath.nanj constant"

	| cm result imag |
	cm := cmath perform: #instance env: 1.
	result := cm perform: #nanj env: 1.
	
	imag := result perform: #imag env: 1.
	self assert: (imag _isNaN)
%

category: 'Tests - Polar'
method: CMathTestCase
testPhase
	"Test cmath.phase()"

	| cm phaseBlock z result pi |
	cm := cmath perform: #instance env: 1.
	pi := cm perform: #pi env: 1.
	phaseBlock := cm perform: #phase env: 1.

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
	cm := cmath perform: #instance env: 1.
	result := cm perform: #pi env: 1.
	
	self assert: (((result - 3.14159) abs) 
		< 0.001)
%

category: 'Tests - Polar'
method: CMathTestCase
testPolar
	"Test cmath.polar()"

	| cm polarBlock z result r theta |
	cm := cmath perform: #instance env: 1.
	polarBlock := cm perform: #polar env: 1.

	"polar(3+4j) should give (5, atan(4/3))"
	z := complex ___new___: 3.0 _: 4.0.
	result := polarBlock value: {z} value: nil.

	r := result perform: #__getitem__: env: 1 withArguments: {0}.
	theta := result perform: #__getitem__: env: 1 withArguments: {1}.

	self assert: (((r - 5.0) abs)
		< 0.00001)
%

category: 'Tests - Polar'
method: CMathTestCase
testRect
	"Test cmath.rect()"

	| cm rectBlock result real imag pi |
	cm := cmath perform: #instance env: 1.
	pi := cm perform: #pi env: 1.
	rectBlock := cm perform: #rect env: 1.

	"rect(1, 0) = 1+0j"
	result := rectBlock value: {1.0. 0.0} value: nil.
	real := result perform: #real env: 1.
	imag := result perform: #imag env: 1.

	self assert: (((real - 1.0) abs)
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%

category: 'Tests - Power'
method: CMathTestCase
testSqrt
	"Test cmath.sqrt() with complex number"

	| cm sqrtBlock z result real imag |
	cm := cmath perform: #instance env: 1.
	sqrtBlock := cm perform: #sqrt env: 1.

	"sqrt(4) = 2"
	z := complex ___new___: 4.0 _: 0.0.
	result := sqrtBlock value: {z} value: nil.
	real := result perform: #real env: 1.
	imag := result perform: #imag env: 1.

	self assert: (((real - 2.0) abs)
		< 0.00001).
	self assert: ((imag abs) < 0.00001)
%
