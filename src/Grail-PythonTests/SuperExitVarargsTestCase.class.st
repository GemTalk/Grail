Class {
	#name : 'SuperExitVarargsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SuperExitVarargsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SuperExitVarargsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SuperExitVarargsTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/super_exit_varargs.py'
		name: 'super_exit_varargs'

]

{ #category : 'Grail-Tests' }
SuperExitVarargsTestCase >> testAWithStatementChainsExitThroughTheBase [

	self assertAll: #('with_clean' 'with_exception')

]

{ #category : 'Grail-Tests - coverage' }
SuperExitVarargsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests' }
SuperExitVarargsTestCase >> testShapesThatAlreadyWorkedStillDo [

	self assertAll: #('mirror_varargs_over_fixed' 'direct_base' 'direct_inherited')

]

{ #category : 'Grail-Tests' }
SuperExitVarargsTestCase >> testSuperReachesAVarargsBaseExit [

	self assertAll: #('super_call' 'two_levels' 'bound_then_called'
		'splat_call' 'unbound_call')

]
