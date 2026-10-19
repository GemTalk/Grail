Class {
	#name : 'SliceOmittedBoundsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SliceOmittedBoundsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SliceOmittedBoundsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SliceOmittedBoundsTestCase >> setUp [

	importlib @env1:modules removeKey: #'slice_omitted_bounds' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slice_omitted_bounds.py')
		name: 'slice_omitted_bounds'

]

{ #category : 'Grail-Tests - slice' }
SliceOmittedBoundsTestCase >> testAWrittenSliceEqualsTheConstructedOne [

	self assertAll: #('repr' 'equal_to_the_constructed_slice'
		'hash_agrees_with_the_constructed_slice' 'usable_as_a_dict_key' 'indices')

]

{ #category : 'Grail-Tests - slice' }
SliceOmittedBoundsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests - slice' }
SliceOmittedBoundsTestCase >> testOmittedBoundsReadAsNone [

	self assertAll: #('step_omitted' 'stop_and_step_omitted' 'start_and_step_omitted'
		'everything_omitted' 'only_step' 'all_three_given' 'step_is_none_not_a_method'
		'bounds_from_names')

]

{ #category : 'Grail-Tests - slice' }
SliceOmittedBoundsTestCase >> testPytestSourceAndBuiltinSequences [

	self assertAll: #('pytest_source_slice' 'builtin_sequences')

]
