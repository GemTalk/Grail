Class {
	#name : 'ALexerErrorNamesItsLineWithoutTheNewlineTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ALexerErrorNamesItsLineWithoutTheNewlineTestCase >> testALexerErrorsTextIsItsLineWithoutTheNewline [
	"tests/python/a_lexer_error_names_its_line_without_the_newline.py: the
	SyntaxError text of an unterminated string, a bracket error, an invalid
	literal or character, incompatible prefixes and an f-string's lexer
	errors is the line without its newline, while the parser's errors, a
	line continuation and an unindent keep it.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_lexer_error_names_its_line_without_the_newline' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_lexer_error_names_its_line_without_the_newline.py')
		name: 'a_lexer_error_names_its_line_without_the_newline'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
