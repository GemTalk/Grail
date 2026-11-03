Class {
	#name : 'UnicodeEscapePastTheLastCodePointTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeEscapePastTheLastCodePointTestCase >> testAnEscapePastTheLastCodePointIsASyntaxError [
	"tests/python/unicode_escape_past_the_last_code_point.py: a \U escape
	above U+10FFFF in a str literal is CPython's SyntaxError, at its position
	in the literal, as the unicode_escape codec refuses it -- not an OutOfRange
	that ends the session.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unicode_escape_past_the_last_code_point' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_escape_past_the_last_code_point.py')
		name: 'unicode_escape_past_the_last_code_point'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
