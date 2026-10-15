Class {
	#name : 'InspectMethodPredicatesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
InspectMethodPredicatesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
InspectMethodPredicatesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
InspectMethodPredicatesTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/inspect_method_predicates.py'
		name: 'inspect_method_predicates'

]

{ #category : 'Grail-Tests - coverage' }
InspectMethodPredicatesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests' }
InspectMethodPredicatesTestCase >> testFunctionsAreFunctions [

	self assertAll: #('module_function' 'lambda' 'nested_function'
		'method_through_class')

]

{ #category : 'Grail-Tests' }
InspectMethodPredicatesTestCase >> testMethodsAreMethods [

	self assertAll: #('method_through_instance' 'decorated_method_through_instance'
		'wraps_method_through_instance' 'classmethod_through_class')

]

{ #category : 'Grail-Tests' }
InspectMethodPredicatesTestCase >> testOtherShapes [

	self assertAll: #('builtin_type_method_is_routine'
		'class_and_instance_are_not_routines')

]

{ #category : 'Grail-Tests' }
InspectMethodPredicatesTestCase >> testPluggyShapes [

	self assertAll: #('pluggy_varnames_keeps_first_param'
		'pluggy_registers_decorated_hookimpl')

]
