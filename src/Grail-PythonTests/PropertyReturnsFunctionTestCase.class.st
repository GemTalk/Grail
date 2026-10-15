Class {
	#name : 'PropertyReturnsFunctionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PropertyReturnsFunctionTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PropertyReturnsFunctionTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PropertyReturnsFunctionTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/property_returns_function.py'
		name: 'property_returns_function'

]

{ #category : 'Grail-Tests' }
PropertyReturnsFunctionTestCase >> testAFunctionValueIsNotBound [

	self assertAll: #('returns_the_function' 'not_bound_to_the_holder'
		'getattr_spelling' 'read_write_property' 'fget_agrees' 'slotted_holder')

]

{ #category : 'Grail-Tests - coverage' }
PropertyReturnsFunctionTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests' }
PropertyReturnsFunctionTestCase >> testTheValueIsUsable [

	self assertAll: #('call_with_explicit_instance' 'module_function_value'
		'bound_method_keeps_its_own_self' 'signature_sees_self')

]
