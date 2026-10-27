Class {
	#name : 'FStringAstJoinedStrTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringAstJoinedStrTestCase >> testAstParseAnswersAnFStringAsAJoinedStr [
	"tests/python/fstring_ast_joinedstr.py: ast.parse answers an f-string as
	CPython's JoinedStr -- merged literal Constants, a FormattedValue per field
	with its conversion code and a JoinedStr spec -- which ast.unparse writes
	back and compile() runs.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_ast_joinedstr' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_ast_joinedstr.py')
		name: 'fstring_ast_joinedstr'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
