Class {
	#name : 'CompileErrorFilenameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CompileErrorFilenameTestCase >> testASyntaxErrorReportsTheFileCompileWasGiven [
	"tests/python/compile_error_filename.py: ``compile(src, 'mod.py', ...)''
	raises a SyntaxError whose filename is 'mod.py', for parser, tokenizer,
	indentation and declaration errors; exec() and eval() of a str report
	'<string>'.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'compile_error_filename' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_error_filename.py')
		name: 'compile_error_filename'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
