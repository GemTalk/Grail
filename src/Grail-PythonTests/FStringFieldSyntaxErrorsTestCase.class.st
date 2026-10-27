Class {
	#name : 'FStringFieldSyntaxErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringFieldSyntaxErrorsTestCase >> testAnFStringFieldRaisesCPythonsSyntaxError [
	"tests/python/fstring_field_syntax_errors.py: a single '}' outside a field,
	a lambda without parentheses, a field opening with **, and an unmatched
	closer in a field raise CPython's SyntaxError, for f- and t-strings, while
	the valid shapes beside them still compile.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_field_syntax_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_field_syntax_errors.py')
		name: 'fstring_field_syntax_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
