Class {
	#name : 'AsyncIterationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncIterationTestCase >> assertMatchesCPythonAt: key [
	"Compare Grail's result for one probe against the CPython 3.14.6 value the
	fixture records, by repr on both sides."

	| expected |
	expected := (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key))
			asString.
	self assert: (self resultAt: key) equals: expected.

]

{ #category : 'Grail-Private' }
AsyncIterationTestCase >> resultAt: key [
	"The repr of one fixture probe's result, as Grail produced it."

	^ (((Python at: #builtins) @env1:instance)
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key))
			asString

]

{ #category : 'Grail-Setup' }
AsyncIterationTestCase >> setUp [
	"Reload tests/python/async_iteration.py fresh each test: the module body
	runs every probe at import, and the iterators are stateful, so a shared
	instance would let one test read another's drained counter."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_iteration' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_iteration.py')
		name: 'async_iteration'.

]

{ #category : 'Grail-Tests - The Loop' }
AsyncIterationTestCase >> testAnExceptionFromAnextPropagates [
	"__anext__ is awaited, so an exception raised inside it has to travel out
	through the await delegation and out of the loop -- not be mistaken for
	exhaustion.  StopAsyncIteration ends the loop; a ValueError does not."

	self assertMatchesCPythonAt: 'exception_from_anext_propagates'.

]

{ #category : 'Grail-Tests - Protocol Errors' }
AsyncIterationTestCase >> testAnextIsValidatedOnWhatAiterReturned [
	"CPython's second check, and the easy one to miss: __anext__ is required of
	the object __aiter__ ANSWERED, not of the original, and the error names that
	object's type.  So an __aiter__ that returns the wrong thing fails at the
	loop head with a message about what it returned, instead of failing
	per-iteration with something confusing."

	self assertMatchesCPythonAt: 'aiter_without_anext_is_rejected'.
	self assertMatchesCPythonAt: 'aiter_returning_a_non_iterator_is_rejected'.

]

{ #category : 'Grail-Tests - Suspension' }
AsyncIterationTestCase >> testASuspensionInsideAnextSuspendsTheWholeLoop [
	"WHAT MAKES ASYNC ITERATION MORE THAN A RENAME.  __anext__ parks, and the
	yield has to travel out of __anext__, out of the loop, out of the coroutine
	and into the driver -- then the driver's value comes back in as the item the
	loop binds.  That is how a server yields between chunks of a streaming
	body.

	A synchronous loop cannot fake this: it has nowhere to send the suspension.
	Rides the delegation from CoroutineSuspensionTestCase, via ``___gen___''."

	self assertMatchesCPythonAt: 'suspension_inside_anext_reaches_the_driver'.

]

{ #category : 'Grail-Tests - The Loop' }
AsyncIterationTestCase >> testAsyncForDrivesAiterAndAnext [
	"THE TEST THIS EXISTS FOR.  ``async for'' used to emit a synchronous ``for'',
	so __aiter__ / __anext__ were never consulted and a real async iterator
	raised ``object is not iterable''.  The empty case is the companion: a
	StopAsyncIteration on the FIRST __anext__ must run the body zero times
	rather than once."

	self assertMatchesCPythonAt: 'basic'.
	self assertMatchesCPythonAt: 'empty_iterator_runs_body_zero_times'.

]

{ #category : 'Grail-Tests - Async Generators' }
AsyncIterationTestCase >> testAsyncForOverAnAsyncGeneratorNowIterates [
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

]

{ #category : 'Grail-Tests - Protocol Errors' }
AsyncIterationTestCase >> testASyncIterableIsRejectedWithACatchableTypeError [
	"``async for v in [1, 2]'' is an ordinary mistake.  A bare __aiter__ send
	made it an UNCATCHABLE MessageNotUnderstood that aborted the whole
	evaluation; it is now CPython's TypeError, verbatim, which Python code can
	catch."

	self assertMatchesCPythonAt: 'sync_iterable_is_rejected'.

]

{ #category : 'Grail-Tests - Shared Loop Machinery' }
AsyncIterationTestCase >> testBreakAndContinueWork [
	"``break'' and ``continue'' are compiled as PythonBreak / PythonContinue
	signals caught by handlers ForAst emits around the loop.  Sharing that code
	rather than copying it is the design; these are the checks that the sharing
	is real."

	self assertMatchesCPythonAt: 'break'.
	self assertMatchesCPythonAt: 'continue'.

]

{ #category : 'Grail-Tests - Type Names' }
AsyncIterationTestCase >> testCoroutineAndGeneratorTypesNameTheRealClasses [
	"THE NINETY-RESULT PLACEHOLDER.  ``class CoroutineType: pass'' made
	``type(coro) is types.CoroutineType'' False about a real coroutine, and
	CPython's test_coroutines asserts exactly that expression at the top of
	run_async -- so all ~99 of its tests failed before any test body ran, with a
	bare message-less AssertionError.  Derived from a live object now, the way
	types.py already derived CellType."

	self assertMatchesCPythonAt: 'coroutine_type_names_the_real_class'.
	self assertMatchesCPythonAt: 'generator_type_names_the_real_class'.
	self assertMatchesCPythonAt: 'the_run_async_assertion_holds'.

]

{ #category : 'Grail-Tests - Shared Loop Machinery' }
AsyncIterationTestCase >> testForElseRunsOnlyOnANaturalDrain [
	"Python's for-else, which is the subtlest part of the shared emit: the else
	clause runs when the iterator DRAINS and is skipped by ``break''.  It works
	by catching exhaustion on an inner handler and letting PythonBreak past it
	to an outer one -- so swapping StopIteration for StopAsyncIteration had to
	keep both arms intact."

	self assertMatchesCPythonAt: 'else_on_natural_drain'.
	self assertMatchesCPythonAt: 'break_skips_else'.

]

{ #category : 'Grail-Tests - Type Names' }
AsyncIterationTestCase >> testInspectPredicatesAnswerAboutRealObjects [
	"iscoroutine and isgenerator were both hardcoded ``return False''.  They are
	dispatch decisions -- asgiref, anyio and starlette ask iscoroutine(result)
	to decide whether to await -- so False meant the body never ran.

	The fourth probe is the Grail-specific hazard this fixture caught:
	PythonCoroutine IS a PythonGenerator, so isgenerator answered True about a
	coroutine where CPython answers False.  CPython's predicates are mutually
	exclusive and callers branch on that, so the exclusion is explicit now."

	self assertMatchesCPythonAt: 'inspect_predicates'.

]

{ #category : 'Grail-Tests - Shared Loop Machinery' }
AsyncIterationTestCase >> testTupleUnpackingAndNesting [
	"Tuple targets go through ForAst's emitUnpackOn: path, and nested loops
	disambiguate their ___iter___ / ___item___ temps by counting enclosing
	ForAst nodes -- AsyncForAst IS a ForAst, so the count includes it and nested
	async loops do not collide."

	self assertMatchesCPythonAt: 'tuple_unpacking'.
	self assertMatchesCPythonAt: 'nested_async_for'.

]

{ #category : 'Grail-Tests - Type Names' }
AsyncIterationTestCase >> testTypesCoroutineDecorator [
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

]
