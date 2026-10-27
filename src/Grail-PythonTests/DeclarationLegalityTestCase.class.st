Class {
	#name : 'DeclarationLegalityTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DeclarationLegalityTestCase >> testGlobalNonlocalAndAnnotationsConflictAsCPythonsSymtableSays [
	"tests/python/declaration_legality.py: ``nonlocal x'' after a parameter,
	a read, an annotation or an assignment of x is a SyntaxError, as ``global
	x'' is, and so is a simple annotation after either declaration; ``(x):
	int'' alone binds nothing.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'declaration_legality' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/declaration_legality.py')
		name: 'declaration_legality'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
