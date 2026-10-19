Class {
	#name : 'DictDeleteByEqualKeyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DictDeleteByEqualKeyTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
DictDeleteByEqualKeyTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
DictDeleteByEqualKeyTestCase >> setUp [

	importlib @env1:modules removeKey: #'dict_delete_by_equal_key' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_delete_by_equal_key.py')
		name: 'dict_delete_by_equal_key'

]

{ #category : 'Grail-Tests - deletion' }
DictDeleteByEqualKeyTestCase >> testDeletingThroughAnEqualKeyLeavesTheDictWalkable [

	self assertAll: #('deleting_by_an_equal_key_leaves_every_view_agreeing'
		'what_is_left_keeps_its_insertion_order'
		'len_agrees_with_what_the_walk_finds'
		'pop_by_an_equal_key_is_the_same_story'
		'deleting_the_only_entry_empties_the_dict')

]

{ #category : 'Grail-Tests - deletion' }
DictDeleteByEqualKeyTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14

]

{ #category : 'Grail-Tests - deletion' }
DictDeleteByEqualKeyTestCase >> testTheDictCanBeMutatedFurtherAfterSuchADeletion [

	self assertAll: #('a_deleted_key_can_be_added_back_at_the_end'
		'an_updated_dict_deletes_and_walks_too'
		'a_dict_subclass_behaves_the_same')

]

{ #category : 'Grail-Tests - deletion' }
DictDeleteByEqualKeyTestCase >> testTheKeysThatAlreadyWorkedAreUnchanged [

	self assertAll: #('str_keys_are_unchanged'
		'int_keys_are_unchanged'
		'the_key_stored_first_is_the_one_kept'
		'popitem_takes_the_last_entry'
		'clear_empties_both_the_table_and_the_walk'
		'a_set_never_had_an_order_list_to_disagree_with')

]
