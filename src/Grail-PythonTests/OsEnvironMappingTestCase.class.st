Class {
	#name : 'OsEnvironMappingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsEnvironMappingTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsEnvironMappingTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsEnvironMappingTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/os_environ_mapping.py'
		name: 'os_environ_mapping'

]

{ #category : 'Grail-Tests - coverage' }
OsEnvironMappingTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests' }
OsEnvironMappingTestCase >> testTheMutableMappingProtocol [

	self assertAll: #('update_forms' 'merge_operators' 'merge_with_a_non_mapping'
		'inplace_merge' 'popitem' 'equality')

]

{ #category : 'Grail-Tests' }
OsEnvironMappingTestCase >> testTheTypeIsOsEnvironAndAMutableMapping [

	self assertAll: #('type_is_exported' 'type_names' 'is_mutable_mapping'
		'rich_style_type_test')

]
