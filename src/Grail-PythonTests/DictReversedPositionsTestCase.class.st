"reversed() over a dict and its views with the dict changed underneath:
CPython's outcome, from a port of dictreviter_iternext over PyDict's entry
positions (a deleted key leaves a nil in ``order').  Also popitem() and copy()
on that entry list.

Every expectation in tests/python/dict_reversed_positions.py was produced by
CPython 3.14.8; the fixture gate re-checks it there."
Class {
	#name : 'DictReversedPositionsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DictReversedPositionsTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
DictReversedPositionsTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
DictReversedPositionsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dict_reversed_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_reversed_positions.py')
		name: 'dict_reversed_positions'.

]

{ #category : 'Grail-Tests' }
DictReversedPositionsTestCase >> testEntryListMaintenance [
	self assertAll: #('churn' 'popitem_and_copy')

]

{ #category : 'Grail-Tests' }
DictReversedPositionsTestCase >> testMutationUnderAReverseIterator [
	self assertAll: #('keys_changed' 'clear_and_restore' 'size_changed')

]

{ #category : 'Grail-Tests' }
DictReversedPositionsTestCase >> testReverseIterators [
	self assertAll: #('types' 'plain' 'length_hint' 'pickled')

]
