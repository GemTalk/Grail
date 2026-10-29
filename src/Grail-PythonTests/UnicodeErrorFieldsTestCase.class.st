Class {
	#name : 'UnicodeErrorFieldsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeErrorFieldsTestCase >> testAUnicodeErrorsStrReadsItsFieldsAsTheyStand [
	"tests/python/unicode_error_fields.py: a UnicodeError's encoding, object,
	start, end and reason are attributes its str reads as they stand --
	assignment shows, del unsets, out-of-range bounds give a range rather than
	a crash, and a reason that changes the object is refused -- and
	UnicodeTranslateError and a bytearray-built UnicodeDecodeError print as
	CPython's do.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unicode_error_fields' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_error_fields.py')
		name: 'unicode_error_fields'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
