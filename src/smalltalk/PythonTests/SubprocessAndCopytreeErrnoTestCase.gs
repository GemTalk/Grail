! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubprocessAndCopytreeErrnoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubprocessAndCopytreeErrnoTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubprocessAndCopytreeErrnoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubprocessAndCopytreeErrnoTestCase - the last message-only OSErrors
! ===============================================================================
! subprocess and shutil.copytree built their error from the TEXT of an errno
! rather than from the errno itself, so e.errno, e.strerror and e.filename were
! all None.  A caller catching subprocess.run to say WHICH program is missing
! reads e.filename, and got nothing; the same for the tree copytree refused to
! overwrite.
!
! subprocess's broken-pipe error is the other shape CPython carries: errno and
! strerror with NO filename, since a pipe names no file.
!
! tests/python/subprocess_and_copytree_errno.py holds the 8 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SubprocessAndCopytreeErrnoTestCase removeAllMethods.
SubprocessAndCopytreeErrnoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SubprocessAndCopytreeErrnoTestCase
setUp

	importlib @env1:modules removeKey: #'subprocess_and_copytree_errno' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subprocess_and_copytree_errno.py')
		name: 'subprocess_and_copytree_errno'
%

category: 'Grail-Helpers'
method: SubprocessAndCopytreeErrnoTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SubprocessAndCopytreeErrnoTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - subprocess'
method: SubprocessAndCopytreeErrnoTestCase
testAMissingProgramIsNamedByTheError

	self assertAll: #('running_a_missing_program_names_it'
		'popen_of_a_missing_program_names_it_too'
		'the_message_is_the_one_cpython_prints'
		'a_program_that_exists_still_runs')
%

category: 'Grail-Tests - shutil'
method: SubprocessAndCopytreeErrnoTestCase
testCopytreeNamesTheTreeItRefusedAndStillCopies

	self assertAll: #('copytree_onto_an_existing_tree_names_it'
		'the_refused_tree_is_left_alone'
		'copytree_still_copies_into_a_new_tree'
		'dirs_exist_ok_still_copies_over_an_existing_tree')
%

category: 'Grail-Tests - shutil'
method: SubprocessAndCopytreeErrnoTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8
%
