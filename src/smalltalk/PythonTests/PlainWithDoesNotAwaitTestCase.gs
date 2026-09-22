! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PlainWithDoesNotAwaitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PlainWithDoesNotAwaitTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PlainWithDoesNotAwaitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PlainWithDoesNotAwaitTestCase - a plain with binds what __enter__ returns
! ===============================================================================
! ``with contextlib.closing(gen()) as it'' bound None.
!
! Every with was compiled through the await helper async with needs
! (PythonCoroutine >> ___grailAwait___:), on the reasoning -- written into three
! comments -- that it passes a non-coroutine straight through.  It does not pass
! a GENERATOR through: it drives anything generator-shaped to completion, as an
! await must for a generator-based coroutine.  So an __enter__ that returned a
! generator had it RUN, and the ``as'' target got its return value: None.
!
! The fix gives a plain with no await at all, as CPython has none.  The class-side
! await was really async-with knowledge that WithAst held only so AsyncWithAst
! could inherit it through super; it now lives in AsyncWithAst, which keeps its
! fallback for an async with outside a wrapped body.  Both codegen arms change,
! and both are exercised.
!
! Found through CPython's glob, which lists a directory exactly this way.
!
! tests/python/plain_with_does_not_await.py holds the 7 checks below, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.  Three are CONTROLS for
! async with, including a contended asyncio.Lock -- the shape that once let a body
! run without holding the lock.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PlainWithDoesNotAwaitTestCase removeAllMethods.
PlainWithDoesNotAwaitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - with'
method: PlainWithDoesNotAwaitTestCase
testEveryPlainWithCheckAgreesWithCPython
	"Every check in tests/python/plain_with_does_not_await.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |

	importlib @env1:modules removeKey: #'plain_with_does_not_await' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/plain_with_does_not_await.py')
		name: 'plain_with_does_not_await'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_plain_manager_is_unchanged'
	  'an_enter_that_returns_a_coroutine_binds_it_unawaited'
	  'an_enter_that_returns_a_generator_binds_it_unrun'
	  'async_with_still_awaits_an_aenter_that_suspends'
	  'async_with_still_holds_a_contended_lock_across_the_body'
	  'closing_a_generator_binds_the_generator'
	  'nested_items_each_bind_their_own_value').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 7
%
