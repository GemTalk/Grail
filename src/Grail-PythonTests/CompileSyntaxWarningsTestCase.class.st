Class {
	#name : 'CompileSyntaxWarningsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CompileSyntaxWarningsTestCase >> testCompileWarnsAsCPythonsCodeGeneratorDoes [
	"tests/python/compile_syntax_warnings.py: compile() warns about an assert
	of a parenthesised tuple, ``is'' with a literal and a literal called or
	subscripted where a comma was meant -- with CPython's text, the compiled
	file's name and the line -- warns about nothing else, and raises a
	SyntaxError at the same place when a filter makes the warning an error.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'compile_syntax_warnings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_syntax_warnings.py')
		name: 'compile_syntax_warnings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
