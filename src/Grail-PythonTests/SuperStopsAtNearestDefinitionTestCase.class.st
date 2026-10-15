Class {
	#name : 'SuperStopsAtNearestDefinitionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SuperStopsAtNearestDefinitionTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SuperStopsAtNearestDefinitionTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SuperStopsAtNearestDefinitionTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/super_stops_at_nearest_definition.py'
		name: 'super_stops_at_nearest_definition'

]

{ #category : 'Grail-Tests' }
SuperStopsAtNearestDefinitionTestCase >> testADecoratedNearestDefStillAnswersDecorated [

	self assertAll: #('decorated_parent_still_decorated'
		'decorated_grandparent_through_plain_parent')

]

{ #category : 'Grail-Tests' }
SuperStopsAtNearestDefinitionTestCase >> testANearerPlainDefWins [

	self assertAll: #('single_inheritance' 'pytest_module_diamond'
		'plain_abstractmethod_base' 'runtime_store_on_ancestor')

]

{ #category : 'Grail-Tests - coverage' }
SuperStopsAtNearestDefinitionTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 6 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 6

]
