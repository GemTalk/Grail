Class {
	#name : 'InspectGetattrStaticModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InspectGetattrStaticModuleTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
InspectGetattrStaticModuleTestCase >> setUp [
	"Reload tests/python/inspect_getattr_static_module.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_getattr_static_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_getattr_static_module.py')
		name: 'inspect_getattr_static_module'.

]

{ #category : 'Grail-Tests - Modules' }
InspectGetattrStaticModuleTestCase >> testAMissingNameIsStillMissing [
	"A name the module lacks answers the default, or raises AttributeError
	without one."

	self assert: (self check: #'a_missing_name_answers_the_default') equals: true.
	self assert: (self check: #'a_missing_name_without_default_raises') equals: true.

]

{ #category : 'Grail-Tests - Modules' }
InspectGetattrStaticModuleTestCase >> testAModulesNamesAreFound [
	"getattr_static reads a module's namespace, as CPython's does through
	module's md_dict member.  Grail's module class lists an accessor for
	__dict__, which read as a binding that hides the namespace, so every module
	answered the default -- and pluggy 1.7, which finds hookspecs this way,
	stopped pytest from starting."

	self assert: (self check: #'a_stdlib_modules_function_is_found') equals: true.
	self assert: (self check: #'this_modules_own_function_is_found') equals: true.
	self assert: (self check: #'an_attribute_set_on_a_module_is_found') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
InspectGetattrStaticModuleTestCase >> testClassesAndInstancesAreUnaffected [
	"Guard rail: a class's and an instance's lookups answer what they did."

	self assert: (self check: #'classes_and_instances_are_unaffected') equals: true.

]
