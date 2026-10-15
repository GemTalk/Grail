Class {
	#name : 'WarningsAndDecoratedPropertiesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
WarningsAndDecoratedPropertiesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
WarningsAndDecoratedPropertiesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
WarningsAndDecoratedPropertiesTestCase >> setUp [

	importlib @env1:modules removeKey: #'warnings_and_decorated_properties' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_and_decorated_properties.py')
		name: 'warnings_and_decorated_properties'

]

{ #category : 'Grail-Tests - warnings' }
WarningsAndDecoratedPropertiesTestCase >> testAFreshWarningsIsANewModule [

	self assertAll: #('a_fresh_warnings_is_a_new_working_module')

]

{ #category : 'Grail-Tests - properties' }
WarningsAndDecoratedPropertiesTestCase >> testDecoratedPropertyAccessorsRun [

	self assertAll: #('a_property_over_a_decorator_runs_the_decorated_accessors'
		'a_deprecated_property_getter_warns')

]

{ #category : 'Grail-Tests - warnings' }
WarningsAndDecoratedPropertiesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests - exec' }
WarningsAndDecoratedPropertiesTestCase >> testExecInAFunctionImportsAndNamesItsFrames [

	self assertAll: #('a_bare_exec_in_a_function_can_import'
		'exec_d_code_reports_compile_s_filename')

]

{ #category : 'Grail-Tests - identity' }
WarningsAndDecoratedPropertiesTestCase >> testMethodsInheritedFromObjectAreObjects [

	self assertAll: #('a_method_inherited_from_object_is_object_s'
		'a_deprecated_class_without_init_rejects_arguments')

]

{ #category : 'Grail-Tests - warnings' }
WarningsAndDecoratedPropertiesTestCase >> testSurrogateFilenameAndPublicApi [

	self assertAll: #('a_lone_surrogate_filename_is_recorded'
		'warnings_declares_its_public_api')

]

{ #category : 'Grail-Tests - warnings' }
WarningsAndDecoratedPropertiesTestCase >> testWarnExplicitAsksTheLoader [

	self assertAll: #('warn_explicit_asks_the_loader_for_the_source'
		'warn_explicit_shows_the_loader_s_line'
		'the_source_is_split_by_str_s_own_splitlines')

]
