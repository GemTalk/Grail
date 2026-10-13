! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RmtreeOnexcTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RmtreeOnexcTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RmtreeOnexcTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RmtreeOnexcTestCase - shutil.rmtree's onexc / onerror / ignore_errors protocol
! ===============================================================================
! Grail's rmtree took only ignore_errors, so pytest -- whose tmp_path cleanup
! calls ``shutil.rmtree(path, onexc=...)'' -- ended every session that had used
! tmp_path with a TypeError.  The checks pin what CPython 3.14 hands the
! handler (function name, path, exception type) and that rmtree carries on past
! a failure the handler absorbed.
!
! Underneath it, os.remove/os.rmdir in a read-only directory raised a bare
! OSError with no errno, because the file primitive answers only nil and
! reading the filesystem back cannot see a permission on the parent.
!
! tests/python/rmtree_onexc.py holds the checks, run under real CPython 3.14 by
! scripts/check_python_fixtures.sh.  Six of them need a directory that chmod
! 0o500 actually protects, and the fixture skips them where it does not (a root
! user), so the count is 6 or 12.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RmtreeOnexcTestCase removeAllMethods.
RmtreeOnexcTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: RmtreeOnexcTestCase
setUp

	importlib @env1:modules removeKey: #'rmtree_onexc' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rmtree_onexc.py')
		name: 'rmtree_onexc'
%

category: 'Grail-Helpers'
method: RmtreeOnexcTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: RmtreeOnexcTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Helpers'
method: RmtreeOnexcTestCase
readOnlyChecks

	^ #('onexc_hears_each_failure_and_rmtree_goes_on'
		'onerror_gets_an_exc_info_triple'
		'ignore_errors_removes_what_it_can'
		'a_handler_that_retries_finishes_the_job'
		'without_a_handler_the_first_failure_is_raised'
		'os_remove_and_rmdir_report_permission_denied')
%

category: 'Grail-Tests - shutil'
method: RmtreeOnexcTestCase
testOnexcHearsWhatCPythonReports

	self assertAll: #('onexc_hears_a_missing_path_from_lstat'
		'onexc_hears_a_file_twice'
		'onexc_hears_a_top_level_link_refused'
		'onexc_hears_a_dangling_link_from_open')
%

category: 'Grail-Tests - shutil'
method: RmtreeOnexcTestCase
testSignature

	self assertAll: #('onexc_wins_over_onerror' 'dir_fd_none_is_accepted')
%

category: 'Grail-Tests - shutil'
method: RmtreeOnexcTestCase
testFailuresInAReadOnlyDirectory
	"Run only where chmod 0o500 protects a directory; elsewhere the fixture
	records none of these, and testEveryFixtureCheckIsAssertedByATestHere says
	so."

	| present |
	present := self readOnlyChecks select: [:name |
		(self results @env1:__contains__: name) == true].
	self assertAll: present
%

category: 'Grail-Tests - shutil'
method: RmtreeOnexcTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"Six unconditional checks, plus the six read-only ones when the directory
	protection held.  A check added to the fixture without being listed would
	pass unasserted here, so the count is pinned."

	| n |
	n := self results @env1:__len__.
	self assert: (n = 6 or: [n = 12]) description: 'checks: ' , n printString
%
