Class {
	#name : 'SubclassableIoAndWarningsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SubclassableIoAndWarningsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SubclassableIoAndWarningsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SubclassableIoAndWarningsTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/subclassable_io_and_warnings.py'
		name: 'subclassable_io_and_warnings'

]

{ #category : 'Grail-Tests' }
SubclassableIoAndWarningsTestCase >> testCatchWarningsIsAClass [

	self assertAll: #('catch_warnings_is_a_class' 'call_makes_an_instance' 'repr'
		'record' 'action_shorthand' 'reentry_errors')

]

{ #category : 'Grail-Tests - coverage' }
SubclassableIoAndWarningsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests' }
SubclassableIoAndWarningsTestCase >> testPytestWarningsRecorder [

	self assertAll: #('pytest_recorder_reusable')

]

{ #category : 'Grail-Tests' }
SubclassableIoAndWarningsTestCase >> testTextIOWrapperSubclassesWrapABuffer [

	self assertAll: #('capture_io_writes_to_its_buffer' 'tee_capture_super_write'
		'encoded_file' 'read_back' 'subclass_is_a_textiowrapper')

]
