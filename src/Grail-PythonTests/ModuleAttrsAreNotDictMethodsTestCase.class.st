Class {
	#name : 'ModuleAttrsAreNotDictMethodsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ModuleAttrsAreNotDictMethodsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ModuleAttrsAreNotDictMethodsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ModuleAttrsAreNotDictMethodsTestCase >> setUp [

	importlib @env1:modules removeKey: #'module_attrs_are_not_dict_methods' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attrs_are_not_dict_methods.py')
		name: 'module_attrs_are_not_dict_methods'

]

{ #category : 'Grail-Tests - attributes' }
ModuleAttrsAreNotDictMethodsTestCase >> testAnInheritedDictMethodIsNotAModuleAttribute [

	self assertAll: #('no_inherited_dict_method_is_a_module_attribute'
		'getattr_raises_attribute_error_for_each')

]

{ #category : 'Grail-Tests - attributes' }
ModuleAttrsAreNotDictMethodsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - attributes' }
ModuleAttrsAreNotDictMethodsTestCase >> testTheModuleSurvivesReadingEveryOneOfThem [
	"The order these are read in is the order that emptied the module and then
	raised KeyError on the empty dict."

	self assertAll: #('the_module_survives_reading_every_one'
		'and_textwrap_too')

]

{ #category : 'Grail-Tests - attributes' }
ModuleAttrsAreNotDictMethodsTestCase >> testTheReadsThatShouldWorkAreUnchanged [

	self assertAll: #('a_modules_own_names_still_read'
		'dunder_accessors_still_read'
		'a_missing_name_is_still_an_attribute_error'
		'hasattr_is_false_for_a_missing_name'
		'the_module_is_still_iterable_by_dir')

]
