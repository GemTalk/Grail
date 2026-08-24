! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncioExceptionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioExceptionsTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncioExceptionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncioExceptionsTestCase
!
! Which asyncio exception types are the BUILTIN ones, and which are asyncio's
! own.  Drives tests/python/asyncio_exceptions.py, whose five checks were
! measured against CPython 3.14.6 (it is self-running, so scripts/
! check_python_fixtures.sh runs them there on every gate).
!
! THE ONE THAT WAS WRONG IS TimeoutError.  Through 3.10 asyncio had its own; in
! 3.11 it became an alias of the builtin, and asyncio/exceptions.py now says so:
!
!     TimeoutError = _builtins.TimeoutError
!
! Grail had ``class TimeoutError(Exception)'' instead.  That is the kind of
! deviation that reads correctly everywhere you look for it -- ``wait_for''
! raises a TimeoutError, its name is TimeoutError, its message is right -- and
! is wrong at every CATCH site, because 3.11+ code writes the plain ``except
! TimeoutError'' and that is a different class.  It also missed the builtin's
! descent from OSError.
!
! Nothing Grail's own fixtures asked would have found it: they were written
! against ``asyncio.TimeoutError'', the spelling that worked.  It took an
! upstream test -- test.test_asyncio.test_queues'
! test_cancelled_getters_not_being_held_in_self_getters -- which writes the
! modern spelling and let the exception escape its assertRaises.
!
! CancelledError is here as the CONTRAST, and deliberately so: it is NOT
! aliased, because it must stay outside Exception so that the ``except
! Exception'' wrapping almost every task body cannot swallow a cancellation.
! Testing the two together is what stops a later "alias these to the builtins"
! tidy-up from taking CancelledError with it.
! ===============================================================================

! ------------------- Remove existing behavior from AsyncioExceptionsTestCase
removeallmethods AsyncioExceptionsTestCase
removeallclassmethods AsyncioExceptionsTestCase
set compile_env: 0
! ------------------- Instance methods for AsyncioExceptionsTestCase

category: 'Grail-Setup'
method: AsyncioExceptionsTestCase
setUp
	"Reload the fixture fresh each test.  Its module body RUNS the checks --
	two of them drive a real event loop through asyncio.run -- so a shared
	instance would let one test observe another's loop state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_exceptions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asyncio_exceptions.py')
		name: 'asyncio_exceptions'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: AsyncioExceptionsTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- TimeoutError

category: 'Grail-Tests - TimeoutError'
method: AsyncioExceptionsTestCase
testTimeoutErrorIsTheBuiltin
	"The identity, which is the whole of it.  Written as its own test rather
	than folded into the catch-site test below, because when this one fails the
	other two fail WITH it and only this one says why."

	self assert: (self at: 'timeout_error_is_the_builtin') equals: true.
%

category: 'Grail-Tests - TimeoutError'
method: AsyncioExceptionsTestCase
testTimeoutErrorInheritsFromOSError
	"The builtin descends from OSError; a bare Exception subclass does not.
	So ``except OSError'' around a timing-out await used to behave
	differently -- a second wrong answer from the same cause, and one no
	asyncio-specific test would have looked for."

	self assert: (self at: 'timeout_error_is_an_oserror') equals: true.
%

category: 'Grail-Tests - TimeoutError'
method: AsyncioExceptionsTestCase
testWaitForRaisesWhatTheBuiltinNameCatches
	"The failure exactly as upstream reported it: catch the BUILTIN name
	around a wait_for that times out.  Before the alias this except clause
	did not fire at all and the exception escaped.

	The fixture times out on a future NOTHING resolves, so the check does not
	depend on how fast this machine is -- only that 0.01s passes."

	self
		assert: (self at: 'wait_for_raises_what_the_builtin_name_catches')
		equals: true.
%

! ------------------- CancelledError, the contrast

category: 'Grail-Tests - CancelledError'
method: AsyncioExceptionsTestCase
testCancelledErrorIsAsynciosOwnAndNotAnException
	"NOT aliased to anything, and outside Exception on purpose -- it moved out
	in 3.8 precisely so ordinary error handling cannot swallow cancellation."

	self assert: (self at: 'cancelled_error_is_asyncios_own') equals: true.
%

category: 'Grail-Tests - CancelledError'
method: AsyncioExceptionsTestCase
testCancelledErrorPassesThroughExceptException
	"The consequence, measured on a real task rather than asserted from the
	class hierarchy: a task body wrapping everything in ``except Exception''
	is still cancellable.  If CancelledError were an Exception this would
	answer 'swallowed' and cancellation would be unreliable in the most
	ordinary code there is."

	self
		assert: (self at: 'cancelled_error_survives_except_exception')
		equals: true.
%

set compile_env: 0
