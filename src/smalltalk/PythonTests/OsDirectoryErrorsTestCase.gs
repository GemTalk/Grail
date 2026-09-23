! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsDirectoryErrorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsDirectoryErrorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsDirectoryErrorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsDirectoryErrorsTestCase - os.chdir, os.rmdir and os.remove of a directory
! ===============================================================================
! os.chdir said nothing at all: its primitive answers 0 on success and the errno
! on failure, and os.chdir tested only for nil, so a chdir to a missing
! directory changed nothing and raised nothing -- os.rename's defect again.
!
! os.rmdir and os.remove raised a plain OSError carrying only a sentence Grail
! wrote itself -- 'Cannot remove directory: ...' -- where CPython raises the
! errno's own subclass with errno, strerror and filename.  Their primitives
! answer only nil, so their errno is read back from the filesystem, as
! os.mkdir's already was.
!
! Two cases are numbered per platform and are asserted against the platform: a
! directory that still holds entries is ENOTEMPTY (66 on Darwin, 39 on Linux),
! and unlink(2) of a directory is EPERM on Darwin and EISDIR on Linux.
!
! tests/python/os_directory_errors.py holds the 15 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsDirectoryErrorsTestCase removeAllMethods.
OsDirectoryErrorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsDirectoryErrorsTestCase
setUp

	importlib @env1:modules removeKey: #'os_directory_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_directory_errors.py')
		name: 'os_directory_errors'
%

category: 'Grail-Helpers'
method: OsDirectoryErrorsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsDirectoryErrorsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os'
method: OsDirectoryErrorsTestCase
testChdirCarriesTheErrnoAndStillChangesDirectory

	self assertAll: #('chdir_to_a_missing_path_carries_enoent'
		'chdir_to_a_file_carries_enotdir' 'chdir_under_a_file_carries_enotdir'
		'str_of_the_error_names_the_path' 'chdir_still_changes_the_directory')
%

category: 'Grail-Tests - os'
method: OsDirectoryErrorsTestCase
testRmdirCarriesTheErrnoAndStillRemovesAnEmptyDirectory

	self assertAll: #('rmdir_of_a_missing_path_carries_enoent'
		'rmdir_of_a_file_carries_enotdir'
		'rmdir_of_a_symlink_to_a_directory_carries_enotdir'
		'rmdir_of_a_directory_holding_entries_is_not_empty'
		'rmdir_of_a_directory_holding_entries_leaves_it_alone'
		'rmdir_still_removes_an_empty_directory')
%

category: 'Grail-Tests - os'
method: OsDirectoryErrorsTestCase
testRemoveOfADirectoryIsWhatThePlatformReports

	self assertAll: #('remove_of_a_directory_is_what_the_platform_reports'
		'remove_of_a_directory_leaves_it_alone' 'remove_still_removes_a_file')
%

category: 'Grail-Tests - os'
method: OsDirectoryErrorsTestCase
testEveryErrorsStrerrorIsTheTextOfItsErrno

	self assertAll: #('strerror_is_the_text_of_every_error_above')
%

category: 'Grail-Tests - os'
method: OsDirectoryErrorsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15
%
