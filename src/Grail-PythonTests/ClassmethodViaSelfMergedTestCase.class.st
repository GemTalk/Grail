Class {
	#name : 'ClassmethodViaSelfMergedTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassmethodViaSelfMergedTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ClassmethodViaSelfMergedTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ClassmethodViaSelfMergedTestCase >> setUp [

	importlib @env1:modules removeKey: #'classmethod_via_self_merged' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_via_self_merged.py')
		name: 'classmethod_via_self_merged'

]

{ #category : 'Grail-Tests - classmethods' }
ClassmethodViaSelfMergedTestCase >> testAClassmethodThroughSelfFromASecondaryBase [

	self assertAll: #('a_classmethod_through_self_from_a_secondary_base'
		'the_class_it_binds_is_the_instances_own'
		'a_varargs_classmethod_the_same_way'
		'a_staticmethod_the_same_way')

]

{ #category : 'Grail-Tests - classmethods' }
ClassmethodViaSelfMergedTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8

]

{ #category : 'Grail-Tests - classmethods' }
ClassmethodViaSelfMergedTestCase >> testEveryShapeThatAlreadyWorkedStillDoes [

	self assertAll: #('the_declaring_class_used_directly'
		'the_declaring_class_as_the_primary_base'
		'the_call_written_in_a_subclass'
		'the_class_side_call_and_the_read_from_outside')

]
