Class {
	#name : 'SelfSendPropertyCallTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SelfSendPropertyCallTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SelfSendPropertyCallTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SelfSendPropertyCallTestCase >> setUp [

	importlib @env1:modules removeKey: #'self_send_property_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_send_property_call.py')
		name: 'self_send_property_call'

]

{ #category : 'Grail-Tests - properties' }
SelfSendPropertyCallTestCase >> testAPropertyValueIsCalledNotItsSetter [

	self assertAll: #('calling_a_property_value_through_self'
		'calling_a_cached_property_value_through_self'
		'calling_a_property_from_outside_still_works'
		'calling_a_property_whose_value_is_not_callable')

]

{ #category : 'Grail-Tests - properties' }
SelfSendPropertyCallTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - properties' }
SelfSendPropertyCallTestCase >> testEveryOtherSelfCallIsUnchanged [

	self assertAll: #('a_plain_method_self_call_is_unchanged'
		'a_classmethod_or_staticmethod_self_call_is_unchanged')

]

{ #category : 'Grail-Tests - properties' }
SelfSendPropertyCallTestCase >> testReadingAndWritingAPropertyIsUnchanged [

	self assertAll: #('reading_a_property_through_self_is_unchanged'
		'writing_a_property_through_self_is_unchanged'
		'a_property_read_from_outside_is_unchanged')

]
