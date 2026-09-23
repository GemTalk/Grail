! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RmtreeSymlinksTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RmtreeSymlinksTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RmtreeSymlinksTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RmtreeSymlinksTestCase - shutil.rmtree does not follow a symbolic link
! ===============================================================================
! _rmtree_inner asked os.path.isdir, which RESOLVES a link, so a link to a
! directory inside the tree was recursed into: rmtree deleted what the link
! POINTED AT -- files outside the tree it was asked to remove -- and then
! failed on entries it had already taken away.  CPython unlinks the link and
! never looks at the target.
!
! rmtree OF a link is refused rather than followed (CPython GH-46010), with an
! OSError whose errno and strerror are both None; a DANGLING link at the top is
! ENOENT instead.
!
! The defect showed up on CI, not here: Darwin listed the link AFTER its target,
! which hid the deletion, and Linux listed it BEFORE, where rmtree then failed
! outright.  So every check names what must still exist, not only what must
! raise.
!
! tests/python/rmtree_symlinks.py holds the 12 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RmtreeSymlinksTestCase removeAllMethods.
RmtreeSymlinksTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: RmtreeSymlinksTestCase
setUp

	importlib @env1:modules removeKey: #'rmtree_symlinks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rmtree_symlinks.py')
		name: 'rmtree_symlinks'
%

category: 'Grail-Helpers'
method: RmtreeSymlinksTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: RmtreeSymlinksTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - shutil'
method: RmtreeSymlinksTestCase
testRmtreeLeavesWhatALinkInTheTreePointedAt

	self assertAll: #('rmtree_removes_the_tree_it_was_given'
		'rmtree_leaves_what_a_link_pointed_at'
		'rmtree_leaves_the_file_a_link_pointed_at'
		'rmtree_unlinks_a_link_nested_deep_in_the_tree')
%

category: 'Grail-Tests - shutil'
method: RmtreeSymlinksTestCase
testRmtreeOfALinkIsRefusedAndRemovesNothing

	self assertAll: #('rmtree_of_a_link_to_a_directory_is_refused'
		'rmtree_of_a_refused_link_removes_nothing'
		'rmtree_of_a_link_to_a_file_is_refused_the_same_way'
		'rmtree_of_a_dangling_link_is_file_not_found')
%

category: 'Grail-Tests - shutil'
method: RmtreeSymlinksTestCase
testRmtreeReportsAMissingPathAndAFile

	self assertAll: #('rmtree_of_a_missing_path_is_file_not_found'
		'rmtree_of_a_file_is_not_a_directory')
%

category: 'Grail-Tests - shutil'
method: RmtreeSymlinksTestCase
testIgnoreErrorsSwallowsWhatRmtreeWouldRaise

	self assertAll: #('rmtree_with_ignore_errors_swallows_the_refusal'
		'rmtree_with_ignore_errors_swallows_a_missing_path')
%

category: 'Grail-Tests - shutil'
method: RmtreeSymlinksTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%
