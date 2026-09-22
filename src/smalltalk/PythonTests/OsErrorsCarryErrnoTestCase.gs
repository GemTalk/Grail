! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsErrorsCarryErrnoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsErrorsCarryErrnoTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsErrorsCarryErrnoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsErrorsCarryErrnoTestCase - a failing os call or open() carries its errno
! ===============================================================================
! os.stat, os.listdir, os.symlink, os.readlink, os.utime, os.chmod, os.remove,
! open() and gzip.open() raised the right OSError subclass with CPython's text,
! but built it from the TEXT alone, so e.errno, e.strerror and e.filename were
! all None.  They now raise through os >> ___signalErrno:filename:, as
! os.rename and os.mkdir do.
!
! os.symlink also named only the link where CPython names both paths, and a
! path under a plain file was FileNotFoundError where CPython reports ENOTDIR.
! os.strerror raised an uncatchable Smalltalk ArgumentError for a non-integer.
!
! tests/python/os_errors_carry_errno.py holds the 30 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsErrorsCarryErrnoTestCase removeAllMethods.
OsErrorsCarryErrnoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsErrorsCarryErrnoTestCase
setUp

	importlib @env1:modules removeKey: #'os_errors_carry_errno' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_errors_carry_errno.py')
		name: 'os_errors_carry_errno'
%

category: 'Grail-Helpers'
method: OsErrorsCarryErrnoTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsErrorsCarryErrnoTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testListdirAndStatCarryTheErrnoAndFilename

	self assertAll: #('listdir_of_a_missing_path_carries_enoent'
		'listdir_of_a_file_carries_enotdir' 'stat_of_a_missing_path_carries_enoent'
		'stat_under_a_file_carries_enotdir' 'lstat_of_a_missing_path_carries_enoent'
		'str_of_the_error_names_the_path')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testOpenCarriesTheErrnoAndFilename

	self assertAll: #('open_of_a_missing_file_carries_enoent'
		'open_of_a_directory_carries_eisdir_to_read_or_write'
		'exclusive_open_of_an_existing_file_carries_eexist'
		'open_under_a_file_carries_enotdir' 'open_of_a_path_object_names_it_as_a_str'
		'gzip_open_of_a_missing_file_carries_enoent')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testSymlinkNamesBothPathsAndStillCreatesTheLink

	self assertAll: #('symlink_onto_an_occupant_names_both_paths'
		'symlink_onto_a_dangling_link_is_file_exists'
		'symlink_into_a_missing_directory_names_both_paths'
		'symlink_under_a_file_carries_enotdir' 'str_of_a_symlink_error_names_both_paths'
		'symlink_still_creates_the_link')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testReadlinkCarriesTheErrnoAndFilename

	self assertAll: #('readlink_of_a_missing_path_carries_enoent'
		'readlink_of_a_file_is_einval' 'readlink_under_a_file_carries_enotdir')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testUtimeChmodAndRemoveCarryTheErrnoAndStillAct

	self assertAll: #('utime_of_a_missing_file_carries_enoent'
		'chmod_of_a_missing_file_carries_enoent' 'chmod_still_sets_the_mode'
		'remove_of_a_missing_file_carries_enoent' 'remove_under_a_file_carries_enotdir'
		'remove_still_removes_a_dangling_link')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testEveryErrorsStrerrorIsTheTextOfItsErrno

	self assertAll: #('strerror_is_the_text_of_every_error_above')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testStrerrorRefusesWhatCPythonRefuses

	self assertAll: #('strerror_refuses_a_non_integer'
		'strerror_refuses_an_integer_beyond_a_c_int')
%

category: 'Grail-Tests - os'
method: OsErrorsCarryErrnoTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 30 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 30
%
