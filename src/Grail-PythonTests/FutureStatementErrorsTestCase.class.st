Class {
	#name : 'FutureStatementErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FutureStatementErrorsTestCase >> testUnknownFeaturesAndMisplacedImportsAreSyntaxErrors [
	"tests/python/future_statement_errors.py: a future statement naming an
	unknown feature, or ``braces'', is a SyntaxError at the name, and a
	``from __future__ import'' outside the module's leading block is one at the
	statement, while a syntax error elsewhere is still the one reported.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'future_statement_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/future_statement_errors.py')
		name: 'future_statement_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]
