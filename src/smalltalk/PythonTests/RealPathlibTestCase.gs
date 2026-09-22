! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RealPathlibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RealPathlibTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RealPathlibTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RealPathlibTestCase - pathlib is CPython's own package
! ===============================================================================
! Grail's pathlib was a hand-written stub, src/python/stdlib/pathlib.py.  It is
! now CPython 3.14's package, vendored with two adaptations marked GRAIL --
! Path.touch (CPython writes it with os.open) and pathlib.types (whose ABCs name
! ABCMeta, which Grail's ABC does not carry yet).  glob, fnmatch, posixpath,
! ntpath and genericpath came with it.
!
! A vendored module fails at CALL time wherever it reaches for something os did
! not have, so every check here is a call the real pathlib makes that answered
! wrongly or not at all before: os.stat(follow_symlinks=), os.path.lexists,
! os.path.realpath(strict=), os.PathLike.register, os.stat_result, and os.mkdir
! raising the errno's own subclass.  Two of those were REGRESSIONS against the
! stub -- Path.resolve() and Path.mkdir(parents=True) -- because the stub had
! them and reached os by a different road.
!
! tests/python/real_pathlib.py holds the 44 checks, run under real CPython 3.14
! by scripts/check_python_fixtures.sh.  PathlibStubSurfaceTestCase keeps the
! smaller vocabulary the stub grew.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RealPathlibTestCase removeAllMethods.
RealPathlibTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: RealPathlibTestCase
setUp

	importlib @env1:modules removeKey: #'real_pathlib' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/real_pathlib.py')
		name: 'real_pathlib'
%

category: 'Grail-Helpers'
method: RealPathlibTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: RealPathlibTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testPathlibIsCPythonsPackageWithItsTypesModule

	self assertAll: #('pathlib_is_a_package' 'pathlib_types_defines_path_info'
		'pathlib_types_registers_the_concrete_paths')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testPathLikeAndStatResultAnswerPathlibsTypeChecks

	self assertAll: #('a_path_is_os_pathlike' 'a_registered_class_is_os_pathlike'
		'a_subclass_of_a_registered_class_is_os_pathlike'
		'an_unregistered_class_is_not_os_pathlike' 'path_stat_answers_an_os_stat_result')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testStatFollowsALinkOnlyWhenAsked

	self assertAll: #('stat_follows_a_link_to_the_file' 'stat_without_following_sees_the_link'
		'os_stat_takes_follow_symlinks_as_a_keyword' 'a_broken_link_does_not_exist'
		'a_broken_link_exists_without_following' 'lexists_sees_a_broken_link'
		'lexists_of_nothing_is_false' 'is_symlink' 'readlink_names_the_target')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testResolveTakesStrictAsTheStubsResolveNeverHadTo

	self assertAll: #('resolve_makes_a_relative_path_absolute' 'resolve_collapses_dot_dot'
		'resolve_non_strict_keeps_a_missing_name' 'resolve_strict_of_a_missing_path_raises'
		'resolve_strict_of_an_existing_path' 'realpath_takes_strict_as_a_keyword')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testMkdirRaisesTheErrnosOwnSubclassSoParentsAreCreated

	self assertAll: #('mkdir_parents_creates_the_missing_ones'
		'mkdir_exist_ok_accepts_an_existing_directory' 'mkdir_refuses_an_existing_directory'
		'os_mkdir_under_a_missing_parent_is_file_not_found'
		'os_mkdir_of_an_existing_directory_is_file_exists'
		'os_mkdir_under_a_file_is_not_a_directory')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testTouchCreatesRefusesAndSetsTheMode

	self assertAll: #('touch_creates_an_empty_file' 'touch_leaves_an_existing_file_content'
		'touch_refuses_an_existing_file_when_not_exist_ok' 'touch_with_a_mode_sets_it')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testGlobRecursesOnlyWhenAsked

	self assertAll: #('glob_star_star_recurses' 'rglob_recurses'
		'glob_module_is_recursive_only_when_asked' 'iterdir_lists_one_level'
		'full_match_takes_a_recursive_pattern')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testPurePathsIncludingWindowsOnes

	self assertAll: #('pure_windows_path_splits_the_drive' 'pure_windows_path_is_case_insensitive'
		'pure_posix_path_parents' 'with_stem_keeps_the_suffix')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testRenameAnswersTheTargetAndSamefileSeesThroughALink

	self assertAll: #('rename_answers_the_target_and_moves_the_file' 'samefile_through_a_link')
%

category: 'Grail-Tests - pathlib'
method: RealPathlibTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 44 checks.  A check added to the fixture without
	being listed would pass unasserted here, and one that disappeared would
	fail only by the KeyError it raises -- so the count is pinned."

	self assert: (self results @env1:__len__) equals: 44
%
