! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsPathCommonpathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsPathCommonpathTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsPathCommonpathTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsPathCommonpathTestCase - os.path.commonpath is CPython's posixpath.commonpath
! ===============================================================================
! Grail's Smalltalk commonpath raised ValueError for two absolute paths sharing
! only the root (CPython answers '/'), made a relative pair absolute, gave the
! wrong message for mixed absolute/relative, and crashed on bytes.  The first
! sent pytest's rootdir to the invocation directory for tests under an
! unrelated tree, and collection then walked every entry of /private/tmp.
!
! tests/python/os_path_commonpath.py holds the 16 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsPathCommonpathTestCase removeAllMethods.
OsPathCommonpathTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsPathCommonpathTestCase
setUp

	importlib @env1:modules removeKey: #'os_path_commonpath' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_commonpath.py')
		name: 'os_path_commonpath'
%

category: 'Grail-Helpers'
method: OsPathCommonpathTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsPathCommonpathTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os.path'
method: OsPathCommonpathTestCase
testAbsolutePaths

	self assertAll: #('only_the_root_in_common'
		'a_shared_prefix'
		'one_contains_the_other'
		'the_root_and_a_child'
		'redundant_separators_and_trailing_slash'
		'dot_components_are_dropped'
		'a_single_path'
		'component_not_character_prefix'
		'pytest_sees_an_unrelated_tree_as_rooted_at_slash')
%

category: 'Grail-Tests - os.path'
method: OsPathCommonpathTestCase
testRelativePaths

	self assertAll: #('relative_paths_stay_relative' 'relative_with_nothing_in_common')
%

category: 'Grail-Tests - os.path'
method: OsPathCommonpathTestCase
testErrorsAndArgumentKinds

	self assertAll: #('an_empty_sequence'
		'absolute_and_relative'
		'str_and_bytes'
		'bytes'
		'a_generator_argument')
%

category: 'Grail-Tests - os.path'
method: OsPathCommonpathTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 16 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 16
%
