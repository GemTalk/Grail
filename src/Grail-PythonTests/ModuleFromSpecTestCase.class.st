Class {
	#name : 'ModuleFromSpecTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ModuleFromSpecTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ModuleFromSpecTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ModuleFromSpecTestCase >> setUp [

	importlib @env1:modules removeKey: #'module_from_spec' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_from_spec.py')
		name: 'module_from_spec'

]

{ #category : 'Grail-Tests - module_from_spec' }
ModuleFromSpecTestCase >> testAFileLoadsByHand [

	self assertAll: #('the_module_carries_the_spec' 'it_is_not_executed_or_registered'
		'exec_module_runs_the_file_in_it')

]

{ #category : 'Grail-Tests - module_from_spec' }
ModuleFromSpecTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 5

]

{ #category : 'Grail-Tests - module_from_spec' }
ModuleFromSpecTestCase >> testTheLoadersCreateModuleIsAsked [

	self assertAll: #('a_loaders_create_module_makes_the_module'
		'exec_module_without_create_module_is_refused')

]
