Class {
	#name : 'UnittestResultExcInfoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
UnittestResultExcInfoTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
UnittestResultExcInfoTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
UnittestResultExcInfoTestCase >> setUp [

	importlib @env1:modules removeKey: #'unittest_result_exc_info' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_result_exc_info.py')
		name: 'unittest_result_exc_info'

]

{ #category : 'Grail-Tests - the triple' }
UnittestResultExcInfoTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7

]

{ #category : 'Grail-Tests - the triple' }
UnittestResultExcInfoTestCase >> testEveryOutcomeIsHandedTheTriple [

	self assertAll: #('a_failure_is_handed_the_triple' 'an_error_is_handed_the_triple'
		'an_expected_failure_is_handed_the_triple' 'a_setup_error_is_handed_the_triple'
		'a_teardown_error_is_handed_the_triple' 'a_cleanup_error_is_handed_the_triple')

]

{ #category : 'Grail-Tests - the triple' }
UnittestResultExcInfoTestCase >> testTheBaseResultStillKeepsAString [

	self assertAll: #('the_base_result_keeps_a_string_per_error')

]
