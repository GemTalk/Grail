! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SliceBlockCopyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SliceBlockCopyTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SliceBlockCopyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SliceBlockCopyTestCase - #1385 and #1214
! ===============================================================================
!   * slices   -- a step-1 slice is one block copy (copyFrom:to:, or an
!                 exact-size tuple), and must answer what the element-by-
!                 element walk did: the built-in's type for built-ins and
!                 their subclasses, THE empty tuple, a frozen tuple, an
!                 independent list.
!   * pyexpat  -- _scan_markup tests a 9-character window, not the whole
!                 remainder, and Parse drops what it has consumed; a document
!                 fed a few characters at a time reports what it does whole.
!
! tests/python/slice_block_copy.py holds the 12 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SliceBlockCopyTestCase removeAllMethods.
SliceBlockCopyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SliceBlockCopyTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/slice_block_copy.py'
		name: 'slice_block_copy'
%

category: 'Grail-Helpers'
method: SliceBlockCopyTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SliceBlockCopyTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - slices'
method: SliceBlockCopyTestCase
testBuiltinSlicesKeepTheirType

	self assertAll: #('str_slices' 'wide_str_slices' 'bytes_slices'
		'list_slices' 'tuple_slices' 'stepped_slices')
%

category: 'Grail-Tests - slices'
method: SliceBlockCopyTestCase
testSubclassSlicesAreTheBuiltin

	self assertAll: #('subclass_slices_are_the_builtin')
%

category: 'Grail-Tests - slices'
method: SliceBlockCopyTestCase
testTupleSlicesAreFrozenAndShareTheEmptyTuple

	self assertAll: #('empty_tuple_slice_is_the_empty_tuple'
		'tuple_slice_is_immutable')
%

category: 'Grail-Tests - slices'
method: SliceBlockCopyTestCase
testListCopyIsIndependent

	self assertAll: #('list_copy_is_independent')
%

category: 'Grail-Tests - pyexpat'
method: SliceBlockCopyTestCase
testChunkedParseMatchesWholeParse

	self assertAll: #('chunked_parse_matches_whole_parse' 'whole_parse_events')
%

category: 'Grail-Tests - coverage'
method: SliceBlockCopyTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%
