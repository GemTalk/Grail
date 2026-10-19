Class {
	#name : 'WideStrTypeAndAugmentedAttrStoreTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
WideStrTypeAndAugmentedAttrStoreTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
WideStrTypeAndAugmentedAttrStoreTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
WideStrTypeAndAugmentedAttrStoreTestCase >> setUp [

	importlib @env1:modules removeKey: #'wide_str_type_and_augmented_attr_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/wide_str_type_and_augmented_attr_store.py')
		name: 'wide_str_type_and_augmented_attr_store'

]

{ #category : 'Grail-Tests - augmented' }
WideStrTypeAndAugmentedAttrStoreTestCase >> testAugmentedAttributeStoreGoesThroughSetattr [

	self assertAll: #('an_augmented_attribute_store_goes_through_setattr')

]

{ #category : 'Grail-Tests - codecs' }
WideStrTypeAndAugmentedAttrStoreTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 4 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 4

]

{ #category : 'Grail-Tests - type' }
WideStrTypeAndAugmentedAttrStoreTestCase >> testEveryStrsTypeIsStr [

	self assertAll: #('every_str_s_type_is_str_and_a_subclass_s_is_itself')

]

{ #category : 'Grail-Tests - codecs' }
WideStrTypeAndAugmentedAttrStoreTestCase >> testMultibyteCodecHandlerAndErrors [

	self assertAll: #('a_multibyte_error_handler_must_answer_str_or_bytes_and_int'
		'a_multibyte_codec_s_errors_cannot_be_deleted')

]
