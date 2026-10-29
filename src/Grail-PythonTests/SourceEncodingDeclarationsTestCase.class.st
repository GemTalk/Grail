Class {
	#name : 'SourceEncodingDeclarationsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SourceEncodingDeclarationsTestCase >> testBytesSourceIsReadInItsDeclaredEncoding [
	"tests/python/source_encoding_declarations.py: compile() reads a bytes
	source in the encoding its PEP 263 declaration names, on the first line or
	the second, refuses a BOM beside any declaration but UTF-8, and reports an
	encoding that cannot read the source with the codec's message.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'source_encoding_declarations' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/source_encoding_declarations.py')
		name: 'source_encoding_declarations'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
