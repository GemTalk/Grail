Class {
	#name : 'ImportedSyntaxErrorFilenameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ImportedSyntaxErrorFilenameTestCase >> testAnImportedModulesSyntaxErrorNamesItsFile [
	"tests/python/imported_syntax_error_filename.py: a module that cannot be
	imported -- refused by the parser, the compiler or its decoding, as a
	submodule or through a star import -- raises a SyntaxError naming the
	module's file, in args as well, the tokenizer's warnings name it, and an
	exec() the module body runs still says <string>.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'imported_syntax_error_filename' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/imported_syntax_error_filename.py')
		name: 'imported_syntax_error_filename'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
