Class {
	#name : 'AnUnterminatedStringIsDetectedAtTheLastLineTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AnUnterminatedStringIsDetectedAtTheLastLineTestCase >> testAnUnterminatedTripleQuotedStringNamesTheLastLine [
	"tests/python/an_unterminated_string_is_detected_at_the_last_line.py: an
	unterminated triple-quoted string is detected at the last line, whether
	the source ends in a newline or not and in eval input too, and a
	single-quoted one at its own line.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'an_unterminated_string_is_detected_at_the_last_line' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/an_unterminated_string_is_detected_at_the_last_line.py')
		name: 'an_unterminated_string_is_detected_at_the_last_line'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
