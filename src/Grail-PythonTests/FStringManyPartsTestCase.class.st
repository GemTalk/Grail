Class {
	#name : 'FStringManyPartsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringManyPartsTestCase >> testAnFStringOfVeryManyPartsCompilesInOrder [
	"tests/python/fstring_many_parts.py: f-strings of hundreds of fields, and
	256 of them concatenated, compile and evaluate their fields left to
	right.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_many_parts' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_many_parts.py')
		name: 'fstring_many_parts'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
