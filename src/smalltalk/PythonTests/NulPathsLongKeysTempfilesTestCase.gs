! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NulPathsLongKeysTempfilesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NulPathsLongKeysTempfilesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NulPathsLongKeysTempfilesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NulPathsLongKeysTempfilesTestCase - three defects test.test_linecache found
! ===============================================================================
! None of them is in linecache, which is CPython's own file unchanged.
!
!   * nul       -- os passed a path with an embedded NUL to the kernel, which
!                  stops reading at the NUL: os.stat('/tmp\x00junk') reported on
!                  /tmp, os.listdir('\x00') listed the current directory, and
!                  os.remove(p + '\x00.bak') would have removed p.  CPython's
!                  path converter refuses it in every os function
!                  (os >> ___fsPathChecked___:for:arg:), and the os.path
!                  predicates answer False (os >> ___statOrNil___:lstat:).
!   * long key  -- dict >> ___removeStoredKey___: asked for a str key's Symbol
!                  form, and GemStone refuses a Symbol over 1024 characters with
!                  an error Python cannot catch: ``{}.pop('a' * 2000, None)''
!                  killed the program.  linecache.updatecache opens with
!                  ``cache.pop(filename, None)''.
!   * tempfile  -- mkstemp / NamedTemporaryFile / TemporaryFile were
!                  NotImplementedError stubs; ten of the module's tests write
!                  their source through NamedTemporaryFile.
!
! tests/python/nul_paths_long_keys_tempfiles.py holds the 14 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NulPathsLongKeysTempfilesTestCase removeAllMethods.
NulPathsLongKeysTempfilesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NulPathsLongKeysTempfilesTestCase
setUp

	importlib @env1:modules removeKey: #'nul_paths_long_keys_tempfiles' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nul_paths_long_keys_tempfiles.py')
		name: 'nul_paths_long_keys_tempfiles'
%

category: 'Grail-Helpers'
method: NulPathsLongKeysTempfilesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: NulPathsLongKeysTempfilesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - nul'
method: NulPathsLongKeysTempfilesTestCase
testAnEmbeddedNulIsRefusedBeforeTheKernelSeesIt

	self assertAll: #('stat_refuses_an_embedded_nul'
		'lstat_and_listdir_refuse_it_too'
		'mutating_calls_refuse_it_before_touching_anything'
		'linecache_ignores_a_nul_filename')
%

category: 'Grail-Tests - nul'
method: NulPathsLongKeysTempfilesTestCase
testPredicatesAndStringFunctionsAreUnchanged
	"The half that must not move: the predicates say no rather than raise, and
	the pure string functions never looked at the filesystem at all."

	self assertAll: #('the_predicates_answer_false'
		'string_functions_let_a_nul_through')
%

category: 'Grail-Tests - long key'
method: NulPathsLongKeysTempfilesTestCase
testDictPopTakesAKeyTooLongForASymbol

	self assertAll: #('dict_pop_accepts_a_long_str_key'
		'a_missing_long_key_is_a_key_error'
		'linecache_ignores_a_very_long_filename')
%

category: 'Grail-Tests - tempfile'
method: NulPathsLongKeysTempfilesTestCase
testTempfileCreatesRealFiles

	self assertAll: #('mkstemp_creates_a_private_file'
		'named_temporary_file_delete_false_keeps_the_file'
		'named_temporary_file_text_mode_is_removed_on_exit'
		'named_temporary_file_close_removes_it'
		'temporary_file_reads_back_what_was_written')
%

category: 'Grail-Tests - tempfile'
method: NulPathsLongKeysTempfilesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 14 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14
%
