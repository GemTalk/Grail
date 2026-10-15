Class {
	#name : 'IntFromBytesIterableTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
IntFromBytesIterableTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
IntFromBytesIterableTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
IntFromBytesIterableTestCase >> setUp [

	importlib @env1:modules removeKey: #'int_from_bytes_iterable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_from_bytes_iterable.py')
		name: 'int_from_bytes_iterable'

]

{ #category : 'Grail-Tests - int' }
IntFromBytesIterableTestCase >> testAnyIterableOfIntsIsAccepted [

	self assertAll: #('a_bytes_like_still_works' 'a_list_or_tuple_of_ints_works'
		'a_generator_works' 'a_map_object_works_which_is_what_ipaddress_passes'
		'a_range_works_too' 'an_element_with_index_is_accepted'
		'an_empty_iterable_is_zero')

]

{ #category : 'Grail-Tests - int' }
IntFromBytesIterableTestCase >> testByteorderAndSignedStillApply [

	self assertAll: #('byteorder_still_applies_to_an_iterable'
		'signed_still_applies_to_an_iterable'
		'bool_from_bytes_narrows_an_iterable_too')

]

{ #category : 'Grail-Tests - int' }
IntFromBytesIterableTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14

]

{ #category : 'Grail-Tests - int' }
IntFromBytesIterableTestCase >> testWhatIsRefusedIsRefusedAsCPythonRefusesIt [

	self assertAll: #('a_str_is_refused_before_it_is_iterated'
		'a_non_iterable_is_refused'
		'an_element_that_is_not_an_integer_is_refused'
		'an_element_out_of_range_is_refused')

]
