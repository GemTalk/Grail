! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictHashesBeforeEqTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictHashesBeforeEqTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DictHashesBeforeEqTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictHashesBeforeEqTestCase - compare full hashes before asking __eq__ (#1171)
! ===============================================================================
! Sharing a bucket means two hashes agree MODULO THE TABLE SIZE, which is far
! weaker than being equal.  CPython stores each entry's hash (me_hash) and checks
! it before it will call __eq__ at all.  PyDict >> compareKey:with: went from the
! identity check straight to __eq__, so a key whose __eq__ answers anything
! TRUTHY for an unrelated object swallowed whatever it collided with.
!
! annotationlib's _Stringifier is exactly that shape -- hashes by id(), and its
! __eq__ builds an expression object -- so typing's
! ``_deduplicate = dict.fromkeys(params)'' collapsed Union[str, undefined] to
! Union[str], which is str.  Four structures were affected: dict, set, frozenset
! and typing.Union, all through this one comparison.
!
! BECAUSE IT DEPENDS ON OBJECT IDS IT IS INTERMITTENT, about one run in seven, so
! the fixture COUNTS over 400 trials rather than trying once.  Measured with the
! change reverted: dict 78, set 78, frozenset 163, union 85 lost out of 400.  A
! single trial would have passed five times in six -- which is why
! test.test_annotationlib read as a flaky test for weeks instead of a bug, and
! why a run-level flakiness check could never settle it.
!
! The hash is RECOMPUTED rather than stored: CPython keeps me_hash per entry and
! this table has nowhere to put it.  The cost falls only where two keys already
! share a bucket, which is the path that was about to call __eq__ anyway.
!
! tests/python/dict_hashes_before_eq.py holds the 8 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DictHashesBeforeEqTestCase removeAllMethods.
DictHashesBeforeEqTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DictHashesBeforeEqTestCase
setUp

	importlib @env1:modules removeKey: #'dict_hashes_before_eq' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_hashes_before_eq.py')
		name: 'dict_hashes_before_eq'
%

category: 'Grail-Helpers'
method: DictHashesBeforeEqTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: DictHashesBeforeEqTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - hashing'
method: DictHashesBeforeEqTestCase
testNoStructureLosesAKeyToATruthyEquality
	"400 trials across dict / set / frozenset / typing.Union.  One trial would
	pass five times in six with the defect present."

	self assertAll: #('no_structure_loses_a_key_to_a_truthy_eq')
%

category: 'Grail-Tests - hashing'
method: DictHashesBeforeEqTestCase
testKeysWhoseHashesDoMatchStillReachEquality
	"The half that must not break: checking hashes first must not stop two
	genuinely equal keys from merging."

	self assertAll: #('equal_keys_sharing_a_hash_still_merge'
		'numeric_keys_of_different_types_still_collapse'
		'a_set_of_equal_numeric_types_is_one_element'
		'a_key_that_equals_nothing_keeps_its_own_entry')
%

category: 'Grail-Tests - hashing'
method: DictHashesBeforeEqTestCase
testOrdinaryKeysAreUnchanged

	self assertAll: #('numbers_that_merely_share_a_bucket_do_not_merge'
		'str_keys_are_unaffected'
		'an_unhashable_key_still_raises_type_error')
%

category: 'Grail-Tests - hashing'
method: DictHashesBeforeEqTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 8 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8
%
