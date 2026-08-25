! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncGeneratorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncGeneratorsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AsyncGeneratorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncGeneratorsTestCase
!
! ``async def'' WITH ``yield'' IN IT -- the last big language-level async gap.
!
! Such a function answered a plain PythonCoroutine (FunctionDefAst
! ___lazyWrapperClass___ said so), and a coroutine has no __aiter__, so
! ``async for v in agen()'' raised ``TypeError: 'async for' requires an object
! with __aiter__ method, got PythonCoroutine''.  asend / athrow / aclose did not
! exist at all.
!
! ------------------------------------------------------------------------------
! THE PROBLEM, which is not obvious until you try it: ONE BODY, TWO KINDS OF
! SUSPENSION.
!
!     yield v      hand v to whoever is doing ``async for'' -- this ENDS the
!                  current __anext__, and v is what awaiting it produces
!     await x      park until x resolves -- this must travel PAST __anext__ and
!                  out to the event loop, because __anext__ has produced nothing
!
! Both arrive at the consumer through the SAME door: ___yield___: parks the
! forked body on a semaphore and hands one value over, and an ``await'' gets
! there too, because ___grailAwait___: delegates through ___yieldFrom___: which
! suspends with ___yield___:.  So the value is ambiguous, and reading an await's
! suspension as an item makes ``async for'' produce the loop's own plumbing as
! data.
!
! THE ANSWER: tag the yield, not the suspension.  PyAsyncYield wraps what the
! body yielded; ___asyncYield___: is the only thing that ever constructs one, so
! the tag cannot be forged -- whereas a suspension value comes from arbitrary
! user __await__ code and could imitate a tuple or a symbol.
!
! ------------------------------------------------------------------------------
! TWO MISTAKES MADE HERE, both caught by measurement rather than by review, and
! both worth keeping in the record because the code now looks obvious.
!
! 1. THE AWAITABLE WAS A GENERATOR, AND THAT EXHAUSTED VM MEMORY.  __anext__
!    first answered ``PythonGenerator withBlock: [...]'', which reads beautifully
!    -- ___yield___: is already exactly "park and hand this outward".  It also
!    FORKED A GsPROCESS PER ITERATION STEP, on the hot path of every ``async
!    for''.  test_coroutines died with ``VM temporary object memory is full, too
!    many markSweeps since last successful scavenge'' having reported 0 tests: a
!    CRASH where the module had merely been failing.  PyAsyncGenASend is a state
!    machine instead -- one small object per step, no process -- because
!    ___yieldFrom___: drives anything offering __iter__ / __next__ / send: /
!    throw: / close, generator or not.
!
! 2. A PERMISSIVE ``await'' IS AN INFINITE LOOP IN AN ``async for''.
!    ___grailAwait___: answers a non-awaitable UNCHANGED, deliberately, because
!    shipped library code awaits values Grail resolves synchronously.  In a loop
!    whose only exit is StopAsyncIteration that is fatal: test_coroutines'
!    test_for_4 has ``def __anext__: return ()'', and Grail bound ``()'' as the
!    item and went round again, allocating every turn -- the SECOND cause of the
!    same crash.  ___grailAwaitAnext___: is ___grailAwait___: minus the
!    pass-through plus CPython's TypeError, and AsyncForAst uses it.  A quiet
!    wrong value is a bug; an unbounded loop is a different kind of thing.
!
! ------------------------------------------------------------------------------
! ASYNC COMPREHENSIONS WERE SYNCHRONOUS ALL ALONG, and real async generators are
! what exposed it.  The parser has always recorded ``is_async'' on each
! comprehension clause and codegen has always ignored it, so ``[x async for x in
! ait]'' iterated its operand with __iter__/__next__.  That produced the right
! answer by ACCIDENT while an async-generator function answered a coroutine --
! PythonCoroutine is a PythonGenerator, so sync iteration over one worked.
! Tagging ends the accident: the tag reached user code as
! ``TypeError: unsupported operand type(s) for +: 'PyAsyncYield' and
! 'SmallInteger'''.  ComprehensionAst now honours the flag, per clause, because
! one comprehension may mix them.
!
! ------------------------------------------------------------------------------
! WHAT IS STILL MISSING:
!
!   * THE EVENT LOOP, which is now the only thing between this and a working
!     async stack.  CPython's test_asyncgen is newly wired into the manifest and
!     54 of its 85 tests fail with ``asyncio is not supported in Grail (no event
!     loop)'' -- that single number is the clearest statement of where the work
!     goes next.  See docs/Support_FastAPI.md: GemStone's ProcessScheduler
!     already supplies every primitive a loop needs, including socket readiness,
!     so what remains is an asyncio facade.
!   * ``inspect.isasyncgenfunction()'' -- whether a FUNCTION is an async
!     generator function, without calling it.  CPython reads a code flag; Grail's
!     functions carry none, so it still answers False.  Pinned below.
!   * The deprecated 3-argument ``athrow(type, value, tb)''.  One test.
!
! MEASURED: test.test_coroutines 47 -> 48 of 99 passing across this change (the
! comprehension fix more than paid for the two tests the tagging cost), and
! test.test_asyncgen is newly measured at 8 of 85.
!
! Drives tests/python/async_generators.py, whose EXPECTED table was generated by
! RUNNING CPython 3.14.6 and self-verifies against it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AsyncGeneratorsTestCase removeAllMethods.
AsyncGeneratorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncGeneratorsTestCase
setUp
	"Reload tests/python/async_generators.py fresh each test: the module body
	runs every probe at import, and async generators are stateful, so a shared
	instance would let one test read another's drained generator."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_generators' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_generators.py')
		name: 'async_generators'.
