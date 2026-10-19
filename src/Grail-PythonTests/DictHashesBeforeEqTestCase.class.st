Class {
	#name : 'DictHashesBeforeEqTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DictHashesBeforeEqTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
DictHashesBeforeEqTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
DictHashesBeforeEqTestCase >> setUp [

	importlib @env1:modules removeKey: #'dict_hashes_before_eq' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_hashes_before_eq.py')
		name: 'dict_hashes_before_eq'

]

{ #category : 'Grail-Tests - hashing' }
DictHashesBeforeEqTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 8 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8

]

{ #category : 'Grail-Tests - hashing' }
DictHashesBeforeEqTestCase >> testKeysWhoseHashesDoMatchStillReachEquality [
	"The half that must not break: checking hashes first must not stop two
	genuinely equal keys from merging."

	self assertAll: #('equal_keys_sharing_a_hash_still_merge'
		'numeric_keys_of_different_types_still_collapse'
		'a_set_of_equal_numeric_types_is_one_element'
		'a_key_that_equals_nothing_keeps_its_own_entry')

]

{ #category : 'Grail-Tests - hashing' }
DictHashesBeforeEqTestCase >> testNoStructureLosesAKeyToATruthyEquality [
	"400 trials across dict / set / frozenset / typing.Union.  One trial would
	pass five times in six with the defect present."

	self assertAll: #('no_structure_loses_a_key_to_a_truthy_eq')

]

{ #category : 'Grail-Tests - hashing' }
DictHashesBeforeEqTestCase >> testOrdinaryKeysAreUnchanged [

	self assertAll: #('numbers_that_merely_share_a_bucket_do_not_merge'
		'str_keys_are_unaffected'
		'an_unhashable_key_still_raises_type_error')

]
