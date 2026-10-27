Class {
	#name : 'TokenizerDiagnosticsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TokenizerDiagnosticsTestCase >> testLiteralWarningsAndInvalidCharactersAreCPythons [
	"tests/python/tokenizer_literal_and_character_diagnostics.py: a number
	written against a following keyword warns ``invalid decimal literal'' and
	its kin, an error under an error filter; a non-ASCII character that starts
	no token is ``invalid character'' or ``invalid non-printable character''
	by code point; identifiers, strings and comments are untouched; and the
	tokenizer's warnings name the compiled file.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'tokenizer_literal_and_character_diagnostics' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tokenizer_literal_and_character_diagnostics.py')
		name: 'tokenizer_literal_and_character_diagnostics'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
