Class {
	#name : 'MovedClassmethodTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
MovedClassmethodTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
MovedClassmethodTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
MovedClassmethodTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/moved_classmethod.py'
		name: 'moved_classmethod'

]

{ #category : 'Grail-Tests - coverage' }
MovedClassmethodTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13

]

{ #category : 'Grail-Tests' }
MovedClassmethodTestCase >> testFiveOrMoreArguments [

	self assertAll: #('five_args_class' 'five_args_instance'
		'explicit_parent_five_args' 'explicit_parent_five_args_again')

]

{ #category : 'Grail-Tests' }
MovedClassmethodTestCase >> testKeywordCallsBindByName [

	self assertAll: #('positional' 'keyword' 'keyword_via_instance'
		'keyword_on_func' 'keyword_errors')

]

{ #category : 'Grail-Tests' }
MovedClassmethodTestCase >> testNamedTupleClassmethods [

	self assertAll: #('namedtuple_keyword_and_siblings' 'namedtuple_five_positional')

]

{ #category : 'Grail-Tests' }
MovedClassmethodTestCase >> testSiblingCallsThroughCls [

	self assertAll: #('sibling_through_cls' 'unary_sibling_through_cls')

]
