Class {
	#name : 'CmathPortedFunctionsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CmathPortedFunctionsTestCase >> testTheOriginalFunctionsFollowCmathmodule [
	"tests/python/cmath_ported_functions.py: cmath's sqrt, exp, log, the
	trigonometric and hyperbolic functions, phase, polar, rect and the
	classifiers keep the signs of zeros, give C99's special values, raise
	CPython's domain and range errors, take log's base and convert their
	arguments as CPython does.  They computed by textbook formulas before.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'cmath_ported_functions' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cmath_ported_functions.py')
		name: 'cmath_ported_functions'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
