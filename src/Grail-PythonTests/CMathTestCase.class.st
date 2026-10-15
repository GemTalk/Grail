Class {
	#name : 'CMathTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testE [
	"Test cmath.e constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:e.
	
	self assert: (((result - 2.71828) abs) 
		< 0.001)

]

{ #category : 'Grail-Tests - Exponential' }
CMathTestCase >> testExp [
	"Test cmath.exp() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 0.0 _: 0.0.
	result := cm @env1:exp: z.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 1.0) abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)

]

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testInf [
	"Test cmath.inf constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:inf.
	
	self assert: (result _getKind) equals: 3

]

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testInfj [
	"Test cmath.infj constant"

	| cm result imag |
	cm := cmath @env1:instance.
	result := cm @env1:infj.
	
	imag := result @env1:imag.
	self assert: (imag _getKind) equals: 3

]

{ #category : 'Grail-Tests - Classification' }
CMathTestCase >> testIsfinite [
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

]

{ #category : 'Grail-Tests - Classification' }
CMathTestCase >> testIsinf [
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

]

{ #category : 'Grail-Tests - Classification' }
CMathTestCase >> testIsnan [
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

]

{ #category : 'Grail-Tests - Logarithmic' }
CMathTestCase >> testLog [
	"Test cmath.log() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 1.0 _: 0.0.
	result := cm @env1:log: z.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: ((real abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)

]

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testNan [
	"Test cmath.nan constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:nan.
	
	self assert: (result _isNaN)

]

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testNanj [
	"Test cmath.nanj constant"

	| cm result imag |
	cm := cmath @env1:instance.
	result := cm @env1:nanj.
	
	imag := result @env1:imag.
	self assert: (imag _isNaN)

]

{ #category : 'Grail-Tests - Polar' }
CMathTestCase >> testPhase [
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

]

{ #category : 'Grail-Tests - Constants' }
CMathTestCase >> testPi [
	"Test cmath.pi constant"

	| cm result |
	cm := cmath @env1:instance.
	result := cm @env1:pi.
	
	self assert: (((result - 3.14159) abs) 
		< 0.001)

]

{ #category : 'Grail-Tests - Polar' }
CMathTestCase >> testPolar [
	"Test cmath.polar() — Phase-4 direct method dispatch."

	| cm z result r |
	cm := cmath @env1:instance.

	z := complex ___new___: 3.0 _: 4.0.
	result := cm @env1:polar: z.

	r := result @env1:__getitem__: 0.
	self assert: (((r - 5.0) abs) < 0.00001)

]

{ #category : 'Grail-Tests - Polar' }
CMathTestCase >> testRect [
	"Test cmath.rect() — Phase-4 direct method dispatch."

	| cm result real imag |
	cm := cmath @env1:instance.

	result := cm @env1:rect: 1.0 _: 0.0.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 1.0) abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)

]

{ #category : 'Grail-Tests - Power' }
CMathTestCase >> testSqrt [
	"Test cmath.sqrt() — Phase-4 direct method dispatch."

	| cm z result real imag |
	cm := cmath @env1:instance.

	z := complex ___new___: 4.0 _: 0.0.
	result := cm @env1:sqrt: z.
	real := result @env1:real.
	imag := result @env1:imag.

	self assert: (((real - 2.0) abs) < 0.00001).
	self assert: ((imag abs) < 0.00001)

]
