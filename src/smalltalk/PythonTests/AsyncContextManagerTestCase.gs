! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncContextManagerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncContextManagerTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncContextManagerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncContextManagerTestCase
!
! ``@contextlib.asynccontextmanager'' -- @contextmanager's async twin -- and
! the three neighbours that were stubbed alongside it.  Drives
! tests/python/asynccontextmanager.py, whose sixteen checks pass identically
! under CPython 3.14.6 (self-running, so scripts/check_python_fixtures.sh runs
! them there on every gate).
!
! WHAT WAS THERE BEFORE was ``def asynccontextmanager(func): return func'',
! with a header explaining that Grail had "no async context managers, and
! `async with` is emitted as plain `with`".  Both halves had stopped being
! true: async generators support asend/athrow/aclose, and ``async with''
! really does dispatch to __aenter__/__aexit__ -- asyncio.timeout is one.
!
! HOW THE STUB FAILED is the reason this has its own test class, because it is
! the argument for a stub raising NotImplementedError rather than degrading
! quietly.  Handing back the undecorated function meant ``async with
! database():'' met a bare async_generator, which has __anext__ but no
! __aexit__, so the caller got
!
!     TypeError: 'async_generator' object does not support the asynchronous
!     context manager protocol (missed __aexit__ method)
!
! raised inside its own block and naming its own object.  Under a TaskGroup
! that surfaced as an ExceptionGroup whose single child was a TypeError, so
! ``except* CustomException'' correctly declined to catch it and the group
! escaped -- three layers from the two-line stub responsible.  The CPython
! suite had it filed as "mixes asynccontextmanager with nested groups
! (undiagnosed)".
!
! THREE NEIGHBOURS were wrong in the same family, and each was wrong by
! sharing something with the synchronous half that could not be shared:
!   * AsyncContextDecorator subclassed ContextDecorator, so decorating with an
!     async context manager produced a wrapper running a plain ``with'' over
!     an object that has only __aenter__/__aexit__.
!   * AbstractAsyncContextManager was ``pass'', so a subclass relying on the
!     documented default __aenter__ got a plain object with no async hooks.
!   * aclosing() returned the SYNCHRONOUS closing(), which calls .close() --
!     a method an async iterator does not have.
!
! STILL NOT COVERED: AsyncExitStack remains aliased to the synchronous
! ExitStack, so it has no enter_async_context and no aclose.  That is now said
! in contextlib.py at the alias rather than left to be discovered.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: AsyncContextManagerTestCase
setUp
	"Reload the fixture fresh each test.  Its module body RUNS the checks, and
	most of them drive a real event loop through asyncio.run, so a shared
	instance would let one test observe another's loop state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asynccontextmanager' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asynccontextmanager.py')
		name: 'asynccontextmanager'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: AsyncContextManagerTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- The decorator itself

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testTheDecoratorReturnsAContextManagerNotTheFunction
	"The one check that fails on the pass-through build without running an
	event loop at all: the decorated object must have BOTH async hooks."

	self assert: (self at: 'the_decorator_returns_a_context_manager') equals: true
%

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testTheYieldedValueReachesTheAsClause
	self assert: (self at: 'the_yielded_value_reaches_the_as_clause') equals: true
%

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testCleanupRunsOnTheHappyPath
	self assert: (self at: 'cleanup_runs_on_the_happy_path') equals: true
%

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testCleanupRunsWhenTheBodyRaises
	self assert: (self at: 'cleanup_runs_when_the_body_raises') equals: true
%

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testTheGeneratorCanAwaitAcrossTheYield
	"Setup and cleanup that both suspend.  A cleanup that awaits must still
	complete before the block is allowed to exit."

	self assert: (self at: 'the_generator_can_await_across_the_yield') equals: true
%

category: 'Grail-Tests - The Decorator'
method: AsyncContextManagerTestCase
testTheFactoryCarriesTheWrappedFunctionsIdentity
	"functools.update_wrapper, for the same reason @contextmanager needed it:
	callers that inspect the decorated object must see what it wraps."

	self assert: (self at: 'the_factory_carries_the_wrapped_functions_identity')
		equals: true
%

! ------------------- __aexit__'s identity comparisons, where it is subtle

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testTheBodyExceptionIsSeenByTheGenerator
	self assert: (self at: 'the_body_exception_is_seen_by_the_generator') equals: true
%

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testAGeneratorThatSwallowsSuppressesTheException
	"athrow signals ``not handled'' by RAISING; __aexit__ signals it by
	returning false.  Getting that impedance mismatch backwards yields a
	context manager that swallows everything, and every happy path still
	passes."

	self assert: (self at: 'a_generator_that_swallows_suppresses_the_exception')
		equals: true
%

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testACleanupThatRaisesReplacesTheBodyException
	"The shape test_taskgroup_context_manager_exit_raises is built from:
	athrow comes back with something that is NOT what was thrown in, so
	__aexit__ has to let it out rather than treat it as its own."

	self assert: (self at: 'a_cleanup_that_raises_replaces_the_body_exception')
		equals: true
%

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testACleanupThatRaisesOnTheHappyPathPropagates
	self assert: (self at: 'a_cleanup_that_raises_on_the_happy_path_propagates')
		equals: true
%

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testAGeneratorThatNeverYieldsIsARuntimeError
	self assert: (self at: 'a_generator_that_never_yields_is_a_runtime_error')
		equals: true
%

category: 'Grail-Tests - Exception Handling'
method: AsyncContextManagerTestCase
testAGeneratorThatYieldsTwiceIsARuntimeError
	self assert: (self at: 'a_generator_that_yields_twice_is_a_runtime_error')
		equals: true
%

! ------------------- The three neighbours stubbed alongside it

category: 'Grail-Tests - Neighbours'
method: AsyncContextManagerTestCase
testTheContextManagerWorksAsADecorator
	"AsyncContextDecorator subclassed the SYNCHRONOUS ContextDecorator, whose
	__call__ wraps the body in a plain ``with'' -- over an object that has
	only __aenter__/__aexit__.  Sharing the base looked like reuse and was
	the one method that could not be shared."

	self assert: (self at: 'the_context_manager_works_as_a_decorator') equals: true
%

category: 'Grail-Tests - Neighbours'
method: AsyncContextManagerTestCase
testAclosingAwaitsAclose
	"It returned the synchronous closing(), which calls .close()."

	self assert: (self at: 'aclosing_awaits_aclose') equals: true
%

category: 'Grail-Tests - Neighbours'
method: AsyncContextManagerTestCase
testTheAbstractBaseSuppliesAenter
	"AbstractAsyncContextManager was ``pass''.  Only __aenter__ is checked:
	upstream makes __aexit__ abstract, so a subclass omitting it cannot be
	instantiated there, and this fixture has to agree with CPython."

	self assert: (self at: 'the_abstract_base_supplies_aenter') equals: true
%

! ------------------- The failure as it was actually met

category: 'Grail-Tests - Regression'
method: AsyncContextManagerTestCase
testATaskGroupCollectsBothTheBodyAndTheCleanupError
	"test_taskgroup_context_manager_exit_raises, reduced.  Two distinct
	CustomExceptions -- one from the child task, one from the cleanup -- must
	BOTH land in the group, and ``except*'' must catch it.  On the
	pass-through build the group held a single TypeError, which is why
	``except* CustomException'' was right to decline it."

	self assert: (self at: 'a_taskgroup_collects_both_the_body_and_the_cleanup_error')
		equals: true
%
