Class {
	#name : 'ModuleFunctionMetadataTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ModuleFunctionMetadataTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ModuleFunctionMetadataTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ModuleFunctionMetadataTestCase >> setUp [

	importlib @env1:modules removeKey: #'module_function_metadata' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_function_metadata.py')
		name: 'module_function_metadata'

]

{ #category : 'Grail-Tests - lambdas' }
ModuleFunctionMetadataTestCase >> testALambdasCodeObject [

	self assertAll: #('a_lambdas_code_object' 'a_lambda_has_its_signature')

]

{ #category : 'Grail-Tests - assigned defaults' }
ModuleFunctionMetadataTestCase >> testANonTupleOrNonDictIsRefused [

	self assertAll: #('a_non_tuple_or_non_dict_is_refused')

]

{ #category : 'Grail-Tests - assigned defaults' }
ModuleFunctionMetadataTestCase >> testAssignedDefaultsChangeWhatTheCallBinds [

	self assertAll: #('a_module_defs_assigned_defaults_bind'
		'a_methods_assigned_defaults_bind' 'a_later_write_replaces_an_uncarried_one')

]

{ #category : 'Grail-Tests - what #1228 reported' }
ModuleFunctionMetadataTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 11

]

{ #category : 'Grail-Tests - what #1228 reported' }
ModuleFunctionMetadataTestCase >> testTheReportedGapsStayClosed [

	self assertAll: #('a_module_def_has_its_metadata'
		'inspect_classes_a_module_def_as_a_function' 'getfullargspec_of_a_module_def'
		'update_wrapper_and_wraps_on_module_defs' 'doctest_finds_a_module_defs_docstring')

]
