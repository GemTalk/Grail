Class {
	#name : 'FStringUnterminatedTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringUnterminatedTestCase >> testUnterminatedFStringIsNamedAsOne [
	"tests/python/fstring_unterminated.py: an unterminated f-string or
	t-string is reported as an unterminated f-string or t-string literal, and
	every other literal as a string literal, at the literal's start.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_unterminated' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_unterminated.py')
		name: 'fstring_unterminated'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
