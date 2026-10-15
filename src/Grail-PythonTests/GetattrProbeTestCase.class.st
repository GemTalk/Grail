Class {
	#name : 'GetattrProbeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
GetattrProbeTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
GetattrProbeTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
GetattrProbeTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/getattr_probe.py'
		name: 'getattr_probe'

]

{ #category : 'Grail-Tests - probe' }
GetattrProbeTestCase >> testAMissAfterAProbeKeepsItsSnapshot [

	self assertAll: #('suggestion_after_probe' 'frame_locals_after_probe'
		'own_method_suggestion_after_probe' 'outside_miss_hides_underscored')

]

{ #category : 'Grail-Tests - coverage' }
GetattrProbeTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13

]

{ #category : 'Grail-Tests - names' }
GetattrProbeTestCase >> testModuleAttributeClassNames [

	self assertAll: #('module_attr_identities' 'plain_class_names')

]

{ #category : 'Grail-Tests - probe' }
GetattrProbeTestCase >> testProbeAnswersAreUnchanged [

	self assertAll: #('getattr_default_on_miss' 'getattr_hit' 'hasattr_answers'
		'getattr_hook' 'property_raising_another_name' 'nested_probe'
		'two_arg_getattr_raises')

]
