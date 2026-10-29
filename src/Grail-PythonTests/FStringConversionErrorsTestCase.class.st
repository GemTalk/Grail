Class {
	#name : 'FStringConversionErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringConversionErrorsTestCase >> testConversionIsSOrROrAWrittenRightAfterTheBang [
	"tests/python/fstring_conversion_errors.py: an f-string conversion is the
	whole NAME after the ``!'', and only s, r and a, written right after it
	and followed by ``:'' or ``}''; each refusal is CPython's message at
	CPython's location.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_conversion_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_conversion_errors.py')
		name: 'fstring_conversion_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
