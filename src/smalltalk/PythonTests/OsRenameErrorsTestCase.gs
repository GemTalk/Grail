! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsRenameErrorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsRenameErrorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsRenameErrorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsRenameErrorsTestCase - os.rename and os.replace say when they fail
! ===============================================================================
! os.rename returned normally when the rename FAILED.  GsFile >>
! renameFileOnServer:to: answers 0 on success and the errno on failure, and
! os.rename tested only for nil -- the one answer it never gives -- so renaming a
! file that did not exist moved nothing and said nothing.  pathlib's Path.rename
! inherited it.
!
! It now raises the errno's own OSError subclass with errno, strerror, filename
! and filename2, as CPython does.  os.replace is the same call on POSIX, and
! os.strerror -- libc's own strerror(), so the text is the platform's -- is the
! public spelling of the text in those messages.
!
! tests/python/os_rename_errors.py holds the 15 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsRenameErrorsTestCase removeAllMethods.
OsRenameErrorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsRenameErrorsTestCase
setUp

	importlib @env1:modules removeKey: #'os_rename_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_rename_errors.py')
		name: 'os_rename_errors'
%

category: 'Grail-Helpers'
method: OsRenameErrorsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsRenameErrorsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testRenameOfAMissingFileRaisesFileNotFoundNamingBothPaths

	self assertAll: #('rename_of_a_missing_file_is_file_not_found'
		'rename_of_a_missing_file_names_both_paths' 'rename_of_a_missing_file_creates_no_target'
		'a_failed_rename_leaves_the_source_alone')
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testRenameRaisesTheErrnosOwnSubclass

	self assertAll: #('rename_of_a_file_onto_a_directory_is_a_directory_error'
		'rename_of_a_directory_onto_a_file_is_not_a_directory'
		'rename_of_a_directory_onto_a_full_one_is_a_plain_os_error')
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testRenameAndReplaceStillMoveAndOverwrite

	self assertAll: #('rename_moves_the_file' 'rename_overwrites_an_existing_file'
		'replace_overwrites_an_existing_file')
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testReplaceAndPathlibReportFailureToo

	self assertAll: #('replace_of_a_missing_file_is_file_not_found'
		'path_rename_of_a_missing_file_is_file_not_found' 'path_replace_answers_the_target')
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testStrerrorIsTheTextOfTheError

	self assertAll: #('strerror_words_the_errnos_both_platforms_share'
		'strerror_is_the_text_of_the_error')
%

category: 'Grail-Tests - os'
method: OsRenameErrorsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15
%
