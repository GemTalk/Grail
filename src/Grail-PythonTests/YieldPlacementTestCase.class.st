Class {
	#name : 'YieldPlacementTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
YieldPlacementTestCase >> testYieldIsAcceptedOnlyWhereCPythonsGrammarPutsIt [
	"tests/python/yield_placement.py: a yield expression compiles as a
	statement, an assignment's right-hand side and a parenthesised group;
	inside a tuple, a call or an operator it is invalid syntax; inside a
	comprehension, past its outermost iterable, it is ``'yield' inside list
	comprehension'' and its kin.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'yield_placement' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/yield_placement.py')
		name: 'yield_placement'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
