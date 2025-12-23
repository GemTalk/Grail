! ===============================================================================
! CMathTestCase - Tests for Python cmath module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
CMathTestCase removeAllMethods: 0.
CMathTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for CMathTestCase

category: 'Tests - Constants'
method: CMathTestCase
testPi
	"Test cmath.pi constant"

	| cm result |
	cm := cmath perform: #new env: 0.
	result := cm perform: #pi env: 2.
	
	self assert: (((result perform: #- env: 0 withArguments: {3.14159}) perform: #abs env: 0) 
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Constants'
method: CMathTestCase
testE
	"Test cmath.e constant"

	| cm result |
	cm := cmath perform: #new env: 0.
	result := cm perform: #e env: 2.
	
	self assert: (((result perform: #- env: 0 withArguments: {2.71828}) perform: #abs env: 0) 
		perform: #< env: 0 withArguments: {0.001})
%

category: 'Tests - Constants'
method: CMathTestCase
testInf
	"Test cmath.inf constant"

	| cm result |
	cm := cmath perform: #new env: 0.
	result := cm perform: #inf env: 2.
	
	self assert: (result perform: #_getKind env: 0) equals: 3
%

category: 'Tests - Constants'
method: CMathTestCase
testInfj
	"Test cmath.infj constant"

	| cm result imag |
	cm := cmath perform: #new env: 0.
	result := cm perform: #infj env: 2.
	
	imag := result perform: #imag env: 2.
	self assert: (imag perform: #_getKind env: 0) equals: 3
%

category: 'Tests - Constants'
method: CMathTestCase
testNan
	"Test cmath.nan constant"

	| cm result |
	cm := cmath perform: #new env: 0.
	result := cm perform: #nan env: 2.
	
	self assert: (result perform: #_isNaN env: 0)
%

category: 'Tests - Constants'
method: CMathTestCase
testNanj
	"Test cmath.nanj constant"

	| cm result imag |
	cm := cmath perform: #new env: 0.
	result := cm perform: #nanj env: 2.
	
	imag := result perform: #imag env: 2.
	self assert: (imag perform: #_isNaN env: 0)
%

category: 'Tests - Exponential'
method: CMathTestCase
testExp
	"Test cmath.exp() with complex number"

	| cm z result real imag |
	cm := cmath perform: #new env: 0.
	
	"exp(0) = 1"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {0.0. 0.0}.
	result := (cm perform: #exp: env: 2 withArguments: {z}).
	real := result perform: #real env: 2.
	imag := result perform: #imag env: 2.
	
	self assert: (((real perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0) 
		perform: #< env: 0 withArguments: {0.00001}).
	self assert: ((imag perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Logarithmic'
method: CMathTestCase
testLog
	"Test cmath.log() with complex number"

	| cm z result real imag |
	cm := cmath perform: #new env: 0.
	
	"log(1) = 0"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}.
	result := (cm perform: #log: env: 2 withArguments: {z}).
	real := result perform: #real env: 2.
	imag := result perform: #imag env: 2.
	
	self assert: ((real perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).
	self assert: ((imag perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Power'
method: CMathTestCase
testSqrt
	"Test cmath.sqrt() with complex number"

	| cm z result real imag |
	cm := cmath perform: #new env: 0.

	"sqrt(4) = 2"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {4.0. 0.0}.
	result := (cm perform: #sqrt: env: 2 withArguments: {z}).
	real := result perform: #real env: 2.
	imag := result perform: #imag env: 2.

	self assert: (((real perform: #- env: 0 withArguments: {2.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).
	self assert: ((imag perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Polar'
method: CMathTestCase
testPhase
	"Test cmath.phase()"

	| cm z result pi |
	cm := cmath perform: #new env: 0.
	pi := cm perform: #pi env: 2.

	"phase(1+0j) = 0"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}.
	result := (cm perform: #phase: env: 2 withArguments: {z}).
	self assert: ((result perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001}).

	"phase(0+1j) = pi/2"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {0.0. 1.0}.
	result := (cm perform: #phase: env: 2 withArguments: {z}).
	self assert: (((result perform: #- env: 0 withArguments: {(pi perform: #/ env: 0 withArguments: {2.0})}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Polar'
method: CMathTestCase
testPolar
	"Test cmath.polar()"

	| cm z result r theta |
	cm := cmath perform: #new env: 0.

	"polar(3+4j) should give (5, atan(4/3))"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {3.0. 4.0}.
	result := (cm perform: #polar: env: 2 withArguments: {z}).

	r := result perform: #__getitem__: env: 2 withArguments: {0}.
	theta := result perform: #__getitem__: env: 2 withArguments: {1}.

	self assert: (((r perform: #- env: 0 withArguments: {5.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Polar'
method: CMathTestCase
testRect
	"Test cmath.rect()"

	| cm result real imag pi |
	cm := cmath perform: #new env: 0.
	pi := cm perform: #pi env: 2.

	"rect(1, 0) = 1+0j"
	result := (cm perform: #rect:_: env: 2 withArguments: {1.0. 0.0}).
	real := result perform: #real env: 2.
	imag := result perform: #imag env: 2.

	self assert: (((real perform: #- env: 0 withArguments: {1.0}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.00001}).
	self assert: ((imag perform: #abs env: 0) perform: #< env: 0 withArguments: {0.00001})
%

category: 'Tests - Classification'
method: CMathTestCase
testIsnan
	"Test cmath.isnan()"

	| cm z result nan |
	cm := cmath perform: #new env: 0.
	nan := cm perform: #nan env: 2.

	"isnan(nan+0j) = True"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {nan. 0.0}.
	result := (cm perform: #isnan: env: 2 withArguments: {z}).
	self assert: result.

	"isnan(1+0j) = False"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}.
	result := (cm perform: #isnan: env: 2 withArguments: {z}).
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsinf
	"Test cmath.isinf()"

	| cm z result inf |
	cm := cmath perform: #new env: 0.
	inf := cm perform: #inf env: 2.

	"isinf(inf+0j) = True"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {inf. 0.0}.
	result := (cm perform: #isinf: env: 2 withArguments: {z}).
	self assert: result.

	"isinf(1+0j) = False"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}.
	result := (cm perform: #isinf: env: 2 withArguments: {z}).
	self deny: result
%

category: 'Tests - Classification'
method: CMathTestCase
testIsfinite
	"Test cmath.isfinite()"

	| cm z result inf |
	cm := cmath perform: #new env: 0.
	inf := cm perform: #inf env: 2.

	"isfinite(1+2j) = True"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 2.0}.
	result := (cm perform: #isfinite: env: 2 withArguments: {z}).
	self assert: result.

	"isfinite(inf+0j) = False"
	z := complex perform: #___real:imaginary: env: 0 withArguments: {inf. 0.0}.
	result := (cm perform: #isfinite: env: 2 withArguments: {z}).
	self deny: result
%


