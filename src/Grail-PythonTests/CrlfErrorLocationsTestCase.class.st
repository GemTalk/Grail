Class {
	#name : 'CrlfErrorLocationsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CrlfErrorLocationsTestCase >> testErrorsInCrlfSourceAreLocatedInTheTranslatedText [
	"tests/python/crlf_error_locations.py: a SyntaxError in a source with CRLF
	or lone CR line ends -- from the parser, the compiler, an f-string field or
	the indentation -- is located on the line and column CPython reports,
	which count the text with universal newlines.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'crlf_error_locations' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/crlf_error_locations.py')
		name: 'crlf_error_locations'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