%

category: 'Grail-Private'
method: AsyncGeneratorsTestCase
resultAt: key
	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString
%

category: 'Grail-Private'
method: AsyncGeneratorsTestCase
assertMatchesCPythonAt: key
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.
%

! ------------------- The object exists and is the right one

category: 'Grail-Tests - The Object'
method: AsyncGeneratorsTestCase
testAnAsyncGeneratorIsItsOwnAsyncIterator
	"THE TEST THIS EXISTS FOR.  These functions answered a coroutine, which has
	no __aiter__, so ``async for'' over one raised TypeError."

	self assertMatchesCPythonAt: 'is_its_own_async_iterator'.
	self assertMatchesCPythonAt: 'async_for_iterates_it'.
%

category: 'Grail-Tests - The Object'
method: AsyncGeneratorsTestCase
testTheThreeKindsStayDistinguishable
	"Grail builds generators, coroutines and async generators out of ONE
	machinery -- PythonCoroutine and PythonAsyncGenerator are both
	PythonGenerator subclasses, because ``do not run the body at the call'' is
	what that machinery already implements.  So the guard that matters is that
	they did not collapse into each other: a plain async def must not become an
	async generator, a sync generator must not either, and the three
	types.* names must be three different classes.

	This is also why types.AsyncGeneratorType could not simply be derived
	BEFORE this change: with no distinct class it would have been identical to
	CoroutineType, and every isinstance() against it would have answered yes
	about an ordinary coroutine."

	self assertMatchesCPythonAt: 'a_plain_async_def_is_not_one'.
	self assertMatchesCPythonAt: 'a_sync_generator_is_not_one'.
	self assertMatchesCPythonAt: 'the_types_are_three_distinct_classes'.
%

! ------------------- The payoff

category: 'Grail-Tests - Yield Versus Await'
method: AsyncGeneratorsTestCase
testAnAwaitInTheBodySuspendsTheLoopWhileAYieldFeedsIt
	"THE PROPERTY THE WHOLE DESIGN IS FOR.  A body that awaits between yields,
	driven by hand: its suspensions must reach the DRIVER (the event loop) and
	its yields must reach the LOOP as items.  Both travel the same route out of
	the forked body, which is why the yield is tagged.

	Get the split wrong either way and this fails loudly: treat a suspension as
	an item and the loop produces plumbing; treat a yield as a suspension and
	the loop never produces anything.  It is how a streaming response works."

	self assertMatchesCPythonAt: 'await_inside_the_body_suspends_the_loop'.
%

! ------------------- Ending

category: 'Grail-Tests - Ending'
method: AsyncGeneratorsTestCase
testExhaustionAndAnEarlyReturnEndTheIteration
	"A body that runs out, and one that ``return''s early, both end the async
	iteration -- with StopAsyncIteration, not StopIteration.  The distinction is
	load-bearing rather than cosmetic: a StopIteration escaping the step would be
	read by the await delegation as the awaitable finishing NORMALLY, silently
	answering None as if it were an item."

	self assertMatchesCPythonAt: 'exhaustion_raises_stopasynciteration'.
	self assertMatchesCPythonAt: 'a_body_that_returns_early_ends_the_iteration'.
%

! ------------------- asend / athrow / aclose

category: 'Grail-Tests - The Rest Of The Protocol'
method: AsyncGeneratorsTestCase
testAsendThreadsAValueIntoTheYield
	"``x = yield v'' binds what asend() passed, exactly as a sync generator's
	send() does -- the tag wraps the value going OUT and does not disturb the
	value coming back IN."

	self assertMatchesCPythonAt: 'asend_threads_a_value_into_the_yield'.
%

category: 'Grail-Tests - The Rest Of The Protocol'
method: AsyncGeneratorsTestCase
testAthrowArrivesAtTheYield
	"athrow() raises at the point the body is parked on, so the body's own
	``except'' around the yield catches it.  This is how a cancellation reaches
	an async generator."

	self assertMatchesCPythonAt: 'athrow_arrives_at_the_yield'.
%

