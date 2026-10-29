Class {
	#name : 'MissingCommaTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MissingCommaTestCase >> testTwoExpressionsSideBySideInBracketsAreAMissingComma [
	"tests/python/missing_comma.py: inside brackets, where an expression
	starts, a disjunction followed directly by another expression is
	CPython's missing-comma error over both, and every shape CPython leaves
	alone is still plain invalid syntax.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'missing_comma' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/missing_comma.py')
		name: 'missing_comma'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
