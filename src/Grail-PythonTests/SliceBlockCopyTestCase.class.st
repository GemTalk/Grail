Class {
	#name : 'SliceBlockCopyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SliceBlockCopyTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SliceBlockCopyTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SliceBlockCopyTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/slice_block_copy.py'
		name: 'slice_block_copy'

]

{ #category : 'Grail-Tests - slices' }
SliceBlockCopyTestCase >> testBuiltinSlicesKeepTheirType [

	self assertAll: #('str_slices' 'wide_str_slices' 'bytes_slices'
		'list_slices' 'tuple_slices' 'stepped_slices')

]

{ #category : 'Grail-Tests - pyexpat' }
SliceBlockCopyTestCase >> testChunkedParseMatchesWholeParse [

	self assertAll: #('chunked_parse_matches_whole_parse' 'whole_parse_events')

]

{ #category : 'Grail-Tests - coverage' }
SliceBlockCopyTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests - slices' }
SliceBlockCopyTestCase >> testListCopyIsIndependent [

	self assertAll: #('list_copy_is_independent')

]

{ #category : 'Grail-Tests - slices' }
SliceBlockCopyTestCase >> testSubclassSlicesAreTheBuiltin [

	self assertAll: #('subclass_slices_are_the_builtin')

]

{ #category : 'Grail-Tests - slices' }
SliceBlockCopyTestCase >> testTupleSlicesAreFrozenAndShareTheEmptyTuple [

	self assertAll: #('empty_tuple_slice_is_the_empty_tuple'
		'tuple_slice_is_immutable')

]
