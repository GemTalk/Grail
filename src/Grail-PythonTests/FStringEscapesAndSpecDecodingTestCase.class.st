Class {
	#name : 'FStringEscapesAndSpecDecodingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringEscapesAndSpecDecodingTestCase >> testEscapesAreTextAndAFormatSpecDecodesThem [
	"tests/python/fstring_escapes_and_spec_decoding.py: a brace spelled as an
	escape is literal text, not a replacement field, and a non-raw f-string's
	format spec decodes its escapes while a raw one keeps them.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_escapes_and_spec_decoding' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_escapes_and_spec_decoding.py')
		name: 'fstring_escapes_and_spec_decoding'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
