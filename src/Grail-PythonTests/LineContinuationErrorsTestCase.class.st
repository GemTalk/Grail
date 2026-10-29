Class {
	#name : 'LineContinuationErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
LineContinuationErrorsTestCase >> testBackslashMustEndItsLineAndSpecsEndAtTheirLine [
	"tests/python/line_continuation_errors.py: a backslash outside a string
	followed by anything but its newline, or continuing into the end of the
	source, is CPython's error at CPython's location -- in an f-string field
	too -- and a newline in a single-quoted f-string's spec is refused.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'line_continuation_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/line_continuation_errors.py')
		name: 'line_continuation_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
