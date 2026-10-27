Class {
	#name : 'CmathInverseFunctionsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CmathInverseFunctionsTestCase >> testTheInverseFunctionsAndIscloseFollowCPython [
	"tests/python/cmath_inverse_functions.py: cmath.acos, acosh, asin, asinh,
	atan, atanh and isclose exist -- cmath >> __getattr__: answers them from
	CPython's cmathmodule.c ported to Python -- with CPython's regular and
	special values, no overflow for large arguments, atanh(1) a domain error,
	CPython's argument conversion and isclose's tolerances.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'cmath_inverse_functions' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cmath_inverse_functions.py')
		name: 'cmath_inverse_functions'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
