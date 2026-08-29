! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MultiprocessingModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MultiprocessingModuleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
MultiprocessingModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MultiprocessingModuleTestCase — the ``multiprocessing`` shim.  Grail cannot
! fork a gem, so Process and the process Pool raise; ThreadPool runs its work
! INLINE on the calling thread and every AsyncResult is already complete.  The
! checks live in tests/python/use_multiprocessing.py, which also self-verifies
! under CPython through scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MultiprocessingModuleTestCase removeAllMethods.
MultiprocessingModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Multiprocessing'
method: MultiprocessingModuleTestCase
loadFixture
	"Load tests/python/use_multiprocessing.py fresh, dropping any cached
	multiprocessing modules so the fixture recompiles cleanly."

	importlib @env1:modules removeKey: #'use_multiprocessing' ifAbsent: [].
	importlib @env1:modules removeKey: #'multiprocessing' ifAbsent: [].
	importlib @env1:modules removeKey: #'multiprocessing.pool' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_multiprocessing.py')
		name: 'use_multiprocessing'
%

category: 'Grail-Tests-Multiprocessing'
method: MultiprocessingModuleTestCase
testEveryFixtureCheckPasses
	"Drive every conformance check in the fixture and NAME the ones that fail.

	Asserting a count alone would report ``expected 18 got 17'' and leave the
	reader to hunt for which; collecting the failing names puts the answer in
	the failure message.  The count is asserted TOO, so a fixture that
	silently stops contributing checks cannot pass by shrinking -- a moving
	denominator would otherwise validate nothing."

	| results failed |
	results := self loadFixture @env1:all_checks.
	failed := (results select: [:pair | (pair at: 2) ~~ true])
		collect: [:pair | pair at: 1].
	self assert: failed asArray equals: #().
	self assert: results size equals: 18
%

category: 'Grail-Tests-Multiprocessing'
method: MultiprocessingModuleTestCase
testProcessRaisesRatherThanPretending
	"Grail cannot fork a gem.  Process has to fail at the point the caller
	decided to use real parallelism -- not later, and not silently.

	A Grail-only claim: under CPython this constructs happily, which is why
	it lives outside the fixture's CHECKS list and the CPython gate."

	self assert: self loadFixture @env1:grail_only_process_raises
%

category: 'Grail-Tests-Multiprocessing'
method: MultiprocessingModuleTestCase
testProcessPoolRaisesRatherThanRunningSerially
	"The PROCESS pool must not quietly degrade to serial execution: a caller
	reaching for Pool wants parallelism, and silently serial results are
	indistinguishable from correct ones until they are merely too slow.
	ThreadPool is the supported inline path, and says so in the error."

	self assert: self loadFixture @env1:grail_only_process_pool_raises
%
