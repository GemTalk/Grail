Class {
	#name : 'CoroutineSuspensionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CoroutineSuspensionTestCase >> assertMatchesCPythonAt: key [
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides -- so a tuple, a list, a str and an
	int are each compared as what they print as, and 0 does not match False."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.

]

{ #category : 'Grail-Private' }
CoroutineSuspensionTestCase >> resultAt: key [
	"The repr of one fixture probe's result, as Grail produced it."

	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString

]

{ #category : 'Grail-Setup' }
CoroutineSuspensionTestCase >> setUp [
	"Reload tests/python/coroutine_suspension.py fresh each test.  The module
	body runs every probe at import, and several of them drive coroutines and
	mutate captured lists, so a shared instance would let one test read another
	test's leftovers."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_suspension' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_suspension.py')
		name: 'coroutine_suspension'.

]

{ #category : 'Grail-Tests - Identity' }
CoroutineSuspensionTestCase >> testACoroutineCannotBeAwaitedTwice [
	"Formerly testACoroutineCanStillBeAwaitedTwice, the known-gap pin that
	promised to fail and point at the fixture row when the consumed flag
	landed.  It landed without needing a flag: PythonCoroutine overrides
	___resumeFinishedWith___: (issue 25887), so the second await's resume of
	the finished body raises RuntimeError instead of quietly answering None.
	The fixture row always recorded CPython's real answer -- it was the one
	probe of the fifteen that DIFFERED under Grail, and now none do."

	self assert: (self resultAt: 'coroutine_is_its_own_awaitable') asString
		equals: '''RuntimeError: cannot reuse already awaited coroutine'''.

]

{ #category : 'Grail-Tests - Suspension' }
CoroutineSuspensionTestCase >> testACoroutineCanSuspendMoreThanOnce [
	"A loop steps a task many times.  Two yields from one __await__ must arrive
	as two separate suspensions, each carrying its own sent value back -- so the
	delegation holds state ACROSS suspensions rather than restarting."

	self assertMatchesCPythonAt: 'multiple_suspensions'.

]

{ #category : 'Grail-Tests' }
CoroutineSuspensionTestCase >> testACoroutineParkedInAHandlerDoesNotShieldAPlainCaller [
	"The same leak from the other side: while a coroutine is parked inside its
	own except handler, an ORDINARY synchronous try in this stack must still
	reach its later clauses."

	self assert: (self resultAt:
			'a_task_parked_in_a_handler_does_not_shield_a_plain_caller')
		equals: '[''parked'', ''mine-KeyError'', ''resumed'']'.

]

{ #category : 'Grail-Tests - No Suspension' }
CoroutineSuspensionTestCase >> testACoroutineThatNeverSuspendsStillRunsStraightThrough [
	"The behaviour that already worked, and the guard against buying suspension
	by breaking the common case: a body with no blocking await runs to
	completion on the first send and reports its value as StopIteration's."

	self assertMatchesCPythonAt: 'no_suspension'.
	self assertMatchesCPythonAt: 'await_chain'.

]

{ #category : 'Grail-Tests - A Real Loop' }
CoroutineSuspensionTestCase >> testAMiniatureEventLoopRunsTwoTasksToCompletion [
	"THE SUBSTANTIVE CLAIM: the runtime can host an event loop.

	The fixture builds asyncio's actual shape -- a Future whose __await__ is
	``yield self'', and a round-robin scheduler that receives parked futures at
	its own send(), resolves one, and resumes -- with no asyncio import and
	nothing framework-specific.  Two tasks, two awaits each, run to completion
	with the right results.

	Every unit above could pass on a runtime that still could not do this, which
	is why the composed case is tested rather than inferred."

	self assertMatchesCPythonAt: 'mini_event_loop'.

]

{ #category : 'Grail-Tests - No Suspension' }
CoroutineSuspensionTestCase >> testAnExceptionPropagatesOutOfAnAwait [
	"Delegation must not swallow or re-wrap what the awaited coroutine raised;
	``await'' propagates it at the await site, as a call would."

	self assertMatchesCPythonAt: 'exception_propagates_out_of_an_await'.

]

{ #category : 'Grail-Tests - Suspension' }
CoroutineSuspensionTestCase >> testASuspensionTravelsOutThroughNestedAwaits [
	"THE PROPERTY A LOOP ACTUALLY DEPENDS ON.  A loop holds only the OUTERMOST
	coroutine, so a suspension two awaits down has to surface at that one
	send() -- which is what delegating (rather than driving inline) is for.
	Reached through ___yieldFrom___: at each level."

	self assertMatchesCPythonAt: 'suspension_travels_out_through_nested_awaits'.

]

{ #category : 'Grail-Tests - Async With' }
CoroutineSuspensionTestCase >> testAsyncWithStillWorksAndSurvivesASuspensionInsideIt [
	"``async with'' awaits __aenter__ and __aexit__, so it runs through the same
	machinery.  The second case is the one worth having: suspending INSIDE the
	context must not lose the context manager's exit."

	self assertMatchesCPythonAt: 'async_with'.
	self assertMatchesCPythonAt: 'async_with_suspending_inside'.

]

{ #category : 'Grail-Tests' }
CoroutineSuspensionTestCase >> testAsyncWithWaitsForASuspendingAenter [
	"``async with'' MUST suspend when __aenter__ does, and Grail's did not.

	The with-statement codegen drove __aenter__ through the CLASS-side
	``PythonCoroutine ___grailAwait___:'', which holds no reference to the
	awaiting coroutine.  That helper can only send() ONCE: a coroutine that
	RETURNS gives its value through StopIteration, but one that SUSPENDS makes it
	answer nil -- and the statement then walks into its body as though the
	manager had been entered.

	So ``async with lock:'' on a CONTENDED asyncio.Lock ran the critical section
	WITHOUT the lock, and __aexit__ raised ``RuntimeError: Lock is not
	acquired''.  Uncontended, __aenter__ never suspends, which is exactly why
	every test here passed for as long as nothing contended: it took upstream's
	test_asyncio.test_locks, where a Barrier makes contention the point, to
	surface it -- two of three tasks came out of ``async with barrier as i'' with
	None.

	The fix gives AsyncWithAst the two-emit rule AwaitAst already had: inside a
	wrapped body, drive through ``___gen___'' so a yield from deep inside
	__aenter__ travels out.  See PythonAst/AsyncWithAst >> ___awaitPrefix___.

	The assertion is the ORDER of events, because that is what separates the bug
	from the fix -- the body must not appear before ``aenter-done''."

	self assert: (self resultAt: 'async_with_waits_for_a_suspending_aenter')
		equals: '([''aenter-start'', ''aenter-done'', (''body'', ''VALUE''), ''aexit''], ''VALUE'')'.

]

{ #category : 'Grail-Tests - Suspension' }
CoroutineSuspensionTestCase >> testAwaitConsultsAWaitDunderAndTheYieldReachesTheDriver [
	"THE TEST THIS EXISTS FOR.  A custom awaitable whose __await__ yields used
	to evaluate to the awaitable OBJECT: __await__ was never called, because the
	old ___grailAwait___: drove only generator-shaped operands and passed
	everything else through.  Now the yield arrives at the driver's send(), and
	what the driver sends back is the value of the yield inside __await__ --
	both halves, because a loop needs to hand a result back in."

	self assertMatchesCPythonAt: 'suspend_and_resume'.

]

{ #category : 'Grail-Tests - Known Deviations' }
CoroutineSuspensionTestCase >> testAwaitingAPlainGeneratorDelegatesToIt [
	"The other half of the pass-through deviation, and the more interesting one:
	CPython rejects ``await <plain generator>'' with a TypeError, while Grail now
	DELEGATES to it -- so its yields suspend the awaiting coroutine and its
	return value becomes the await's value.

	That is a consequence of routing await through ___yieldFrom___: rather than a
	separate decision, and it is strictly more useful than the old behaviour
	(which ran the generator inline and discarded the suspensions).  Recorded so
	the widening is visible and intentional."

	| r |
	r := self eval: 'def g():
    yield ''g1''
    return ''gdone''

async def f():
    return await g()

c = f()
first = c.send(None)
try:
    c.send(None)
    out = (first, ''did not finish'')
except StopIteration as e:
    out = (first, e.value)
out'.
	self assert: (((Python at: #builtins) @env1:instance) @env1:repr: r) asString
		equals: '(''g1'', ''gdone'')'.

]

{ #category : 'Grail-Tests - Known Deviations' }
CoroutineSuspensionTestCase >> testAwaitingAPlainValueIsATypeError [
	"Formerly testAwaitingAPlainValuePassesItThrough, which pinned the
	DELIBERATE deviation that ``await 7'' answered 7.  The deviation's
	recorded reason was that jinja2, asgiref and flask awaited values Grail
	resolved synchronously, behind is_async guards that never fired -- but
	those guards misfired because the inspect predicates were stubs, and once
	they became honest (PR #661) the leniency's reason expired with them.
	Measured before flipping this pin: Flask (371) and asgi (28) SUnit suites
	and the full curated corpus run clean with the strict clause.

	The OTHER half of the deviation -- awaiting a plain generator, the test
	below -- is kept: types.coroutine is an identity decorator here, so a
	decorated and an undecorated generator cannot be told apart, and CPython
	itself accepts the decorated one."

	| r |
	r := self eval: 'async def f():
    return await 7
c = f()
try:
    c.send(None)
    out = ''did not finish''
except StopIteration as e:
    out = e.value
except TypeError as e:
    out = str(e)
out'.
	self assert: r asString equals: '''int'' object can''t be awaited'.

]

{ #category : 'Grail-Tests - Cancellation' }
CoroutineSuspensionTestCase >> testCloseRunsTheFinallyAtTheSuspensionPoint [
	"A loop shutting down closes its pending coroutines, and each one's
	``finally'' has to run -- which only happens if close() reaches the
	suspension point rather than discarding the parked delegation."

	self assertMatchesCPythonAt: 'close_runs_the_finally_at_the_suspension'.

]

{ #category : 'Grail-Tests - Suspension' }
CoroutineSuspensionTestCase >> testControlFlowContinuesAfterASuspension [
	"Resuming must put the coroutine back exactly where it parked, with the rest
	of the body -- including a further await -- still to run.  A fix that
	suspended correctly but lost the continuation would pass every test above
	and fail this one."

	self assertMatchesCPythonAt: 'await_after_a_suspension'.

]

{ #category : 'Grail-Tests - A Real Loop' }
CoroutineSuspensionTestCase >> testTheLoopInterleavesItsTasks [
	"Interleaving is the observable difference between suspending and running
	inline.  Two workers that park three times each must alternate --
	a0 b0 a1 b1 a2 b2 -- and would run a0 a1 a2 b0 b1 b2 if a suspension did not
	really return control to the scheduler.  This is the check that a
	pass-through ``await'' cannot fake."

	self assertMatchesCPythonAt: 'loop_interleaves_two_tasks'.

]

{ #category : 'Grail-Tests - Cancellation' }
CoroutineSuspensionTestCase >> testThrowArrivesAtTheSuspensionPoint [
	"This is cancellation.  asyncio cancels a task by throwing CancelledError at
	wherever it is parked; if throw() hit the OUTER coroutine instead, a
	cancelled task could never clean up in the right place.  Both halves: caught
	at the suspension, and propagated out when nothing catches it."

	self assertMatchesCPythonAt: 'throw_arrives_at_the_suspension'.
	self assertMatchesCPythonAt: 'throw_propagates_when_not_caught'.

]

{ #category : 'Grail-Tests' }
CoroutineSuspensionTestCase >> testTwoTasksCanBothParkInsideAnExceptHandler [
	"THE CANONICAL ASYNCIO RETRY, RUN TWICE AT ONCE.

	``except X: await ...'' then loop back into the same try is how every socket
	coroutine in an event loop is written.  Two tasks doing it simultaneously is
	not an edge case: it is the ordinary state of a server, where every
	connection runs the same code, so both park inside a handler of the SAME try.

	Grail kept ``which except handler bodies am I inside'' in one SESSION-wide
	stack, and a coroutine is a generator running on its own forked process --
	a second call stack.  The task that resumed first therefore unwound the
	OTHER task's entry and left its own behind, and from then on the shield that
	keeps a handler's exception away from its siblings refused EVERY later clause
	of its own try, a bare ``except BaseException'' included.  The next exception
	escaped uncaught.

	Measured as an ASGI server dying on its first request (see
	AsgiServerTestCase): connect() answered EISCONN past an ``except OSError''
	written to catch exactly that.  Fixed in BaseException
	>> ___captureHandlerState___, saved and restored across every suspension by
	PythonGenerator >> ___yield___: and >> ___captureConsumerState___.

	Both tasks are asserted, because the leak had a victim and a beneficiary:
	only the FIRST to park lost its bookkeeping, so checking one task could pass
	while the bug was still there."

	self assert: (self resultAt: 'two_tasks_park_inside_except_handlers')
		equals: '[(''a'', [''ValueError'', ''KeyError'']), (''b'', [''ValueError'', ''KeyError''])]'.

]
