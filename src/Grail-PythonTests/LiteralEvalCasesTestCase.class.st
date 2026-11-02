Class {
	#name : 'LiteralEvalCasesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
LiteralEvalCasesTestCase >> testLiteralEvalAnswersAndRefusesAsCPythonDoes [
	"tests/python/literal_eval_cases.py: numbers, strings with every escape,
	containers, singletons and AST nodes evaluate as CPython's literal_eval
	evaluates them, and what is no literal is its ``malformed node or string''
	or SyntaxError.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'literal_eval_cases' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/literal_eval_cases.py')
		name: 'literal_eval_cases'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
