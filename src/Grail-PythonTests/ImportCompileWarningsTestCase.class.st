Class {
	#name : 'ImportCompileWarningsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ImportCompileWarningsTestCase >> testImportingAModuleEmitsTheCodeGeneratorWarnings [
	"tests/python/import_compile_warnings.py: importing a module with ``x is
	1'', an always-true assert or a literal called where a comma was meant
	emits CPython's SyntaxWarnings, naming the module's file and line, and a
	filter that makes them errors makes the import a SyntaxError there.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'import_compile_warnings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_compile_warnings.py')
		name: 'import_compile_warnings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