category: 'Grail-Tests - The Rest Of The Protocol'
method: AsyncGeneratorsTestCase
testAcloseRunsTheFinally
	"aclose() is how a loop shutting down releases an async generator it
	abandoned mid-iteration, and the ``finally'' has to run -- which only
	happens if GeneratorExit reaches the suspension point.

	The unstarted case is the companion, and it is the one an over-eager
	implementation gets wrong: a generator whose body never ran has no
	``finally'' pending, so aclose() must run NOTHING rather than entering the
	body to unwind it."

	self assertMatchesCPythonAt: 'aclose_runs_the_finally'.
	self assertMatchesCPythonAt: 'aclose_on_an_unstarted_generator_is_harmless'.
%

! ------------------- The predicates

category: 'Grail-Tests - Predicates'
method: AsyncGeneratorsTestCase
testInspectTellsTheThreeApart
	"isasyncgen() was hardcoded False because no such object existed.

	The second probe is the Grail hazard, and it is worse than the coroutine
	case it mirrors: PythonAsyncGenerator is a PythonGenerator subclass, so a
	bare isinstance() answers True about an async generator -- and unlike a
	coroutine, an async generator DOES answer to send(), so code that took the
	generator arm would drive it without complaint and hand back the internal
	PyAsyncYield tag as if it were an item.  CPython's predicates are mutually
	exclusive and callers branch on that."

	self assertMatchesCPythonAt: 'inspect_isasyncgen'.
	self assertMatchesCPythonAt: 'isgenerator_excludes_async_generators'.
%

! ------------------- Async comprehensions

category: 'Grail-Tests - Async Comprehensions'
method: AsyncGeneratorsTestCase
testAnAsyncComprehensionUsesTheAsyncProtocol
	"``[x async for x in agen()]'' iterated its operand SYNCHRONOUSLY: the
	parser has always recorded is_async per clause and codegen ignored it.  That
	produced the right answer by ACCIDENT while these functions answered a
	coroutine, and tagging ended the accident -- the tag reached user code as an
	arithmetic TypeError.

	All four comprehension forms share ComprehensionAst >>
	emitGenerators:from:on:innerBody:, so fixing the one helper fixes list, set,
	dict and generator-expression forms together, which is what this checks."

	| r b |
	b := (Python at: #builtins) @env1:instance.
	r := self eval: 'async def agen(src):
    for i in src:
        yield i

async def run():
    lst = [i + 1 async for i in agen([10, 20])]
    st = {i + 1 async for i in agen([10, 20])}
    dct = {i: i + 1 async for i in agen([10])}
    gen = list(i + 1 for i in [1])
    return (lst, sorted(st), dct, gen)

c = run()
try:
    c.send(None)
    out = ''did not finish''
except StopIteration as e:
    out = e.value
out'.
	self assert: (b @env1:repr: r) asString
		equals: '([11, 21], [11, 21], {10: 11}, [2])'.
%

! ------------------- Protocol errors

category: 'Grail-Tests - Protocol Errors'
method: AsyncGeneratorsTestCase
testAnAnextThatAnswersANonAwaitableRaisesRatherThanLooping
	"THE CRASH THIS PREVENTS.  ``async for'' exits only on
	StopAsyncIteration, so an __anext__ answering something inert loops
	forever, allocating every turn -- test_coroutines' test_for_4 took the whole
	module from FAILING to CRASHING with ``VM temporary object memory is full''.

	The general ``await'' still passes a non-awaitable through, on purpose;
	___grailAwaitAnext___: is the iteration path's stricter variant, and this
	test is the reason the two exist separately."

	| r b |
	b := (Python at: #builtins) @env1:instance.
	r := self eval: 'class Bad:
    def __aiter__(self):
        return self
    def __anext__(self):
        return ()

async def f():
    async for i in Bad():
        pass

c = f()
try:
    c.send(None)
    out = ''looped or finished''
except StopIteration:
    out = ''finished''
except TypeError as e:
    out = (''TypeError'', str(e))
out'.
	self assert: (b @env1:repr: r) asString
		equals: '(''TypeError'', "''async for'' received an invalid object from __anext__: tuple")'.
%

category: 'Grail-Tests'
method: AsyncGeneratorsTestCase
testIsasyncgenfunctionAnswersTrue
	"Formerly pinned FALSE as a known gap, with the instruction that when the
	fix landed this test would fail and say so.  It did: functions carry a
	real co_flags word (FunctionDefAst >> emitCoFlags), and inspect's
	predicates now mask it exactly as CPython does, so the flags-word excuse
	is gone.  The full truth table lives in InspectAsyncPredicatesTestCase;
	this keeps the one answer that changed, at the site that pinned it."

	| r |
	r := self eval: 'import inspect
async def agen():
    yield 1
inspect.isasyncgenfunction(agen)'.
	self assert: r equals: true.
%
