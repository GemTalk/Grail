Class {
	#name : 'ThreadingModuleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> loadFixture [
	"Load tests/python/use_threading.py fresh (dropping any cached threading
	module so the fixture recompiles cleanly)."

	importlib @env1:modules removeKey: #'use_threading' ifAbsent: [].
	importlib @env1:modules removeKey: #'threading' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_threading.py')
		name: 'use_threading'

]

{ #category : 'Grail-Tests - Barrier' }
ThreadingModuleTestCase >> testBarrierReleasesAllPartiesTogether [
	"A Barrier has to BLOCK, so it is built on the real Semaphore-backed locks
	rather than on Event -- Event >> wait answers the flag without blocking,
	and a barrier that returned immediately would defeat its own purpose.

	The second assertion is the one that matters: no party may record passing
	the barrier before the last one has arrived.  A non-blocking stub satisfies
	the first check and fails this."

	self assert: self loadFixture @env1:barrier_releases_all_parties asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - Barrier' }
ThreadingModuleTestCase >> testBarrierResetClearsTheCount [
	"reset() on an idle barrier returns it to the empty state so it can be
	reused -- test_functools drives one barrier through m rounds that way."

	| r |
	r := self loadFixture @env1:barrier_reset_clears_the_count asArray.
	self assert: (r at: 1) equals: 0.
	self assert: (r at: 2) equals: 2.
	self assert: (r at: 3) asArray equals: #( 'through' ).

]

{ #category : 'Grail-Tests - Barrier' }
ThreadingModuleTestCase >> testBarrierWaitAnswersArrivalIndex [
	"CPython answers the arrival index so exactly one waiter can be singled out
	for follow-up work; across the cohort those indices are a permutation of
	range(parties)."

	self assert: self loadFixture @env1:barrier_wait_returns_arrival_index asArray
		equals: #( 0 1 2 ).

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testBoundMethodTupleArgs [
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

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testLock [
	"A Semaphore-backed Lock: acquire holds it, release frees it."

	| r |
	r := self loadFixture @env1:lock_roundtrip.
	self assert: (r at: 1).        "acquire returned true"
	self assert: (r at: 2).        "locked while held"
	self deny: (r at: 3)           "unlocked after release"

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testRLock [
	"A reentrant lock: the owning thread acquires twice without deadlocking."

	| r |
	r := self loadFixture @env1:rlock_reentrant.
	self assert: (r at: 1).
	self assert: (r at: 2)

]

{ #category : 'Grail-Tests - Barrier' }
ThreadingModuleTestCase >> testSwitchIntervalRoundTrips [
	"sys.getswitchinterval / setswitchinterval.  Grail's cooperative scheduler
	does not use the value as a preemption deadline, but it must round-trip:
	test.support saves it, lowers it to shake out races, and restores it.  A
	non-positive interval is rejected, as CPython does, rather than accepted
	and then reported back as legitimate."

	self assert: self loadFixture @env1:switch_interval_round_trips asArray
		equals: #( true true true true ).

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testThreadedCounter [
	"Five worker threads each append their index; all are joined and every one
	ran (proving multiple concurrent green threads complete)."

	| r |
	r := self loadFixture @env1:threaded_counter: 5.
	self assert: (r at: 1) equals: 5.
	self assert: (r at: 2) asArray equals: #(0 1 2 3 4)

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testThreadRoundtrip [
	"A worker thread mutates shared state; join() waits for it to finish."

	| r |
	r := self loadFixture @env1:thread_roundtrip.
	self assert: (r at: 1) asArray equals: #(42).  "worker ran"
	self deny: (r at: 2).                                "not alive before start"
	self deny: (r at: 3).                                "not alive after join"
	self assert: (r at: 4)                               "ident was assigned"

]

{ #category : 'Grail-Tests-Threading' }
ThreadingModuleTestCase >> testThreadTakesCPythonsConstructorArguments [
	"Thread(target=f, kwargs={...}) reaches the target, and daemon is
	keyword-only.  The parameter used to be named kwds, after a Grail
	limitation that no longer reproduces, so kwargs= was a TypeError.
	tests/python/thread_constructor_args.py holds the checks and agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'thread_constructor_args' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/thread_constructor_args.py')
		name: 'thread_constructor_args'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
