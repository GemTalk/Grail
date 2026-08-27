! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioShieldAndWaitForTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncioShieldAndWaitForTestCase comment:
'A real asyncio.shield, and wait_for''s 3.12+ cancellation contract.

shield was ``async def'' returning ``await ensure_future(arg)'' -- import
compatibility, no protection, and no future API on what it returned.  Now
CPython''s synchronous wiring: outer future, forwarding inner-done callback
(which READS a cancelled-outer''s inner exception so it never reports
unretrieved), unhooking outer-done callback, done-inner-answers-itself.

wait_for is the 3.12+ shape, mirrored because it is behavioural: the eager
timeout<=0 path never STARTS a coroutine; the normal path awaits the raw
awaitable under timeout(), so an outside cancel rides the _fut_waiter
chain -- a cancel-swallowing coroutine completes normally and the waiting
task ends done() but NOT cancelled(), and expiry against one returns its
value rather than TimeoutError, both pinned because both are surprising.
ensure_future gains CPython''s awaitable validation on the way.  Took
test.test_asyncio.test_waitfor from FAIL/4 to fully green (19 tests).

See tests/python/asyncio_shield_and_waitfor.py (19 checks,
CPython-validated first).'
%

expectvalue /Class
doit
AsyncioShieldAndWaitForTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncioShieldAndWaitForTestCase removeAllMethods: 0.
AsyncioShieldAndWaitForTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncioShieldAndWaitForTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_shield_and_waitfor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asyncio_shield_and_waitfor.py')
		name: 'asyncio_shield_and_waitfor'.
%

category: 'Grail-Helpers'
method: AsyncioShieldAndWaitForTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncioShieldAndWaitForTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AsyncioShieldAndWaitForTestCase
testShieldWiring
	"Future in, future out, identity for a done inner, forwarding in both
	directions, and the TypeError for a non-awaitable."

	self assertAll: #('shield_returns_future' 'shield_of_done_is_inner'
		'await_shield_result' 'inner_cancel_propagates'
		'inner_exception_propagates' 'shield_refuses_non_awaitable')
%

category: 'Grail-Tests'
method: AsyncioShieldAndWaitForTestCase
testShieldProtects
	"The point of shield: cancelling the outer leaves the inner running to
	completion, under a zero timeout included."

	self assertAll: #('outer_cancel_leaves_inner'
		'inner_completes_after_outer_cancel'
		'shielded_zero_timeout_kills_only_outer'
		'shielded_task_finished_in_background')
%

category: 'Grail-Tests'
method: AsyncioShieldAndWaitForTestCase
testWaitForEagerPath
	"timeout<=0: a done future still answers, an unstarted coroutine's
	body never runs."

	self assertAll: #('zero_timeout_raises' 'zero_timeout_body_never_starts'
		'zero_timeout_done_future_answers')
%

category: 'Grail-Tests'
method: AsyncioShieldAndWaitForTestCase
testWaitForCancellationContract
	"Outside cancel waits for cleanup and rides the _fut_waiter chain; a
	swallowing coroutine ends the task done-not-cancelled; expiry converts
	to TimeoutError only when the cancellation actually lands."

	self assertAll: #('outside_cancel_waits_for_cleanup'
		'swallowed_cancel_ends_done_not_cancelled'
		'expiry_swallowed_returns_normally'
		'expiry_swallowed_ran_to_completion'
		'expiry_raises_timeout' 'expiry_ran_finally_first')
%
