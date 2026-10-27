Class {
	#name : 'FStringIsNotADocstringTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringIsNotADocstringTestCase >> testAnFStringFirstInABodyIsNoDocstring [
	"tests/python/fstring_is_not_a_docstring.py: a function, class or module
	whose body opens with an f-string -- with or without fields, or a string
	concatenated with one -- has no docstring.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_is_not_a_docstring' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_is_not_a_docstring.py')
		name: 'fstring_is_not_a_docstring'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
