Class {
	#name : 'GlobalStatementCodegenTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
GlobalStatementCodegenTestCase >> setUp [
	"Load tests/python/global_statement_codegen.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_statement_codegen' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/global_statement_codegen.py')
		name: 'global_statement_codegen'.

]

{ #category : 'Grail-Tests' }
GlobalStatementCodegenTestCase >> testModuleImportsCleanly [
	"The module loads without raising at codegen time."

	self
		assert: (testModule @env1:___pyAttrLoad___: #compiles)
		equals: true.

]
