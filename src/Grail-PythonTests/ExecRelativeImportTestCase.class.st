Class {
	#name : 'ExecRelativeImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExecRelativeImportTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ExecRelativeImportTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ExecRelativeImportTestCase >> setUp [

	importlib @env1:modules removeKey: #'exec_relative_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_relative_import.py')
		name: 'exec_relative_import'

]

{ #category : 'Grail-Tests - runtime' }
ExecRelativeImportTestCase >> testDunderImportAndImportModuleResolveALevel [

	self assertAll: #('dunder_import_with_a_level' 'import_module_relative')

]

{ #category : 'Grail-Tests - exec' }
ExecRelativeImportTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - exec' }
ExecRelativeImportTestCase >> testRelativeImportInExecResolvesAgainstItsGlobals [

	self assertAll: #('parent_package_and_a_module_in_it' 'own_package_and_a_module_in_it'
		'inside_a_function_and_a_class_body' 'package_from_spec_parent'
		'a_meta_path_loader_execing_a_package_module')

]

{ #category : 'Grail-Tests - exec' }
ExecRelativeImportTestCase >> testRelativeImportRefusals [

	self assertAll: #('no_parent_package' 'beyond_the_top_level_package')

]
