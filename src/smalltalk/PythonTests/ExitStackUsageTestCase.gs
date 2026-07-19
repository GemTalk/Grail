! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExitStackUsageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExitStackUsageTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ExitStackUsageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExitStackUsageTestCase — contextlib.ExitStack.close() / pop_all().  close()
! unwinds the registered callbacks outside the ``with`` block (flask's test
! client calls it between requests); pop_all() transfers ownership to a fresh
! stack.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExitStackUsageTestCase removeAllMethods.
ExitStackUsageTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ExitStack'
method: ExitStackUsageTestCase
loadFixture
	"Load tests/python/exitstack_usage.py fresh."

	importlib @env1:modules removeKey: #'exitstack_usage' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exitstack_usage.py')
		name: 'exitstack_usage'
%

category: 'Grail-Tests-ExitStack'
method: ExitStackUsageTestCase
testCloseRunsCallbacks
	"close() runs every registered callback in LIFO order."

	| log |
	log := self loadFixture @env1:close_runs_callbacks.
	self assert: log size equals: 2.
	self assert: (log @env1:__getitem__: 0) equals: 'b'.
	self assert: (log @env1:__getitem__: 1) equals: 'a'
%

category: 'Grail-Tests-ExitStack'
method: ExitStackUsageTestCase
testCloseIsIdempotent
	"A second close() has nothing left to run."

	self assert: self loadFixture @env1:close_is_idempotent equals: 1
%

category: 'Grail-Tests-ExitStack'
method: ExitStackUsageTestCase
testPopAllTransfersCallbacks
	"pop_all() moves the callbacks to a new stack; closing the
	original then runs nothing, closing the moved stack runs them."

	| r ranAfterPop log |
	r := self loadFixture @env1:pop_all_transfers_callbacks.
	ranAfterPop := r @env1:__getitem__: 0.
	log := r @env1:__getitem__: 1.
	self assert: ranAfterPop size equals: 0.
	self assert: log size equals: 1.
	self assert: (log @env1:__getitem__: 0) equals: 'kept'
%
