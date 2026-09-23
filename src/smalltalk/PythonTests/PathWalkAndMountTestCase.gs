! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PathWalkAndMountTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PathWalkAndMountTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PathWalkAndMountTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PathWalkAndMountTestCase - Path.walk, Path.is_mount and Path.is_junction
! ===============================================================================
! Three pathlib methods had no os support under them and raised AttributeError.
!
! Path.walk asks os.walk with os._walk_symlinks_as_files, a bare SENTINEL
! object compared by identity, for its own follow_symlinks=False.  It asks for
! a third mode rather than a Boolean: a symlink to a directory belongs among
! the FILENAMES and is never descended into.  os.walk had no sentinel to
! compare against, and an object is truthy, so passing it would have read as
! follow_symlinks=True -- the opposite of what was asked.
!
! Path.is_mount and Path.is_junction ask os.path.ismount and os.path.isjunction,
! both of which CPython's posixpath already implements and Grail already ships;
! os.path.relpath was missing outright and is the same delegation.
!
! tests/python/path_walk_and_mount.py holds the 19 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PathWalkAndMountTestCase removeAllMethods.
PathWalkAndMountTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PathWalkAndMountTestCase
setUp

	importlib @env1:modules removeKey: #'path_walk_and_mount' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/path_walk_and_mount.py')
		name: 'path_walk_and_mount'
%

category: 'Grail-Helpers'
method: PathWalkAndMountTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: PathWalkAndMountTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os.walk'
method: PathWalkAndMountTestCase
testWalkAnswersEachOfItsThreeSymlinkModes

	self assertAll: #('walk_reports_a_link_as_a_directory_it_does_not_enter'
		'walk_following_links_descends_into_one'
		'walk_with_the_sentinel_reports_a_link_as_a_file'
		'the_sentinel_is_an_object_of_its_own'
		'walk_bottom_up_still_yields_the_leaves_first')
%

category: 'Grail-Tests - pathlib'
method: PathWalkAndMountTestCase
testPathWalkWalksTheTreeAndCanBePruned

	self assertAll: #('path_walk_treats_a_link_as_a_file'
		'path_walk_following_links_descends_into_one'
		'path_walk_yields_path_objects'
		'path_walk_bottom_up_yields_the_leaves_first'
		'path_walk_can_be_pruned_by_mutating_dirnames')
%

category: 'Grail-Tests - os.path'
method: PathWalkAndMountTestCase
testIsMountAnswersForTheRootAndForADirectory

	self assertAll: #('ismount_of_the_root_directory'
		'ismount_of_an_ordinary_directory' 'ismount_of_a_link_or_a_missing_path'
		'path_is_mount_answers_for_the_root_and_for_a_directory')
%

category: 'Grail-Tests - os.path'
method: PathWalkAndMountTestCase
testIsJunctionIsFalseOffWindows

	self assertAll: #('isjunction_is_false_off_windows'
		'path_is_junction_is_false_too')
%

category: 'Grail-Tests - os.path'
method: PathWalkAndMountTestCase
testRelpathAnswersAPathRelativeToItsStart

	self assertAll: #('relpath_of_a_path_under_its_start'
		'relpath_emits_one_dotdot_per_component_left_behind'
		'relpath_defaults_its_start_to_the_working_directory')
%

category: 'Grail-Tests - os.path'
method: PathWalkAndMountTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 19 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 19
%
