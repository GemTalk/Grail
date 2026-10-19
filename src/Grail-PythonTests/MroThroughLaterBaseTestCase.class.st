Class {
	#name : 'MroThroughLaterBaseTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
MroThroughLaterBaseTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
MroThroughLaterBaseTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
MroThroughLaterBaseTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/mro_through_later_base.py'
		name: 'mro_through_later_base'

]

{ #category : 'Grail-Tests - coverage' }
MroThroughLaterBaseTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11

]

{ #category : 'Grail-Tests' }
MroThroughLaterBaseTestCase >> testPrecedenceThatAlreadyHeld [

	self assertAll: #('primary_override_still_wins' 'own_method_wins'
		'cooperative_super' 'nested_class_via_later_base' 'strenum_mixin_equality')

]

{ #category : 'Grail-Tests' }
MroThroughLaterBaseTestCase >> testPytestCollectorShape [

	self assertAll: #('pytest_shape' 'pytest_shape_super' 'pytest_shape_mro')

]

{ #category : 'Grail-Tests' }
MroThroughLaterBaseTestCase >> testSecondaryBaseBeatsALaterSharedAncestor [

	self assertAll: #('secondary_beats_shared_ancestor' 'secondary_classmethod'
		'secondary_other_arity')

]
