Class {
	#name : 'FStringOpenFieldTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringOpenFieldTestCase >> testFStringEndingInsideAFieldIsCPythonsErrorForIt [
	"tests/python/fstring_open_field.py: an f-string that ends inside a
	replacement field -- at a string that took its quote, or at its quote in a
	format spec -- is CPython's ``expecting '}''' error once the field's own
	tokens are fine, a comment that took the brace leaves it never closed, and
	a closer of the wrong kind is a mismatched bracket.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_open_field' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_open_field.py')
		name: 'fstring_open_field'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
