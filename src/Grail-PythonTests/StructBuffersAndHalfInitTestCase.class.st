Class {
	#name : 'StructBuffersAndHalfInitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
StructBuffersAndHalfInitTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
StructBuffersAndHalfInitTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
StructBuffersAndHalfInitTestCase >> setUp [

	importlib @env1:modules removeKey: #'struct_buffers_and_half_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/struct_buffers_and_half_init.py')
		name: 'struct_buffers_and_half_init'

]

{ #category : 'Grail-Tests - struct' }
StructBuffersAndHalfInitTestCase >> testAFreshImportIsLetGo [

	self assertAll: #('a_fresh_import_leaves_sys_modules_alone_and_is_collectable')

]

{ #category : 'Grail-Tests - struct' }
StructBuffersAndHalfInitTestCase >> testAHalfInitializedStruct [

	self assertAll: #('a_half_initialized_struct_refuses_every_operation'
		'a_half_initialized_struct_can_be_initialized_later')

]

{ #category : 'Grail-Tests - memoryview' }
StructBuffersAndHalfInitTestCase >> testAViewOverAnArrayIsWritable [

	self assertAll: #('a_view_over_an_array_is_writable_through')

]

{ #category : 'Grail-Tests - struct' }
StructBuffersAndHalfInitTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - struct' }
StructBuffersAndHalfInitTestCase >> testIterUnpackAnswersAnUnpackIterator [

	self assertAll: #('iter_unpack_answers_an_uninstantiable_unpack_iterator')

]

{ #category : 'Grail-Tests - struct' }
StructBuffersAndHalfInitTestCase >> testPackIntoWantsAWritableBuffer [

	self assertAll: #('pack_into_refuses_anything_that_is_not_a_writable_buffer')

]

{ #category : 'Grail-Tests - memoryview' }
StructBuffersAndHalfInitTestCase >> testSteppedSlicesAreRealViews [

	self assertAll: #('stepped_slices_read_through_their_stride'
		'a_stepped_view_writes_through_and_composes'
		'a_stepped_view_is_not_castable_and_step_zero_is_refused')

]
