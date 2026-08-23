! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncIterationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncIterationTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AsyncIterationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncIterationTestCase
!
! ``async for'' -- a DIFFERENT PROTOCOL, not ``for'' with a keyword in front.
! It differs at all three points:
!
!     obj __aiter__          the iterator      (an ordinary method)
!     await it __anext__     each item         (an AWAITABLE)
!     StopAsyncIteration     the end           (NOT a StopIteration subclass)
!
! AsyncForAst emitted a plain synchronous ``for'' and said so in its own header,
! so __aiter__ / __anext__ were never consulted and iterating a real async
! iterator raised ``TypeError: object is not iterable''.  Everything starlette
! and anyio iterate -- request bodies, task groups, streams -- is an async
! iterator, so this is on the critical path for any async web stack
! (docs/Support_FastAPI.md).
!
! HOW IT IS BUILT: three hooks, not a second loop.  break, continue, for-else,
! tuple unpacking, the nesting-depth temp names and the PEP 657 position stores
! are IDENTICAL between the two loops, so ForAst >> printSmalltalkOn: now calls
! ___emitIteratorFrom___:on:, ___nextExpressionFor___: and
! ___exhaustedExceptionName___, and AsyncForAst overrides exactly those.
! Copying printSmalltalkOn: would have forked a hundred lines of loop machinery
! over three strings, and every later fix to for-else or unpacking would have
! had to be made twice.  The break / continue / else / unpacking / nesting tests
! below are the evidence that the sharing is real rather than asserted.
!
! THE AWAITED __anext__ IS WHAT MAKES IT MORE THAN A RENAME.  A suspension
! inside __anext__ has to suspend the WHOLE LOOP and reach the driver -- which is
! how a server yields between chunks of a streaming body.  Emitted through
! ``___gen___'', the enclosing coroutine, exactly as AwaitAst does, so it rides
! the delegation added in CoroutineSuspensionTestCase.  A synchronous loop
! cannot fake that test.
!
! A MISSING __aiter__ HAD TO BECOME A TypeError.  A bare ``__aiter__'' send
! produced an uncatchable Smalltalk MessageNotUnderstood -- ``a
! OrderedCollection class does not understand #__aiter__'' -- which aborts the
! whole evaluation.  ``async for v in [1, 2]'' is an ordinary programming
! mistake and must be an ordinary, catchable TypeError, so the emit routes
! through PythonCoroutine class >> ___grailAiter___:, which also makes CPython's
! SECOND check: __anext__ is validated on whatever __aiter__ RETURNED, not on
! the original object.
!
! ------------------------------------------------------------------------------
! ALSO HERE, because it is the same increment and the same root cause: THE TYPE
! NAMES.
!
! ``types.CoroutineType'' and ``types.GeneratorType'' were bare placeholder
! classes -- ``class CoroutineType: pass'' -- so ``type(coro) is
! types.CoroutineType'' was False ABOUT A REAL COROUTINE.  types.py now derives
! both from a live object, the same way it already derived CellType.
!
! That one placeholder was worth ninety test results.  CPython's test_coroutines
! opens every one of its ~99 tests with
!
!     def run_async(coro):
!         assert coro.__class__ in {types.GeneratorType, types.CoroutineType}
!
! so the assert failed before any test body ran and the module reported a bare,
! message-less ``AssertionError:'' ninety-odd times -- a result that looks like
! ninety separate bugs and is one.
!
! And ``inspect.iscoroutine()'' was hardcoded ``return False'', as was
! ``isgenerator()''.  Those are DISPATCH decisions, not introspective trivia:
! asgiref, anyio and starlette all ask ``iscoroutine(result)'' to decide whether
! to await what a call returned, and False means the body silently never runs.
!
! THE COROUTINE EXCLUSION IN isgenerator IS GRAIL-SPECIFIC and was found by this
! fixture disagreeing with CPython.  PythonCoroutine IS a PythonGenerator here
! (deliberately -- the generator machinery already implements "run the body when
! driven"), so a bare isinstance() answered True about a coroutine where CPython
! answers False.  CPython's two predicates are mutually exclusive and callers
! branch on that, so isgenerator now excludes coroutines explicitly.
!
! ------------------------------------------------------------------------------
! WHAT IS STILL MISSING, deliberately:
!
!   * (CLOSED, in the increment right after this one) ASYNC GENERATORS.  An
!     ``async def'' containing ``yield'' answered a COROUTINE, which has no
!     __aiter__, so ``async for'' over one raised.  PythonAsyncGenerator now
!     exists; see AsyncGeneratorsTestCase.  The test that pinned the gap is kept
!     below, rewritten, as the record.
!   * ``aiter'' / ``anext'' BUILTINS are absent (one test_coroutines test).
!   * Coroutine introspection -- cr_frame, cr_code, inspect.getcoroutinestate --
!     is absent (four tests).
!   * NO EVENT LOOP still ships.
!
! MEASURED AGAINST CPython's OWN SUITE.  test.test_coroutines is newly wired
! into scripts/cpython_suite_manifest.txt, which is how the numbers above are
! known rather than guessed: 99 tests, from 64 failures + 25 errors (6 passing)
! to 22 + 26 (47 passing) across this increment.
!
! Drives tests/python/async_iteration.py, whose EXPECTED table was generated by
! RUNNING CPython 3.14.6 and self-verifies against it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AsyncIterationTestCase removeAllMethods.
AsyncIterationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncIterationTestCase
setUp
	"Reload tests/python/async_iteration.py fresh each test: the module body
	runs every probe at import, and the iterators are stateful, so a shared
	instance would let one test read another's drained counter."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_iteration' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_iteration.py')
		name: 'async_iteration'.
%

category: 'Grail-Private'
method: AsyncIterationTestCase
resultAt: key
	"The repr of one fixture probe's result, as Grail produced it."

	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString
%

category: 'Grail-Private'
method: AsyncIterationTestCase
assertMatchesCPythonAt: key
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.
%

! ------------------- The loop

category: 'Grail-Tests - The Loop'
method: AsyncIterationTestCase
testAsyncForDrivesAiterAndAnext
	"THE TEST THIS EXISTS FOR.  ``async for'' used to emit a synchronous ``for'',
	so __aiter__ / __anext__ were never consulted and a real async iterator
	raised ``object is not iterable''.  The empty case is the companion: a
	StopAsyncIteration on the FIRST __anext__ must run the body zero times
	rather than once."

	self assertMatchesCPythonAt: 'basic'.
	self assertMatchesCPythonAt: 'empty_iterator_runs_body_zero_times'.
%

category: 'Grail-Tests - The Loop'
method: AsyncIterationTestCase
testAnExceptionFromAnextPropagates
	"__anext__ is awaited, so an exception raised inside it has to travel out
	through the await delegation and out of the loop -- not be mistaken for
	exhaustion.  StopAsyncIteration ends the loop; a ValueError does not."

	self assertMatchesCPythonAt: 'exception_from_anext_propagates'.
%

! ------------------- The shared machinery is genuinely shared

category: 'Grail-Tests - Shared Loop Machinery'
method: AsyncIterationTestCase
testBreakAndContinueWork
	"``break'' and ``continue'' are compiled as PythonBreak / PythonContinue
	signals caught by handlers ForAst emits around the loop.  Sharing that code
	rather than copying it is the design; these are the checks that the sharing
	is real."

	self assertMatchesCPythonAt: 'break'.
	self assertMatchesCPythonAt: 'continue'.
%

category: 'Grail-Tests - Shared Loop Machinery'
method: AsyncIterationTestCase
testForElseRunsOnlyOnANaturalDrain
	"Python's for-else, which is the subtlest part of the shared emit: the else
	clause runs when the iterator DRAINS and is skipped by ``break''.  It works
	by catching exhaustion on an inner handler and letting PythonBreak past it
	to an outer one -- so swapping StopIteration for StopAsyncIteration had to
	keep both arms intact."

	self assertMatchesCPythonAt: 'else_on_natural_drain'.
	self assertMatchesCPythonAt: 'break_skips_else'.
%

category: 'Grail-Tests - Shared Loop Machinery'
method: AsyncIterationTestCase
testTupleUnpackingAndNesting
	"Tuple targets go through ForAst's emitUnpackOn: path, and nested loops
	disambiguate their ___iter___ / ___item___ temps by counting enclosing
	ForAst nodes -- AsyncForAst IS a ForAst, so the count includes it and nested
	async loops do not collide."

	self assertMatchesCPythonAt: 'tuple_unpacking'.
	self assertMatchesCPythonAt: 'nested_async_for'.
%

! ------------------- The payoff

category: 'Grail-Tests - Suspension'
method: AsyncIterationTestCase
testASuspensionInsideAnextSuspendsTheWholeLoop
	"WHAT MAKES ASYNC ITERATION MORE THAN A RENAME.  __anext__ parks, and the
	yield has to travel out of __anext__, out of the loop, out of the coroutine
	and into the driver -- then the driver's value comes back in as the item the
	loop binds.  That is how a server yields between chunks of a streaming
	body.

	A synchronous loop cannot fake this: it has nowhere to send the suspension.
	Rides the delegation from CoroutineSuspensionTestCase, via ``___gen___''."

	self assertMatchesCPythonAt: 'suspension_inside_anext_reaches_the_driver'.
%

! ------------------- Protocol errors are catchable

category: 'Grail-Tests - Protocol Errors'
method: AsyncIterationTestCase
testASyncIterableIsRejectedWithACatchableTypeError
	"``async for v in [1, 2]'' is an ordinary mistake.  A bare __aiter__ send
	made it an UNCATCHABLE MessageNotUnderstood that aborted the whole
	evaluation; it is now CPython's TypeError, verbatim, which Python code can
	catch."

	self assertMatchesCPythonAt: 'sync_iterable_is_rejected'.
%

category: 'Grail-Tests - Protocol Errors'
method: AsyncIterationTestCase
testAnextIsValidatedOnWhatAiterReturned
	"CPython's second check, and the easy one to miss: __anext__ is required of
	the object __aiter__ ANSWERED, not of the original, and the error names that
	object's type.  So an __aiter__ that returns the wrong thing fails at the
	loop head with a message about what it returned, instead of failing
	per-iteration with something confusing."

	self assertMatchesCPythonAt: 'aiter_without_anext_is_rejected'.
	self assertMatchesCPythonAt: 'aiter_returning_a_non_iterator_is_rejected'.
%

! ------------------- The type names

category: 'Grail-Tests - Type Names'
method: AsyncIterationTestCase
testCoroutineAndGeneratorTypesNameTheRealClasses
	"THE NINETY-RESULT PLACEHOLDER.  ``class CoroutineType: pass'' made
	``type(coro) is types.CoroutineType'' False about a real coroutine, and
	CPython's test_coroutines asserts exactly that expression at the top of
	run_async -- so all ~99 of its tests failed before any test body ran, with a
	bare message-less AssertionError.  Derived from a live object now, the way
	types.py already derived CellType."

	self assertMatchesCPythonAt: 'coroutine_type_names_the_real_class'.
	self assertMatchesCPythonAt: 'generator_type_names_the_real_class'.
	self assertMatchesCPythonAt: 'the_run_async_assertion_holds'.
%

category: 'Grail-Tests - Type Names'
method: AsyncIterationTestCase
testInspectPredicatesAnswerAboutRealObjects
	"iscoroutine and isgenerator were both hardcoded ``return False''.  They are
	dispatch decisions -- asgiref, anyio and starlette ask iscoroutine(result)
	to decide whether to await -- so False meant the body never ran.

	The fourth probe is the Grail-specific hazard this fixture caught:
	PythonCoroutine IS a PythonGenerator, so isgenerator answered True about a
	coroutine where CPython answers False.  CPython's predicates are mutually
	exclusive and callers branch on that, so the exclusion is explicit now."

	self assertMatchesCPythonAt: 'inspect_predicates'.
%

category: 'Grail-Tests - Type Names'
method: AsyncIterationTestCase
testTypesCoroutineDecorator
	"``@types.coroutine'' makes a generator function awaitable.  CPython does it
	by ORing CO_ITERABLE_COROUTINE into a code flag; Grail has no code flags and
	needs none, because ___grailAwait___: delegates to any generator-shaped
	operand -- so the property the decorator grants already holds and the
	honest implementation hands the function back.

	The callable check is kept because it is the one part a caller can observe
	going wrong: types.coroutine(42) must raise rather than answer 42.  Ten
	test_coroutines tests use this decorator and could not even reach their
	bodies without the name existing."

	self assertMatchesCPythonAt:
		'types_coroutine_returns_a_callable_and_rejects_non_callables'.
%

! ------------------- Known gaps, pinned rather than hidden

category: 'Grail-Tests - Async Generators'
method: AsyncIterationTestCase
testAsyncForOverAnAsyncGeneratorNowIterates
	"THIS TEST USED TO PIN A GAP, and it is left here, rewritten, as the record
	that the gap closed.

	It asserted that ``async for'' over an ``async def'' containing ``yield''
	raised ___grailAiter___:'s TypeError naming PythonCoroutine -- because such
	a function answered a plain coroutine, which has no __aiter__ -- and said
	that when async generators landed it would fail and say so.  It did exactly
	that, in the shard run for the very next increment.

	PythonAsyncGenerator now exists, so this is the ordinary case: the
	generator is iterated and yields its values.  The interesting part of async
	generators -- a yield and an await going to different places -- is covered
	by AsyncGeneratorsTestCase; what is worth keeping HERE is that async
	iteration reaches them through the same __aiter__/__anext__ path as any
	other async iterator, with nothing special-cased for them."

	| r |
	r := self eval: 'async def agen():
    yield 1
    yield 2

async def consume():
    out = []
    async for v in agen():
        out.append(v)
    return out

c = consume()
try:
    c.send(None)
    out = ''did not finish''
except StopIteration as e:
    out = (''finished'', e.value)
out'.
	self
		assert: (((Python at: #builtins) @env1:instance) @env1:repr: r) asString
		equals: '(''finished'', [1, 2])'.
%
