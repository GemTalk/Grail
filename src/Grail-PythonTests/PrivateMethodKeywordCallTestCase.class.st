Class {
	#name : 'PrivateMethodKeywordCallTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PrivateMethodKeywordCallTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PrivateMethodKeywordCallTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PrivateMethodKeywordCallTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/private_method_keyword_call.py'
		name: 'private_method_keyword_call'

]

{ #category : 'Grail-Tests - coverage' }
PrivateMethodKeywordCallTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7

]

{ #category : 'Grail-Tests' }
PrivateMethodKeywordCallTestCase >> testKeywordCallsReachThePrivateMethod [

	self assertAll: #('plain_keyword_call' 'defaulted_keyword_call'
		'star_keyword_call')

]

{ #category : 'Grail-Tests' }
PrivateMethodKeywordCallTestCase >> testMangledNameFromOutsideTheClass [

	self assertAll: #('mangled_name_from_outside'
		'unexpected_keyword_is_a_type_error')

]

{ #category : 'Grail-Tests' }
PrivateMethodKeywordCallTestCase >> testSubclassPrivatesStaySeparate [

	self assertAll: #('subclass_keeps_base_private' 'subclass_own_private')

]
