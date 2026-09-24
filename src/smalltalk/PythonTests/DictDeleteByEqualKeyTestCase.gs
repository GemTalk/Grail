! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictDeleteByEqualKeyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictDeleteByEqualKeyTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DictDeleteByEqualKeyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictDeleteByEqualKeyTestCase - deleting through an equal, non-identical key
! ===============================================================================
! A Python dict matches keys with __hash__ and __eq__, so ``del d[Key(1)]''
! removes the entry stored under a DIFFERENT Key(1) object.  PyDict keeps two
! structures: the hash table, whose hooks route through the Python protocol, and
! the order list that gives iteration CPython's insertion order.  The table
! removed the entry by Python equality; the order list was asked to drop the key
! by the Smalltalk ``='', which for a Python object is identity, and kept it.
!
! The dict was inconsistent from then on, and the report came later and
! elsewhere: a walk read a key the table no longer held (an uncatchable
! LookupError out of values()/items()) or compared the two sizes and reported
! ``dictionary changed size during iteration'' about a change nobody made.
!
! PyDict >> ___removeKeyFromOrder___: now drops the key the TABLE matches.  It
! tries the Smalltalk comparison first -- right for every str/int key, and no
! __eq__ send -- and falls back to the table's own compareKey:with:, so the scan
! is paid only where the cheap answer was wrong.
!
! tests/python/dict_delete_by_equal_key.py holds the 14 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DictDeleteByEqualKeyTestCase removeAllMethods.
DictDeleteByEqualKeyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DictDeleteByEqualKeyTestCase
setUp

	importlib @env1:modules removeKey: #'dict_delete_by_equal_key' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_delete_by_equal_key.py')
		name: 'dict_delete_by_equal_key'
%

category: 'Grail-Helpers'
method: DictDeleteByEqualKeyTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: DictDeleteByEqualKeyTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - deletion'
method: DictDeleteByEqualKeyTestCase
testDeletingThroughAnEqualKeyLeavesTheDictWalkable

	self assertAll: #('deleting_by_an_equal_key_leaves_every_view_agreeing'
		'what_is_left_keeps_its_insertion_order'
		'len_agrees_with_what_the_walk_finds'
		'pop_by_an_equal_key_is_the_same_story'
		'deleting_the_only_entry_empties_the_dict')
%

category: 'Grail-Tests - deletion'
method: DictDeleteByEqualKeyTestCase
testTheDictCanBeMutatedFurtherAfterSuchADeletion

	self assertAll: #('a_deleted_key_can_be_added_back_at_the_end'
		'an_updated_dict_deletes_and_walks_too'
		'a_dict_subclass_behaves_the_same')
%

category: 'Grail-Tests - deletion'
method: DictDeleteByEqualKeyTestCase
testTheKeysThatAlreadyWorkedAreUnchanged

	self assertAll: #('str_keys_are_unchanged'
		'int_keys_are_unchanged'
		'the_key_stored_first_is_the_one_kept'
		'popitem_takes_the_last_entry'
		'clear_empties_both_the_table_and_the_walk'
		'a_set_never_had_an_order_list_to_disagree_with')
%

category: 'Grail-Tests - deletion'
method: DictDeleteByEqualKeyTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14
%
