Class {
	#name : 'UnicodeEscapeDecodesNamedCharactersTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeEscapeDecodesNamedCharactersTestCase >> testTheCodecDecodesANameAndRefusesABadOne [
	"tests/python/unicode_escape_decodes_named_characters.py: the
	unicode-escape codec decodes \N{NAME} case-insensitively, refuses a
	malformed escape or an unknown name with CPython's reason and span, and
	error handlers drop or replace exactly the escape.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unicode_escape_decodes_named_characters' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_escape_decodes_named_characters.py')
		name: 'unicode_escape_decodes_named_characters'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
