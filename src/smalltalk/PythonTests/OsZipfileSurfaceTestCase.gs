! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsZipfileSurfaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsZipfileSurfaceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsZipfileSurfaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsZipfileSurfaceTestCase - the os surface CPython's own zipfile needed
! ===============================================================================
! Swapping Grail's read-only zipfile for CPython's real one failed import, then
! extraction, then writing -- each time on a piece of os that CPython has and
! Grail did not.  They are one test case because they share one reason to
! exist, not because they are one feature:
!
!   * os.SEEK_SET / SEEK_CUR / SEEK_END, which zipfile seeks with;
!   * os.path.splitdrive, which sanitises every member name on EXTRACTION -- so
!     without it the real zipfile could not extract at all, a regression against
!     the read-only one it replaced;
!   * os.path.splitroot and os.path.samefile;
!   * os.fspath of a pathlib.Path.  os.stat(Path(...)) already worked, because
!     ___fsPath___: probed the whole class chain for __fspath__; the public
!     os.fspath() read only the object's OWN method dict, and Path inherits
!     __fspath__ from PurePath.  Two copies of one predicate had disagreed, and
!     both now go through ___isPathLike___:;
!   * os.makedirs(path, exist_ok=True), which matched no selector at all.
!
! tests/python/os_zipfile_surface.py holds the 15 checks below and is run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsZipfileSurfaceTestCase removeAllMethods.
OsZipfileSurfaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - os for zipfile'
method: OsZipfileSurfaceTestCase
testEveryOsSurfaceCheckAgreesWithCPython
	"Every check in tests/python/os_zipfile_surface.py, which the fixture gate
	also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |

	importlib @env1:modules removeKey: #'os_zipfile_surface' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_zipfile_surface.py')
		name: 'os_zipfile_surface'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_directory_is_the_same_file_as_itself_through_dot'
	  'a_relative_path_has_no_drive_either'
	  'exactly_two_leading_slashes_are_a_root_of_their_own'
	  'fspath_of_a_path_that_inherits_dunder_fspath'
	  'fspath_still_passes_a_string_through'
	  'makedirs_accepts_exist_ok_by_keyword'
	  'makedirs_accepts_the_path_by_keyword'
	  'posix_has_no_drive'
	  'seek_constants_have_their_posix_values'
	  'splitroot_of_a_relative_path'
	  'splitroot_of_an_absolute_path'
	  'splitroot_of_the_empty_path'
	  'splitroot_of_the_root_alone'
	  'three_leading_slashes_collapse_to_one_root'
	  'two_different_directories_are_not_the_same_file').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 15
%

category: 'Grail-Tests - os for zipfile'
method: OsZipfileSurfaceTestCase
testFspathRefusesAnObjectThatIsNotPathLike
	"The other half of the fspath fix: widening the probe to the class chain
	must not make fspath permissive.  An int has no __fspath__ anywhere in its
	chain, and CPython raises TypeError for it."

	self
		should: [self eval: 'import os
os.fspath(42)']
		raise: TypeError
%
