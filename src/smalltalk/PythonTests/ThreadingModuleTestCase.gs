! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ThreadingModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ThreadingModuleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ThreadingModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ThreadingModuleTestCase — ``threading.Thread`` over GsProcess and the
! Semaphore-backed locks of the native ``_thread`` module.  Threads are
! cooperative green threads (one gem, one OS thread): concurrent, not parallel.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ThreadingModuleTestCase removeAllMethods.
ThreadingModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
loadFixture
	"Load tests/python/use_threading.py fresh (dropping any cached threading
	module so the fixture recompiles cleanly)."

	importlib @env1:modules removeKey: #'use_threading' ifAbsent: [].
	importlib @env1:modules removeKey: #'threading' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_threading.py')
		name: 'use_threading'
%

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
testThreadRoundtrip
	"A worker thread mutates shared state; join() waits for it to finish."

	| r |
	r := self loadFixture @env1:thread_roundtrip.
	self assert: (r at: 1) asArray equals: #(42).  "worker ran"
	self deny: (r at: 2).                                "not alive before start"
	self deny: (r at: 3).                                "not alive after join"
	self assert: (r at: 4)                               "ident was assigned"
%

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
testLock
	"A Semaphore-backed Lock: acquire holds it, release frees it."

	| r |
	r := self loadFixture @env1:lock_roundtrip.
	self assert: (r at: 1).        "acquire returned true"
	self assert: (r at: 2).        "locked while held"
	self deny: (r at: 3)           "unlocked after release"
%

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
testRLock
	"A reentrant lock: the owning thread acquires twice without deadlocking."

	| r |
	r := self loadFixture @env1:rlock_reentrant.
	self assert: (r at: 1).
	self assert: (r at: 2)
%

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
testBoundMethodTupleArgs
	"Regression for the BoundMethod fix that makes a bound method usable as a
	thread target.  ``BoundMethod>>value:value:`` dispatches via
	``perform:env:withArguments:`` (primitive 2015), which requires an EXACT
	Array; a Python tuple is an Array *subclass* and is rejected.  Invoking a
	bound method with a tuple as its positional args (what
	``start_new_thread(fn, ())`` passes) must therefore coerce the tuple and
	succeed — checked here directly, decoupled from green-thread timing."

	| mod p bm |
	mod := self loadFixture.
	p := mod @env1:make_probe.
	bm := p @env1:___pyAttrLoad___: #'hit'.
	self assert: bm class name asString equals: 'BoundMethod'.
	bm @env1:value: (mod @env1:empty_tuple) value: nil.   "tuple positional"
	bm @env1:value: #() value: nil.                       "plain-Array positional"
	self assert: (p @env1:___pyAttrLoad___: #'calls') equals: 2
%

category: 'Grail-Tests-Threading'
method: ThreadingModuleTestCase
testThreadedCounter
	"Five worker threads each append their index; all are joined and every one
	ran (proving multiple concurrent green threads complete)."

	| r |
	r := self loadFixture @env1:threaded_counter: 5.
	self assert: (r at: 1) equals: 5.
	self assert: (r at: 2) asArray equals: #(0 1 2 3 4)
%

! --- Barrier + the switch-interval accessors ---

category: 'Grail-Tests - Barrier'
method: ThreadingModuleTestCase
testBarrierReleasesAllPartiesTogether
	"A Barrier has to BLOCK, so it is built on the real Semaphore-backed locks
	rather than on Event -- Event >> wait answers the flag without blocking,
	and a barrier that returned immediately would defeat its own purpose.

	The second assertion is the one that matters: no party may record passing
	the barrier before the last one has arrived.  A non-blocking stub satisfies
	the first check and fails this."

	self assert: self loadFixture @env1:barrier_releases_all_parties asArray
		equals: #( true true ).
%

category: 'Grail-Tests - Barrier'
method: ThreadingModuleTestCase
testBarrierWaitAnswersArrivalIndex
	"CPython answers the arrival index so exactly one waiter can be singled out
	for follow-up work; across the cohort those indices are a permutation of
	range(parties)."

	self assert: self loadFixture @env1:barrier_wait_returns_arrival_index asArray
		equals: #( 0 1 2 ).
%

category: 'Grail-Tests - Barrier'
method: ThreadingModuleTestCase
testBarrierResetClearsTheCount
	"reset() on an idle barrier returns it to the empty state so it can be
	reused -- test_functools drives one barrier through m rounds that way."

	| r |
	r := self loadFixture @env1:barrier_reset_clears_the_count asArray.
	self assert: (r at: 1) equals: 0.
	self assert: (r at: 2) equals: 2.
	self assert: (r at: 3) asArray equals: #( 'through' ).
%

category: 'Grail-Tests - Barrier'
method: ThreadingModuleTestCase
testSwitchIntervalRoundTrips
	"sys.getswitchinterval / setswitchinterval.  Grail's cooperative scheduler
	does not use the value as a preemption deadline, but it must round-trip:
	test.support saves it, lowers it to shake out races, and restores it.  A
	non-positive interval is rejected, as CPython does, rather than accepted
	and then reported back as legitimate."

	self assert: self loadFixture @env1:switch_interval_round_trips asArray
		equals: #( true true true true ).
%
