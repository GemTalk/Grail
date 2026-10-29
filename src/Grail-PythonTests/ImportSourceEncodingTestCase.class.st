Class {
	#name : 'ImportSourceEncodingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ImportSourceEncodingTestCase >> testAModuleIsReadInItsDeclaredEncoding [
	"tests/python/import_source_encoding.py: importing a module file reads it
	in the encoding its PEP 263 declaration names, on the first line or the
	second, drops a UTF-8 BOM, and refuses an undeclared non-UTF-8 file, a BOM
	beside another encoding and an unknown encoding with CPython's
	SyntaxErrors.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'import_source_encoding' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_source_encoding.py')
		name: 'import_source_encoding'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
