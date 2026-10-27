Class {
	#name : 'FloatAbsNegativeZeroTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FloatAbsNegativeZeroTestCase >> testAbsClearsTheSignBitAndCopysignKeepsAZerosSign [
	"tests/python/float_abs_negative_zero.py: abs(-0.0), math.fabs(-0.0) and
	(-0.0).__abs__() are 0.0 -- C's fabs, as CPython's float_abs -- and
	math.copysign gives a zero magnitude the sign asked for; cmath's zero
	parts keep their signs as a result.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'float_abs_negative_zero' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/float_abs_negative_zero.py')
		name: 'float_abs_negative_zero'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
