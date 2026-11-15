Class {
	#name : 'CompileErrorTextTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-SyntaxErrors' }
CompileErrorTextTestCase >> testACompilerErrorHasTheCompilersTextAndColumns [
	"tests/python/compile_error_text.py: a SyntaxError CPython raises after
	the parse -- 'return' or 'await' outside function, 'break' outside loop,
	nonlocal at module level, a duplicate argument -- has as its text the line
	read back from the file it is reported in (None for '<string>', for a name
	that is no file and for a directory; the file's own line, newline kept,
	when there is one) and UTF-8 byte columns (test_exceptions
	test_string_source).  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'compile_error_text' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_error_text.py')
		name: 'compile_error_text'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
